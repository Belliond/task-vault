-- =========================================================
--  PENGINGAT DEADLINE + WAKTU SELESAI
--
--  deadline_reminder_at : penanda pengingat "3 jam sebelum
--      deadline" sudah dikirim, supaya tidak dobel tiap jam.
--  completed_at         : kapan tugas berubah jadi Completed.
--      Dibutuhkan digest Senin ("selesai minggu lalu"),
--      karena status saja tidak menyimpan waktu.
--
--  completed_at diisi trigger, bukan frontend: status bisa
--  berubah dari web maupun dari sync, dan trigger menjaga
--  keduanya konsisten.
-- =========================================================

alter table public.tasks
    add column if not exists deadline_reminder_at timestamptz;

alter table public.tasks
    add column if not exists completed_at timestamptz;


create or replace function public.isi_completed_at()
returns trigger
language plpgsql
as $$
begin

    if new.status = 'Completed' then

        -- Pertahankan waktu lama bila status tetap Completed.
        if tg_op = 'INSERT'
           or old.status is distinct from 'Completed' then

            new.completed_at := coalesce(new.completed_at, now());

        end if;

    else

        new.completed_at := null;

    end if;

    return new;

end;
$$;


drop trigger if exists tasks_completed_at on public.tasks;

create trigger tasks_completed_at
    before insert or update of status on public.tasks
    for each row execute function public.isi_completed_at();


revoke all on function public.isi_completed_at() from public;

do $$
begin

    if exists (select 1 from pg_roles where rolname = 'anon') then
        grant execute on function public.isi_completed_at() to anon;
    end if;

    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        grant execute on function public.isi_completed_at() to authenticated;
    end if;

end
$$;


comment on column public.tasks.deadline_reminder_at is
    'Kapan pengingat 3 jam sebelum deadline dikirim.';

comment on column public.tasks.completed_at is
    'Kapan status berubah menjadi Completed. NULL = belum selesai.';
