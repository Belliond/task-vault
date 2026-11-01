-- =========================================================
--  GHOST TASK MATRIX — SETUP SUPABASE
--  MODE BERSAMA / TANPA LOGIN (web kelas untuk dibuka
--  bersama teman — semua orang dengan link boleh baca,
--  edit, dan hapus tugas).
--
--  Idempoten: boleh dijalankan berulang kapan saja.
--  Jalankan lewat: Supabase Dashboard → SQL Editor → Run
--  atau lewat koneksi pooler (psycopg/libpq).
--
--  URUTAN PENTING: policy dihapus BARU kolom user_id bisa
--  hilang, karena policy lama bergantung ke kolom itu.
-- =========================================================


-- =========================================================
--  BAGIAN 1: BUKA AKSES BERSAMA (TANPA LOGIN)
--  RLS dimatikan secara sadar: siapa pun yang membuka web
--  boleh baca/tulis/hapus. Semua policy lama dihapus supaya
--  tidak membingungkan kalau suatu saat RLS diaktifkan lagi.
-- =========================================================

alter table public.tasks disable row level security;

drop policy if exists "read own tasks" on public.tasks;
drop policy if exists "insert own tasks" on public.tasks;
drop policy if exists "update own tasks" on public.tasks;
drop policy if exists "delete own tasks" on public.tasks;
drop policy if exists "Enable read access for all users" on public.tasks;
drop policy if exists "Allow public insert" on public.tasks;
drop policy if exists "Allow anon update tasks" on public.tasks;
drop policy if exists "Allow public delete" on public.tasks;


-- =========================================================
--  BAGIAN 2: KOLOM PENDUKUNG SINKRONISASI LMS
--  Kolom user_id (sisa era login) dihapus — tidak dipakai
--  lagi di mode bersama ini.
-- =========================================================

alter table public.tasks
    drop column if exists user_id;

alter table public.tasks
    add column if not exists source text not null default 'manual',
    add column if not exists external_id text,
    add column if not exists synced_at timestamptz;

-- Buang index lama yang menempel di user_id (ikut hilang
-- saat kolomnya dihapus; baris di bawah hanya jaga-jaga).
drop index if exists tasks_user_id_idx;
drop index if exists tasks_user_source_external_idx;

-- Anti-dobel: sync Moodle yang berjalan berkali-kali (atau
-- dari dua browser sekaligus) tidak boleh menggandakan tugas.
create unique index if not exists tasks_source_external_idx
    on public.tasks (source, external_id)
    where external_id is not null;
