#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
#  PEMASANGAN CEPAT — jembatan WhatsApp <-> Telegram
#
#  Jalankan di Termux:
#      bash <(curl -fsSL https://raw.githubusercontent.com/Belliond/task-vault/main/wa-telegram-bridge/pasang.sh)
#
#  Skrip ini hanya menyiapkan semuanya. Tidak mengirim data
#  ke mana pun.
# =========================================================

set -e

HIJAU='\033[0;32m'
KUNING='\033[0;33m'
MERAH='\033[0;31m'
NORMAL='\033[0m'

pesan() { printf "${HIJAU}%s${NORMAL}\n" "$1"; }
ingat()  { printf "${KUNING}%s${NORMAL}\n" "$1"; }
gagal()  { printf "${MERAH}%s${NORMAL}\n" "$1"; }


echo
pesan "=== Jembatan WhatsApp - Telegram ==="
echo


# ---------- 1. Pastikan di Termux ----------
if [ ! -d "/data/data/com.termux" ]; then

    gagal "Ini harus dijalankan di Termux (Android)."

    exit 1

fi


# ---------- 2. Paket dasar ----------
pesan "1/5  Menyiapkan paket..."

pkg update -y > /dev/null 2>&1 || true

pkg install -y nodejs git > /dev/null 2>&1

if ! command -v node > /dev/null 2>&1; then

    gagal "Node.js gagal dipasang. Coba jalankan: pkg install nodejs"

    exit 1

fi

VERSI=$(node -e 'console.log(process.versions.node.split(".")[0])')

if [ "$VERSI" -lt 20 ]; then

    gagal "Node.js kamu versi $VERSI, butuh 20 ke atas."

    ingat "Jalankan: pkg upgrade nodejs"

    exit 1

fi

pesan "     Node.js $(node --version) siap"


# ---------- 3. Ambil kode ----------
pesan "2/5  Mengambil kode..."

TUJUAN="$HOME/task-vault"

if [ -d "$TUJUAN" ]; then

    ingat "     Folder sudah ada, memperbarui..."

    cd "$TUJUAN"

    git pull --quiet || true

else

    git clone --quiet https://github.com/Belliond/task-vault.git "$TUJUAN"

    cd "$TUJUAN"

fi

cd "$TUJUAN/wa-telegram-bridge"


# ---------- 4. Dependensi ----------
pesan "3/5  Memasang dependensi (sekali saja, agak lama)..."

npm install --no-audit --no-fund > /dev/null 2>&1

pesan "     Selesai"


# ---------- 5. Konfigurasi ----------
pesan "4/5  Konfigurasi..."

if [ -f .env ]; then

    ingat "     .env sudah ada, tidak ditimpa."

else

    cp .env.example .env

    ingat ""
    ingat "  Kamu perlu dua nilai dari Telegram:"
    ingat "   1. Token bot  -> chat @BotFather, kirim /newbot"
    ingat "   2. Chat ID    -> chat @userinfobot, kirim /start"
    ingat ""

    printf "  Token bot Telegram : "
    read -r TOKEN

    printf "  Chat ID kamu       : "
    read -r CHATID

    printf "  Nomor WhatsApp (contoh 628123456789) : "
    read -r NOMOR

    # Tulis tanpa menyentuh contoh lain.
    sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TOKEN|" .env
    sed -i "s|^TELEGRAM_CHAT_ID=.*|TELEGRAM_CHAT_ID=$CHATID|" .env
    sed -i "s|^WA_BRIDGE_PASANGAN=.*|WA_BRIDGE_PASANGAN=$NOMOR|" .env

    chmod 600 .env

    pesan "     .env tersimpan (hanya bisa dibaca kamu)"

fi


# ---------- 6. Selesai ----------
pesan "5/5  Selesai."
echo
ingat "Langkah berikutnya:"
echo
echo "  cd ~/task-vault/wa-telegram-bridge"
echo "  termux-wake-lock"
echo "  node bridge.mjs"
echo
ingat "Kode 8 digit akan muncul. Buka WhatsApp:"
ingat "  Pengaturan > Perangkat tertaut > Tautkan perangkat"
ingat "  > Tautkan dengan nomor telepon > ketik kodenya"
echo
ingat "Supaya tidak mati saat layar dikunci:"
ingat "  Setelan > Aplikasi > Termux > Baterai > Tidak dibatasi"
echo
