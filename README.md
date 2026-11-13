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
scripts/            Generator config.js, penerap migrasi, sync Moodle
.github/workflows/  deploy.yml (Pages) + sync.yml (sync otomatis)
```

## Struktur halaman

Aplikasi memakai satu **navbar horizontal** yang menempel di atas
(`position: sticky`). Tidak ada sidebar lagi, dan tidak ada halaman hero
pembuka — aplikasi langsung terbuka di Beranda.

| Halaman | Isi |
|---|---|
| **Beranda** (`#homePage`) | Dua kartu statistik (TOTAL TASKS, PRIORITY), direktori mata kuliah, lalu **kalender deadline** di bagian paling bawah |
| **Tasks** (`#taskListSection`) | Semua tugas, dikelompokkan per mata kuliah. Tiap kartu punya panel **SOAL & SUBMISSION** (isi soal, status pengumpulan, berkas, tautan ke LMS) yang diisi sync |
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

Khusus sinkronisasi otomatis Moodle (**tidak** boleh masuk browser, lihat
[Sync otomatis Moodle](#sync-otomatis-moodle)):

```ini
MOODLE_TOKEN=<token web service milik user>
MOODLE_COURSE_IDS=                         # opsional, mis. 968,970
MOODLE_EXCLUDE_COURSES=                    # opsional, mis. 968
```

Filter kelas/matkul **tidak perlu** diisi di sini. Atur dari halaman
**SYNC** → **01 SINKRONISASI OTOMATIS**; pilihannya disimpan di tabel
`sync_settings`. Kedua variabel di atas hanya untuk mengunci pengaturan dari
sisi server (menang atas database).

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
   | `MOODLE_TOKEN` | untuk sync otomatis | lihat [Sync otomatis Moodle](#sync-otomatis-moodle) |

   `MOODLE_TOKEN` **tidak** dipakai `deploy.yml` — hanya oleh `sync.yml`.
   Jangan menambahkannya ke `config.js`: apa pun yang masuk ke sana terkirim
   ke browser.

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
| `..._drop_deadline_reminders.sql` | Hapus sisa tabel pengingat |
| `..._sync_settings.sql` | Tabel `sync_settings` untuk filter dari halaman web |
| `..._classroom_courses.sql` | Tabel `classroom_courses` (daftar kelas) |
| `..._moodle_courses.sql` | Tabel `moodle_courses` (daftar matkul) |
| `..._moodle_filter.sql` | Kolom filter Moodle di `sync_settings` |
| `..._lms_details.sql` | Kolom `lms_details` (isi soal + submission), upsert ikut mengisinya |
| `..._task_notified.sql` | Kolom `notified_at` (penanda tugas baru sudah dikirim ke Telegram) |
| `..._deadline_time.sql` | Kolom `deadline_time` (jam deadline WIB), upsert ikut mengisinya |
| `..._reminder_digest.sql` | Kolom `deadline_reminder_at` + `completed_at`, trigger pengisi `completed_at` |

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

## PWA & mode offline

Aplikasi bisa dipasang ke home screen dan dibuka tanpa internet untuk
**membaca** data terakhir. Menulis (tambah/edit/hapus, sync, submit LMS)
tetap butuh koneksi.

| Berkas | Peran |
|---|---|
| `manifest.json` | `display: standalone`, ikon 192 & 512, `theme_color` |
| `icon-192.png`, `icon-512.png` | Ikon home screen (di-render dari `favicon.svg`) |
| `sw.js` | Service worker: shell HTML/CSS/JS + font/CDN |
| `script.js` | Menyimpan hasil query terakhir ke `localStorage` (`tasksCacheV1`) |

Cara kerja:

- **Shell**: `sw.js` menyimpan `index.html`, `style.css`, `script.js`,
  `three-bg.js`, `pointer-tilt.js`, ikon, dan `privacy.html` saat install.
- **Navigasi**: jaringan dulu supaya deploy baru langsung terlihat, lalu
  jatuh ke shell kalau offline.
- **Aset same-origin**: cache dulu, diperbarui di belakang.
- **Supabase tidak pernah di-cache.** Data basi di level HTTP lebih
  menyesatkan daripada pesan offline. Yang dipakai saat offline adalah
  salinan `localStorage` yang ditulis setiap `loadTasks()` berhasil.
- **`config.js` tidak di-cache** karena di-generate ulang tiap deploy dari
  secrets; kunci baru harus langsung berlaku.
- Saat `navigator.onLine === false`, `loadTasks()` langsung membaca cache
  tanpa menunggu timeout jaringan, dan form menolak menulis dengan pesan
  "Butuh internet untuk menyimpan perubahan."

Kalau mengubah `index.html`/`style.css`/`script.js`, naikkan nilai `CACHE`
di `sw.js` supaya perangkat lama tidak tertinggal versi lama.

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

**Lapisan biner.** Selain 6 bentuk besar, ada **168 sprite** teks `0`/`1`
yang tersebar di seluruh layar (`GLYPH_COUNT`). Sprite dipakai, bukan mesh
bidang, karena selalu menghadap kamera tanpa perlu dirotasi manual dan
satu tekstur bisa dipakai bersama. Sebarannya memakai PRNG deterministik
(seed tetap) supaya tata letak tidak berubah tiap reload. Glyph mengapung
pelan **dan** bergeser saat kursor bergerak; nilai `depth` per sprite
membuat lapisan depan bergerak lebih jauh daripada lapisan belakang
sehingga muncul kesan parallax.

Tiga hal yang menentukan glyph benar-benar terbaca — semuanya hasil
revisi setelah versi pertama hanya tampak sebagai kabut hijau samar:

| Faktor | Nilai | Alasan |
|---|---|---|
| Tekstur | kanvas 128×128, digit 82px | Saat sprite diskalakan ke ~40–80px di layar, tepi huruf tetap tajam |
| Lintasan gambar | halo (shadowBlur) → inti → stroke tebal | Halo saja menghasilkan kabut; inti + stroke membuat batang digit tegas |
| Warna | halo pekat + inti mint/cyan pucat | Inti hampir putih terbaca tetapi terlihat abu-abu; inti hijau jenuh justru kusam |

Selain itu ukuran glyph dinyatakan sebagai **fraksi tinggi layar**
(`screenScale`), lalu dikonversi ke satuan dunia per kedalaman di
`layout()`. Sebelumnya ukuran memakai satuan dunia langsung, sehingga
sprite di `z = -4.2` tampil sekitar tiga kali lebih kecil daripada di
`z = 0.2` — sebagian besar glyph jadi terlalu kecil untuk dibaca.

Masking canvas juga diubah: dulu pusat layar memakai `transparent 52%`
(alpha 0), sehingga glyph di tengah terhapus sama sekali. Sekarang pusat
hanya **dipudarkan** (alpha 0.30 → 1.00 di tepi), jadi glyph terlihat di
seluruh layar tanpa mengganggu judul.

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
| Lebar < 700px | 3 objek (bukan 6), ~71 glyph (bukan 168), glyph 15% lebih besar, opacity 0.85×, `pixelRatio` ≤ 1.25, ~30 fps |
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

Ada dua cara menarik tugas: **manual** lewat tombol di halaman SYNC, dan
**otomatis** lewat GitHub Actions. Moodle dan Classroom sama-sama bisa otomatis.

### Moodle

Token web service disimpan di `localStorage` browser dan tidak pernah dikirim
ke server lain. Dua jalur pengambilan token:

- **Username + password** → `/login/token.php` (untuk akun dengan password lokal)
- **Token manual** → login ke Moodle → *Preferences* → *Security keys*
  (`/user/managetoken.php`) → salin token untuk service `moodle_mobile_app`

> Jalur **SSO Google** (`launch.php`) masih ada di kode, tetapi di
> `kuliah2.itera.ac.id` alamat itu membalas **404** — plugin mobile tidak
> tersedia. Untuk akun yang hanya bisa login lewat Google, ambil token lewat
> halaman *Security keys* setelah login di browser.

### Google Classroom

Di browser, Classroom memakai OAuth 2.0 *implicit flow* client-side. Butuh
OAuth Client ID milik sendiri:

1. Google Cloud Console → aktifkan **Google Classroom API**
2. Credentials → OAuth client ID → **Web application**
3. *Authorized JavaScript origins*: `https://belliond.github.io`
4. *Authorized redirect URIs*: `https://belliond.github.io/task-vault/`
5. OAuth consent screen → **Test users** → tambahkan akun yang akan sync

Implicit flow **hanya** memberi access token berumur ~1 jam — tidak pernah
refresh token. Karena itu sync otomatis Classroom memakai jalur berbeda
(authorization code + PKCE), dijelaskan di bagian berikut.

---

## Sync otomatis Moodle

Tombol SYNC hanya berjalan kalau ada orang membuka situs dan mengkliknya. Agar
tugas baru masuk sendiri, `scripts/sync-lms.mjs` menjalankan pekerjaan yang sama
di server, dijadwalkan oleh `.github/workflows/sync.yml`.

### Cara kerjanya

1. `core_webservice_get_site_info` → memvalidasi token sekaligus mengambil `userid`
2. `core_enrol_get_users_courses` → daftar mata kuliah yang diikuti
3. `mod_assign_get_assignments` → tugas per mata kuliah (20 mata kuliah per permintaan)
4. Kirim semuanya dalam satu panggilan ke `sync_lms_tasks(rows)`

Fungsi database itu sudah ada sejak migrasi `20261105000000`. Ia **tidak**
menimpa `status` maupun `dismissed_at`, jadi tugas yang sudah Anda tandai
selesai atau sembunyikan tidak kembali menjadi *Pending* setiap kali sync jalan.

### Kenapa GitHub Actions, bukan cron di database

Database proyek ini memang punya `pg_cron` dan `pg_net`, dan keduanya terbukti
bisa memanggil keluar. Tetapi menunggu balasan HTTP **di dalam satu transaksi
Postgres tidak berhasil**: transaksi memakai snapshot tetap, sehingga baris
balasan yang ditulis `pg_net` di latar belakang tidak pernah terlihat. Sudah
diuji — hasilnya selalu `TIMEOUT`. Menunggunya butuh tiga fase cron terpisah
yang rapuh dan sulit diperiksa. Runner GitHub Actions lebih sederhana dan log
setiap jalannya bisa dibaca langsung.

### Setup (sekali saja)

**1. Ambil token Moodle**

1. Buka `https://kuliah2.itera.ac.id/user/managetoken.php` (login dulu)
2. Pada service `moodle_mobile_app`, klik **Request token** / salin token yang ada

**2. Isi Secrets di GitHub**

Settings → Secrets and variables → Actions → **New repository secret**:

| Nama | Nilai |
|---|---|
| `MOODLE_TOKEN` | token dari langkah 1 |
| `MOODLE_URL` | `https://kuliah2.itera.ac.id` |
| `SUPABASE_URL` | sama dengan yang dipakai deploy |
| `SUPABASE_KEY` | publishable / anon key |

**3. Jalankan sekali untuk membuktikan**

Tab **Actions** → **Sync LMS** → **Run workflow** → centang *dry run* dulu.
Dry run menampilkan daftar tugas yang akan ditulis tanpa menyentuh database.
Kalau hasilnya wajar, jalankan lagi tanpa centang.

### Menjalankan lokal

```bash
npm run sync:dry     # tampilkan saja
npm run sync         # tulis ke database
npm test             # uji fungsi murni + logika filter UI
```

Membaca `MOODLE_TOKEN` dari `.env`, atau dari environment kalau `.env` tidak ada.

### Hal yang perlu disadari

- **Semua mata kuliah ikut disinkronkan, kecuali yang Anda lepas centangnya.**
  Di browser Anda memilih mata kuliah lewat centang; di server tidak ada
  `localStorage`. Karena itu pilihan disimpan ke tabel `sync_settings` lewat
  halaman **SYNC** → **01 SINKRONISASI OTOMATIS**, dan skrip server membacanya.
  `MOODLE_COURSE_IDS=968,970` / `MOODLE_EXCLUDE_COURSES=968` tetap bisa dipakai
  di GitHub Secrets bila ingin mengunci pengaturan dari sisi server — nilainya
  menang atas database.
- **Deadline memakai zona `Asia/Jakarta`.** Runner GitHub berjalan di UTC,
  sedangkan kolom `deadline` bertipe `date`. Tanpa konversi, tugas yang
  deadline-nya lewat tengah malam WIB akan tercatat sehari lebih awal.
  Jam deadline disimpan terpisah di `deadline_time` (tipe `time`, WIB);
  `NULL` berarti tugas tanpa jam (all-day atau data lama).
- **Jadwal setiap 4 jam** pada menit `:17`, bukan `:00`. GitHub memperingatkan
  bahwa jadwal di awal jam paling sering tertunda atau dilewati saat beban
  tinggi. `workflow_dispatch` tidak terkena penundaan ini.
- **Jadwal berhenti sendiri setelah 60 hari tanpa aktivitas repo.** GitHub
  mengirim email pemberitahuan, dan tombol *Run workflow* tetap bisa dipakai
  kapan saja.
- **Tugas yang sudah lewat deadline dihapus** dari database saat sync, sama
  seperti perilaku tombol SYNC di browser. Tiap sumber hanya membersihkan
  barisnya sendiri — sync Moodle tidak pernah menyentuh baris Classroom.

---

## Sync otomatis Google Classroom

Berbeda dari Moodle, Classroom tidak punya token permanen. Access token-nya
mati dalam ~1 jam. Yang bisa bertahan adalah **refresh token**, dan itu hanya
diberikan oleh *authorization code flow* dengan `access_type=offline` — bukan
oleh implicit flow yang dipakai situs.

Karena itu ada dua hal terpisah:

- `scripts/classroom-auth.mjs` — dijalankan **sekali** oleh Anda, di komputer
  sendiri, untuk menangkap refresh token.
- `scripts/sync-lms.mjs` — menukar refresh token itu menjadi access token baru
  setiap kali sync jalan, lalu menarik daftar kelas dan tugas.

### Syarat yang tidak bisa dilewati

Project Google harus berstatus **In production**.

| Status | Umur refresh token |
|---|---|
| `Testing` | **mati setelah 7 hari** — sync otomatis akan berhenti sendiri |
| `In production` (belum diverifikasi) | tidak kedaluwarsa |

Selama masih `Testing`, Google sengaja mematikan refresh token setelah 7 hari.
Tidak ada cara memperpanjangnya dari sisi skrip. Ini bukan batasan kode, tapi
aturan Google.

Cara mengubahnya:

1. Buka <https://console.cloud.google.com/auth/audience>
2. Pastikan project yang benar sudah dipilih
3. Pada **Publishing status**, klik **Publish app** → konfirmasi

Konsekuensinya:

- Consent pertama menampilkan layar **"Google hasn't verified this app"**.
  Klik **Advanced** → **Go to … (unsafe)**. Ini normal untuk aplikasi pribadi.
- Batas **100 user** seumur project. Untuk satu akun, tidak masalah.
- **Tidak perlu** submit verifikasi, dan tidak ada biaya.

### Setup (sekali saja)

**1. Buat OAuth client KEDUA, tipe Desktop app**

<https://console.cloud.google.com/auth/clients> → **Create client** →
Application type **Desktop app** → Create.

> Ini client **kedua**, terpisah dari client yang dipakai situs. Jangan pakai
> ulang client situs: tipe **Web application** menolak redirect
> `http://127.0.0.1` dengan `redirect_uri_mismatch` — sudah diuji langsung ke
> server Google. Karena itu nama variabelnya juga berbeda (`CLASSROOM_SYNC_*`),
> supaya keduanya tidak saling menimpa.

Pastikan **Google Classroom API** sudah aktif:
<https://console.cloud.google.com/apis/library/classroom.googleapis.com>

**2. Isi `.env`**

```env
CLASSROOM_SYNC_CLIENT_ID=....apps.googleusercontent.com
CLASSROOM_SYNC_CLIENT_SECRET=...
```

**3. Ambil refresh token**

```bash
npm run classroom:auth
```

Skrip membuka browser, meminta izin, lalu mencetak `CLASSROOM_SYNC_REFRESH_TOKEN`.
Sebelum mencetak, skrip **langsung menguji** token itu ke Classroom API dan
menampilkan daftar kelas yang terlihat — jadi kalau ada yang salah (scope
kurang, API belum aktif, akun tanpa kelas), ketahuan saat itu juga.

**4. Simpan ke GitHub Secrets**

| Nama | Nilai |
|---|---|
| `CLASSROOM_SYNC_CLIENT_ID` | dari langkah 1 |
| `CLASSROOM_SYNC_CLIENT_SECRET` | dari langkah 1 |
| `CLASSROOM_SYNC_REFRESH_TOKEN` | dari langkah 3 |

**5. Buktikan dengan dry run**

Actions → **Sync LMS** → **Run workflow** → centang *dry run*. Log akan
menampilkan dua bagian terpisah, `--- Moodle ---` dan `--- Classroom ---`.

Hasil yang sudah pernah terbukti pada proyek ini (run `43294038151`, mode
tulis): `Tersimpan: 0 baru, 22 diperbarui` untuk Moodle dan
`Tersimpan: 1 baru, 1 diperbarui` untuk Classroom, lalu diverifikasi langsung
ke tabel `tasks` (24 baris: 22 `moodle` + 2 `classroom`).

### Kalau `Publish app` masih abu-abu

Tombol itu menuntut **homepage** dan **privacy policy** yang benar-benar bisa
dibuka publik. Keduanya sudah disediakan repo ini:

- `https://belliond.github.io/task-vault/`
- `https://belliond.github.io/task-vault/privacy.html`

Isi di **Google Auth Platform → Branding → App domain**. Jangan unggah logo:
halaman itu sendiri memperingatkan logo memicu kewajiban verifikasi tambahan.

### Kenapa perlu DUA OAuth client

| Client | Tipe | Dipakai oleh |
|---|---|---|
| `CLASSROOM_CLIENT_ID` | Web application | tombol sync di halaman web |
| `CLASSROOM_SYNC_CLIENT_ID` | **Desktop app** | GitHub Actions |

Client `Web application` **menolak** redirect `http://127.0.0.1` dengan
`redirect_uri_mismatch` — diuji langsung ke server Google, bukan diasumsikan.
Karena itu pengambilan refresh token mustahil memakai client situs, dan nama
variabelnya sengaja dipisah supaya keduanya tidak saling menimpa.

### Kalau refresh token mati

Gejalanya: log berhenti dengan `invalid_grant`. Penyebab tersering adalah
project masih `Testing` dan sudah lewat 7 hari. Perbaiki dengan
**Publish app**, lalu jalankan `npm run classroom:auth` sekali lagi dan
perbarui secret-nya.

### Batasan yang perlu diketahui

- **Filter kelas dan mata kuliah diatur dari halaman Sync, bukan dari secret.**
  Buka menu **SYNC**. Di bagian **01 SINKRONISASI OTOMATIS** ada dua daftar:
  kelas Classroom dan mata kuliah Moodle. Yang tidak dicentang akan dilewati,
  dan tugasnya yang sudah tersimpan dihapus pada sync berikutnya. Pilihan
  disimpan di tabel `sync_settings`, jadi berlaku untuk semua perangkat dan
  tidak hilang saat browser dibersihkan.
  Daftar kelas/matkul di halaman itu **tidak perlu** menghubungkan akun:
  server menyimpannya di tabel `classroom_courses` dan `moodle_courses` setiap
  kali sync berjalan.
- **Secret tetap bisa dipakai untuk mengunci pengaturan dari server.**
  `CLASSROOM_EXCLUDE_COURSES`, `CLASSROOM_COURSE_IDS`, `MOODLE_COURSE_IDS`, dan
  `MOODLE_EXCLUDE_COURSES` — bila diisi, nilainya **menang** atas isi database.
  Boleh id angka atau potongan nama (Classroom), dipisah koma.
- **Classroom menyimpan id, Moodle menyimpan id angka.** `classroom_courses.course_id`
  berisi id panjang Google (mis. `843941141691`), `moodle_courses.course_id`
  berisi id numerik Moodle (mis. `1016`). Keduanya dibaca sebagai teks.
- **Kelas semester lalu yang masih `ACTIVE`** tetap ikut tersync kalau tidak
  dikecualikan. Kelas seperti itu punya tugas dengan deadline jauh di masa
  depan, sehingga muncul di halaman web — itulah gunanya filter di atas.
- **Deadline Classroom juga digeser ke WIB.** `dueDate`/`dueTime` dari
  Classroom API keduanya dalam UTC. Tugas yang deadline-nya 17:00 UTC jatuh
  pada 00:00 WIB keesokan harinya, dan itu yang dicatat.
- **Hanya kelas aktif.** Kelas yang diarsipkan tidak diambil, dan baris lama
  milik kelas itu akan dibersihkan saat sync.
- **Hanya tugas berstatus `PUBLISHED`.** Draf dilewati.
- **Satu sumber gagal tidak membatalkan yang lain.** Kalau Moodle bermasalah,
  Classroom tetap ditulis — tetapi run tetap ditandai gagal supaya masalahnya
  terlihat.

---

## Notifikasi Telegram

Tiga jenis pesan:

| Kapan | Isi |
|---|---|
| Tiap hari 08.00 WIB | tugas LMS baru (sekali per tugas, dijaga `tasks.notified_at`) + deadline **H-3 sampai H-1** |
| Tiap jam menit `:05` | pengingat **3 jam sebelum deadline** untuk tugas yang punya jam (`deadline_reminder_at`) |
| Senin 08.00 WIB | digest: semua tugas dengan deadline minggu ini + jumlah tugas yang selesai minggu lalu (`completed_at`) |

Tugas yang sudah dikirim ke Moodle/Classroom (`submitted`/`graded`) tidak
diingatkan lagi.

**Nada pesan** diatur di `scripts/notify-telegram.mjs` (fungsi `susunPesan`,
`susunPesanDeadline`, `susunDigest`). Gaya saat ini: hangat, singkat, tanpa
emoji dan tanpa panggilan sayang. Contoh:

```
Reminder ya

• Tugas 3 (Kriptografi)
  deadline jam 23.59, sekitar 3 jam lagi

Masih ada waktu kok, jangan lupa dikerjakan ya.
```

**Setup (sekali saja)**

1. Chat `@BotFather` -> `/newbot` -> simpan token.
2. Tekan **START** di chat bot, lalu buka
   `https://api.telegram.org/bot<TOKEN>/getUpdates` dan catat `chat.id`.
3. Isi secret repo (Settings -> Secrets and variables -> Actions):

   ```
   TELEGRAM_BOT_TOKEN
   TELEGRAM_CHAT_ID
   ```

4. Uji tanpa mengirim: Actions -> **Notify Telegram** -> Run workflow ->
   `dry_run = true`. Pilih `mode` untuk melihat pesan harian atau pengingat.

Workflow: `.github/workflows/notify.yml`. Skrip: `scripts/notify-telegram.mjs`.
Token tidak pernah masuk `config.js`, browser, atau tabel database.

Pengingat 3 jam memakai jendela bergulir, bukan jam tetap: cron berjalan tiap
jam dan hanya tugas dengan sisa waktu 0–3 jam yang dikirim. Karena itu
deadline lewat tengah malam tetap tertangkap (tugas besok ikut dibaca).
`deadline_reminder_at` mencegah pesan yang sama terkirim dua kali.

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
- **Rahasia tidak boleh masuk frontend.** Tidak ada token atau API key di
  `script.js`, `config.js`, maupun `localStorage`. Kalau suatu saat menambah
  fitur yang butuh rahasia, simpan di server (mis. GitHub Secrets atau Supabase
  Vault) dan kirim ke browser hanya nilai yang tersamarkan.
- **`MOODLE_TOKEN` hanya hidup di GitHub Secrets.** Token itu tidak pernah
  dibuat menjadi `config.js` dan tidak pernah dikirim ke browser, karena
  `sync.yml` berjalan di runner GitHub, bukan di halaman.
- **Kredensial Classroom juga hanya di server.** `CLASSROOM_SYNC_CLIENT_SECRET`
  dan `CLASSROOM_SYNC_REFRESH_TOKEN` dibaca oleh `scripts/sync-lms.mjs` dari GitHub
  Secrets, bukan dari halaman. Yang ada di browser hanyalah OAuth Client ID
  (memang bukan rahasia) dan access token berumur ~1 jam di `localStorage`.
  Refresh token **tidak pernah** menyentuh browser.
- **`config.js` tidak memuat kredensial apa pun.** Generator
  `scripts/build-config.mjs` hanya meneruskan nilai yang memang publik.
  `CLASSROOM_SYNC_CLIENT_SECRET` dan `CLASSROOM_SYNC_REFRESH_TOKEN` sengaja tidak
  diteruskan; kalau suatu saat muncul di `config.js`, itu kesalahan.
- **Fungsi `security definer` harus dicabut dari `anon`.** Fungsi yang
  memegang rahasia server tidak boleh bisa dipanggil dari browser; kalau bisa,
  siapa pun yang menemukan URL + publishable key dapat memicunya tanpa batas.

Kalau nanti butuh multi-user yang aman, aktifkan RLS + Supabase Auth dan
tambahkan kembali kolom `user_id`.

---

## Deploy

Push ke branch `main` → GitHub Pages menyajikan folder root. Tidak ada build
step. Halaman di-serve sebagai `https://belliond.github.io/task-vault/`.

Pastikan URL itu terdaftar di Google Cloud Console (lihat bagian Classroom),
dan `site_url` di `supabase/config.toml` sesuai.
