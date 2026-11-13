-- =========================================================
--  JAM DEADLINE
--
--  tasks.deadline hanya menyimpan tanggal, sehingga tugas
--  yang due pukul 23.59 terlihat sama dengan yang due pagi.
--  Kolom terpisah (bukan mengubah deadline menjadi timestamptz)
--  dipilih supaya tanggal tetap bisa dipakai kalender, filter,
--  dan pengingat H-3 tanpa konversi zona tambahan.
--
--  NULL = tugas tanpa jam (all-day atau data lama).
-- =========================================================

alter table public.tasks
add column if not exists deadline_time time;


-- Upsert yang sama, ditambah deadline_time. Status pilihan user
-- dan dismissed_at tetap TIDAK disentuh.
create or replace function public.sync_lms_tasks(rows jsonb)
returns table (created integer, updated integer)
language plpgsql
security invoker
as $$
declare
    item        jsonb;
    v_inserted  boolean;
    v_created   integer := 0;
    v_updated   integer := 0;
begin

    for item in select * from jsonb_array_elements(rows)
    loop

        insert into public.tasks (
            course,
            class_name,
            deadline,
            deadline_time,
            category,
            status,
            source,
            external_id,
            synced_at,
            lms_details
        )
        values (
            item ->> 'course',
            item ->> 'class_name',
            (item ->> 'deadline')::date,
            nullif(item ->> 'deadline_time', '')::time,
            item ->> 'category',
            'Pending',
            item ->> 'source',
            item ->> 'external_id',
            coalesce(
                (item ->> 'synced_at')::timestamptz,
                now()
            ),
            item -> 'lms_details'
        )
        on conflict (source, external_id)
            where external_id is not null
        do update set
            course        = excluded.course,
            class_name    = excluded.class_name,
            deadline      = excluded.deadline,
            deadline_time = excluded.deadline_time,
            category      = excluded.category,
            synced_at     = excluded.synced_at,
            -- coalesce, BUKAN excluded langsung: sync manual dari
            -- browser belum mengirim lms_details, dan tanpa ini
            -- setiap tombol SYNC akan menghapus isi soal yang
            -- sudah diambil sync server.
            lms_details   = coalesce(
                excluded.lms_details,
                public.tasks.lms_details
            )
            -- status dan dismissed_at TIDAK disentuh.
        returning (xmax = 0) into v_inserted;

        if v_inserted then
            v_created := v_created + 1;
        else
            v_updated := v_updated + 1;
        end if;

    end loop;

    return query select v_created, v_updated;

end;
$$;


revoke all on function public.sync_lms_tasks(jsonb) from public;

do $$
begin

    if exists (select 1 from pg_roles where rolname = 'anon') then
        grant execute on function public.sync_lms_tasks(jsonb) to anon;
    end if;

    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        grant execute on function public.sync_lms_tasks(jsonb) to authenticated;
    end if;

end
$$;

comment on column public.tasks.deadline_time is
    'Jam deadline WIB. NULL = tanpa jam (all-day / data lama).';
