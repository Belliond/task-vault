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
//
// `tirusMulai` menentukan di mana penipisan MULAI. Pada logo
// Kali, badan berupa pita yang lebarnya hampir tetap sepanjang
// loop, lalu baru menipis di ekor. Tanpa parameter ini, badan
// sudah menipis sejak leher dan loop-nya terlihat seperti kawat.
function menirus(spine, w0, w1, eksponen = 0.85, tirusMulai = 0) {
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

        // Bagian sebelum tirusMulai lebarnya tetap w0.
        const u = Math.max(0, (t - tirusMulai) / (1 - tirusMulai));

        const h = (w1 + (w0 - w1) * Math.pow(1 - u, eksponen)) / 2;

        kiri.push([x + nx * h, y + ny * h]);
        kanan.push([x - nx * h, y - ny * h]);
    }

    return pathDari([...kiri, ...kanan.reverse()]);
}

// ---------------------------------------------------------
//  BADAN: huruf S memanjang, menirus jadi ekor
// ---------------------------------------------------------

// Struktur diambil dari PENGUKURAN referensi (bukan perkiraan):
// referensi diperkecil ke 128x128, lalu rentang piksel putih tiap
// baris dibaca dan dikalikan 4. Hasilnya, dalam koordinat 512:
//
//   kumis   : tiga helai nyaris sejajar, menjulur dari bahu
//             (~215,180) ke kiri; ujungnya di (24,128),
//             (20,176), dan (36,232)
//   bahu    : ~(215,185), tempat kumis dan leher bertemu
//   leher   : turun ke kanan-bawah, lebar ~20 px, sampai kepala
//             di ~(320,230)
//   kepala  : baji kecil, moncong di ~(368,250)
//   loop    : sisi kiri di x~205 (y 228..270), dasar di y~315
//   ekor    : dua helai menyebar ke kanan-bawah, ujung di
//             ~(400,360) dan ~(388,416)
//
// Loop-nya memang lebar dan hampir menutup; itu bentuk aslinya.
// Yang membuatnya terbaca naga adalah kepala kecil yang tajam,
// kumis yang mengipasi, dan duri di leher.
const SPINE_BADAN = [
    [322, 232],  // pangkal kepala
    [300, 214],
    [276, 200],
    [252, 190],
    [232, 186],  // bahu
    [214, 192],
    [204, 208],
    [200, 228],  // sisi kiri loop
    [201, 250],
    [208, 272],
    [222, 290],
    [244, 303],
    [270, 311],  // dasar loop
    [298, 316],
    [322, 326],
    [340, 344],  // menyapu ke kanan
    [350, 368],
    [354, 392]   // ujung badan, tempat ekor
];

// Lebar badan: pita ~26 px yang lebarnya HAMPIR TETAP sepanjang
// leher dan loop, baru menipis di ekor (tirusMulai 0.62). Ini
// yang membuatnya terlihat seperti pita kaligrafi, bukan kawat.
//
// w1 dinaikkan dari 3 ke 9 px: dengan w1 kecil, ujung badan
// memudar hampir transparan karena gradien ikut menipis, sehingga
// ekornya terlihat pucat dan putus.
const badan = () => menirus(spline(SPINE_BADAN), 26, 9, 0.55, 0.62);

// Ekor: badan berakhir dengan garpu DUA helai tipis yang keduanya
// menjuntai ke BAWAH, seperti pada referensi.
//
// Percobaan sebelumnya membuat helai pertama menuju kanan-atas dan
// helai kedua ke bawah. Hasilnya bukan garpu, melainkan cabang
// bersudut seperti trisula, karena kedua helai berangkat ke arah
// yang berlawanan dari satu titik.
const EKOR = [
    { titik: [[354, 392], [366, 404], [378, 420], [386, 440]], w0: 7, w1: 0.6 },
    { titik: [[354, 392], [358, 412], [362, 436], [366, 462]], w0: 6, w1: 0.6 }
];

function ekor() {
    return EKOR.map(
        (e) => `    <path d="${menirus(spline(e.titik), e.w0, e.w1, 0.55)}"/>`
    ).join("\n");
}

// ---------------------------------------------------------
//  DURI PUNGGUNG
// ---------------------------------------------------------

// Duri kecil di sepanjang LEHER saja, antara kepala dan bahu.
//
// Arahnya dihitung dari ruas leher: tegak lurus terhadap arah
// leher, dipilih yang menghadap KE ATAS (di referensi duri tumbuh
// dari tepi atas leher). Percobaan sebelumnya memakai vektor dari
// titik pusat loop; pada leher yang hampir lurus hasilnya duri
// ikut berputar dan ada yang tumbuh ke dalam.
function duriPunggung() {
    const spine = spline(SPINE_BADAN);
    const hasil = [];

    // Hanya di leher: 2%..22% dari panjang spine.
    const posisi = [0.02, 0.06, 0.10, 0.14, 0.18, 0.22];

    for (let k = 0; k < posisi.length; k += 1) {
        const t = posisi[k];
        const i = Math.round(t * (spine.length - 1));

        const [x, y] = spine[i];
        const [xa, ya] = spine[Math.max(0, i - 2)];
        const [xb, yb] = spine[Math.min(spine.length - 1, i + 2)];

        const dx = xb - xa;
        const dy = yb - ya;
        const len = Math.hypot(dx, dy) || 1;

        // Normal tegak lurus leher, dipilih yang mengarah ke atas.
        let nx = dy / len;
        let ny = -dx / len;
        if (ny > 0) { nx = -nx; ny = -ny; }

        // Duri ramping dan runcing: lebih tinggi daripada lebar
        // pangkalnya, supaya terbaca sebagai duri, bukan gigi.
        const p = k / (posisi.length - 1);
        const panjang = 20 - 7 * p;
        const lebar = 6 - 1.5 * p;

        // Pangkal duri diletakkan di tepi badan (setengah lebar
        // badan), supaya duri tumbuh dari kulit.
        const tepi = 10;
        const bx = x + nx * tepi;
        const by = y + ny * tepi;

        const ujung = [bx + nx * panjang, by + ny * panjang];

        const tx = -ny;
        const ty = nx;

        const kiri = [bx + tx * lebar / 2, by + ty * lebar / 2];
        const kanan = [bx - tx * lebar / 2, by - ty * lebar / 2];

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

// Kepala: BAJI bersudut yang DIHITUNG dari ujung badan.
//
// Ini perbaikan penting. Sebelumnya kepala digambar dengan
// koordinat tetap yang ditulis tangan, sementara badan berakhir di
// titik lain. Akibatnya pangkal kepala tidak pernah tepat
// menyambung: saat diperbesar terlihat seperti kotak putih yang
// ditempel di ujung badan, dengan sambungan bersudut.
//
// Sekarang pangkal kepala diambil dari titik pertama spine badan,
// dan arah moncong dihitung dari arah leher. Jadi berapa pun spine
// diubah, kepala selalu menyambung rapat dan sejajar.
function kepala() {
    const spine = spline(SPINE_BADAN);

    const [x0, y0] = spine[0];
    const [x1, y1] = spine[6];

    // Arah MENJAUHI badan (dari leher ke moncong).
    let dx = x0 - x1;
    let dy = y0 - y1;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    // Normal tegak lurus arah moncong.
    const nx = -dy;
    const ny = dx;

    const titik = (maju, samping) => [
        x0 + dx * maju + nx * samping,
        y0 + dy * maju + ny * samping
    ];

    const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

    // Setengah lebar pangkal kepala dibuat sedikit lebih besar dari
    // setengah lebar badan, supaya kepalanya terbaca (bukan
    // menerus seperti pipa).
    const setengah = 17;

    const atas = titik(0, setengah);
    const kening = titik(30, 13);
    const moncong = titik(68, 3);
    const rahang = titik(46, -14);
    const bawah = titik(0, -setengah);

    // Mata: lensa memanjang sejajar arah moncong, di dekat kening.
    const mataA = titik(16, 6);
    const mataB = titik(40, 5);
    const mataC = titik(40, -2);
    const mataD = titik(16, 1);

    const lensa = (a, b, c, d, isi) =>
        `  <path d="M ${f(a)} Q ${f([(a[0]+b[0])/2, (a[1]+b[1])/2 - 4])} ${f(b)} ` +
        `Q ${f([(c[0]+d[0])/2, (c[1]+d[1])/2 - 2])} ${f(d)} Z"\n` +
        `        fill="${isi}"/>`;

    return `  <!-- kepala: baji dihitung dari ujung badan, jadi menyambung rapat -->
  <path d="M ${f(atas)}
           L ${f(kening)}
           L ${f(moncong)}
           L ${f(rahang)}
           L ${f(bawah)}
           Z"
        fill="url(#kulit)"/>

  <!-- mulut: celah gelap tipis di sisi bawah moncong -->
  <path d="M ${f(titik(38, -8))}
           L ${f(titik(66, -3))}
           L ${f(titik(66, 0))}
           L ${f(titik(38, -5))}
           Z"
        fill="${LATAR}"/>

  <!-- mata: CELAH SEMPIT berbentuk lensa, bukan bulatan berpupil -->
${lensa(mataA, mataB, mataC, mataD, LATAR)}
${lensa(
    [mataA[0] + dx * 3, mataA[1] + dy * 3],
    [mataB[0] - dx * 3, mataB[1] - dy * 3],
    [mataC[0] - dx * 3, mataC[1] - dy * 3],
    [mataD[0] + dx * 3, mataD[1] + dy * 3],
    SIAN
)}`;
}

// ---------------------------------------------------------
//  SULUR
// ---------------------------------------------------------

// Kumis: tiga helai yang berpangkal di BAHU lalu mengipasi ke kiri.
//
// Angka diukur dari referensi dengan memindai kolom:
//
//   x=48  -> tiga helai di y 126-130, 170-176, 226-230
//   x=192 -> tiga helai di y 142-150, 162-170, 178-186
//   x=224 -> ketiganya menyatu jadi satu pita setinggi ~34 px
//
// PELAJARAN dari percobaan sebelumnya: pangkal kumis harus
// benar-benar BERADA DI DALAM badan. Badan di sekitar bahu
// (x 240) hanya membentang setinggi ~26 px, jadi pangkal yang
// diletakkan di tepinya menyembulkan ujung rata — terlihat seperti
// batang terpotong yang menggantung di bahu.
//
// Karena itu pangkalnya sekarang dibenamkan JAUH ke dalam badan,
// di leher (x 300, y 208..228), tempat badan lebih tebal. Karena
// kumis digambar SEBELUM badan, bagian pangkalnya tertutup siluet
// dan kumis tampak tumbuh dari dalam badan — bukan ditempel.
const SULUR = [
    { titik: [[300, 210], [186, 154], [130, 138], [74, 130], [26, 126]], w0: 15, w1: 1.2 },
    { titik: [[300, 218], [182, 178], [126, 176], [70, 178], [22, 180]], w0: 14, w1: 1.2 },
    { titik: [[300, 226], [186, 208], [136, 218], [86, 228], [38, 238]], w0: 13, w1: 1.2 }
];

// Tirus baru dimulai di 25% panjang, jadi pangkalnya tetap tebal
// dan menyatu dengan bahu, lalu menipis seperti cambuk.
function sulur() {
    return SULUR.map(
        (s) => `    <path d="${menirus(spline(s.titik), s.w0, s.w1, 0.85, 0.25)}"/>`
    ).join("\n");
}

// ---------------------------------------------------------
//  ISI GAMBAR
// ---------------------------------------------------------

function isi() {
    return `  <!-- ============ KUMIS (mengipasi dari bahu ke kiri) ============ -->
  <g fill="${HIJAU}" opacity="0.9">
${sulur()}
  </g>

  <!-- ============ BADAN (garis menirus: tebal di leher, tipis di ekor) ============ -->
  <path d="${badan()}"
        fill="url(#badan)"/>

  <!-- ============ EKOR (dua helai tipis) ============ -->
  <g fill="${HIJAU_GELAP}">
${ekor()}
  </g>

  <!-- ============ DURI PUNGGUNG ============ -->
  <g fill="${HIJAU_GELAP}">
${duriPunggung()}
  </g>

${kepala()}`;
}

const DEFS = `  <defs>
    <!-- Kepala memakai gradien yang SAMA dengan badan. Percobaan
         sebelumnya memberi kepala gradien sendiri yang lebih
         terang, dan hasilnya kepala terlihat seperti potongan
         kertas putih yang ditempel, bukan bagian dari badan. -->
    <linearGradient id="kulit" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="${HIJAU}"/>
      <stop offset="0.5" stop-color="${HIJAU_TENGAH}"/>
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
