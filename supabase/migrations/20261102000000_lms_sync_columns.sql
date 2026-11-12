-- =========================================================
--  KOLOM PENDUKUNG SINKRONISASI LMS (MOODLE / CLASSROOM)
-- =========================================================

alter table public.tasks
    add column if not exists source text not null default 'manual',
    add column if not exists external_id text,
    add column if not exists synced_at timestamptz;

-- Tugas hasil sync yang "dihapus" user tidak benar-benar
-- dibuang. Sync berikutnya mencari baris berdasarkan
-- external_id; kalau barisnya hilang, tugas akan di-insert
-- ulang sehingga tombol DELETE tampak tidak berfungsi.
-- Karena itu baris hanya ditandai di sini lalu
-- disembunyikan dari daftar.
alter table public.tasks
    add column if not exists dismissed_at timestamptz;


-- =========================================================
--  ANTI-DOBEL
--  Sync yang berjalan berkali-kali (atau dari dua browser
--  sekaligus) tidak boleh menggandakan tugas. Index unik
--  parsial hanya berlaku untuk baris yang punya
--  external_id, sehingga tugas manual tidak terpengaruh.
-- =========================================================

drop index if exists tasks_user_id_idx;
drop index if exists tasks_user_source_external_idx;

create unique index if not exists tasks_source_external_idx
    on public.tasks (source, external_id)
    where external_id is not null;


-- Mempercepat query daftar (filter dismissed + urut deadline)
-- dan pencarian baris usang saat sync.
create index if not exists tasks_active_deadline_idx
    on public.tasks (deadline)
    where dismissed_at is null;

create index if not exists tasks_source_idx
    on public.tasks (source);
