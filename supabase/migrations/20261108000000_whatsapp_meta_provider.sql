-- =========================================================
--  KANAL KEDUA: WHATSAPP CLOUD API (RESMI)
--  ---------------------------------------------------------
--  Latar belakang: CallMeBot menutup pendaftaran baru
--  ("The bot is currently full"), sehingga jalur gratis tidak
--  resmi itu tidak bisa dipakai lagi. Sebagai gantinya dipakai
--  WhatsApp Cloud API resmi milik Meta dengan NOMOR TEST.
--
--  KENAPA NOMOR TEST
--  Nomor test dibuat otomatis saat WhatsApp ditambahkan ke
--  sebuah app di Meta for Developers. Keunggulannya:
--    - Meta TIDAK menagih pesan yang dikirim dari nomor test;
--    - tidak perlu kartu kredit, verifikasi bisnis, atau
--      review nama tampilan;
--    - tetap bisa mengirim template, jadi pengingat jalan di
--      luar jendela layanan 24 jam.
--  Batasannya: hanya bisa mengirim ke maksimal 5 nomor yang
--  didaftarkan manual di API Setup (cukup 1 untuk pemakaian
--  pribadi), dan nomor pengirimnya bukan nomor sendiri
--  (berupa nomor US +1 555...). Cocok untuk pemakaian pribadi,
--  bukan untuk produksi massal.
--
--  KENAPA TETAP DI SERVER
--  Sama seperti kanal CallMeBot: access token Meta adalah
--  rahasia penuh (bisa mengirim pesan atas nama app). Token
--  disimpan di Supabase Vault, dan pengiriman dilakukan
--  pg_cron + pg_net. Browser tidak pernah menerimanya.
--
--  Idempoten: aman dijalankan berulang.
-- =========================================================


-- =========================================================
--  1. KOLOM BARU DI reminder_channel
--  provider menentukan jalur pengiriman. Kolom meta_* hanya
--  dipakai bila provider = 'meta'.
-- =========================================================

alter table public.reminder_channel
    add column if not exists provider          text    not null default 'callmebot',
    add column if not exists meta_phone_id     text,
    add column if not exists meta_template     text    not null default 'deadline_reminder',
    add column if not exists meta_lang         text    not null default 'id',
    -- Jumlah variabel {{n}} pada body template. 0 berarti
    -- template tanpa variabel (mis. hello_world), supaya bisa
    -- dipakai untuk uji cepat sebelum template sendiri disetujui.
    add column if not exists meta_param_count  integer not null default 4;


do $$
begin

    if not exists (
        select 1 from pg_constraint
         where conname = 'reminder_channel_provider_check'
    ) then
        alter table public.reminder_channel
            add constraint reminder_channel_provider_check
            check (provider in ('callmebot', 'meta'));
    end if;

    if not exists (
        select 1 from pg_constraint
         where conname = 'reminder_channel_param_count_check'
    ) then
        alter table public.reminder_channel
            add constraint reminder_channel_param_count_check
            check (meta_param_count between 0 and 10);
    end if;

end
$$;


-- =========================================================
--  2. PENILAIAN JAWABAN GATEWAY
--  Dipisah supaya aturannya SATU dan dipakai bersama oleh
--  refresh_reminder_status(), reminder_last_test(), dan UI.
--
--  Dua gateway berperilaku berbeda:
--    - CallMeBot membalas HTTP 201 walaupun gagal; pesan
--      errornya berupa teks "ERROR: ..." di body.
--    - Graph API membalas non-2xx dengan body JSON
--      {"error":{"message":"..."}}.
--  Jadi kode HTTP saja tidak cukup untuk keduanya.
-- =========================================================

create or replace function public.gateway_ok(
    p_code integer,
    p_body text
)
returns boolean
language plpgsql
immutable
as $$
declare
    pesan text;
begin

    if p_code is null or p_code not between 200 and 299 then
        return false;
    end if;

    if coalesce(p_body, '') ~* '(^|\n)\s*ERROR' then
        return false;
    end if;

    begin
        pesan := p_body::jsonb #>> '{error,message}';
    exception when others then
        pesan := null;
    end;

    return coalesce(pesan, '') = '';

end;
$$;


create or replace function public.gateway_error(
    p_code integer,
    p_body text
)
returns text
language plpgsql
immutable
as $$
declare
    pesan text;
    bersih text;
begin

    bersih := left(trim(regexp_replace(coalesce(p_body, ''), '<[^>]+>', '', 'g')), 300);

    -- Graph API: ambil pesan manusianya, bukan seluruh JSON.
    begin
        pesan := p_body::jsonb #>> '{error,message}';
    exception when others then
        pesan := null;
    end;

    if coalesce(pesan, '') <> '' then
        return left(pesan, 300);
    end if;

    if coalesce(bersih, '') = '' then
        return 'HTTP ' || coalesce(p_code::text, '???');
    end if;

    return bersih;

end;
$$;


-- =========================================================
--  3. PENGIRIM: SATU PINTU UNTUK DUA JALUR
--  Mengembalikan request id pg_net. Pemanggil yang mencatat
--  ke reminder_log dan menunggu hasilnya.
-- =========================================================

create or replace function public.kirim_whatsapp(
    p_offset   integer,
    p_course   text,
    p_class    text,
    p_deadline date
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    cfg      public.reminder_channel%rowtype;
    token    text;
    req_id   bigint;
    pesan    text;
    kapan    text;
    judul    text;
    kelas    text;
    tanggal  text;
    nilai    text[];
    param    jsonb;
    isi      jsonb;
    i        integer;
begin

    select * into cfg from public.reminder_channel where id;

    if cfg is null then
        raise exception 'Konfigurasi pengingat belum ada.';
    end if;

    kapan   := case p_offset
                   when 0 then 'HARI INI'
                   when 1 then 'BESOK'
                   else p_offset || ' HARI LAGI'
               end;
    judul   := coalesce(nullif(trim(p_course), ''), 'Tugas');
    kelas   := coalesce(nullif(trim(p_class), ''), '-');
    tanggal := to_char(p_deadline, 'DD Mon YYYY');


    -- ---------------- WHATSAPP CLOUD API (RESMI) ----------------

    if cfg.provider = 'meta' then

        select decrypted_secret into token
          from vault.decrypted_secrets
         where name = 'meta_wa_token'
         limit 1;

        if coalesce(token, '') = '' then
            raise exception 'Access token WhatsApp Cloud API belum diisi.';
        end if;

        if coalesce(cfg.meta_phone_id, '') = '' then
            raise exception 'Phone number ID belum diisi.';
        end if;

        if coalesce(cfg.phone, '') = '' then
            raise exception 'Nomor tujuan belum diisi.';
        end if;

        -- Template dengan variabel: susun components.body.
        -- Template tanpa variabel (param_count = 0) tidak boleh
        -- mengirim components sama sekali, kalau tidak Graph API
        -- menolak dengan error 132000.
        if cfg.meta_param_count > 0 then

            nilai := array[kapan, judul, kelas, tanggal];

            param := '[]'::jsonb;

            for i in 1 .. cfg.meta_param_count loop

                param := param || jsonb_build_array(
                    jsonb_build_object(
                        'type', 'text',
                        'text', coalesce(nilai[i], '-')
                    )
                );

            end loop;

            isi := jsonb_build_object(
                'name', cfg.meta_template,
                'language', jsonb_build_object('code', cfg.meta_lang),
                'components', jsonb_build_array(
                    jsonb_build_object(
                        'type', 'body',
                        'parameters', param
                    )
                )
            );

        else

            isi := jsonb_build_object(
                'name', cfg.meta_template,
                'language', jsonb_build_object('code', cfg.meta_lang)
            );

        end if;

        select net.http_post(
            url := 'https://graph.facebook.com/v23.0/'
                || cfg.meta_phone_id || '/messages',
            body := jsonb_build_object(
                'messaging_product', 'whatsapp',
                'recipient_type', 'individual',
                'to', cfg.phone,
                'type', 'template',
                'template', isi
            ),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || token
            ),
            timeout_milliseconds := 10000
        ) into req_id;

        return req_id;

    end if;


    -- ---------------- CALLMEBOT (TIDAK RESMI) ----------------

    select decrypted_secret into token
      from vault.decrypted_secrets
     where name = 'callmebot_apikey'
     limit 1;

    if coalesce(token, '') = '' then
        raise exception 'API key CallMeBot belum diisi.';
    end if;

    pesan := public.format_deadline_message(
        p_course, p_class, p_deadline, p_offset
    );

    select net.http_get(
        url := 'https://api.callmebot.com/whatsapp.php'
            || '?phone=' || public.url_encode(cfg.phone)
            || '&apikey=' || public.url_encode(token)
            || '&text=' || public.url_encode(pesan),
        timeout_milliseconds := 10000
    ) into req_id;

    return req_id;

end;
$$;


-- =========================================================
--  4. PENJADWAL UTAMA
--  Sama seperti sebelumnya, tetapi pengiriman diserahkan ke
--  kirim_whatsapp() supaya bisa dua jalur.
-- =========================================================

drop function if exists public.run_deadline_reminders(boolean);

create or replace function public.run_deadline_reminders(
    p_force boolean default false
)
returns table (
    tugas_id  bigint,
    sisa_hari integer,
    hasil     text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    cfg        public.reminder_channel%rowtype;
    local_now  timestamp;
    hari_ini   date;
    rec        record;
    req_id     bigint;
    detail_log text;
begin

    select * into cfg from public.reminder_channel where id;

    if cfg is null or not cfg.enabled then
        return;
    end if;

    if coalesce(cfg.phone, '') = '' then
        return;
    end if;

    local_now := (now() at time zone cfg.timezone);
    hari_ini  := local_now::date;

    if not p_force
       and extract(hour from local_now)::int <> cfg.send_hour then
        return;
    end if;

    for rec in
        select t.id,
               t.course,
               t.class_name,
               t.deadline,
               (t.deadline - hari_ini) as sisa
          from public.tasks t
         where t.dismissed_at is null
           and t.status <> 'Completed'
           and (t.deadline - hari_ini) = any (cfg.days_before)
           and not exists (
                   select 1
                     from public.reminder_log l
                    where l.task_id = t.id
                      and l.offset_days = (t.deadline - hari_ini)
               )
         order by t.deadline, t.course
    loop

        begin

            req_id := public.kirim_whatsapp(
                rec.sisa,
                rec.course,
                rec.class_name,
                rec.deadline
            );

        exception when others then

            insert into public.reminder_log
                (task_id, offset_days, status, detail)
            values
                (rec.id, rec.sisa, 'failed', sqlerrm)
            on conflict (task_id, offset_days) do nothing;

            tugas_id  := rec.id;
            sisa_hari := rec.sisa;
            hasil     := 'failed: ' || sqlerrm;
            return next;
            continue;

        end;

        detail_log := case cfg.provider
                          when 'meta' then
                              'Template ' || cfg.meta_template
                              || ' (' || cfg.meta_lang || ')'
                          else
                              public.format_deadline_message(
                                  rec.course, rec.class_name,
                                  rec.deadline, rec.sisa
                              )
                      end;

        insert into public.reminder_log
            (task_id, offset_days, status, detail, request_id)
        values
            (rec.id, rec.sisa, 'queued', detail_log, req_id)
        on conflict (task_id, offset_days) do nothing;

        tugas_id  := rec.id;
        sisa_hari := rec.sisa;
        hasil     := 'queued';
        return next;

    end loop;

end;
$$;


-- =========================================================
--  5. SINKRONKAN STATUS
--  Memakai aturan penilaian yang sama (gateway_ok/error),
--  sehingga error JSON dari Graph API ikut terbaca.
-- =========================================================

create or replace function public.refresh_reminder_status()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    jumlah integer := 0;
begin

    begin

        update public.reminder_log l
           set status = case
                            when public.gateway_ok(r.status_code, r.content)
                                then 'sent'
                            else 'failed'
                        end,
               detail = case
                            when public.gateway_ok(r.status_code, r.content)
                                then l.detail
                            else public.gateway_error(r.status_code, r.content)
                        end
          from net._http_response r
         where r.id = l.request_id
           and l.request_id is not null
           and l.status = 'queued';

        get diagnostics jumlah = row_count;

    exception when others then
        jumlah := 0;
    end;

    return jumlah;

end;
$$;


-- =========================================================
--  6. API UNTUK FRONTEND
--  Nomor dikembalikan TERSAMARKAN. Token tidak pernah keluar
--  dari Vault; yang dikirim hanya penanda ada/tidaknya token.
-- =========================================================

-- Signature berubah (kolom provider/meta_* ditambahkan), jadi
-- versi lama dibuang lebih dulu: create or replace tidak bisa
-- mengubah tipe kembalian.
drop function if exists public.reminder_channel_get();

create or replace function public.reminder_channel_get()
returns table (
    phone_masked     text,
    enabled          boolean,
    days_before      integer[],
    send_hour        integer,
    timezone         text,
    provider         text,
    has_api_key      boolean,
    has_meta_token   boolean,
    meta_phone_id    text,
    meta_template    text,
    meta_lang        text,
    meta_param_count integer,
    last_sent_at     timestamptz,
    last_status      text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    cfg public.reminder_channel%rowtype;
begin

    select * into cfg from public.reminder_channel where id;

    if cfg is null then
        return;
    end if;

    phone_masked := case
        when coalesce(cfg.phone, '') = '' then null
        when length(cfg.phone) <= 4 then '****'
        else repeat('*', greatest(length(cfg.phone) - 4, 0))
             || right(cfg.phone, 4)
    end;

    enabled          := cfg.enabled;
    days_before      := cfg.days_before;
    send_hour        := cfg.send_hour;
    timezone         := cfg.timezone;
    provider         := cfg.provider;
    meta_phone_id    := cfg.meta_phone_id;
    meta_template    := cfg.meta_template;
    meta_lang        := cfg.meta_lang;
    meta_param_count := cfg.meta_param_count;

    select exists (
        select 1 from vault.decrypted_secrets where name = 'callmebot_apikey'
    ) into has_api_key;

    select exists (
        select 1 from vault.decrypted_secrets where name = 'meta_wa_token'
    ) into has_meta_token;

    select l.created_at, l.status
      into last_sent_at, last_status
      from public.reminder_log l
     order by l.created_at desc
     limit 1;

    return next;

end;
$$;


-- Signature berubah, jadi versi lama dibuang lebih dulu.
drop function if exists public.reminder_channel_save(text, text, boolean, integer[], integer);

create or replace function public.reminder_channel_save(
    p_phone           text,
    p_api_key         text    default null,
    p_enabled         boolean default true,
    p_days            integer[] default '{3,1,0}',
    p_hour            integer default 8,
    p_provider        text    default 'callmebot',
    p_meta_phone_id   text    default null,
    p_meta_template   text    default null,
    p_meta_lang       text    default null,
    p_meta_param_count integer default null,
    p_meta_token      text    default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    nomor      text;
    nomor_lama text;
    prov       text;
begin

    select phone into nomor_lama
      from public.reminder_channel where id;

    prov := case lower(coalesce(p_provider, 'callmebot'))
                when 'meta' then 'meta'
                else 'callmebot'
            end;

    -- p_phone null berarti "pertahankan nomor yang sudah ada".
    -- Frontend mengirim null saat kolom input masih berisi nomor
    -- tersamarkan (*******7890), karena nilai bertanda bintang
    -- tidak boleh disimpan sebagai nomor sungguhan.
    if p_phone is null then

        if coalesce(nomor_lama, '') = '' then
            raise exception 'Nomor WhatsApp wajib diisi.';
        end if;

        nomor := nomor_lama;

    else

        nomor := regexp_replace(p_phone, '[^0-9]', '', 'g');

        if nomor like '00%' then
            nomor := substr(nomor, 3);
        end if;

        if length(nomor) < 8 then
            raise exception 'Nomor tidak valid: minimal 8 digit.';
        end if;

    end if;

    insert into public.reminder_channel
        (id, phone, enabled, days_before, send_hour, updated_at,
         provider, meta_phone_id, meta_template, meta_lang, meta_param_count)
    values
        (true, nomor, p_enabled, coalesce(p_days, '{3,1,0}'), p_hour, now(),
         prov,
         nullif(trim(coalesce(p_meta_phone_id, '')), ''),
         coalesce(nullif(trim(coalesce(p_meta_template, '')), ''), 'deadline_reminder'),
         coalesce(nullif(trim(coalesce(p_meta_lang, '')), ''), 'id'),
         coalesce(p_meta_param_count, 4))
    on conflict (id) do update
        set phone            = excluded.phone,
            enabled          = excluded.enabled,
            days_before      = excluded.days_before,
            send_hour        = excluded.send_hour,
            provider         = excluded.provider,
            meta_phone_id    = excluded.meta_phone_id,
            meta_template    = excluded.meta_template,
            meta_lang        = excluded.meta_lang,
            meta_param_count = excluded.meta_param_count,
            updated_at       = now();

    -- Rahasia hanya ditulis kalau diisi. Mengosongkan kolom di
    -- UI berarti "jangan ubah", bukan "hapus".
    if coalesce(p_api_key, '') <> '' then

        delete from vault.secrets where name = 'callmebot_apikey';

        perform vault.create_secret(
            p_api_key,
            'callmebot_apikey',
            'API key CallMeBot untuk pengingat deadline'
        );

    end if;

    if coalesce(p_meta_token, '') <> '' then

        delete from vault.secrets where name = 'meta_wa_token';

        perform vault.create_secret(
            p_meta_token,
            'meta_wa_token',
            'Access token WhatsApp Cloud API untuk pengingat deadline'
        );

    end if;

    return true;

end;
$$;


-- Tombol uji: kirim satu pesan sekarang tanpa menunggu jadwal.
create or replace function public.reminder_send_test()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    cfg    public.reminder_channel%rowtype;
    req_id bigint;
    detail text;
begin

    select * into cfg from public.reminder_channel where id;

    if cfg is null or coalesce(cfg.phone, '') = '' then
        return 'Nomor belum diisi.';
    end if;

    if cfg.provider = 'callmebot'
       and not exists (
               select 1 from vault.decrypted_secrets
                where name = 'callmebot_apikey'
           ) then
        return 'API key belum diisi.';
    end if;

    if cfg.provider = 'meta'
       and not exists (
               select 1 from vault.decrypted_secrets
                where name = 'meta_wa_token'
           ) then
        return 'Access token WhatsApp Cloud API belum diisi.';
    end if;

    begin

        req_id := public.kirim_whatsapp(
            0,
            'Pesan uji',
            'Ghost Task Matrix',
            (now() at time zone cfg.timezone)::date
        );

    exception when others then
        return 'Gagal mengirim: ' || sqlerrm;
    end;

    detail := case cfg.provider
                  when 'meta' then
                      'Pesan uji via template ' || cfg.meta_template
                      || ' (' || cfg.meta_lang || ')'
                  else
                      'Pesan uji dari Ghost Task Matrix.'
              end;

    insert into public.reminder_log
        (task_id, offset_days, status, detail, request_id)
    values
        (null, -1, 'queued', detail, req_id);

    return 'Pesan uji dikirim ke gateway. Menunggu konfirmasi...';

end;
$$;


create or replace function public.reminder_last_test()
returns table (
    status     text,
    detail     text,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
    rid bigint;
begin

    select l.request_id
      into rid
      from public.reminder_log l
     where l.task_id is null
       and l.offset_days = -1
     order by l.id desc
     limit 1;

    if rid is null then
        return;
    end if;

    begin

        update public.reminder_log l
           set status = case
                            when public.gateway_ok(r.status_code, r.content)
                                then 'sent'
                            else 'failed'
                        end,
               detail = case
                            when public.gateway_ok(r.status_code, r.content)
                                then l.detail
                            else public.gateway_error(r.status_code, r.content)
                        end
          from net._http_response r
         where r.id = l.request_id
           and l.request_id = rid
           and l.status = 'queued';

    exception when others then
        null;

    end;

    return query
        select l.status, l.detail, l.created_at
          from public.reminder_log l
         where l.task_id is null
           and l.offset_days = -1
         order by l.id desc
         limit 1;

end;
$$;


-- =========================================================
--  7. HAK AKSES
--  Pengirim dan penilai jawaban memegang token, jadi tertutup
--  untuk browser. Yang boleh dipanggil browser hanya empat
--  fungsi di bawah.
-- =========================================================

revoke all on function public.kirim_whatsapp(integer, text, text, date)
    from public, anon, authenticated;

revoke all on function public.run_deadline_reminders(boolean)
    from public, anon, authenticated;

revoke all on function public.refresh_reminder_status()
    from public, anon, authenticated;

revoke all on function public.gateway_ok(integer, text)
    from public, anon, authenticated;

revoke all on function public.gateway_error(integer, text)
    from public, anon, authenticated;

revoke all on function public.url_encode(text)
    from public, anon, authenticated;

revoke all on function public.format_deadline_message(text, text, date, integer)
    from public, anon, authenticated;

grant execute on function public.reminder_channel_get() to anon, authenticated;

grant execute on function public.reminder_channel_save(
    text, text, boolean, integer[], integer, text, text, text, text, integer, text
) to anon, authenticated;

grant execute on function public.reminder_send_test() to anon, authenticated;
grant execute on function public.reminder_last_test() to anon, authenticated;
