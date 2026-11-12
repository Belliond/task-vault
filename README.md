# Ghost Task Matrix

Dashboard tugas akademik bertema cyber/terminal. Frontend statis (HTML + CSS +
JS, tanpa build step), data di **Supabase**, tugas bisa ditarik otomatis dari
**Moodle** dan **Google Classroom**.

```
index.html          Markup (navbar, halaman-halaman, 3 modal)
script.js           Seluruh logika aplikasi
style.css           Tema + responsif
three-bg.js         Latar 3D kinetik (Three.js, opsional)
pointer-tilt.js     Efek tilt kartu/navbar mengikuti kursor
config.js           DI-GENERATE dari .env (tidak di-commit)
.env                Kredensial lokal (tidak di-commit)
.env.example        Template .env (di-commit)
SUPABASE_SETUP.sql  Setup sekali-jalan lewat SQL Editor (cara cepat)
supabase/           Migrasi versi terkontrol (cara yang disarankan)
scripts/            Generator config.js dan SUPABASE_SETUP.sql
```

## Struktur halaman

Aplikasi memakai satu **navbar horizontal** yang menempel di atas
(`position: sticky`). Tidak ada sidebar lagi, dan tidak ada halaman hero
pembuka — aplikasi langsung terbuka di Beranda.

| Halaman | Isi |
|---|---|
| **Beranda** (`#homePage`) | Dua kartu statistik (TOTAL TASKS, PRIORITY), direktori mata kuliah, lalu **kalender deadline** di bagian paling bawah |
| **Tasks** (`#taskListSection`) | Semua tugas, dikelompokkan per mata kuliah |
| **Schedule** (`#scheduleSection`) | Tabel jadwal kuliah |
| **Sync** (`#syncSection`) | Koneksi Moodle & Google Classroom |
| **Detail matkul** (`#courseDetailSection`) | Semua tugas satu mata kuliah; dibuka dari Beranda, bukan dari navbar |

Semua halaman adalah `<section class="page-view">` datar di dalam satu
`<main>`. Hanya satu yang terlihat pada satu waktu (class `.hidden`), dan
`script.js` memusatkan perpindahannya di `showPage()`.

Kalender **tidak lagi jadi halaman sendiri** dan tidak ada di navbar: grid
bulanan, kontrol bulan, dan daftar tugas tanggal terpilih semuanya berada di
blok `.calendar-block` di ujung Beranda. Karena itu `renderCalendar()` ikut
dipanggil dari `refreshActiveView()` setiap kali data selesai dimuat.

Tombol **+ ADD TASK** hanya ada di halaman Tasks dan halaman detail matkul
(tombol di navbar dan blok merek `</> ANON GRID` sudah dihapus) dan membuka
`#addTaskModal`. Modal itu sengaja berada di level `<body>`, bukan di
dalam `<main>`: `.main-content` memakai `z-index: 3` sehingga membentuk
*stacking context* sendiri, dan modal di dalamnya akan terkurung di bawah
navbar.

**Kartu tugas dipakai di tiga tempat** — daftar semua tugas, halaman detail
matkul, dan daftar tanggal di kalender. Ketiganya memakai `createTaskCard()`
yang sama, dan `refreshActiveView()` menyegarkan halaman yang sedang terbuka
setiap kali `loadTasks()` selesai.

---

## Quick start

```bash
npm install                 # Supabase CLI (opsional, hanya untuk migrasi)
copy .env.example .env      # lalu isi SUPABASE_URL + SUPABASE_KEY
npm run dev                 # http://localhost:5173
```

`npm run dev` otomatis menjalankan `env:build` lebih dulu, lalu menyalakan
server statis dari `scripts/serve.mjs`. Server itu hanya memakai modul bawaan
Node, jadi tetap jalan tanpa koneksi internet.

Alias: `npm start` dan `npm run serve` sama dengan `npm run dev`.

Setup database (sekali saja) ada di bagian [Setup database](#setup-database).

---

## Konfigurasi (.env)

Kredensial **tidak lagi ditulis di `script.js`**. Semuanya masuk lewat `.env`,
lalu di-generate menjadi `config.js` yang dibaca browser.

### 1. Buat file .env

```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
```

### 2. Isi nilainya

Buka `.env`, isi minimal dua baris ini (dari **Project Settings → API**):

```ini
SUPABASE_URL=https://<REF>.supabase.co
SUPABASE_KEY=<publishable / anon key>
```

Opsional:

```ini
MOODLE_URL=https://kuliah2.itera.ac.id     # default kolom Site URL
CLASSROOM_CLIENT_ID=<...apps.googleusercontent.com>
CLASSROOM_REDIRECT=                        # kosong = otomatis dari URL halaman
```

Khusus migrasi database (**tidak** dibaca browser):

```ini
SUPABASE_DB_PASSWORD=<password database>
SUPABASE_DB_URL=                           # opsional, biarkan kosong
```

`SUPABASE_DB_URL` **tidak perlu diisi** — script mencari server otomatis. Isi hanya
kalau pencarian otomatis gagal, dengan connection string dari
**Dashboard → tombol `Connect` → tab `Session pooler`** (harus diawali `postgresql://`,
bukan `https://`).

### 3. Generate config.js

```bash
npm run env:build
```

Perintah ini menulis `config.js`. Jalankan ulang setiap kali `.env` berubah.

> **Keduanya ter-gitignore.** Yang di-commit hanya `.env.example` tanpa nilai.
> Kalau `config.js` belum ada, aplikasi tetap terbuka dan menampilkan instruksi
> setup di area daftar tugas — tidak gagal tanpa penjelasan.

### Peringatan rahasia

Semua nilai di `.env` **berakhir di browser** dan bisa dibaca siapa pun yang
membuka web. Generator menolak `service_role` / `sb_secret_...` secara otomatis.
Yang benar-benar rahasia hanya boleh ada di sisi server.

---

## Deploy (GitHub Pages)

Karena `config.js` tidak di-commit, situs produksi tidak akan punya file itu
kalau memakai "Deploy from a branch". Karena itu ada workflow
`.github/workflows/deploy.yml` yang membuat `config.js` dari **GitHub Secrets**
saat deploy.

1. **Settings → Secrets and variables → Actions**, tambahkan:

   | Secret | Wajib | Isi |
   |---|---|---|
   | `SUPABASE_URL` | ya | `https://<REF>.supabase.co` |
   | `SUPABASE_KEY` | ya | publishable / anon key |
   | `MOODLE_URL` | tidak | default Site URL |
   | `CLASSROOM_CLIENT_ID` | tidak | OAuth client ID |
   | `CLASSROOM_REDIRECT` | tidak | kosong = otomatis |

2. **Settings → Pages → Source**: pilih **GitHub Actions**
   (bukan "Deploy from a branch").

3. Push ke `main`. Workflow membangun `config.js`, memverifikasinya, lalu
   menerbitkan situs.

### Kalau situs terbit tapi kosong

Gejalanya: Beranda menampilkan **"Could not load courses"**, kartu statistik
menampilkan `—`, dan badge kalender berbunyi **DATA UNAVAILABLE**. Artinya
`config.js` tidak ada, jadi aplikasi tidak punya URL/key Supabase.

1. Cek `https://<user>.github.io/<repo>/config.js`. Kalau **404**, file itu
   memang tidak pernah dibuat.
2. Buka **Actions → Deploy to GitHub Pages**. Kalau gagal di step
   *Check required secrets*, berarti `SUPABASE_URL` / `SUPABASE_KEY` belum
   diisi — lihat langkah 1 di atas.
3. Pastikan **Settings → Pages → Source** sudah **GitHub Actions**. Kalau
   masih "Deploy from a branch", situs terbit dari branch tanpa `config.js`.
4. Setelah secret diisi, jalankan **Re-run all jobs** (atau push commit baru).

Aplikasi sengaja membedakan "tidak ada tugas" dari "data gagal dimuat", supaya
halaman kosong tidak terbaca sebagai "memang tidak ada deadline".

---

## Setup database

Ada dua cara. Pilih **salah satu**.

### Cara A — `npm run db:push` (tanpa CLI, disarankan)

Script ini konek langsung ke Postgres memakai password database. Tidak perlu
`supabase login` dan tidak menyentuh schema `supabase_migrations`.

**1. Isi password database di `.env`:**

```ini
SUPABASE_DB_PASSWORD=password-database-anda
```

Ambil / reset di **Dashboard → Project Settings → Database → Reset database password**.

**2. Jalankan:**

```bash
npm install            # memasang driver pg
npm run db:check       # cek koneksi saja, tidak menulis apa pun
npm run db:push        # jalankan semua migrasi
```

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run db:check` | Uji koneksi + tampilkan kondisi tabel/fungsi |
| `npm run db:dry` | Tampilkan file migrasi tanpa mengeksekusi |
| `npm run db:push` | Jalankan semua migrasi |

Script otomatis mencari region project (direct, lalu pooler beberapa region).
Kalau pencarian otomatis gagal, isi `SUPABASE_DB_URL` di `.env` dengan
connection string dari **Dashboard → tombol `Connect` → tab `Session pooler`**.

> **Password ini hanya untuk migrasi.** Tidak pernah masuk `config.js` dan
> tidak dikirim ke browser. Boleh dikosongkan lagi setelah migrasi selesai.

### Cara B — Supabase CLI

```bash
npm install
npx supabase login
npx supabase link --project-ref <REF>   # REF dari URL dashboard
npx supabase db push        # menjalankan semua migrasi
```

### Cara C — SQL Editor (tanpa terminal)

Buka **Supabase Dashboard → SQL Editor**, paste seluruh isi
`SUPABASE_SETUP.sql`, lalu **Run**. File itu menggabungkan keenam migrasi di
atas dalam satu skrip.

`SUPABASE_SETUP.sql` adalah **artefak hasil generate** — jangan diedit manual.
Setiap kali migrasi berubah, jalankan `npm run db:sql` untuk membangun ulang.

### Isi migrasi

Migrasi dijalankan berurutan dari `supabase/migrations/`:

| File | Isi |
|---|---|
| `..._baseline_tasks.sql` | Tabel `tasks`, matikan RLS (mode bersama), hapus `user_id` |
| `..._lms_sync_columns.sql` | Kolom `source`/`external_id`/`synced_at`/`dismissed_at`, index anti-dobel |
| `..._normalize_task_status.sql` | Normalisasi status + `CHECK` constraint |
| `..._enable_realtime.sql` | Daftarkan tabel ke publication `supabase_realtime` |
| `..._sync_upsert_batch.sql` | Fungsi `sync_lms_tasks(jsonb)` untuk upsert batch |
| `..._status_default_pending.sql` | Default kolom `status` jadi `'Pending'` |

Semua idempoten — aman dijalankan berulang.

Hasil yang diharapkan: `Success. No rows returned`.

### Verifikasi

```sql
-- kolom harus lengkap
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'tasks'
 order by ordinal_position;

-- hanya boleh ada tiga nilai ini
select status, count(*) from public.tasks group by status;

-- fungsi upsert batch harus ada (dipakai kedua sync)
select proname from pg_proc where proname = 'sync_lms_tasks';
```

---

## Menjalankan secara lokal

```bash
npm run dev          # http://localhost:5173
```

Kalau port 5173 sedang dipakai:

```powershell
$env:PORT=5174; npm run dev
```

Redirect OAuth Google Classroom diturunkan dari `window.location`, jadi
localhost otomatis terpakai sebagai redirect URI. Tambahkan URL itu ke
*Authorized redirect URIs* di Google Cloud Console.

---

## Notifikasi popup

`showToast()` di `script.js` menampilkan notifikasi singkat (sukses, error,
peringatan) sebagai popup **di tengah layar**, bukan di pojok. Container
`.toast-container` memakai `position: fixed; inset: 0` dengan flex
`center/center`, dan `pointer-events: none` supaya tidak pernah menghalangi
klik ke elemen di bawahnya. Toast muncul dengan animasi membesar dari
tengah (`translateY(10px) scale(0.92)` → `scale(1)`), bukan meluncur dari
samping.

---

## Latar 3D (three-bg.js)

Seluruh halaman punya lapisan bentuk geometris yang mengapung dan
berputar pelan di belakang konten. Dibuat dengan **Three.js** dan
dimuat dari CDN, jadi tidak ada build step dan tidak ada dependency
yang perlu di-`npm install`.

| Berkas | Isi |
|---|---|
| `three-bg.js` | Modul latar 3D (mandiri, tidak menyentuh logika aplikasi) |
| `pointer-tilt.js` | Efek tilt kartu/navbar mengikuti kursor |
| `<canvas id="bg3dStage">` | Elemen sasaran di `index.html`, `aria-hidden`, anak langsung `<body>` |

Bentuknya adalah terjemahan 3D dari bahasa visual Dark Neobrutalism:
isi warna solid, garis tepi tebal, dan hard shadow tanpa blur. Tiap
objek terdiri dari empat lapisan — hard shadow, isi, outline, dan garis
lipatan.

**Lapisan biner.** Selain 6 bentuk besar, ada **126 sprite** teks `0`/`1`
yang tersebar di seluruh layar (`GLYPH_COUNT`). Sprite dipakai, bukan mesh
bidang, karena selalu menghadap kamera tanpa perlu dirotasi manual dan
satu tekstur 64×64 bisa dipakai bersama. Sebarannya memakai PRNG
deterministik (seed tetap) supaya tata letak tidak berubah tiap reload.
Glyph mengapung pelan **dan** bergeser saat kursor bergerak; nilai
`depth` per sprite membuat lapisan depan bergerak lebih jauh daripada
lapisan belakang sehingga muncul kesan parallax.

**Efek tilt (`pointer-tilt.js`).** Kartu (`.course-card`, `.task-card`,
`.stat-card`, `.calendar-card`, `.sync-card`, `.task-group-header`) dan
navbar/nav-link sedikit "menoleh" mengikuti posisi kursor, maksimum
1.6–6 derajat dengan `perspective(900px)`. Listener dipasang **satu kali
di `document`** dengan `closest()`, bukan per elemen: kartu tugas dibuat
ulang setiap kali data berubah, jadi listener per elemen akan hilang pada
kartu baru. Tilt dilepas saat `pointerdown` agar efek `:active` tetap
terlihat, dan tidak aktif sama sekali pada perangkat sentuh maupun saat
`prefers-reduced-motion: reduce`.

**Batas versi Three.js.** Dipin ke `0.160.1`, yaitu versi **UMD
terakhir**. Mulai r161, `build/three.min.js` dihapus dari paket npm
sehingga tidak bisa lagi dimuat lewat `<script>`. Jangan naikkan versi
tanpa pindah ke ES module.

**Guard yang terpasang** (semuanya tidak ada di situs referensi):

| Kondisi | Perilaku |
|---|---|
| `THREE` gagal dimuat / CDN diblokir | Canvas disembunyikan, aplikasi jalan normal |
| WebGL tidak tersedia | Sama seperti di atas |
| `prefers-reduced-motion: reduce` | Bentuk tetap tampil, tetapi diam (satu frame); tilt nonaktif |
| Tab tidak aktif / canvas off-screen | Animasi dijeda |
| Lebar < 700px | 3 objek (bukan 6), ~53 glyph (bukan 126), `pixelRatio` ≤ 1.25, ~30 fps |
| Perangkat sentuh | Tilt nonaktif (tidak ada hover) |

`pointer-events: none` dan `aria-hidden="true"` membuat lapisan ini
tidak pernah menangkap klik maupun masuk pohon aksesibilitas.

**Kenapa canvas tidak dipindah-pindah lagi.** Versi sebelumnya memindahkan
`<canvas>` ke dalam `<section>` yang sedang tampil, karena tiap halaman punya
latar foto opaque (`BackGround.webp`) yang akan menutupi canvas di belakangnya.
Akibatnya dekorasi 3D hanya terlihat di halaman awal dan hilang begitu masuk
dashboard. Sekarang latar foto dipindah ke `<body>` — satu lapisan untuk semua
halaman — sehingga canvas bisa **menetap sebagai anak `<body>`** dengan
`position: fixed`. Urutan lapisannya:

```
body            foto + veil gelap
.bg3d-stage     bentuk 3D          (z-index 1)
.page-decor     teks biner/error   (z-index 0, fixed)
.main-content   konten             (z-index 3)
.navbar         navigasi           (z-index 100)
.modal          dialog             (z-index 100, anak <body>)
```

**Transparansi latar.** Veil gelap di `body` memakai
`linear-gradient(rgba(4,12,9,0.62), rgba(2,7,6,0.76))` (sebelumnya 0.80/0.88)
dan permukaan kartu memakai warna semi-transparan (`--panel: rgba(14,26,21,0.84)`,
`--bg-secondary: rgba(11,20,16,0.88)`, `--panel-raised: rgba(18,33,26,0.88)`),
sehingga foto latar dan bentuk 3D terlihat menembus kartu. Kontras teks tetap
aman: `--text` di atas panel 84% masih jauh di atas ambang WCAG AA. Dekorasi
teks biner/error diturunkan ke `opacity: 0.09` agar tidak ikut menutupi foto.

Peredupan 3D di halaman non-Beranda memakai class `.is-dim` yang dipasang
`three-bg.js` lewat `MutationObserver` pada atribut `class` tiap `.page-view`
— jadi modul itu tidak perlu diikat ke `script.js`.

**Catatan perawatan.** Jangan menambahkan `filter`, `transform`, atau
`will-change` pada elemen leluhur `.bg3d-stage` (termasuk `body`). Properti itu
menciptakan *containing block* untuk keturunan `position: fixed`, sehingga
canvas latar ikut tergulir dan ukurannya melar mengikuti tinggi halaman alih-alih
viewport. Ini pernah terjadi dengan `filter: saturate(1.2)` yang kini sudah
dihapus.

---

## Integrasi LMS

### Moodle

Dua jalur, keduanya menyimpan token di `localStorage` browser (tidak pernah
dikirim ke server lain):

- **Username + password** → `/login/token.php` (untuk akun dengan password lokal)
- **SSO Google** → `launch.php` → decode link `moodlemobile://token=...`
  (untuk akun kampus yang hanya bisa login Google)

### Google Classroom

OAuth 2.0 *implicit flow*, client-side. Butuh OAuth Client ID milik sendiri:

1. Google Cloud Console → aktifkan **Google Classroom API**
2. Credentials → OAuth client ID → **Web application**
3. *Authorized JavaScript origins*: `https://belliond.github.io`
4. *Authorized redirect URIs*: `https://belliond.github.io/task-vault/`
5. OAuth consent screen → **Test users** → tambahkan akun yang akan sync

---

## Catatan keamanan

**RLS dimatikan secara sadar** untuk mode kelas tanpa login: siapa pun yang
membuka link boleh baca/tulis/hapus. Publishable key ada di `script.js` dan
terkirim ke browser, jadi siapa pun yang menemukan URL + key bisa mengubah isi
tabel.

Konsekuensi yang perlu diterima:

- Tidak ada isolasi antar pengguna — ini memang tujuannya.
- Satu orang iseng bisa mengosongkan ledger. Tidak ada rate limit.
- Tidak ada backup otomatis. Ekspor data secara berkala bila penting.

Kalau nanti butuh multi-user yang aman, aktifkan RLS + Supabase Auth dan
tambahkan kembali kolom `user_id`.

---

## Deploy

Push ke branch `main` → GitHub Pages menyajikan folder root. Tidak ada build
step. Halaman di-serve sebagai `https://belliond.github.io/task-vault/`.

Pastikan URL itu terdaftar di Google Cloud Console (lihat bagian Classroom),
dan `site_url` di `supabase/config.toml` sesuai.
