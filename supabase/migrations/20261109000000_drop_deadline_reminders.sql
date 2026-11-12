-- =========================================================
--  HAPUS FITUR PENGINGAT DEADLINE
--  ---------------------------------------------------------
--  Fitur pengingat WhatsApp dihentikan atas permintaan
--  pemilik proyek, setelah pendaftaran WhatsApp Cloud API
--  terhambat bug verifikasi nomor di sisi Meta dan CallMeBot
--  menutup pendaftaran baru. Tidak ada jalur gratis yang
--  tersisa, jadi fitur dibuang seluruhnya alih-alih
--  dibiarkan setengah hidup.
--
--  Yang dihapus:
--    - tabel reminder_log (riwayat kirim + penjaga anti-dobel)
--    - tabel reminder_channel (nomor, jadwal, pengaturan jalur)
--    - semua fungsi pengirim, penilai jawaban gateway, dan
--      API panel di halaman SYNC
--    - trigger yang menghapus riwayat saat deadline berubah
--    - cron job "deadline-reminders"
--    - sisa respons HTTP pg_net, dan rahasia di Vault
--
--  Yang TIDAK dihapus:
--    - tabel tasks dan seluruh data tugas (tidak disentuh)
--    - extension pg_cron / pg_net. Keduanya hanya dibutuhkan
--      fitur ini, tapi membuang extension bisa memutus objek
--      lain yang tidak terlihat dari repo ini. Membiarkannya
--      tidak berefek apa pun: tanpa job aktif dan tanpa
--      konfigurasi, tidak ada satu pun request keluar.
--
--  Idempoten: aman dijalankan berulang.
-- =========================================================


-- =========================================================
--  1. HENTIKAN PENJADWAL
--  Job harus berhenti SEBELUM fungsinya dihapus, kalau tidak
--  cron akan gagal pada setiap jam dan menumpuk error.
--  cron.unschedule menerima nama job (teks) atau jobid; nama
--  dipakai supaya tidak bergantung pada nomor yang berubah.
-- =========================================================

do $$
declare
    r record;
begin

    if exists (
        select 1 from pg_extension where extname = 'pg_cron'
    ) then

        for r in
            select jobid
              from cron.job
             where jobname = 'deadline-reminders'
        loop
            perform cron.unschedule(r.jobid);
        end loop;

    end if;

end
$$;


-- =========================================================
--  2. HAPUS TRIGGER
--  Dibuang bersama fungsinya, supaya tidak ada trigger yang
--  menunjuk ke fungsi yang sudah tidak ada.
-- =========================================================

drop trigger if exists tasks_clear_reminders on public.tasks;


-- =========================================================
--  3. HAPUS FUNGSI
--  Urutan penting: pemanggil lebih dulu, baru yang dipanggil.
--  drop function tanpa daftar argumen hanya berhasil kalau
--  namanya unik; di sini semua nama memang unik.
-- =========================================================

drop function if exists public.reminder_last_test();
drop function if exists public.reminder_send_test();
drop function if exists public.reminder_channel_save(
    text, text, boolean, integer[], integer,
    text, text, text, text, integer, text
);
drop function if exists public.reminder_channel_get();
drop function if exists public.refresh_reminder_status();
drop function if exists public.run_deadline_reminders(boolean);
drop function if exists public.kirim_whatsapp(integer, text, text, date);
drop function if exists public.gateway_error(integer, text);
drop function if exists public.gateway_ok(integer, text);
drop function if exists public.format_deadline_message(text, text, date, integer);
drop function if exists public.url_encode(text);
drop function if exists public.tasks_clear_reminders_on_deadline_change();


-- =========================================================
--  4. HAPUS TABEL
--  reminder_log lebih dulu karena punya foreign key ke
--  reminder_channel. Data di dalamnya memang sengaja dibuang:
--  isinya hanya riwayat pengiriman yang tidak dipakai lagi.
-- =========================================================

drop table if exists public.reminder_log;
drop table if exists public.reminder_channel;


-- =========================================================
--  5. SISA DATA KELUAR
--  Respons HTTP yang masih tersimpan di pg_net dan rahasia di
--  Vault ikut dibersihkan supaya tidak ada token menganggur.
-- =========================================================

do $$
begin

    if exists (
        select 1 from pg_extension where extname = 'pg_net'
    ) then
        delete from net._http_response;
    end if;

    if exists (
        select 1 from pg_extension where extname = 'supabase_vault'
    ) then
        delete from vault.secrets
         where name in ('callmebot_apikey', 'meta_wa_token');
    end if;

end
$$;


-- =========================================================
--  6. VERIFIKASI
--  Gagal keras kalau masih ada sisa, supaya kesalahan tidak
--  lolos diam-diam.
-- =========================================================

do $$
declare
    sisa_tabel integer;
    sisa_fungsi integer;
    sisa_trigger integer;
begin

    select count(*) into sisa_tabel
      from information_schema.tables
     where table_schema = 'public'
       and table_name like 'reminder%';

    select count(*) into sisa_fungsi
      from pg_proc
     where pronamespace = 'public'::regnamespace
       and (proname like '%reminder%'
            or proname in ('kirim_whatsapp', 'gateway_ok', 'gateway_error',
                           'url_encode', 'format_deadline_message'));

    select count(*) into sisa_trigger
      from pg_trigger
     where not tgisinternal
       and tgname = 'tasks_clear_reminders';

    if sisa_tabel > 0 or sisa_fungsi > 0 or sisa_trigger > 0 then
        raise exception
            'Pembersihan belum tuntas: tabel=%, fungsi=%, trigger=%',
            sisa_tabel, sisa_fungsi, sisa_trigger;
    end if;

end
$$;
