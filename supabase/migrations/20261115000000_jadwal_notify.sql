-- =========================================================
--  JADWAL NOTIFIKASI LEWAT SUPABASE (pg_cron + pg_net)
--
--  Kenapa pindah dari cron GitHub?
--  Jadwal `schedule` di GitHub Actions sering tertunda, dan
--  kadang dilewati sama sekali saat servernya sibuk. Diuji di
--  repo ini: dalam ~23 jam seharusnya ada ~24 run, yang benar
--  benar terjadi cuma 3 -- dan tidak satu pun jatuh pada jam
--  yang dijadwalkan. Notifikasi 08.00 WIB tidak pernah terkirim.
--
--  pg_cron mengeksekusi tepat pada menit yang diminta, dan
--  riwayatnya bisa diperiksa di cron.job_run_details. Itu
--  yang membuat jadwal ini bisa dipercaya.
--
--  Alur:
--      pg_cron (08.00 WIB)
--          -> pg_net memanggil GitHub API /dispatches
--              -> workflow notify.yml menyusun pesan
--                  -> menulis ke wa_outbox
--                      -> jembatan di HP mengirim ke WhatsApp
--
--  Kenapa tetap lewat GitHub, bukan langsung menulis
--  wa_outbox dari SQL? Karena penyusun pesan (H-3, digest
--  Senin, pengingat 3 jam) sudah ada di scripts/notify
--  telegram.mjs dan sudah diuji. Menulis ulang logika itu di
--  SQL akan menduplikasi aturan bisnis, dan cepat atau lambat
--  kedua versi akan berbeda perilaku.
--
--  Token GitHub disimpan di Supabase Vault (terenkripsi),
--  TIDAK di file migrasi ini dan tidak di repo. Migrasi ini
--  hanya membacanya saat job berjalan.
--
--  Catatan keamanan: token ini hanya bisa memicu workflow di
--  repo ini. Kalau bocor, orang lain bisa menjalankan
--  notifikasi lebih sering -- tidak bisa membaca data atau
--  mengubah kode.
-- =========================================================

-- ---------------------------------------------------------
--  1. Fungsi pemicu
--
--  SECURITY DEFINER dipakai supaya fungsi bisa membaca Vault
--  walau dipanggil oleh peran cron. search_path dikunci ke
--  schema yang pasti supaya tidak bisa dibajak objek bernama
--  sama di schema lain.
-- ---------------------------------------------------------

create or replace function public.picu_notify_github()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net, pg_temp
as $$
declare
    token   text;
    req_id  bigint;
begin

    -- Ambil token dari Vault. Kalau belum diisi, jangan diam
    -- diam gagal -- lempar galat supaya kelihatan di
    -- cron.job_run_details.
    select decrypted_secret
      into token
      from vault.decrypted_secrets
     where name = 'github_dispatch_token';

    if token is null or length(trim(token)) = 0 then
        raise exception
            'Token GitHub belum ada di Vault (nama: github_dispatch_token)';
    end if;

    select net.http_post(

        -- Endpoint untuk memicu workflow. Nama file workflow
        -- dipakai, bukan ID, supaya tetap benar walau ID
        -- berubah setelah workflow diubah.
        url := 'https://api.github.com/repos/Belliond/task-vault/actions/workflows/notify.yml/dispatches',

        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || token,
            'Accept', 'application/vnd.github+json',
            'X-GitHub-Api-Version', '2022-11-28',
            'Content-Type', 'application/json',
            -- GitHub MENOLAK permintaan tanpa User-Agent.
            'User-Agent', 'task-vault-pg-cron'
        ),

        -- Input workflow: mode harian, tanpa dry-run, dan
        -- salinan Telegram tetap dikirim (sesuai keputusan
        -- menyimpannya sebagai arsip).
        body := jsonb_build_object(
            'ref', 'main',
            'inputs', jsonb_build_object(
                'mode', 'harian',
                'dry_run', 'false',
                'uji', 'false',
                'tunggu', 'false',
                'kirim_telegram', 'true',
                'tanggal', ''
            )
        ),

        timeout_milliseconds := 10000

    ) into req_id;

    return req_id;

end;
$$;

comment on function public.picu_notify_github() is
    'Memicu workflow Notify Tugas lewat GitHub API. Token dibaca dari Vault.';

-- Hanya peran internal yang perlu memanggil ini. Browser
-- (anon/authenticated) tidak boleh bisa memicunya sendiri,
-- karena itu akan mengirim notifikasi ke WhatsApp pemilik.
revoke all on function public.picu_notify_github() from public;
revoke all on function public.picu_notify_github() from anon, authenticated;


-- ---------------------------------------------------------
--  2. Jadwal
--
--  pg_cron memakai UTC. 08.00 WIB = 01.00 UTC.
--
--  Dijadwalkan pada menit :07, bukan :00, karena menit bulat
--  adalah saat paling sibuk. Bedanya 7 menit tidak berarti
--  untuk notifikasi harian, tapi mengurangi risiko antrean.
--
--  cron.schedule dengan nama job yang sama akan MENGGANTI
--  jadwal lama, bukan menambah. Jadi migrasi ini boleh
--  dijalankan berulang tanpa membuat job ganda.
-- ---------------------------------------------------------

select cron.unschedule('notify-tugas-pagi')
 where exists (
    select 1 from cron.job where jobname = 'notify-tugas-pagi'
 );

select cron.schedule(
    'notify-tugas-pagi',
    '7 1 * * *',
    $$select public.picu_notify_github()$$
);

comment on extension pg_cron is
    'Penjadwal notifikasi harian; job notify-tugas-pagi = 08.07 WIB.';


-- ---------------------------------------------------------
--  3. Pemeriksaan
--
--  Kalau migrasi berhasil, view ini menampilkan jadwal yang
--  aktif beserta hasil run terakhirnya. Berguna untuk
--  memastikan tanpa harus membuka dashboard.
-- ---------------------------------------------------------

create or replace view public.status_jadwal_notify as
select
    j.jobid,
    j.jobname,
    j.schedule,
    j.active,
    r.status          as hasil_terakhir,
    r.return_message  as pesan_terakhir,
    r.start_time      as terakhir_jalan
from cron.job j
left join lateral (
    select status, return_message, start_time
      from cron.job_run_details d
     where d.jobid = j.jobid
     order by d.start_time desc
     limit 1
) r on true
where j.jobname = 'notify-tugas-pagi';

comment on view public.status_jadwal_notify is
    'Jadwal notifikasi harian + hasil run terakhirnya.';

grant select on public.status_jadwal_notify to anon, authenticated;
