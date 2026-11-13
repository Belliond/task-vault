-- =========================================================
--  ISI SOAL & SUBMISSION LMS
--
--  Sebelumnya tabel tasks hanya menyimpan judul + deadline.
--  Isi soal (description/intro) dan bukti pengumpulan
--  (status, waktu, nama berkas) tertinggal di Moodle /
--  Classroom, jadi harus dibuka satu per satu di situsnya.
--
--  Disimpan sebagai SATU kolom jsonb, bukan kolom terpisah:
--  bentuknya berbeda antar sumber (Classroom punya state
--  CREATED/TURNED_IN, Moodle punya status new/submitted),
--  dan UI hanya perlu menampilkannya apa adanya. Satu kolom
--  juga berarti sync tidak perlu diubah setiap kali ada
--  jenis data baru.
--
--  Bentuk yang dipakai sync:
--    {
--      "description": "isi soal",
--      "link": "https://...",
--      "submission": {
--        "state": "submitted" | "TURNED_IN" | "CREATED",
--        "submitted_at": "2026-11-04T05:22:53.778Z",
--        "files": [{ "name": "...", "url": "..." }]
--      }
--    }
--
--  Null untuk tugas manual.
-- =========================================================

alter table public.tasks
    add column if not exists lms_details jsonb;


-- Fungsi upsert yang sama, ditambah lms_details.
-- Status pilihan user dan dismissed_at tetap TIDAK disentuh.

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
            course      = excluded.course,
            class_name  = excluded.class_name,
            deadline    = excluded.deadline,
            category    = excluded.category,
            synced_at   = excluded.synced_at,
            -- coalesce, BUKAN excluded langsung: sync manual dari
            -- browser belum mengirim lms_details, dan tanpa ini
            -- setiap tombol SYNC akan menghapus isi soal yang
            -- sudah diambil sync server.
            lms_details = coalesce(
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
