// =========================================================
//  UJI ZONA AMAN IKON MASKABLE
//
//  Android memotong ikon "maskable" menjadi lingkaran. Yang
//  dijamin terlihat hanya lingkaran berdiameter 80% kanvas.
//  Skrip ini memeriksa SETIAP piksel yang bukan latar pada
//  icon-maskable-512.png: jaraknya dari pusat harus <= 40%.
//
//      node scripts/uji-zona-aman.mjs
// =========================================================

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const AKAR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BERKAS = path.join(AKAR, "icon-maskable-512.png");

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

    console.error("sharp tidak ditemukan. Pasang \"npm i -D sharp\"");
    console.error("atau arahkan SHARP_DIR ke folder paket sharp.");
    process.exit(1);
}

const sharp = await muatSharp();

if (!fs.existsSync(BERKAS)) {
    console.error("icon-maskable-512.png belum ada. Jalankan dulu:");
    console.error("  node scripts/buat-ikon.mjs");
    process.exit(1);
}

const LATAR = [0x05, 0x0a, 0x08];
const AMBANG = 20;

const { data, info } = await sharp(BERKAS)
    .flatten({ background: "#050a08" })
    .raw()
    .toBuffer({ resolveWithObject: true });

const S = info.width;
const pusat = S / 2;

let maks = 0;
let terluar = null;

for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
        const i = (y * info.width + x) * info.channels;
        const d = Math.abs(data[i] - LATAR[0]) +
                  Math.abs(data[i + 1] - LATAR[1]) +
                  Math.abs(data[i + 2] - LATAR[2]);
        if (d < AMBANG) continue;

        const jarak = Math.hypot(x + 0.5 - pusat, y + 0.5 - pusat);
        if (jarak > maks) {
            maks = jarak;
            terluar = { x, y };
        }
    }
}

const batasAman = S * 0.4;
const persen = ((maks / pusat) * 100).toFixed(1);

console.log("berkas         :", path.basename(BERKAS), `(${S}x${S})`);
console.log("radius terjauh :", maks.toFixed(1) + " px", `(${persen}% setengah kanvas)`);
console.log("batas aman     :", batasAman.toFixed(1) + " px (diameter 80%)");
console.log("titik terluar  : x=" + terluar.x + ", y=" + terluar.y);
console.log(maks <= batasAman
    ? "HASIL          : AMAN, tidak terpotong ikon bulat"
    : "HASIL          : TERLALU LEBAR, akan terpotong");

process.exit(maks <= batasAman ? 0 : 1);
