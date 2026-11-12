-- =========================================================
--  PENGATURAN SYNC OTOMATIS
--
--  Halaman web berjalan tanpa server dan tanpa token GitHub.
--  Menaruh token GitHub di browser berarti siapa pun yang
--  membuka situs bisa memicu workflow — dan token itu tidak
--  bisa dirahasiakan di halaman statis.
--
--  Karena itu pengaturan ditulis ke tabel ini lewat
--  publishable key (sama seperti tabel tasks), lalu dibaca
--  oleh scripts/sync-lms.mjs di GitHub Actions. Dengan begitu
--  tombol di web cukup mengubah data, bukan memegang rahasia.
--
--  Satu baris saja: id = 1. Baris itu dikunci lewat CHECK.
-- =========================================================

create table if not exists public.sync_settings (

    id              integer primary key default 1
                    check (id = 1),

    -- Kelas Classroom yang TIDAK ikut disinkronkan.
    -- Disimpan sebagai teks dipisah koma, sama seperti isi
    -- variabel CLASSROOM_EXCLUDE_COURSES, supaya satu bentuk
    -- bisa dipakai di UI maupun di skrip.
    classroom_exclude   text not null default '',

    -- Batasi hanya kelas ini. Kosong = semua kelas.
    classroom_only      text not null default '',

    -- Keterangan kapan terakhir diubah dari halaman web.
    updated_at      timestamptz not null default now(),

    updated_note    text

);

-- RLS dimatikan secara sadar, mengikuti tabel tasks: situs ini
-- memang berjalan tanpa login (mode kelas bersama).
alter table public.sync_settings disable row level security;

drop policy if exists "read sync settings" on public.sync_settings;
drop policy if exists "write sync settings" on public.sync_settings;

-- Baris tunggal. Dibuat kalau belum ada supaya skrip sync
-- tidak perlu menangani "tabel kosong".
insert into public.sync_settings (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------
--  Catatan: nilai di tabel ini BUKAN rahasia. Isinya hanya
--  daftar nama/id kelas yang tidak diinginkan. Yang tetap
--  rahasia (token Moodle, refresh token Google) tidak pernah
--  masuk ke tabel mana pun yang bisa dibaca browser.
-- ---------------------------------------------------------

comment on table public.sync_settings is
    'Pengaturan sync otomatis yang bisa diubah dari halaman web. '
    'Bukan rahasia: hanya daftar filter kelas.';
