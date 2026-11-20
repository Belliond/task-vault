// =========================================================
//  PENGHASIL IKON NAGA — TASK VAULT
//
//  Badan naga dihitung sebagai POLIGON (garis + lebar yang
//  menyusut), karena SVG tidak bisa membuat garis menirus.
//
//  Setelah dirangkai, ikon DIUKUR dengan sharp: kotak isinya
//  dicari, lalu seluruh gambar digeser & diskalakan supaya
//  tepat di tengah. Penempatan tidak ditebak.
//
//  Palet mengikuti tema Task Vault (bukan matcha, bukan Kali):
//    latar  #050a08
//    hijau  #4dffb2 (--green)  · gelap #19d991 (--green-dark)
//    sian   #4fe6ff (--cyan)
//
//      node scripts/gen-ikon-naga.mjs
// =========================================================

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const AKAR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// sharp hanya dipakai untuk MERENDER ikon, bukan oleh aplikasi.
// Repo ini sengaja tidak menambahkannya sebagai dependensi, jadi
// ia dicari di tempat lain kalau tidak ada di node_modules lokal:
//
//     SHARP_DIR=C:\path\ke\node_modules\sharp node scripts/gen-ikon-naga.mjs
//
// Tanpa SHARP_DIR, dipakai node_modules proyek ini (kalau ada).
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

// ---------------------------------------------------------
//  PALET
// ---------------------------------------------------------

const LATAR = "#050a08";
const HIJAU = "#4dffb2";
const HIJAU_GELAP = "#19d991";
const HIJAU_TERANG = "#c9ffe8";
const HIJAU_TENGAH = "#2ee6a0";
const SIAN = "#4fe6ff";

// ---------------------------------------------------------
//  BADAN: spiral yang menirus jadi ekor
// ---------------------------------------------------------

const CX = 262, CY = 372;          // pusat lingkaran badan
const R0 = 100, R1 = 34;           // jari-jari pangkal & ujung
const TH0 = -126 * Math.PI / 180;  // mulai di kiri-atas (leher)
const SWEEP = 330 * Math.PI / 180; // berputar 330 derajat
const W0 = 62, W1 = 3;             // lebar pangkal & ujung
const N = 96;

function titik(t) {
    const r = R0 + (R1 - R0) * t;
    const th = TH0 + SWEEP * t;
    return [CX + r * Math.cos(th), CY + r * Math.sin(th)];
}

// Menyusut dengan eksponen 0.8: tetap tebal lebih lama, lalu
// menipis cepat di ujung. Hasilnya terbaca sebagai ekor.
function lebar(t) {
    return W1 + (W0 - W1) * Math.pow(1 - t, 0.8);
}

function badan() {
    const kiri = [], kanan = [];

    for (let i = 0; i <= N; i += 1) {
        const t = i / N;
        const [x, y] = titik(t);
        const [x2, y2] = titik(Math.min(1, t + 1 / N));

        const dx = x2 - x, dy = y2 - y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const h = lebar(t) / 2;

        kiri.push([x + nx * h, y + ny * h]);
        kanan.push([x - nx * h, y - ny * h]);
    }

    const ujung = titik(1);
    const semua = [...kiri, ujung, ...kanan.reverse()];

    const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    const per = 6;
    const baris = [];

    for (let i = 0; i < semua.length; i += per) {
        const potong = semua.slice(i, i + per).map(f).join(" L ");
        baris.push((i === 0 ? "M " : "L ") + potong);
    }

    return baris.join("\n                 ") + " Z";
}

// Duri di tepi luar badan, menghadap keluar.
//
// Hanya dipasang di bagian badan yang masih TEBAL (t 0.06-0.44).
// Kalau dipasang sampai ke ekor yang sudah menipis, durinya
// terlihat seperti sirip lepas yang mengambang.
function duri() {
    const hasil = [];

    for (const t of [0.06, 0.18, 0.30, 0.42]) {
        const r = R0 + (R1 - R0) * t;
        const th = TH0 + SWEEP * t;
        const h = lebar(t) / 2;

        const x = CX + Math.cos(th) * (r + h - 6);
        const y = CY + Math.sin(th) * (r + h - 6);
        const putar = (th * 180 / Math.PI) + 90;
        const skala = (0.34 + 0.20 * (1 - t)).toFixed(2);

        hasil.push(
            `      <use href="#kerucut" ` +
            `transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) ` +
            `rotate(${putar.toFixed(0)}) scale(${skala})"/>`
        );
    }

    return hasil.join("\n");
}

// ---------------------------------------------------------
//  ISI GAMBAR (tanpa bingkai, supaya bisa diukur & dipusatkan)
// ---------------------------------------------------------

function isi() {
    return `  <!-- ============ BADAN (spiral, ekor menirus) ============ -->
  <path d="${badan()}"
        fill="url(#badan)"/>

  <!-- ============ DURI PUNGGUNG ============ -->
  <g fill="${HIJAU_GELAP}">
${duri()}
  </g>

  <!-- ============ TANDUK ============ -->
  <use href="#kerucut" transform="translate(238 214) rotate(-70) scale(0.7)"
       fill="${HIJAU_GELAP}"/>
  <use href="#kerucut" transform="translate(278 178) rotate(-44) scale(1.05)"
       fill="url(#tanduk)"/>

  <!-- ============ KEPALA ============ -->
  <!-- Sisi kiri kepala dibuat sampai x=170 supaya menutup tutup
       bulat badan (yang mencapai x=172). Tanpa itu, ujung badan
       menyembul di kiri dan terlihat seperti tonjolan. -->
  <path d="M 170 306
           C 180 240, 236 184, 300 172
           L 360 182
           L 420 206
           C 448 218, 458 236, 444 250
           L 378 262
           L 306 278
           L 236 298
           Z"
        fill="url(#kulit)"/>

  <!-- kening -->
  <path d="M 260 212 C 288 198, 322 196, 348 206"
        fill="none" stroke="${HIJAU_GELAP}" stroke-width="9"
        stroke-linecap="round" opacity="0.55"/>

  <!-- mulut -->
  <path d="M 442 244 C 398 260, 338 272, 260 284"
        fill="none" stroke="${LATAR}" stroke-width="7.5"
        stroke-linecap="round"/>

  <!-- taring -->
  <path d="M 372 264 L 378 296 L 391 266 Z" fill="${HIJAU_TERANG}"/>
  <path d="M 420 256 L 425 282 L 437 258 Z" fill="${HIJAU_TERANG}"/>

  <!-- mata: sian, supaya beda dari badan hijau -->
  <ellipse cx="334" cy="224" rx="23" ry="12.5"
           transform="rotate(-12 334 224)" fill="${LATAR}"/>
  <circle cx="342" cy="220" r="5" fill="${SIAN}"/>

  <!-- lubang hidung -->
  <circle cx="440" cy="232" r="4.2" fill="${LATAR}"/>`;
}

const DEFS = `  <defs>
    <linearGradient id="kulit" x1="0.12" y1="0" x2="0.88" y2="1">
      <stop offset="0" stop-color="${HIJAU_TERANG}"/>
      <stop offset="0.42" stop-color="${HIJAU}"/>
      <stop offset="1" stop-color="${HIJAU_GELAP}"/>
    </linearGradient>
    <linearGradient id="badan" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${HIJAU}"/>
      <stop offset="0.55" stop-color="${HIJAU_TENGAH}"/>
      <stop offset="1" stop-color="#0b7a54"/>
    </linearGradient>
    <linearGradient id="tanduk" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${HIJAU_GELAP}"/>
      <stop offset="0.5" stop-color="${HIJAU}"/>
      <stop offset="1" stop-color="${HIJAU_TERANG}"/>
    </linearGradient>
    <radialGradient id="cahaya" cx="0.56" cy="0.38" r="0.62">
      <stop offset="0" stop-color="${HIJAU}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${HIJAU}" stop-opacity="0"/>
    </radialGradient>

    <!-- Kerucut meruncing: pangkal di (0,0), ujung di (0,-100).
         Dipakai ulang untuk tanduk dan duri punggung. -->
    <path id="kerucut"
          d="M -27 0 C -25 -34, -13 -70, 0 -100
             C 13 -70, 25 -34, 27 0 Z"/>
  </defs>`;

// ---------------------------------------------------------
//  UKUR KOTAK ISI
// ---------------------------------------------------------

const MARGIN = 0.06;   // 6% tiap sisi, ruang untuk pembulatan

async function ukur(kode) {
    const { data, info } = await sharp(Buffer.from(kode), { density: 200 })
        .resize(512, 512, { fit: "contain", background: LATAR })
        .flatten({ background: LATAR })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const latar = [0x05, 0x0a, 0x08];
    let minX = info.width, minY = info.height, maxX = -1, maxY = -1;

    for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
            const i = (y * info.width + x) * info.channels;
            const d = Math.abs(data[i] - latar[0]) +
                      Math.abs(data[i + 1] - latar[1]) +
                      Math.abs(data[i + 2] - latar[2]);
            if (d < 20) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }

    return { minX, minY, maxX, maxY };
}

function bungkus(transform) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Task Vault">
  <!--
    Naga bergaya logo Kali Linux, memakai palet Task Vault:
      latar ${LATAR} · badan ${HIJAU} ke #0f8f63 · tanduk ${HIJAU_TERANG}
      mata ${SIAN}

    Berkas ini DIHASILKAN oleh scripts/gen-ikon-naga.mjs.
    Jangan diedit tangan: badan naga adalah poligon hasil
    hitungan. Setelah mengubah, jalankan:

        npm run ikon

    Ikon "any" memakai isi penuh. Ikon "maskable" dibuat
    terpisah (icon-maskable-512.png) dengan isi diperkecil ke
    zona aman 80%, karena Android memotongnya jadi lingkaran.
  -->
${DEFS}

  <rect width="512" height="512" fill="${LATAR}"/>
  <circle cx="268" cy="256" r="238" fill="url(#cahaya)"/>

  <g transform="${transform}">
${isi()}
  </g>
</svg>
`;
}

// ---- ukur isi mentah, lalu hitung transform ----
const mentah = bungkus("translate(0 0)");
const kotak = await ukur(mentah);

const lebarIsi = kotak.maxX - kotak.minX + 1;
const tinggiIsi = kotak.maxY - kotak.minY + 1;
const cxIsi = (kotak.minX + kotak.maxX) / 2;
const cyIsi = (kotak.minY + kotak.maxY) / 2;

const ruang = 512 * (1 - MARGIN * 2);
const skala = Math.min(ruang / lebarIsi, ruang / tinggiIsi);

const transform =
    `translate(256 256) scale(${skala.toFixed(4)}) ` +
    `translate(${(-cxIsi).toFixed(1)} ${(-cyIsi).toFixed(1)})`;

fs.writeFileSync(path.join(AKAR, "favicon.svg"), bungkus(transform));

console.log("favicon.svg dibuat (naga).");
console.log("kotak isi mentah :", lebarIsi + "x" + tinggiIsi,
    `(x ${kotak.minX}..${kotak.maxX}, y ${kotak.minY}..${kotak.maxY})`);
console.log("skala            :", skala.toFixed(4));
console.log("badan            : spiral", (SWEEP * 180 / Math.PI).toFixed(0) + " derajat,",
    "lebar", W0, "->", W1, "px");
