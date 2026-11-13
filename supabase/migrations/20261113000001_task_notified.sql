-- =========================================================
--  PENANDA NOTIFIKASI TELEGRAM
--
--  Notifier harian mengirim tugas LMS yang belum pernah
--  diberitahukan, lalu mengisi notified_at. Tanpa kolom ini,
--  tugas yang sama akan dikirim ulang setiap hari.
--
--  Baris lama diisi now() supaya isi database saat fitur ini
--  dipasang tidak langsung membanjiri Telegram. Mulai sekarang
--  hanya baris baru (notified_at null) yang dianggap baru.
-- =========================================================

alter table public.tasks
add column if not exists notified_at timestamptz;

update public.tasks
set notified_at = now()
where notified_at is null;

comment on column public.tasks.notified_at is
    'Kapan tugas baru dikirim ke Telegram. NULL = belum dikirim.';
