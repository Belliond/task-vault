-- =========================================================
--  AKTIFKAN REALTIME UNTUK TABEL TASKS
--
--  Aplikasi berlangganan perubahan tabel lewat WebSocket
--  (postgres_changes) supaya tugas yang ditambah/diubah/
--  dihapus teman langsung muncul tanpa reload.
--
--  Tanpa baris di publication ini, langganan tidak akan
--  pernah berbunyi — dan tidak memunculkan error apa pun,
--  sehingga sangat sulit didiagnosis. Karena itu bagian ini
--  dibuat sebagai migrasi, bukan langkah manual yang mudah
--  terlupa.
--
--  Catatan: publication supabase_realtime hanya ada di
--  proyek Supabase. Bila migrasi ini dijalankan pada
--  Postgres biasa, blok di bawah dilewati tanpa gagal.
-- =========================================================

do $$
begin

    if not exists (
        select 1
          from pg_publication
         where pubname = 'supabase_realtime'
    ) then

        raise notice 'Publication supabase_realtime tidak ada; realtime dilewati.';
        return;

    end if;


    if not exists (
        select 1
          from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = 'tasks'
    ) then

        alter publication supabase_realtime
            add table public.tasks;

        raise notice 'Tabel tasks ditambahkan ke publication supabase_realtime.';

    else

        raise notice 'Tabel tasks sudah ada di publication supabase_realtime.';

    end if;

end
$$;
