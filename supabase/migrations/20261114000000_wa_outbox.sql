-- =========================================================
--  ANTREAN KIRIM WHATSAPP (wa_outbox)
--
--  Kenapa perlu tabel ini?
--  Notifikasi tugas disusun di GitHub Actions, sedangkan
--  pengirim WhatsApp-nya adalah jembatan yang jalan di HP.
--  Runner GitHub tidak punya alamat yang bisa dihubungi HP,
--  jadi keduanya tidak bisa bicara langsung.
--
--  Perantara yang paling sederhana: tabel ini.
--      Actions  -> insert baris status 'menunggu'
--      Jembatan -> ambil baris, kirim, tandai 'terkirim'
--
--  Keuntungan lain: kalau HP mati saat notifikasi disusun,
--  pesannya tidak hilang. Begitu HP hidup, jembatan
--  mengambil antrean yang masih menunggu.
--
--  Catatan keamanan:
--  Tujuan pengiriman TIDAK dibaca dari tabel ini. Jembatan
--  selalu mengirim ke WA_BRIDGE_TUJUAN di .env. Jadi kalau
--  kunci publishable bocor (memang publik di web), penyusup
--  paling jauh hanya bisa menitipkan teks ke nomor pemilik
--  sendiri -- tidak bisa memakai nomor dummy untuk
--  mengirim ke orang lain.
-- =========================================================

create table if not exists public.wa_outbox (

    id          bigserial primary key,

    dibuat_at   timestamptz not null default now(),

    -- Teks yang akan dikirim apa adanya ke WhatsApp.
    pesan       text not null,

    -- menunggu | terkirim | gagal | kedaluwarsa
    status      text not null default 'menunggu',

    -- Berapa kali jembatan sudah mencoba mengirim.
    percobaan   integer not null default 0,

    terkirim_at timestamptz,

    -- Alasan gagal terakhir, untuk diperiksa kalau ada masalah.
    galat       text,

    -- Dari mana baris ini datang: 'notify', 'uji', dst.
    sumber      text
);


-- Batasi status supaya salah ketik tidak membuat baris
-- menggantung selamanya tanpa pernah diambil jembatan.
alter table public.wa_outbox
    drop constraint if exists wa_outbox_status_cek;

alter table public.wa_outbox
    add constraint wa_outbox_status_cek
    check (status in ('menunggu', 'terkirim', 'gagal', 'kedaluwarsa'));


-- Jembatan selalu menanyakan "yang menunggu, terlama dulu".
-- Indeks parsial menjaga permintaan itu tetap murah walau
-- tabel sudah berisi ribuan baris lama.
create index if not exists wa_outbox_menunggu_idx
    on public.wa_outbox (id)
    where status = 'menunggu';


comment on table public.wa_outbox is
    'Antrean pesan WhatsApp: ditulis GitHub Actions, dikirim jembatan di HP.';

comment on column public.wa_outbox.status is
    'menunggu = belum dikirim, terkirim = sudah, gagal = menyerah setelah 3 kali, kedaluwarsa = terlalu lama.';


-- RLS memang dimatikan di proyek ini, jadi akses diatur
-- lewat grant. Actions butuh insert; jembatan butuh select
-- dan update. Tidak ada yang perlu delete.
grant select, insert, update on public.wa_outbox
    to anon, authenticated;

grant usage, select on sequence public.wa_outbox_id_seq
    to anon, authenticated;
