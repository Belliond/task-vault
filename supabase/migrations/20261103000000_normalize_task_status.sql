-- =========================================================
--  SAMAKAN KOSAKATA STATUS
--
--  Versi lama menyimpan status berbahasa Indonesia
--  ("Belum Dikerjakan", "Sedang Dikerjakan", "Selesai"),
--  sedangkan form hanya mengenal tiga nilai baku. Akibatnya
--  <select> pada modal edit tidak punya <option> yang cocok:
--  nilainya kosong, form required tidak bisa disubmit, dan
--  status lama tertimpa saat user menekan simpan.
--
--  Migrasi ini memetakan semua varian ke nilai baku, lalu
--  memasang CHECK constraint supaya nilai asing tidak bisa
--  masuk lagi (dari aplikasi maupun dari SQL manual).
--
--  Idempoten: baris yang sudah baku tidak tersentuh.
-- =========================================================

update public.tasks
   set status = case lower(trim(status))

                    when 'selesai'          then 'Completed'
                    when 'sudah selesai'    then 'Completed'
                    when 'completed'        then 'Completed'
                    when 'complete'         then 'Completed'
                    when 'done'             then 'Completed'

                    when 'sedang dikerjakan' then 'In Progress'
                    when 'dikerjakan'        then 'In Progress'
                    when 'in progress'       then 'In Progress'
                    when 'progress'          then 'In Progress'
                    when 'proses'            then 'In Progress'

                    when 'belum dikerjakan'  then 'Pending'
                    when 'belum'             then 'Pending'
                    when 'pending'           then 'Pending'
                    when 'todo'              then 'Pending'
                    when 'to do'             then 'Pending'
                    when 'baru'              then 'Pending'

                    else 'Pending'
                end
 where status is null
    or status not in ('Pending', 'In Progress', 'Completed');


-- Jaga invarian di level database: tiga nilai ini saja.
do $$
begin

    if not exists (
        select 1
          from pg_constraint
         where conname = 'tasks_status_check'
           and conrelid = 'public.tasks'::regclass
    ) then

        alter table public.tasks
            add constraint tasks_status_check
            check (status in ('Pending', 'In Progress', 'Completed'));

    end if;

end
$$;
