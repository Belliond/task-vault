-- =========================================================
--  UPSERT BATCH UNTUK SINKRONISASI LMS
--
--  Masalah sebelumnya: sync melakukan satu request HTTP per
--  tugas (N+1). Untuk 40 tugas berarti 40 round-trip, lambat
--  dan tidak atomik — kalau request ke-20 gagal, database
--  tertinggal setengah jadi.
--
--  Fungsi ini menyelesaikan semuanya dalam SATU panggilan:
--    - tugas baru  -> INSERT dengan status 'Pending'
--    - tugas lama  -> UPDATE data dasar saja
--
--  Status pilihan user (Pending / In Progress / Completed)
--  dan dismissed_at SENGAJA tidak ikut di-update. Kalau
--  ikut, setiap sync akan mengembalikan tugas yang sudah
--  diselesaikan atau disembunyikan user.
--
--  Mengapa perlu fungsi database, bukan upsert biasa?
--  PostgREST hanya bisa "update semua kolom yang dikirim".
--  Kalau status ikut dikirim agar baris baru valid, sync
--  akan menimpa status lama. ON CONFLICT DO UPDATE di sini
--  memisahkan keduanya: INSERT memakai 'Pending', sedangkan
--  UPDATE tidak menyentuh kolom status sama sekali.
-- =========================================================

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
            synced_at
        )
        values (
            item ->> 'course',
            item ->> 'class_name',
            (item ->> 'deadline')::date,
            item ->> 'category',
            -- Nilai baku eksplisit: default kolom DB masih
            -- 'Belum Dikerjakan' dan tidak boleh dipakai.
            'Pending',
            item ->> 'source',
            item ->> 'external_id',
            coalesce(
                (item ->> 'synced_at')::timestamptz,
                now()
            )
        )
        on conflict (source, external_id)
            where external_id is not null
        do update set
            course     = excluded.course,
            class_name = excluded.class_name,
            deadline   = excluded.deadline,
            category   = excluded.category,
            synced_at  = excluded.synced_at
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


-- Hanya boleh dipanggil dengan hak pemanggil (security invoker),
-- jadi aturan akses tabel tetap berlaku seperti biasa.
--
-- Role anon/authenticated hanya ada di Supabase. Di Postgres
-- biasa perintah GRANT akan gagal dan membatalkan seluruh
-- migrasi, jadi dijalankan hanya bila role-nya memang ada.
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
