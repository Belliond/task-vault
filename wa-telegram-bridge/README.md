# Jembatan WhatsApp ↔ Telegram

Menghubungkan WhatsApp ke Telegram. **Mesinnya jalan di HP kamu sendiri**, bukan
di server orang lain. Tanpa browser, tanpa Chrome — satu proses Node sekitar
**90–100 MB RAM**.

Fitur:

- Pesan WhatsApp masuk → diteruskan ke Telegram (teks + label media)
- Kirim WhatsApp dari Telegram: `/to 08123456789 pesan kamu`
- `/status` untuk cek koneksi
- Hanya chat Telegram kamu yang bisa memerintah (chat lain diabaikan)
- Sambung ulang otomatis kalau koneksi putus
- Semua data (sesi WhatsApp + token) tetap di HP, tidak dikirim ke mana pun

---

## Peringatan penting, baca dulu

1. **Ini bukan API resmi WhatsApp.** Library yang dipakai (`baileys`) bicara
   lewat protokol WhatsApp Web, sama seperti WhatsApp Web di browser. WhatsApp
   melarang klien tidak resmi. **Nomor kamu bisa diblokir** kalau dipakai untuk
   spam atau kirim pesan massal. Untuk pemakaian pribadi yang wajar risikonya
   kecil, tapi tidak nol. Kalau nomor ini penting, jangan dipakai.
2. **Gunakan nomor cadangan** kalau bisa, bukan nomor utama.
3. WhatsApp bisa mengubah protokolnya kapan saja dan membuat library ini rusak
   sampai diperbarui. Kalau tiba-tiba tidak jalan, biasanya itu sebabnya.

Kalau kamu butuh yang 100% resmi dan tidak berisiko ban, itu WhatsApp Cloud API
— tapi berbayar per pesan dan tidak gratis. Panduan ini sengaja memilih jalur
tidak resmi karena kamu minta yang gratis dan jalan di HP.

---

## Yang dibutuhkan

- HP Android (Termux). iOS **tidak bisa** — Apple melarang aplikasi seperti
  Termux.
- WhatsApp aktif di HP itu (untuk memindai QR).
- Bot Telegram + chat ID kamu.

---

## Seberapa ribet?

Jujur: **sedang, bukan sekali klik.** Sekitar 15–20 menit pertama kali.

Yang gampang:

- Memasang: satu perintah (`pasang.sh`), sisanya otomatis
- Menghubungkan WhatsApp: ketik kode 8 digit, tidak perlu HP kedua
- Setelah jalan: tidak perlu diutak-atik lagi

Yang bikin kesal (dan tidak bisa saya hilangkan):

| Bagian | Kenapa ribet | Perlu apa |
|---|---|---|
| Termux harus dari F-Droid | Versi Play Store tidak bisa `pkg install` | Unduh APK dari F-Droid, izinkan "install dari sumber tidak dikenal" |
| `npm install` pertama | Unduh ~44 MB, di HP bisa 3–8 menit | Sabar, jangan ditutup |
| Android mematikan proses | Perilaku sistem, bukan bug tool | `termux-wake-lock` + matikan optimasi baterai Termux |
| Android 12+ phantom process | Proses anak dibunuh tanpa peringatan | Kadang perlu satu perintah ADB dari komputer |
| HP harus tetap hidup | Tidak ada yang jalan kalau HP mati | Cas + jangan matikan |

Kalau kamu tidak nyaman dengan terminal, ini **bukan** tool yang cocok. Tidak
ada versi aplikasi tinggal-install, karena WhatsApp tidak mengizinkan aplikasi
seperti ini di Play Store.

**Alternatif kalau ternyata terlalu ribet:** jalankan di laptop/PC yang selalu
menyala, bukan di HP. Caranya sama persis, tapi tidak ada masalah baterai dan
phantom process. Cukup lewati bagian Termux.

---

## Langkah pasang di HP

### Cara cepat (satu perintah)

Pasang **Termux** dulu dari **F-Droid**, jangan dari Play Store (versi Play Store
sudah usang dan tidak bisa `pkg install`):

<https://f-droid.org/packages/com.termux/>

Buka Termux, tempel satu baris ini:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Belliond/task-vault/main/wa-telegram-bridge/pasang.sh)
```

Skrip itu memasang Node.js, mengunduh kode, memasang dependensi, dan menanyakan
token Telegram + nomor WhatsApp kamu. Selesai dalam sekali jalan.

Kalau `curl` belum ada: `pkg install curl` dulu.

Setelah itu:

```bash
cd ~/task-vault/wa-telegram-bridge
bash jalan.sh
```

`jalan.sh` adalah **penjaga**: ia menjalankan `bridge.mjs` dan menyalakannya
lagi dalam 5 detik kalau Android membunuh prosesnya. Log ditulis ke
`/sdcard/bridge.log` supaya bisa dibaca dari komputer lewat `adb` tanpa perlu
mengetik di layar HP.

> **Kenapa log di `/sdcard`?** Folder Termux (`/data/data/com.termux/...`)
> tidak bisa dibaca `adb` — hasilnya `Permission denied`. Menaruh log di
> `/sdcard` membuat pemantauan mungkin dilakukan dari komputer, yang sangat
> membantu saat memasang.

### Cara manual

<details>
<summary>Klik kalau ingin memasang sendiri langkah demi langkah</summary>

```bash
pkg update -y
pkg install -y nodejs git curl
node --version        # harus 20 ke atas

cd ~
git clone https://github.com/Belliond/task-vault.git
cd task-vault/wa-telegram-bridge
npm install

cp .env.example .env
nano .env             # isi TOKEN, CHAT_ID, dan WA_BRIDGE_PASANGAN
```

Simpan di nano: `Ctrl+O`, `Enter`, lalu `Ctrl+X`.

</details>

---

## Menghubungkan WhatsApp

Ini bagian yang paling sering gagal, jadi baca seluruhnya sebelum mulai.

### Kenapa QR tidak bisa dipindai dari HP sendiri

QR tampil di layar HP, dan yang memindai juga HP itu. Mustahil. Karena itu ada
dua jalur.

### Jalur utama: QR dari laptop (paling andal)

Kalau kamu punya komputer, **ini yang harus dipakai.** Terbukti berhasil,
sekali coba.

1. Di laptop, di folder proyek yang sama:

   ```bash
   npm install
   node qr-laptop.mjs
   ```

   Atau buka `qr-laptop.html` di browser — halaman itu menampilkan QR dan
   memperbaruinya otomatis tiap 2 detik, jadi tidak pernah basi.

2. Di HP: **WhatsApp → Perangkat tertaut → Tautkan perangkat** → pindai QR di
   layar laptop.

3. Tunggu sampai muncul `SESI-SIAP`. Sesi tersimpan di folder `auth-laptop/`.

4. Salin sesi itu ke HP sebagai folder `auth/`:

   ```bash
   tar -czf auth-laptop.tar.gz auth-laptop
   adb push auth-laptop.tar.gz /sdcard/
   ```

   Lalu dari Termux di HP:

   ```bash
   cd ~/task-vault/wa-telegram-bridge
   rm -rf auth
   tar -xzf /sdcard/auth-laptop.tar.gz
   mv auth-laptop auth
   bash jalan.sh
   ```

   Jembatan di HP langsung tersambung **tanpa pairing ulang**.

> **Kenapa harus begitu?** Sesi WhatsApp adalah kunci akun. Sesi yang dibuat di
> laptop bisa dipakai di HP karena keduanya memakai kredensial yang sama.
> Setelah tersalin, HP tidak butuh QR lagi.

### Jalur cadangan: kode 8 digit (kalau tidak ada laptop)

1. Jalankan `bash jalan.sh`
2. Kirim **`/pasang`** ke bot Telegram
3. Bot membalas kode, misalnya `Kode pasangan WhatsApp: JXNZ79ZH`
4. **Siapkan WhatsApp dulu** di layar **Pengaturan → Perangkat tertaut →
   Tautkan perangkat → Tautkan dengan nomor telepon**
5. Baru ketik kode 8 digit itu

> **Jujur soal waktunya:** kode ini hanya hidup **sekitar 20 detik**, bukan 60.
> Di kode Baileys (`socket.js`), QR pertama diberi 60 detik tapi QR berikutnya
> hanya 20 detik (`qrMs = qrTimeout || 20000`), dan setiap kali koneksi putus
> Baileys membuat kunci baru — kode lama langsung mati. Mengetik 8 karakter
> sambil berpindah aplikasi sering kalah cepat.
>
> Karena itu: **siapkan layar WhatsApp lebih dulu**, baru kirim `/pasang`.
> Kalau gagal, kirim `/pasang` lagi. Jangan menyerah di percobaan pertama.

> **Kenapa `/pasang`, bukan kode otomatis?** Meminta kode baru **membatalkan**
> kode sebelumnya. Kalau kode dibuat otomatis tiap menit, kamu bisa mengetik
> kode yang sudah mati. Dengan `/pasang`, kode yang kamu lihat dijamin yang
> terbaru.

Selesai. Kamu akan dapat pesan di Telegram:

```
Jembatan aktif, Krisna.
WhatsApp 62812xxxxxxx sekarang tersambung ke Telegram ini.
```

Kode pasangan butuh `WA_BRIDGE_PASANGAN` di `.env` terisi nomor WhatsApp kamu
(contoh `628123456789` — pakai 62, tanpa `+` dan tanpa `0` di depan).

---

## Perintah di Telegram

| Perintah | Guna |
|---|---|
| `/pasang` | Buat kode pasangan WhatsApp baru |
| `/qr` | Tampilkan QR terakhir (kalau ada) |
| `/status` | Cek WhatsApp tersambung atau tidak |
| `/to 08123... pesan` | Kirim pesan ke nomor itu |
| `/to 08123...` | Tanya nomor itu terdaftar atau tidak |
| `/start` atau `/help` | Bantuan |
| teks biasa | Dikirim ke `WA_BRIDGE_TUJUAN` kalau diisi |

**Penting:** perintah hanya diproses kalau dikirim dari **aplikasi Telegram
kamu**. Mengirim lewat Bot API (`sendMessage`) berarti bot yang mengirim pesan
ke kamu — itu **tidak** menghasilkan update yang bisa dibaca jembatan. Jadi
jangan menguji dengan `curl`/`sendMessage`; uji dari aplikasi Telegram.

Juga: jangan memanggil `getUpdates` dari tempat lain selagi jembatan jalan.
Itu **mencuri antrean** — perintahmu diambil proses lain, dan jembatan tidak
pernah melihatnya.

---

## Supaya tidak mati saat layar dikunci

Android akan mematikan proses di latar belakang. Ini wajib dilakukan, kalau
tidak jembatan mati dalam beberapa menit.

**a. Tahan wake lock** (di Termux, sebelum menjalankan):

```bash
termux-wake-lock
```

**b. Matikan optimasi baterai untuk Termux**

Setelan → Aplikasi → Termux → Baterai → **Tidak dibatasi / Unrestricted**.

Di HP Xiaomi/OPPO/Vivo/Huawei ada pengelola baterai tambahan — cari "Autostart"
dan izinkan Termux.

**c. Jalankan lewat penjaga `jalan.sh`** — cara paling praktis, tidak perlu tmux:

```bash
bash jalan.sh
```

Skrip ini menyalakan ulang jembatan dalam 5 detik kalau mati, dan menulis log
ke `/sdcard/bridge.log`. Sudah diuji: proses dibunuh paksa (kode 137), dan
dalam **6 detik** jembatan hidup lagi dengan WhatsApp tersambung ulang otomatis.

Kalau mau lewat tmux (bisa dilihat langsung):

```bash
pkg install -y tmux
tmux new -s wa
termux-wake-lock
node bridge.mjs
```

Keluar dari tmux tanpa mematikan proses: tekan `Ctrl+B` lalu `D`.
Masuk lagi nanti: `tmux attach -t wa`.

**d. Android 12 ke atas — phantom process killer**

Android versi baru membunuh proses anak tanpa peringatan. Kalau jembatan mati
sendiri padahal wake lock aktif, sambungkan HP ke komputer dan jalankan:

```bash
adb shell "settings put global settings_enable_monitor_phantom_procs false"
```

Ini sekali saja. Tanpa komputer, coba aktifkan **Developer options → Disable
child process restrictions** kalau ada di HP kamu.

**e. Nyalakan otomatis setelah HP restart** (opsional)

Pasang **Termux:Boot** dari F-Droid, lalu:

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/wa-bridge.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
bash ~/task-vault/wa-telegram-bridge/jalan.sh
EOF
chmod +x ~/.termux/boot/wa-bridge.sh
```

Buka Termux:Boot sekali setelah dipasang agar aktif.

---

## Cara pakai

**WhatsApp → Telegram**

Semua pesan masuk otomatis muncul di Telegram:

```
wa · 628999888777

halo, tugasnya sudah dikumpulkan?
```

Dari grup:

```
wa · 628999888777 di Grup Kelas RA

besok bawa laptop
```

Media hanya diberi label, tidak diunduh (supaya tetap ringan):

```
wa · 628999888777

[gambar] ini screenshot-nya
```

**Telegram → WhatsApp**

```
/to 08123456789 halo, ini dari telegram
```

Balasannya: `Terkirim ke 08123456789.`

Cek nomor terdaftar tanpa mengirim pesan:

```
/to 08123456789
```

Perintah lain:

```
/status
```

```
WhatsApp : tersambung
Nomor    : 628111222333
Tujuan   : -
```

**Nomor tujuan default**

Kalau di `.env` diisi `WA_BRIDGE_TUJUAN=08123456789`, maka pesan Telegram tanpa
`/to` langsung dikirim ke nomor itu — praktis untuk chat sehari-hari.

---

## Pengaturan di `.env`

| Kunci | Arti |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token bot dari @BotFather (wajib) |
| `TELEGRAM_CHAT_ID` | ID chat kamu (wajib) |
| `WA_BRIDGE_NAMA` | Nama sapaan, default `Krisna` |
| `WA_BRIDGE_KE_TG` | `0` = jangan teruskan WhatsApp ke Telegram |
| `WA_BRIDGE_KE_WA` | `0` = jangan terima perintah dari Telegram |
| `WA_BRIDGE_ABAIKAN_DIRI` | `1` = pesan yang kamu kirim sendiri tidak diteruskan |
| `WA_BRIDGE_TUJUAN` | Nomor default untuk pesan tanpa `/to` |

---

## Kalau HP sempat mati atau internet mati

Pesan Telegram **tidak hilang** selama HP hidup lagi dalam **24 jam**.

Telegram menyimpan pesan yang belum diambil bot. Begitu jembatan hidup dan
tersambung ke internet, semua pesan yang tertunda diproses berurutan.

Contoh: pesan kamu kirim jam 10.00, HP baru dapat internet jam 11.00 — pesan itu
tetap diproses jam 11.00, terkirim ke WhatsApp, dan kamu dapat balasan
`Terkirim ke ...`.

Batasannya:

| Situasi | Hasil |
|---|---|
| HP hidup lagi < 24 jam | Pesan tertunda diproses semua, berurutan |
| HP hidup lagi > 24 jam | Pesan lama **dibuang Telegram**, tidak bisa diselamatkan |
| Lebih dari 100 pesan tertunda | Diproses 100 per putaran, sisanya menyusul |
| Pesan tertunda datang saat WhatsApp masih menyambung | Jembatan menunggu sampai 30 detik, tidak langsung menolak |

Ini perilaku server Telegram, bukan setelan jembatan — tidak ada cara
menyimpan lebih lama dari 24 jam lewat Bot API.

Yang **tidak** tertunda: pesan WhatsApp. Kalau jembatan mati, pesan WhatsApp
yang masuk saat itu tidak diteruskan (tidak ada riwayat). WhatsApp hanya
mengirim event ke klien yang sedang tersambung.

---

## Kalau ada masalah

**QR tidak muncul**

Pastikan `npm install` selesai tanpa galat. Coba hapus folder `auth` lalu
jalankan lagi.

**"Sesi WhatsApp keluar"**

Berarti WhatsApp memutus perangkat tertaut. Jalankan ulang, pindai QR baru.
Kalau sering terjadi, kemungkinan WhatsApp menandai aktivitas ini.

**Pesan tidak sampai ke Telegram**

Cek `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID`. Pastikan kamu pernah mengirim
pesan ke bot. Lihat `/sdcard/bridge.log`.

**Jembatan mati sendiri**

Itu Android mematikan proses. Jalankan lewat `bash jalan.sh` (lihat bagian
"Supaya tidak mati saat layar dikunci"). Penjaganya akan menyalakan ulang
otomatis.

**Bot tidak membalas, padahal jembatan katanya jalan**

Periksa dulu apakah perintahmu benar-benar sampai:

```bash
adb shell "cat /sdcard/bridge.log | grep 'perintah masuk'"
```

- **Ada baris `perintah masuk: /status`** → perintah sampai, masalahnya di
  balasan. Cek `TELEGRAM_CHAT_ID` — kalau salah, jembatan membalas ke chat lain
  dan kamu tidak melihatnya.
- **Tidak ada baris itu** → perintah tidak sampai. Penyebab paling sering:
  ada proses lain yang memanggil `getUpdates` dan mencuri antrean, atau kamu
  menguji dengan Bot API (`sendMessage`) yang tidak menghasilkan update.

**Log tidak bertambah sama sekali**

Jembatan hanya menulis log saat ada kejadian. Diam bukan berarti mati. Cek
prosesnya:

```bash
adb shell "ps -A | grep ' node' | grep -v grep"
```

**Layar Termux terlihat membeku**

Itu tampilan Termux yang tidak ter-update, bukan programnya mati. Prosesnya
tetap jalan. Jangan di-`force-stop` hanya karena tampilannya diam.

**Mau lihat log sambil jalan**

Log ada di `/sdcard/bridge.log`:

```bash
adb shell "cat /sdcard/bridge.log"
# atau dari dalam Termux:
tail -f /sdcard/bridge.log
```

---

## Catatan saat memasang lewat komputer (adb)

Kalau kamu mengendalikan HP dari komputer, ada beberapa jebakan yang sudah
memakan waktu:

| Jebakan | Kenyataan |
|---|---|
| `adb` menulis ke folder Termux | **Tidak bisa**, `Permission denied`. Push ke `/sdcard/...`, lalu `cp` dari dalam Termux |
| `/tmp` di Termux | **Tidak ada**. Pakai `$PREFIX/tmp` |
| Karakter pertama hilang saat `adb input text` | Awali perintah dengan spasi |
| `adb input text` nyasar ke app lain | Teks masuk ke **app yang sedang di depan**. Pastikan Termux di depan dulu (`dumpsys activity activities \| grep topResumedActivity`) |
| `am force-stop com.termux` | Mematikan semua proses Termux dan mengembalikan folder kerja ke `$HOME`. Selalu pakai path absolut |
| `node bridge.mjs` di latar depan | Terminal terkunci. Pakai `bash jalan.sh` yang sudah melepaskan diri |

---

## Untuk pengembang

```bash
npm test           # 21 uji fungsi murni, tanpa jaringan
node test-e2e.mjs  # alur penuh dengan WhatsApp & Telegram tiruan
node test-tertunda.mjs  # pesan tertunda: dikirim saat jembatan mati
```

`test-e2e.mjs` mengganti paket `baileys` dengan tiruan dan menjalankan Bot API
Telegram palsu di localhost. Jadi seluruh alur (pesan masuk, kiriman keluar,
perintah, penyaringan chat asing) teruji tanpa menyentuh akun sungguhan.

`test-tertunda.mjs` meniru "pesan jam 10, internet hidup jam 11": update
ditahan di antrean server, jembatan baru dinyalakan belakangan, dan harus tetap
memproses pesan lama — termasuk memastikan tidak dobel dan tidak ada yang
terlewat saat dua pesan tertahan sekaligus.

Berkas:

| Berkas | Isi |
|---|---|
| `bridge.mjs` | Proses utama: WhatsApp, Telegram, perintah |
| `lib.mjs` | Fungsi murni: parser, normalisasi nomor, format pesan |
| `jalan.sh` | Penjaga: jalankan ulang otomatis + log ke `/sdcard` |
| `qr-laptop.mjs` | Tampilkan QR di laptop, simpan sesi ke `auth-laptop/` |
| `qr-laptop.html` | Halaman QR auto-refresh untuk dipindai dari HP |
| `pasang.sh` | Pemasang otomatis untuk Termux |
| `test.mjs` | Uji fungsi murni |
| `test-e2e.mjs` | Uji alur penuh dengan tiruan |
| `test-tertunda.mjs` | Uji pesan tertunda (jembatan mati lalu hidup) |
| `test-kode.mjs` | Uji kode pasangan hanya dibuat lewat `/pasang` |

**Catatan untuk yang memodifikasi:**

- `shouldSyncHistoryMessage: () => false` **wajib**. `syncFullHistory: false`
  saja tidak cukup — default Baileys masih menyinkronkan `RECENT` dan
  `INITIAL_BOOTSTRAP`, yang membanjiri log dan membebani HP.
- Baileys akan memperingatkan `DANGER: DISABLING ALL SYNC...`. Peringatan itu
  **aman**: LID mapping tetap bisa diambil lewat jalur cadangan USync
  (`pnFromLIDUSync` di `socket.js`) saat dibutuhkan.
- Offset `getUpdates` harus **selalu** dimajukan, apa pun jenis update-nya.
  Kalau tidak, update yang sama diambil terus dan antrean tidak pernah habis.

---

## Batasan yang perlu diketahui

- **Hanya teks dan label media.** Gambar, video, dokumen, dan audio tidak
  diunduh atau diteruskan isinya.
- **Tidak ada riwayat.** Hanya pesan yang masuk saat jembatan hidup.
- **HP harus menyala dan online.** Kalau HP mati atau tanpa internet, tidak ada
  yang diteruskan.
- **Satu nomor WhatsApp per proses.** Untuk nomor kedua, jalankan salinan folder
  lain dengan port/sesi sendiri.
- **Bukan API resmi.** Lihat peringatan di atas.

---

## Jaga folder sesi WhatsApp

Folder `auth/` dan `auth-laptop/` berisi **kunci akun WhatsApp**. Siapa pun yang
memegang file di dalamnya bisa menyamar sebagai pemilik nomor tanpa perlu kode
pairing.

Karena itu:

- Keduanya sudah masuk `.gitignore`. **Jangan pernah** di-commit atau diunggah.
- Jangan kirim lewat chat, email, atau cloud drive.
- Kalau HP hilang atau folder bocor: buka WhatsApp → **Perangkat tertaut** →
  keluarkan perangkat yang tidak dikenal.
- `qr-laptop.png` juga berisi QR yang bisa dipakai menautkan perangkat —
  jangan dibiarkan terbuka di layar publik.
