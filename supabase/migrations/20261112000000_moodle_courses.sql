-- =========================================================
--  DAFTAR MATA KULIAH MOODLE YANG DIKENAL SERVER
--
--  Sama seperti classroom_courses: panel filter di halaman
--  web tidak boleh bergantung pada token di browser. Server
--  menyimpan mata kuliah yang dilihatnya saat sync, lalu
--  halaman web cukup membacanya.
--
--  Isinya BUKAN rahasia: hanya id dan nama mata kuliah.
-- =========================================================

create table if not exists public.moodle_courses (

    course_id  text primary key,

    name       text not null default '',

    seen_at    timestamptz not null default now()

);

alter table public.moodle_courses disable row level security;

drop policy if exists "read moodle courses" on public.moodle_courses;

comment on table public.moodle_courses is
    'Daftar mata kuliah Moodle hasil sync, dipakai halaman web '
    'untuk menampilkan pilihan filter tanpa perlu token di browser.';
