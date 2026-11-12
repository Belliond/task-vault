-- =========================================================
--  FILTER MATA KULIAH MOODLE
--
--  Sebelumnya hanya Classroom yang bisa diatur dari halaman
--  web. Moodle hanya bisa lewat secret MOODLE_COURSE_IDS yang
--  harus diubah di GitHub. Sekarang keduanya bisa diatur dari
--  halaman Sync.
--
--  Bentuknya sama dengan Classroom: teks dipisah koma berisi
--  id angka (Moodle memakai id numerik, mis. "1016").
-- =========================================================

alter table public.sync_settings
    add column if not exists moodle_only    text not null default '',
    add column if not exists moodle_exclude text not null default '';

comment on column public.sync_settings.moodle_only is
    'Bila diisi, hanya mata kuliah Moodle ini yang disinkronkan.';

comment on column public.sync_settings.moodle_exclude is
    'Mata kuliah Moodle yang tidak disinkronkan.';
