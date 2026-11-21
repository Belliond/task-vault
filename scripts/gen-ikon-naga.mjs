// =========================================================
//  PENGHASIL IKON NAGA — TASK VAULT
//
//  Karakter yang dituju: logo Kali Linux. Yang membuat logo
//  itu terasa GARANG bukan warnanya, melainkan bentuknya:
//
//    - badan berupa GARIS TIPIS memanjang (kaligrafi), bukan
//      gumpalan tebal
//    - kepala KECIL dan bersudut, moncong meruncing
//    - sulur panjang menjulur dari belakang kepala
//    - duri kecil di sepanjang leher
//    - TANPA mata bulat: matanya celah sempit
//
//  Versi sebelumnya gagal karena kebalikannya: badan gempal,
//  kepala besar membulat, mata bulat dengan pupil, taring
//  mungil. Proporsi seperti itu terbaca sebagai maskot lucu.
//
//  Warna tetap palet Task Vault, tetapi PORSINYA dibalik:
//  bidang gelap yang dominan, hijau hanya sebagai garis tipis
//  menyala. Itu yang membuat ikon ini terasa satu keluarga
//  dengan webnya, yang juga hitam dengan aksen neon tipis.
//
//    latar  #050a08
//    hijau  #4dffb2 (--green)  · gelap #19d991 (--green-dark)
//    sian   #4fe6ff (--cyan)
//
//  Seluruh geometri DIHITUNG (spine spline -> poligon menirus),
//  lalu hasilnya diukur dengan sharp dan dipusatkan otomatis.
//  Tidak ada posisi yang ditebak.
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
const HIJAU_GELAP_SEKALI = "#0d6b4a";
const SIAN = "#4fe6ff";

// ---------------------------------------------------------
//  GEOMETRI DASAR
// ---------------------------------------------------------

// Spline Catmull-Rom: kurva halus yang melewati SEMUA titik
// kendali. Dipakai supaya badan dan sulur tidak terlihat
// patah-patah seperti polyline.
function spline(titikKendali, perSegmen = 14) {
    const p = [
        titikKendali[0],
        ...titikKendali,
        titikKendali[titikKendali.length - 1]
    ];

    const hasil = [];

    for (let i = 0; i < p.length - 3; i += 1) {
        const [a, b, c, d] = [p[i], p[i + 1], p[i + 2], p[i + 3]];

        for (let j = 0; j < perSegmen; j += 1) {
            const t = j / perSegmen;
            const t2 = t * t;
            const t3 = t2 * t;

            const f = (k) =>
                0.5 * (
                    2 * b[k] +
                    (-a[k] + c[k]) * t +
                    (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 +
                    (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3
                );

            hasil.push([f(0), f(1)]);
        }
    }

    hasil.push(titikKendali[titikKendali.length - 1]);

    return hasil;
}

function pathDari(points, desimal = 1) {
    const f = (p) => `${p[0].toFixed(desimal)} ${p[1].toFixed(desimal)}`;

    const per = 7;
    const baris = [];

    for (let i = 0; i < points.length; i += per) {
        const potong = points.slice(i, i + per).map(f).join(" L ");
        baris.push((i === 0 ? "M " : "L ") + potong);
    }

    return baris.join("\n                 ") + " Z";
}

// Mengubah SPINE (garis tengah) menjadi POLIGON yang lebarnya
// menirus dari w0 ke w1.
//
// SVG tidak bisa membuat garis menirus, jadi sisi kiri dan
// kanan dihitung sendiri dari garis normal di tiap titik.
// Eksponen < 1 membuat badan tetap tebal lebih lama lalu
// menipis cepat di ujung — persis seperti sapuan kuas.
function menirus(spine, w0, w1, eksponen = 0.85) {
    const kiri = [];
    const kanan = [];
    const n = spine.length - 1;

    for (let i = 0; i <= n; i += 1) {
        const t = i / n;

        const [x, y] = spine[i];
        const [xa, ya] = spine[Math.max(0, i - 1)];
        const [xb, yb] = spine[Math.min(n, i + 1)];

        const dx = xb - xa;
        const dy = yb - ya;
        const len = Math.hypot(dx, dy) || 1;

        const nx = -dy / len;
        const ny = dx / len;

        const h = (w1 + (w0 - w1) * Math.pow(1 - t, eksponen)) / 2;

        kiri.push([x + nx * h, y + ny * h]);
        kanan.push([x - nx * h, y - ny * h]);
    }

    return pathDari([...kiri, ...kanan.reverse()]);
}

// ---------------------------------------------------------
//  BADAN: huruf S memanjang, menirus jadi ekor
// ---------------------------------------------------------

// Bentuk akhir: huruf S yang TERBUKA. Leher turun ke kiri,
// badan menyapu ke bawah, lalu ekor memanjang ke kanan dan
// berhenti sebelum tepi kanvas.
//
// Catatan penting: ekor yang terlalu panjang ke sudut kanan-bawah
// membuat isi keluar dari zona aman ikon maskable (Android
// memotongnya jadi lingkaran). Panjang ekor di bawah ini sudah
// diukur agar tetap masuk.
const SPINE_BADAN = [
    [372, 236],
    [330, 250],
    [292, 284],
    [268, 328],
    [262, 376],
    [276, 424],
    [308, 458],
    [352, 478],
    [400, 486],
    [444, 482],
    [476, 470]
];

const badan = () => menirus(spline(SPINE_BADAN), 14, 1.1, 1.0);

// Filamen ekor: rambut tipis yang melanjutkan ujung ekor ke
// kanan-atas. Detail kecil ini yang membuat siluetnya terasa
// seperti ilustrasi, bukan bentuk blok yang berhenti mendadak.
const SPINE_FILAMEN = [
    [476, 470],
    [498, 452],
    [510, 428],
    [512, 402]
];

const filamen = () => menirus(spline(SPINE_FILAMEN), 5, 0.7, 0.7);

// ---------------------------------------------------------
//  DURI PUNGGUNG
// ---------------------------------------------------------

// Duri dipasang di tepi badan dan menghadap KE LUAR.
//
// Arah luar dihitung dari titik pusat lengkungan badan. Percobaan
// sebelumnya memakai tanda normal yang salah, sehingga duri
// tumbuh ke DALAM lengkungan dan terlihat seperti gigi bersisik
// di sisi yang keliru.
function duriPunggung() {
    const spine = spline(SPINE_BADAN);
    const hasil = [];

    // Pusat lengkungan badan (di dalam kurva S).
    const PUSAT = [352, 372];

    const posisi = [0.05, 0.11, 0.17, 0.23, 0.29];

    for (const t of posisi) {
        const i = Math.round(t * (spine.length - 1));

        const [x, y] = spine[i];

        // Vektor menjauhi pusat lengkungan = arah luar.
        const vx = x - PUSAT[0];
        const vy = y - PUSAT[1];
        const vlen = Math.hypot(vx, vy) || 1;

        const nx = vx / vlen;
        const ny = vy / vlen;

        const panjang = 20 - 10 * t;
        const lebar = 9 - 4 * t;

        const ujung = [x + nx * panjang, y + ny * panjang];

        // Kaki duri diletakkan di sepanjang tepi badan.
        const tx = -ny;
        const ty = nx;

        const kiri = [x + tx * lebar / 2, y + ty * lebar / 2];
        const kanan = [x - tx * lebar / 2, y - ty * lebar / 2];

        hasil.push(
            `    <path d="M ${kiri[0].toFixed(1)} ${kiri[1].toFixed(1)} ` +
            `L ${ujung[0].toFixed(1)} ${ujung[1].toFixed(1)} ` +
            `L ${kanan[0].toFixed(1)} ${kanan[1].toFixed(1)} Z"/>`
        );
    }

    return hasil.join("\n");
}

// ---------------------------------------------------------
//  KEPALA
// ---------------------------------------------------------

// Kepala dibuat KECIL dan bersudut: baji panjang yang meruncing
// ke moncong, dengan rahang bawah yang membuka. Tidak ada rahang
// membulat dan tidak ada taring mungil — keduanya yang membuat
// versi lama terlihat seperti maskot.
const kepala = () => `  <!-- kepala: baji meruncing ke kanan -->
  <path d="M 330 240
           L 392 206
           L 448 200
           L 436 232
           L 384 254
           L 334 268
           Z"
        fill="url(#kulit)"/>

  <!-- rahang bawah: membuka, memberi kesan moncong menyeringai -->
  <path d="M 446 208
           L 404 250
           L 436 240
           Z"
        fill="${HIJAU_GELAP_SEKALI}"/>

  <!-- mata: CELAH SEMPIT, bukan bulatan dengan pupil.
       Ini pembeda utama dari maskot lucu. -->
  <path d="M 378 226 L 404 216 L 402 222 L 380 231 Z"
        fill="${LATAR}"/>
  <path d="M 382 225 L 400 218 L 399 221 L 383 228 Z"
        fill="${SIAN}"/>

  <!-- tanduk belakang: runcing, mengarah ke belakang-atas -->
  <path d="M 342 240 L 306 190 L 360 232 Z"
        fill="${HIJAU_GELAP}"/>

  <!-- tanduk kedua, lebih kecil -->
  <path d="M 356 236 L 338 200 L 372 232 Z"
        fill="${HIJAU_GELAP}" opacity="0.75"/>`;

// ---------------------------------------------------------
//  SULUR
// ---------------------------------------------------------

// Tiga sulur panjang dari belakang kepala. Inilah ciri paling
// khas logo Kali: garis-garis tipis yang menjulur jauh ke luar
// dan memaksa siluetnya melebar.
const SULUR = [
    { titik: [[330, 246], [276, 232], [214, 214], [152, 196], [96, 182]], w0: 7, w1: 0.8 },
    { titik: [[334, 258], [284, 254], [228, 246], [172, 234], [118, 220]], w0: 6, w1: 0.8 },
    { titik: [[338, 270], [292, 272], [242, 270], [192, 262], [142, 250]], w0: 5, w1: 0.8 }
];

function sulur() {
    return SULUR.map(
        (s) => `    <path d="${menirus(spline(s.titik), s.w0, s.w1, 0.8)}"/>`
    ).join("\n");
}

// ---------------------------------------------------------
//  ISI GAMBAR
// ---------------------------------------------------------

function isi() {
    return `  <!-- ============ SULUR (menjulur dari belakang kepala) ============ -->
  <g fill="${HIJAU}" opacity="0.82">
${sulur()}
  </g>

  <!-- ============ BADAN (garis tipis menirus) ============ -->
  <path d="${badan()}"
        fill="url(#badan)"/>

  <!-- ============ FILAMEN EKOR ============ -->
  <path d="${filamen()}"
        fill="${HIJAU_GELAP}"/>

  <!-- ============ DURI PUNGGUNG ============ -->
  <g fill="${HIJAU_GELAP}">
${duriPunggung()}
  </g>

${kepala()}`;
}

const DEFS = `  <defs>
    <linearGradient id="kulit" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="${HIJAU_TERANG}"/>
      <stop offset="0.45" stop-color="${HIJAU}"/>
      <stop offset="1" stop-color="${HIJAU_GELAP}"/>
    </linearGradient>
    <linearGradient id="badan" x1="0.2" y1="0" x2="0.75" y2="1">
      <stop offset="0" stop-color="${HIJAU}"/>
      <stop offset="0.5" stop-color="${HIJAU_TENGAH}"/>
      <stop offset="1" stop-color="${HIJAU_GELAP_SEKALI}"/>
    </linearGradient>
    <radialGradient id="cahaya" cx="0.58" cy="0.42" r="0.62">
      <stop offset="0" stop-color="${HIJAU}" stop-opacity="0.10"/>
      <stop offset="1" stop-color="${HIJAU}" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

// ---------------------------------------------------------
//  UKUR KOTAK ISI
// ---------------------------------------------------------

const MARGIN = 0.07;

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
      latar ${LATAR} · badan ${HIJAU} ke ${HIJAU_GELAP_SEKALI}
      mata ${SIAN}

    Yang membuatnya garang adalah BENTUKNYA: garis tipis
    memanjang, kepala kecil meruncing, sulur menjulur, mata
    berupa celah sempit. Bukan warna.

    Berkas ini DIHASILKAN oleh scripts/gen-ikon-naga.mjs.
    Jangan diedit tangan: seluruh geometri adalah hasil
    hitungan. Setelah mengubah, jalankan:

        npm run ikon

    Ikon "any" memakai isi penuh. Ikon "maskable" dibuat
    terpisah (icon-maskable-512.png) dengan isi diperkecil ke
    zona aman 76%, karena Android memotongnya jadi lingkaran.
  -->
${DEFS}

  <rect width="512" height="512" fill="${LATAR}"/>
  <circle cx="272" cy="252" r="240" fill="url(#cahaya)"/>

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

console.log("favicon.svg dibuat (naga bergaya Kali).");
console.log("kotak isi mentah :", lebarIsi + "x" + tinggiIsi,
    `(x ${kotak.minX}..${kotak.maxX}, y ${kotak.minY}..${kotak.maxY})`);
console.log("skala            :", skala.toFixed(4));
