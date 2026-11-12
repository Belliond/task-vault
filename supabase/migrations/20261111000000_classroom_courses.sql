-- =========================================================
--  DAFTAR KELAS CLASSROOM YANG DIKENAL SERVER
--
--  Masalah yang diperbaiki: panel filter di halaman web dulu
--  mengambil daftar kelas dari token OAuth browser, yang hanya
--  berlaku ~1 jam. Akibatnya user harus "hubungkan manual"
--  dulu setiap kali ingin mengatur filter — padahal server
--  sudah tahu daftar kelasnya tiap 4 jam.
--
--  Sekarang scripts/sync-lms.mjs menulis daftar kelas yang
--  dilihatnya ke tabel ini, dan halaman web cukup membacanya.
--  Tidak perlu token apa pun di browser.
--
--  Isinya BUKAN rahasia: hanya id dan nama kelas.
-- =========================================================

create table if not exists public.classroom_courses (

    course_id    text primary key,

    name         text not null default '',

    section      text not null default '',

    -- ACTIVE / PROVISIONED / ARCHIVED, apa adanya dari Google.
    course_state text not null default '',

    -- Kapan terakhir kelas ini terlihat oleh sync.
    seen_at      timestamptz not null default now()

);

alter table public.classroom_courses disable row level security;

drop policy if exists "read classroom courses" on public.classroom_courses;

comment on table public.classroom_courses is
    'Daftar kelas Classroom hasil sync, dipakai halaman web untuk '
    'menampilkan pilihan filter tanpa perlu token di browser.';
