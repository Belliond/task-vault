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

## Langkah pasang di HP

### 1. Pasang Termux

Ambil dari **F-Droid**, jangan dari Play Store (versi Play Store sudah usang dan
tidak bisa `pkg install`):

<https://f-droid.org/packages/com.termux/>

### 2. Pasang Node.js dan git

Buka Termux, lalu:

```bash
pkg update -y
pkg install -y nodejs git
```

Cek versinya — harus 20 ke atas:

```bash
node --version
```

### 3. Ambil kode jembatannya

```bash
cd ~
git clone https://github.com/Belliond/task-vault.git
cd task-vault/wa-telegram-bridge
npm install
```

### 4. Siapkan bot Telegram

1. Buka Telegram, cari **@BotFather**, kirim `/newbot`, ikuti langkahnya.
2. Simpan **token** yang diberikan (bentuknya `123456:ABC-DEF...`).
3. Cari **@userinfobot**, kirim `/start` — dia membalas **Id** kamu. Itu
   `TELEGRAM_CHAT_ID`.
4. Kirim pesan apa saja ke bot barumu sekali, supaya bot boleh membalas.

### 5. Isi konfigurasi

```bash
cp .env.example .env
nano .env
```

Isi dua baris ini:

```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789
```

Simpan: `Ctrl+O`, `Enter`, lalu `Ctrl+X`.

### 6. Jalankan

```bash
node bridge.mjs
```

Akan muncul **QR di layar**. Di HP:

**WhatsApp → titik tiga ⋮ → Perangkat tertaut → Tautkan perangkat** → pindai QR.

Setelah tersambung, kamu akan dapat pesan di Telegram:

```
Jembatan aktif, Krisna.
WhatsApp 62812xxxxxxx sekarang tersambung ke Telegram ini.
```

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

**c. Jalankan di dalam tmux** supaya tetap hidup walau layar Termux ditutup:

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
cd ~/task-vault/wa-telegram-bridge
node bridge.mjs >> bridge.log 2>&1
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
pesan ke bot. Lihat `bridge.log` di folder yang sama.

**Jembatan mati sendiri**

Itu Android mematikan proses. Ulangi bagian "Supaya tidak mati saat layar
dikunci", terutama wake lock dan matikan optimasi baterai.

**Mau lihat log sambil jalan**

```bash
tail -f bridge.log
```

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
| `test.mjs` | Uji fungsi murni |
| `test-e2e.mjs` | Uji alur penuh dengan tiruan |
| `test-tertunda.mjs` | Uji pesan tertunda (jembatan mati lalu hidup) |

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
