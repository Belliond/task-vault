#!/data/data/com.termux/files/usr/bin/sh
# =========================================================
#  NYALA OTOMATIS SAAT HP BOOT
#
#  Termux:Boot menjalankan skrip ini sekali setiap HP
#  selesai boot. Tugasnya cuma satu: menyalakan penjaga
#  jembatan (jalan.sh), yang lalu menjalankan bridge.mjs
#  dan menyalakannya ulang kalau mati.
#
#  Catatan penting:
#  - Path harus ABSOLUT. Saat boot, folder kerja bukan
#    $HOME, jadi path relatif akan gagal.
#  - Beri jeda beberapa detik: saat boot, jaringan dan
#    penyimpanan belum tentu siap. Tanpa jeda, WhatsApp
#    sering gagal menyambung di percobaan pertama.
# =========================================================

# Jeda supaya sistem benar-benar siap.
sleep 20

termux-wake-lock 2>/dev/null

# Jangan menyalakan dua kali kalau sudah jalan.
if pgrep -f "jalan.sh" > /dev/null 2>&1; then
    echo "$(date '+%d/%m/%Y, %H.%M.%S')  boot: jembatan sudah jalan, dilewati" >> /sdcard/bridge.log
    exit 0
fi

echo "$(date '+%d/%m/%Y, %H.%M.%S')  boot: menyalakan penjaga jembatan" >> /sdcard/bridge.log

exec bash /data/data/com.termux/files/home/task-vault/wa-telegram-bridge/jalan.sh
