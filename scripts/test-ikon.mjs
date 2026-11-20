// =========================================================
//  UJI IKON & MANIFEST
//
//  Ikon PWA mudah "terlihat benar" di laptop tetapi salah di
//  HP. Yang diperiksa di sini:
//
//    1. setiap ikon di manifest benar-benar ada dan PNG sah
//    2. ukuran di manifest cocok dengan isi berkas
//    3. ikon "maskable" terpisah dan isinya masuk zona aman 80%
//       (Android memotong ikon maskable jadi lingkaran)
//    4. favicon.svg benar-benar SVG naga, bukan sisa ikon lama
//    5. warna manifest sama dengan tema web
//    6. service worker menyimpan ikon baru & versi cache naik
//
//  Dijalankan: node scripts/test-ikon.mjs
// =========================================================

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const AKAR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let lulus = 0;
let gagal = 0;

function uji(nama, fn) {
    try {
        fn();
        lulus += 1;
        console.log("  OK    " + nama);
    }
    catch (e) {
        gagal += 1;
        console.log("  GAGAL " + nama + " | " + e.message);
    }
}

const baca = (nama) => fs.readFileSync(path.join(AKAR, nama));

const manifest = JSON.parse(baca("manifest.json").toString("utf8"));
const svg = baca("favicon.svg").toString("utf8");
const html = baca("index.html").toString("utf8");
const css = baca("style.css").toString("utf8");
const sw = baca("sw.js").toString("utf8");


// ---------------------------------------------------------
//  Pembaca PNG sederhana: tanda tangan, IHDR, dan piksel RGBA.
// ---------------------------------------------------------

function bacaPng(buf) {
    const TANDA = "89504e470d0a1a0a";
    if (buf.subarray(0, 8).toString("hex") !== TANDA) {
        throw new Error("bukan PNG");
    }

    const lebar = buf.readUInt32BE(16);
    const tinggi = buf.readUInt32BE(20);
    const kedalaman = buf[24];
    const tipeWarna = buf[25];

    // Kumpulkan IDAT.
    const potong = [];
    let pos = 8;

    while (pos < buf.length) {
        const panjang = buf.readUInt32BE(pos);
        const jenis = buf.subarray(pos + 4, pos + 8).toString("ascii");
        const isi = buf.subarray(pos + 8, pos + 8 + panjang);

        if (jenis === "IDAT") potong.push(isi);
        if (jenis === "IEND") break;

        pos += 12 + panjang;
    }

    const mentah = zlib.inflateSync(Buffer.concat(potong));

    if (kedalaman !== 8 || (tipeWarna !== 6 && tipeWarna !== 2)) {
        throw new Error(`format PNG tidak didukung (kedalaman ${kedalaman}, tipe ${tipeWarna})`);
    }

    const kanal = tipeWarna === 6 ? 4 : 3;
    const lebarBaris = lebar * kanal;
    const piksel = Buffer.alloc(tinggi * lebarBaris);

    // Buka filter per baris (PNG memakai filter 0-4).
    let ip = 0;
    for (let y = 0; y < tinggi; y += 1) {
        const filter = mentah[ip];
        ip += 1;
        const baris = mentah.subarray(ip, ip + lebarBaris);
        ip += lebarBaris;

        const awal = y * lebarBaris;
        const sebelum = (y - 1) * lebarBaris;

        for (let x = 0; x < lebarBaris; x += 1) {
            const a = x >= kanal ? piksel[awal + x - kanal] : 0;
            const b = y > 0 ? piksel[sebelum + x] : 0;
            const c = (x >= kanal && y > 0) ? piksel[sebelum + x - kanal] : 0;
            const nilai = baris[x];

            let hasil;
            switch (filter) {
                case 0: hasil = nilai; break;
                case 1: hasil = nilai + a; break;
                case 2: hasil = nilai + b; break;
                case 3: hasil = nilai + ((a + b) >> 1); break;
                case 4: {
                    const p = a + b - c;
                    const pa = Math.abs(p - a);
                    const pb = Math.abs(p - b);
                    const pc = Math.abs(p - c);
                    const pred = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
                    hasil = nilai + pred;
                    break;
                }
                default:
                    throw new Error("filter PNG tidak dikenal: " + filter);
            }

            piksel[awal + x] = hasil & 0xff;
        }
    }

    return { lebar, tinggi, kanal, piksel };
}


// ---------------------------------------------------------
//  UJI
// ---------------------------------------------------------

console.log("=== ikon & manifest ===");

uji("manifest punya ikon 'any' dan 'maskable'", () => {
    const any = manifest.icons.filter((i) => (i.purpose || "any") === "any");
    const maskable = manifest.icons.filter((i) => i.purpose === "maskable");

    if (any.length === 0) throw new Error("tidak ada ikon purpose 'any'");
    if (maskable.length === 0) throw new Error("tidak ada ikon purpose 'maskable'");
});

uji("setiap ikon di manifest benar-benar ada dan PNG sah", () => {
    for (const ikon of manifest.icons) {
        if (ikon.type !== "image/png") {
            throw new Error("ikon bukan PNG: " + ikon.src);
        }

        const jalur = path.join(AKAR, ikon.src);
        if (!fs.existsSync(jalur)) {
            throw new Error("berkas tidak ada: " + ikon.src);
        }

        const png = bacaPng(fs.readFileSync(jalur));
        const [w, h] = ikon.sizes.split("x").map(Number);

        if (png.lebar !== w || png.tinggi !== h) {
            throw new Error(`${ikon.src}: manifest ${ikon.sizes}, berkas ${png.lebar}x${png.tinggi}`);
        }
    }
});

uji("ikon maskable terpisah dari ikon biasa", () => {
    // Kalau berkasnya sama, isi ikon "any" (penuh) akan dipakai
    // untuk maskable dan tanduk naga terpotong di HP.
    const maskable = manifest.icons.find((i) => i.purpose === "maskable");
    const biasa = manifest.icons.find((i) => i.purpose === "any" && i.sizes === "512x512");

    const isiMaskable = fs.readFileSync(path.join(AKAR, maskable.src));
    const isiBiasa = fs.readFileSync(path.join(AKAR, biasa.src));

    if (isiMaskable.equals(isiBiasa)) {
        throw new Error("ikon maskable sama persis dengan ikon biasa");
    }
});

uji("isi ikon maskable masuk zona aman 80%", () => {
    // Android memotong ikon maskable jadi lingkaran; hanya
    // lingkaran diameter 80% kanvas yang dijamin terlihat.
    const maskable = manifest.icons.find((i) => i.purpose === "maskable");
    const png = bacaPng(fs.readFileSync(path.join(AKAR, maskable.src)));

    const LATAR = [0x05, 0x0a, 0x08];
    const pusat = png.lebar / 2;
    const batas = png.lebar * 0.4;

    let terjauh = 0;

    for (let y = 0; y < png.tinggi; y += 1) {
        for (let x = 0; x < png.lebar; x += 1) {
            const i = (y * png.lebar + x) * png.kanal;

            const d = Math.abs(png.piksel[i] - LATAR[0]) +
                      Math.abs(png.piksel[i + 1] - LATAR[1]) +
                      Math.abs(png.piksel[i + 2] - LATAR[2]);
            if (d < 20) continue;

            const jarak = Math.hypot(x + 0.5 - pusat, y + 0.5 - pusat);
            if (jarak > terjauh) terjauh = jarak;
        }
    }

    if (terjauh > batas) {
        throw new Error(
            `isi keluar zona aman: ${terjauh.toFixed(1)} px > ${batas.toFixed(1)} px`
        );
    }
});

uji("favicon.svg adalah naga, bukan ikon lama", () => {
    // Ikon lama hanya tanda kurung siku `</>` dengan warna
    // #4dffb2. Naga memakai gradien dan warna hijau tema.
    if (!/<svg/.test(svg)) throw new Error("bukan SVG");
    if (!/linearGradient/.test(svg)) throw new Error("tidak ada gradien (naga memakainya)");
    if (!/#4dffb2/i.test(svg)) throw new Error("tidak memakai --green #4dffb2");
    if (!/#4fe6ff/i.test(svg)) throw new Error("tidak memakai --cyan #4fe6ff (mata)");

    // Badan naga dihasilkan sebagai poligon; harus ada path panjang.
    if (!/<path d="M [\d.]+ [\d.]+ L/.test(svg)) {
        throw new Error("tidak ada path badan (poligon hasil hitungan)");
    }
});

uji("index.html memasang favicon, manifest, dan apple-touch-icon", () => {
    if (!/rel="icon"[^>]*href="favicon\.svg"/.test(html)) {
        throw new Error("favicon tidak dipasang");
    }
    if (!/rel="manifest"[^>]*href="manifest\.json"/.test(html)) {
        throw new Error("manifest tidak dipasang");
    }
    if (!/rel="apple-touch-icon"[^>]*href="icon-192\.png"/.test(html)) {
        throw new Error("apple-touch-icon tidak menunjuk icon-192.png");
    }
});

uji("warna manifest sama dengan tema web", () => {
    if (manifest.background_color !== "#050a08") {
        throw new Error("background_color bukan #050a08");
    }
    if (manifest.theme_color !== "#050a08") {
        throw new Error("theme_color bukan #050a08");
    }
    if (!/name="theme-color"[^>]*content="#050a08"/.test(html)) {
        throw new Error("meta theme-color tidak cocok dengan manifest");
    }
    if (!css.includes("#050a08")) {
        throw new Error("CSS tidak memakai #050a08");
    }
});

uji("service worker menyimpan ikon maskable", () => {
    if (!sw.includes("./icon-maskable-512.png")) {
        throw new Error("icon-maskable-512.png tidak ada di SHELL");
    }
    if (!sw.includes("./favicon.svg")) {
        throw new Error("favicon.svg tidak ada di SHELL");
    }
});

uji("versi cache service worker dinaikkan", () => {
    // Cache lama menyimpan ikon lama. Kalau namanya tidak
    // berubah, perangkat yang sudah pernah membuka aplikasi
    // akan terus memakai ikon `</>` yang lama.
    const cocok = sw.match(/const CACHE = "task-vault-(\d{4}-\d{2}-\d{2})"/);
    if (!cocok) throw new Error("nama cache tidak berpola tanggal");

    const versi = cocok[1];
    if (versi < "2026-11-20") {
        throw new Error("versi cache masih lama: " + versi);
    }
});

console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);
process.exit(gagal ? 1 : 0);
