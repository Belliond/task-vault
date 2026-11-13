#!/data/data/com.termux/files/usr/bin/bash
# =========================================================
#  PENJAGA JEMBATAN
#
#  Android (terutama vivo) suka membunuh proses latar
#  belakang saat RAM menipis. Skrip ini menyalakan ulang
#  jembatan otomatis, jadi tidak perlu buka Termux lagi.
#
#  Log sengaja ditulis ke /sdcard supaya bisa dibaca dari
#  laptop lewat adb, tanpa perlu mengetik apa pun di layar.
# =========================================================

D="/data/data/com.termux/files/home/task-vault/wa-telegram-bridge"
LOG="/sdcard/bridge.log"
BATAS_BYTE=2000000

cd "$D" || exit 1

termux-wake-lock 2>/dev/null

while true; do

    # Jaga log tetap kecil: kalau lewat 2 MB, sisakan 500
    # baris terakhir saja.
    if [ -f "$LOG" ]; then
        ukuran=$(stat -c %s "$LOG" 2>/dev/null || echo 0)
        if [ "$ukuran" -gt "$BATAS_BYTE" ]; then
            tail -n 500 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
        fi
    fi

    echo "=== $(date '+%d/%m/%Y, %H.%M.%S')  penjaga: mulai node ===" >> "$LOG"

    node bridge.mjs >> "$LOG" 2>&1

    kode=$?

    echo "=== $(date '+%d/%m/%Y, %H.%M.%S')  penjaga: node berhenti (kode $kode), ulang 5 detik ===" >> "$LOG"

    sleep 5

done
