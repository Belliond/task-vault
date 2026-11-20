// =========================================================
//  RENDER IKON TASK VAULT
//
//  Sumber tunggal: favicon.svg (naga hasil gen-ikon-naga.mjs)
//
//  Menghasilkan tiga berkas, karena satu berkas tidak bisa
//  memenuhi dua kebutuhan sekaligus:
//
//    icon-192.png          purpose "any"      -> isi penuh
//    icon-512.png          purpose "any"      -> isi penuh
//    icon-maskable-512.png purpose "maskable" -> isi diperkecil
//                                               ke zona aman 80%
//
//  Android memotong ikon "maskable" jadi lingkaran. Kalau
//  berkas yang sama dipakai untuk keduanya, tanduk naga akan
//  terpotong. Karena itu maskable dirender terpisah.
//
//      SHARP_DIR=... node scripts/buat-ikon.mjs
// =========================================================

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const AKAR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SUMBER = path.join(AKAR, "favicon.svg");
const LATAR = "#050a08";

// Zona aman ikon maskable: Android menjamin lingkaran berdiameter
// 80% kanvas. Dipakai 76% agar ada sisa untuk pembulatan piksel.
const ZONA_AMAN = 0.76;

async function muatSharp() {
    const kandidat = [];

    if (process.env.SHARP_DIR) {
        kandidat.push(path.join(process.env.SHARP_DIR, "dist", "index.mjs"));
    }
    kandidat.push(path.join(AKAR, "node_modules", "sharp", "dist", "index.mjs"));

    for (const jalur of kandidat) {
        if (fs.existsSync(jalur)) {
            const mod = await import(pathToFileURL(jalur).href);
            return mod.default;
        }
    }

    console.error("sharp tidak ditemukan. Pasang dengan \"npm i -D sharp\",");
    console.error("atau arahkan SHARP_DIR ke folder paket sharp.");
    process.exit(1);
}

const sharp = await muatSharp();

if (!fs.existsSync(SUMBER)) {
    console.error("favicon.svg belum ada. Jalankan dulu:");
    console.error("  node scripts/gen-ikon-naga.mjs");
    process.exit(1);
}

const svg = fs.readFileSync(SUMBER);

function catat(ukuran, berkas) {
    const info = fs.statSync(berkas);
    console.log(`  ${path.basename(berkas).padEnd(24)} ${ukuran}x${ukuran}  ${info.size} byte`);
}

// ---- 1. ikon biasa: isi penuh ----
for (const ukuran of [192, 512]) {
    const keluar = path.join(AKAR, `icon-${ukuran}.png`);
    await sharp(svg, { density: 384 })
        .resize(ukuran, ukuran, { fit: "contain", background: LATAR })
        .png({ compressionLevel: 9 })
        .toFile(keluar);
    catat(ukuran, keluar);
}

// ---- 2. ikon maskable: isi dikecilkan ke zona aman ----
{
    const ukuran = 512;
    const dalam = Math.round(ukuran * ZONA_AMAN);
    const sisa = Math.round((ukuran - dalam) / 2);

    const isi = await sharp(svg, { density: 384 })
        .resize(dalam, dalam, { fit: "contain", background: LATAR })
        .png()
        .toBuffer();

    const keluar = path.join(AKAR, "icon-maskable-512.png");
    await sharp({
        create: { width: ukuran, height: ukuran, channels: 4, background: LATAR }
    })
        .composite([{ input: isi, left: sisa, top: sisa }])
        .png({ compressionLevel: 9 })
        .toFile(keluar);

    catat(ukuran, keluar);
}

console.log("selesai.");
