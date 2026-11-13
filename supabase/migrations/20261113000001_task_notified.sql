-- =========================================================
--  PENANDA NOTIFIKASI TELEGRAM
--
--  Notifier harian mengirim tugas LMS yang belum pernah
--  diberitahukan, lalu mengisi notified_at. Tanpa kolom ini,
--  tugas yang sama akan dikirim ulang setiap hari.
--
--  Backfill hanya saat kolom baru dibuat: isi database yang
--  sudah ada tidak boleh membanjiri Telegram. Kalau backfill
--  dijalankan setiap kali `npm run db:push`, tugas baru yang
--  belum sempat dikirim akan ikut ditandai dan hilang.
-- =========================================================

do $$
begin

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'tasks'
          and column_name = 'notified_at'
    ) then

        alter table public.tasks
        add column notified_at timestamptz;

        update public.tasks
        set notified_at = now()
        where notified_at is null;

    end if;

end
$$;

comment on column public.tasks.notified_at is
    'Kapan tugas baru dikirim ke Telegram. NULL = belum dikirim.';
