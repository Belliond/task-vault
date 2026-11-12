-- =========================================================
--  SAMAKAN DEFAULT STATUS DI LEVEL KOLOM
--
--  Kolom status masih punya default lama 'Belum Dikerjakan'.
--  Aplikasi sekarang selalu mengirim status eksplisit, tapi
--  default yang salah tetap berbahaya: satu INSERT yang lupa
--  menyertakan status (dari SQL manual, atau kode lama) akan
--  langsung melanggar CHECK constraint dan gagal.
--
--  Setelah ini, default-nya 'Pending' sehingga aman.
-- =========================================================

alter table public.tasks
    alter column status set default 'Pending';


-- Pastikan tidak ada sisa nilai lama sebelum constraint aktif.
update public.tasks
   set status = 'Pending'
 where status is null
    or status not in ('Pending', 'In Progress', 'Completed');
