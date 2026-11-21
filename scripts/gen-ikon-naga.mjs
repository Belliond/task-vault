// =========================================================
//  PENGHASIL IKON NAGA — TASK VAULT
//
//  Karakter yang dituju: logo Kali Linux.
//
//  CARA KERJA
//  Sebelumnya geometri DITEBAK dengan tangan, dan hasilnya selalu
//  bergelombang. Sekarang referensi diukur dulu, baru digambar:
//
//    1. referensi diubah jadi topeng (bentuk = piksel netral)
//    2. tiap komponen diberi label, lalu KONTURNYA dilacak
//       (Moore neighborhood) dan disederhanakan (RDP)
//    3. dari kontur itu dibaca: tebal pita, posisi dinding loop,
//       letak bahu, panjang kumis, dan bentuk kepala
//
//  Hasil ukur (px, kanvas 512) yang dipakai di bawah:
//
//    kotak bentuk   x 22..406, y 127..426
//    tebal pita     13-16 px (bukan 20+; pita Kali memang tipis,
//                   yang membuatnya tebal adalah LOOP-nya besar)
//    dinding loop   kiri x 201..218, dasar y 300..319
//    rongga loop    ~123 x 85 px
//    bahu           (250, 203) — tempat kumis berpangkal
//    leher          dari bahu ke pangkal kepala (338, 232)
//    kepala         baji kecil x 330..377, y 236..268
//    kumis          ujung (22,130), (0,185), (35,236)
//    tanduk         bilah tipis terpisah, (273,176)..(346,221)
//    ekor           dua helai, berakhir (405,381) dan (389,426)
//
//  Yang membuat logo Kali terasa GARANG, jadi yang ditiru:
//
//    - badan SATU PITA yang melingkar, ujung-ujung meruncing
//    - rongga loop besar dan lapang
//    - kepala bersudut, moncong meruncing, rahang membuka
//    - mata CELAH SEMPIT (mata bulat = lucu, ini kesalahan lama)
//    - gigi gergaji di punggung leher
//    - kumis tiga bilah yang mekar dari satu akar
//    - warna DATAR; kilau membuat bentuk tajam terlihat lunak
//
//  Warna tetap palet Task Vault:
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
const HIJAU_TERANG = "#8affd4";
const HIJAU_TENGAH = "#31f0a8";
const SIAN = "#4fe6ff";

// ---------------------------------------------------------
//  GEOMETRI DASAR
// ---------------------------------------------------------

// Spline Catmull-Rom CENTRIPETAL (alpha 0,5): tidak pernah
// overshoot, jadi kurva tidak bergelombang walau jarak antar
// titik tidak rata.
function spline(titikKendali, perSegmen = 10) {
    const alpha = 0.5;

    const p = [
        titikKendali[0],
        ...titikKendali,
        titikKendali[titikKendali.length - 1]
    ];

    const hasil = [];
    const jarak = (a, b) =>
        Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6, alpha);

    for (let i = 0; i < p.length - 3; i += 1) {
        const [p0, p1, p2, p3] = [p[i], p[i + 1], p[i + 2], p[i + 3]];

        const t0 = 0;
        const t1 = t0 + jarak(p0, p1);
        const t2 = t1 + jarak(p1, p2);
        const t3 = t2 + jarak(p2, p3);

        for (let j = 0; j < perSegmen; j += 1) {
            const t = t1 + ((t2 - t1) * j) / perSegmen;

            const lerp = (a, b, ta, tb) => {
                const u = (t - ta) / (tb - ta);
                return [
                    a[0] + (b[0] - a[0]) * u,
                    a[1] + (b[1] - a[1]) * u
                ];
            };

            const a1 = lerp(p0, p1, t0, t1);
            const a2 = lerp(p1, p2, t1, t2);
            const a3 = lerp(p2, p3, t2, t3);

            const b1 = lerp(a1, a2, t0, t2);
            const b2 = lerp(a2, a3, t1, t3);

            hasil.push(lerp(b1, b2, t1, t2));
        }
    }

    hasil.push(titikKendali[titikKendali.length - 1]);

    return hasil;
}

function pathDari(points, desimal = 1) {
    const f = (p) => `${p[0].toFixed(desimal)} ${p[1].toFixed(desimal)}`;

    const per = 8;
    const baris = [];

    for (let i = 0; i < points.length; i += per) {
        const potong = points.slice(i, i + per).map(f).join(" L ");
        baris.push((i === 0 ? "M " : "L ") + potong);
    }

    return baris.join("\n                 ") + " Z";
}

function panjangKumulatif(spine) {
    const L = [0];

    for (let i = 1; i < spine.length; i += 1) {
        L.push(L[i - 1] + Math.hypot(
            spine[i][0] - spine[i - 1][0],
            spine[i][1] - spine[i - 1][1]
        ));
    }

    return L;
}

// Profil lebar dari tabel [[t, lebar], ...], t = 0..1 panjang busur.
function lebarPada(t, tabel) {
    if (t <= tabel[0][0]) return tabel[0][1];

    for (let i = 0; i < tabel.length - 1; i += 1) {
        const [ta, wa] = tabel[i];
        const [tb, wb] = tabel[i + 1];

        if (t <= tb) {
            const u = tb - ta ? (t - ta) / (tb - ta) : 0;
            return wa + (wb - wa) * u;
        }
    }

    return tabel[tabel.length - 1][1];
}

// Spine -> dua tepi pita (kiri & kanan).
//
// Dipisah dari menirusProfil karena shading butuh tepi-tepinya
// sendiri: bayangan dalam di satu sisi, rim light di sisi lain.
function pitaTitik(spine, tabelLebar) {
    const a = [];
    const b = [];
    const n = spine.length - 1;
    const L = panjangKumulatif(spine);
    const total = L[n] || 1;

    for (let i = 0; i <= n; i += 1) {
        const t = L[i] / total;

        const [x, y] = spine[i];
        const [xa, ya] = spine[Math.max(0, i - 1)];
        const [xb, yb] = spine[Math.min(n, i + 1)];

        const dx = xb - xa;
        const dy = yb - ya;
        const len = Math.hypot(dx, dy) || 1;

        const nx = -dy / len;
        const ny = dx / len;

        const h = lebarPada(t, tabelLebar) / 2;

        a.push([x + nx * h, y + ny * h]);
        b.push([x - nx * h, y - ny * h]);
    }

    return { a, b };
}

function menirusProfil(spine, tabelLebar) {
    const { a, b } = pitaTitik(spine, tabelLebar);

    return pathDari([...a, ...b.reverse()]);
}

// Jalur sempit yang menempel di tepi `luar` dan masuk ke arah
// `dalam` sejauh `tebal` (0..1). Inilah yang dipakai untuk
// bayangan dalam dan rim light.
function jalurSisi(luar, dalam, tebal) {
    const tepi = luar.map((p, i) => [
        p[0] + (dalam[i][0] - p[0]) * tebal,
        p[1] + (dalam[i][1] - p[1]) * tebal
    ]);

    return pathDari([...luar, ...tepi.reverse()]);
}

const rataY = (daftar) =>
    daftar.reduce((j, p) => j + p[1], 0) / daftar.length;

// ---------------------------------------------------------
//  BADAN
// ---------------------------------------------------------
//
// Satu pita: pangkal kepala -> leher -> bahu -> loop -> ekor.
//
// Titik-titiknya diambil dari TENGAH pita referensi (rata-rata
// tepi dalam dan tepi luar hasil pelacakan kontur), bukan
// ditebak:
//
//   leher  x 262 -> tepi dalam y 213, tepi luar y 201 -> 207
//   bahu   (250, 203)
//   loop   dinding kiri x 201..218 -> tengah 209
//   dasar  tepi dalam y 303, tepi luar y 317 -> tengah 310
//
// Lebar 17-19 px. Referensi 13-16 px; sengaja dinaikkan sedikit
// supaya tetap terbaca saat ikon diperkecil ke 48 px di launcher.
const SPINE_BADAN = [
    [344, 231],  // pangkal kepala
    [326, 221],
    [306, 212],
    [286, 205],
    [266, 201],
    [250, 199],  // bahu: kumis berpangkal di sini
    [233, 202],
    [219, 213],
    [209, 230],
    [203, 250],
    [201, 271],
    [205, 291],
    [214, 308],
    [228, 321],
    [246, 330],
    [266, 335],
    [288, 337],
    [310, 337],
    [332, 338],
    [352, 343],
    [368, 352]   // pangkal cabang ekor
];

// Pita badan menyempit sedikit di batang ekor, lalu MENYATU
// dengan dua helai cabang. Kalau ujungnya dipotong datar, akan
// terlihat "tangga" di sambungan — itu cacat yang sudah dicoba
// diperbaiki dan berhasil dengan meniruskan ujungnya begini.
const LEBAR_BADAN = [
    [0.00, 18],   // pangkal kepala
    [0.12, 18],   // leher
    [0.26, 18],   // bahu
    [0.42, 17],   // dinding kiri loop
    [0.58, 17],
    [0.72, 17],   // dasar loop
    [0.84, 17],
    [0.92, 16],   // batang ekor
    [1.00, 13]    // pangkal cabang
];

const BADAN = spline(SPINE_BADAN, 12);

const PANJANG = panjangKumulatif(BADAN);
const TOTAL = PANJANG[PANJANG.length - 1];

// Titik + arah + lebar pada spine, dicari lewat panjang busur.
function padaSpine(t) {
    const sasaran = Math.max(0, Math.min(1, t)) * TOTAL;

    let i = 0;
    while (i < PANJANG.length - 1 && PANJANG[i] < sasaran) i += 1;

    const [x, y] = BADAN[i];
    const [xa, ya] = BADAN[Math.max(0, i - 3)];
    const [xb, yb] = BADAN[Math.min(BADAN.length - 1, i + 3)];

    const dx = xb - xa;
    const dy = yb - ya;
    const len = Math.hypot(dx, dy) || 1;

    return {
        x, y,
        tx: dx / len,
        ty: dy / len,
        lebar: lebarPada(t, LEBAR_BADAN)
    };
}

// Normal pada spine. `arah` = +1 untuk sisi KIRI arah jalan
// (dalam koordinat layar), -1 untuk sisi kanan.
function normalPada(t, arah = 1) {
    const p = padaSpine(t);

    return {
        ...p,
        nx: -p.ty * arah,
        ny: p.tx * arah
    };
}

const badan = () => menirusProfil(BADAN, LEBAR_BADAN);

// ---------------------------------------------------------
//  SHADING BADAN
// ---------------------------------------------------------
//
// Tanpa shading, pita hijau rata terlihat seperti stiker. Yang
// dipakai di sini bukan gradien mewah, melainkan tiga lapis
// sederhana yang meniru cahaya dari KIRI-ATAS:
//
//   1. bayangan dalam  — jalur sempit di tepi yang membelakangi
//      cahaya, warnanya lebih gelap, sedikit blur
//   2. rim light      — jalur sangat sempit di tepi yang
//      menghadap cahaya, warnanya lebih terang
//   3. tekstur sisik  — lengkung-lengkung tipis di sepanjang
//      pita, mengikuti arah jalan pita
//
// Ketiganya memakai geometri pita yang SAMA, jadi tidak mungkin
// meleset dari siluet.
const badanShading = () => {
    const { a, b } = pitaTitik(BADAN, LEBAR_BADAN);

    // Tepi `a` (normal -dy, dx) ada di sisi luar loop; tepi `b`
    // di sisi dalam. Cahaya datang dari kiri-atas, jadi sisi
    // dalam (menghadap rongga) lebih gelap.
    //
    // Dipakai DUA lapis bayangan dengan lebar berbeda: lapis
    // lebar yang lembut untuk membentuk volume, dan lapis
    // sempit yang lebih pekat tepat di tepi untuk memberi
    // kedalaman. Satu lapis saja terlihat seperti garis, bukan
    // bayangan.
    const gelapLuas = jalurSisi(b, a, 0.55);
    const gelapTepi = jalurSisi(b, a, 0.20);
    const terang = jalurSisi(a, b, 0.16);

    return `  <!-- bayangan dalam: lapis lebar, lembut, membentuk volume -->
  <path d="${gelapLuas}" fill="#0a4a34" opacity="0.34" filter="url(#lembut)"/>

  <!-- bayangan dalam: lapis sempit di tepi, lebih pekat -->
  <path d="${gelapTepi}" fill="#063726" opacity="0.40" filter="url(#lembut)"/>

  <!-- rim light: tepi yang menghadap cahaya -->
  <path d="${terang}" fill="${HIJAU_TERANG}" opacity="0.50"/>`;
};

// ---------------------------------------------------------
//  TEKSTUR SISIK
// ---------------------------------------------------------
//
// Sisik digambar sebagai LENGKUNG KECIL yang saling menumpuk
// (seperti sisik ikan), bukan garis melintang selebar badan.
//
// Ini koreksi penting: percobaan pertama memakai satu lengkung
// penuh dari tepi ke tepi, dan hasilnya terbaca seperti CINCIN
// pada cacing bersegmen — bukan naga. Kuncinya ada tiga:
//
//   1. sisik tidak menyentuh kedua tepi pita
//   2. barisnya BERSELANG-SELANG (staggered), jadi tidak
//      membentuk garis lurus
//   3. ujung lengkungnya membulat ke arah ekor, seperti sisik
//      yang menumpuk
//
// Semua dihitung dari spine, jadi selalu mengikuti lengkung
// badan berapa pun bentuknya diubah.
// ---------------------------------------------------------
//  TEKSTUR SISIK
// ---------------------------------------------------------
//
// Pita badan hanya ~19 px lebar di kanvas 512. Itu batas keras:
// kalau sisik dibuat banyak baris, tiap baris jadi < 5 px dan
// hasilnya terbaca seperti coretan atau anyaman, bukan sisik.
// (Dua percobaan sebelumnya gagal persis karena itu: 5 baris
// jadi anyaman tikar, 4 baris jadi kulit kayu.)
//
// Jadi di sini hanya DUA baris chevron besar per potongan, dengan
// bentuk "V" yang jelas menghadap ekor. Itu terbaca sebagai sisik
// pada ukuran besar, dan pada ukuran 48 px ia melebur jadi
// bayangan halus — bukan noise.
function sisik() {
    const hasil = [];

    // Jarak antar potongan sepanjang badan, dalam piksel busur.
    const jarakBaris = 11;

    // Dua baris: atas dan bawah. Nilai dalam satuan lebar pita.
    const baris = [-0.24, 0.24];

    const f = (q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;

    let nomor = 0;

    for (let busur = 6; busur < TOTAL * 0.9; busur += jarakBaris) {
        const t = busur / TOTAL;
        const p = padaSpine(t);

        // Sisik hanya di pita yang cukup lebar.
        if (p.lebar < 16) { nomor += 1; continue; }

        const nx = -p.ty;
        const ny = p.tx;

        // Geser bergantian, supaya chevron atas dan bawah tidak
        // membentuk garis lurus.
        const geser = nomor % 2 === 0 ? 0 : jarakBaris / 2;

        for (let r = 0; r < baris.length; r += 1) {
            const v = baris[r] * p.lebar;

            const pusat = [
                p.x + nx * v + p.tx * geser,
                p.y + ny * v + p.ty * geser
            ];

            // Chevron: dua sisi miring bertemu di ujung yang
            // menunjuk ke arah EKOR. Lebarnya hampir selebar
            // pita, tingginya sedang.
            const lebarSisi = p.lebar * 0.30;
            const tinggi = p.lebar * 0.26;

            const kiri = [
                pusat[0] - nx * lebarSisi - p.tx * tinggi,
                pusat[1] - ny * lebarSisi - p.ty * tinggi
            ];
            const ujung = [pusat[0], pusat[1]];
            const kanan = [
                pusat[0] + nx * lebarSisi - p.tx * tinggi,
                pusat[1] + ny * lebarSisi - p.ty * tinggi
            ];

            hasil.push(
                `    <path d="M ${f(kiri)} L ${f(ujung)} L ${f(kanan)}" ` +
                `fill="none" stroke="#0a4a34" stroke-width="1.5" ` +
                `stroke-linecap="round" stroke-linejoin="round" ` +
                `opacity="0.34"/>`
            );
        }

        nomor += 1;
    }

    return hasil.join("\n");
}

// ---------------------------------------------------------
//  BUTIRAN (grain)
// ---------------------------------------------------------
//
// DIHAPUS. Sudah dua pendekatan dicoba dan keduanya gagal:
//
//   1. noise halus (baseFrequency 0,85) -> terlihat bagus, tapi
//      PNG membengkak 29 KB menjadi 355 KB karena noise
//      frekuensi tinggi tidak bisa dikompresi
//   2. noise kasar (0,35) -> ukuran turun, tetapi butirannya
//      terlihat sebagai bercak lingkaran besar, bukan tekstur
//
// Untuk ikon PWA yang tampil 48-192 px, butiran tidak pernah
// terlihat sebagai tekstur — ia hanya mengotori bidang gelap.
// Dimensi pada ikon ini datang dari SHADING dan SISIK, yang
// keduanya mengikuti bentuk dan tetap tajam di ukuran kecil.
const butiran = () => "";

// ---------------------------------------------------------
//  DURI GERGAJI DI PUNGGUNG LEHER
// ---------------------------------------------------------
//
// Lima gigi di tepi ATAS leher, miring ke arah kepala seperti
// sirip. Di referensi, gigi ini yang paling menonjol membuat
// leher terlihat garang — bukan duri kecil di sepanjang badan.
//
// Digambar sebagai satu poligon bergerigi yang menyatu dengan
// pita, jadi tidak terlihat seperti mahkota yang ditempel.
function duriLeher() {
    // Leher = 5%..27% panjang badan dari kepala.
    const t0 = 0.05;
    const t1 = 0.27;
    const jumlah = 4;

    const pangkal = [];
    const puncak = [];

    for (let k = 0; k <= jumlah; k += 1) {
        const t = t0 + ((t1 - t0) * k) / jumlah;
        const p = normalPada(t, -1);

        // Sisi -1 = sisi luar (atas) leher.
        const tepi = [p.x + p.nx * (p.lebar / 2), p.y + p.ny * (p.lebar / 2)];

        pangkal.push(tepi);

        // Puncak gigi di tengah antar pangkal, menjulur keluar
        // dan dimiringkan ke arah kepala.
        if (k < jumlah) {
            const tm = t0 + ((t1 - t0) * (k + 0.5)) / jumlah;
            const pm = normalPada(tm, -1);

            const besar = 1 - 0.4 * (k / jumlah);
            const panjang = 13 * besar;

            const ux = pm.nx - pm.tx * 0.5;
            const uy = pm.ny - pm.ty * 0.5;
            const ul = Math.hypot(ux, uy) || 1;

            puncak.push([
                pm.x + pm.nx * (pm.lebar / 2) + (ux / ul) * panjang,
                pm.y + pm.ny * (pm.lebar / 2) + (uy / ul) * panjang
            ]);
        }
    }

    // Rangkai: pangkal0 -> puncak0 -> pangkal1 -> puncak1 -> ...
    const titik = [];
    for (let k = 0; k < jumlah; k += 1) {
        titik.push(pangkal[k]);
        titik.push(puncak[k]);
    }
    titik.push(pangkal[jumlah]);

    // Tutup dengan turun sedikit ke dalam pita, supaya tidak ada
    // garis tipis yang terlihat di pangkal gigi.
    const akhir = normalPada(t1, -1);
    const awal = normalPada(t0, -1);

    const dalamAkhir = [akhir.x + akhir.nx * (akhir.lebar / 2 - 9),
                        akhir.y + akhir.ny * (akhir.lebar / 2 - 9)];
    const dalamAwal = [awal.x + awal.nx * (awal.lebar / 2 - 9),
                       awal.y + awal.ny * (awal.lebar / 2 - 9)];

    const poligon = [dalamAwal, ...titik, dalamAkhir];

    return `  <path d="${pathDari(poligon)}" fill="${HIJAU}"/>`;
}

// ---------------------------------------------------------
//  TANDUK PUNGGUNG
// ---------------------------------------------------------
//
// Bilah tipis yang TERPISAH dari badan, melayang di atas leher.
// Di referensi ada celah di antaranya, dan itu yang memberi
// kesan siluet berlapis.
//
// Bentuknya: tebal di pangkal (kiri-atas), meruncing ke ujung
// kanan-bawah. Jangan dibuat sejajar sempurna dengan leher —
// versi lama begitu, dan hasilnya terbaca seperti pagar tangga.
const TANDUK_PUNGGUNG = {
    titik: [[276, 180], [294, 186], [312, 195], [328, 206], [342, 218]],
    lebar: [[0, 10], [0.3, 8], [0.65, 4], [1, 0]]
};

// ---------------------------------------------------------
//  KUMIS
// ---------------------------------------------------------
//
// Tiga bilah yang mekar dari SATU akar di bahu (250, 203).
// Ujungnya diukur dari referensi. Akarnya tebal dan menyatu,
// tebal bertahan sampai ~55% panjang, baru meruncing tajam.
//
// Versi lama memakai tiga garis tipis sama tebal dari pangkal
// ke ujung; hasilnya terbaca seperti antena serangga.
const AKAR_KUMIS = [244, 200];

const SULUR = [
    { titik: [AKAR_KUMIS, [206, 176], [158, 154], [100, 138], [34, 129]] },
    { titik: [AKAR_KUMIS, [200, 190], [146, 183], [88, 181], [26, 184]] },
    { titik: [AKAR_KUMIS, [202, 212], [150, 224], [96, 238], [44, 252]] }
];

const LEBAR_SULUR = [[0, 17], [0.18, 14], [0.45, 10], [0.72, 6], [1, 0]];

// ---------------------------------------------------------
//  EKOR
// ---------------------------------------------------------
//
// Dua helai yang keluar dari pangkal ekor. DIHITUNG dari ujung
// spine, bukan ditebak: versi lama memakai koordinat tetap dan
// hasilnya mengambang seperti sabit lepas.
//
// Helai pertama pendek dan berbelok ke kanan, helai kedua lebih
// panjang dan menjuntai lurus ke bawah — seperti di referensi.
function ekor() {
    const ujung = padaSpine(1);

    const g = (titik, lebar) =>
        `    <path d="${menirusProfil(spline(titik, 10), lebar)}"/>`;

    // Akar kedua helai DITANAM 16 px ke belakang, di dalam pita
    // badan yang lebarnya 13 px di ujung. Lebar akar 13 px sama
    // dengan lebar badan di titik itu, jadi siluetnya menyatu
    // tanpa "tangga" dan tanpa lekuk.
    const akar = [ujung.x - ujung.tx * 16, ujung.y - ujung.ty * 16];

    // Helai pendek: melanjutkan arah badan lalu membelok ke kanan.
    const pendek = [
        akar,
        [378, 350],
        [394, 362],
        [406, 378]
    ];

    // Helai panjang: membelok lebih tajam ke bawah, berakhir
    // paling rendah. Ujungnya (389, 424) — diukur dari referensi.
    const panjang = [
        akar,
        [374, 358],
        [380, 388],
        [386, 424]
    ];

    return [
        g(pendek, [[0, 13], [0.35, 9], [0.72, 5], [1, 0]]),
        g(panjang, [[0, 13], [0.35, 9], [0.72, 5], [1, 0]])
    ].join("\n");
}

// ---------------------------------------------------------
//  KEPALA
// ---------------------------------------------------------
//
// Digambar di KOORDINAT LOKAL lalu dipetakan memakai arah ujung
// pita, jadi selalu menyambung rapat dengan badan.
//
//   u = searah moncong (keluar dari badan)
//   v = dorsal (sisi atas kepala)
//
// Bentuk di referensi: baji kecil x 330..377, y 236..268 — hanya
// 47 px panjangnya. Versi lama membuatnya 70+ px dan hasilnya
// terbaca seperti paruh ikan. Kepala naga harus KECIL.
//
// Di sini kepalanya digambar sendiri, bukan disalin: tengkorak
// bersudut dengan kening menonjol, moncong meruncing ke bawah,
// rahang bawah membuka, tiga taring, dan mata CELAH SEMPIT.
const SKALA_KEPALA = 0.86;

// Kepala: BAJI MULUS yang meruncing ke moncong.
//
// Ini koreksi penting. Saya sempat menggambar rahang menganga,
// gigi, dan taring — hasilnya terbaca seperti tengkorak pecah,
// bukan naga. Setelah referensi dizoom (tmp-kepala-zoom.png),
// ternyata kepala Kali SEDERHANA: satu baji mulus yang menipis
// ke ujung runcing, dengan satu celah mata tipis. Keganasan
// datang dari siluet yang bersih dan tajam, bukan dari detail.
//
// Titik di bawah memakai koordinat lokal:
//   u = searah moncong · v = dorsal (sisi atas)
// Baji melebar di pangkal (v -13..15), lalu menipis ke ujung
// di (62, 0). Sisi dorsal sedikit cembung, sisi ventral lurus.
const KEPALA_BAJI = [
    [-18, -11], [-4, -13], [10, -12], [26, -9],
    [42, -5], [56, -1], [62, 0],
    [52, 2], [36, 6], [20, 11], [4, 14], [-18, 15]
];

// Tanduk: bilah TIPIS yang terpisah dari kepala, menyapu ke
// belakang-atas. Di referensi ada celah di antaranya, dan celah
// itu yang membuat siluetnya terasa berlapis.
const TANDUK_KEPALA = {
    titik: [[-10, 13], [-28, 26], [-46, 34], [-62, 36]],
    lebar: [[0, 11], [0.35, 7], [0.72, 3], [1, 0]]
};

function kepala() {
    const p = padaSpine(0);

    // Arah moncong = keluar dari badan (berlawanan arah spine).
    const dx = -p.tx;
    const dy = -p.ty;

    // Normal dorsal: tegak lurus moncong, dipilih yang ke ATAS.
    let nx = dy;
    let ny = -dx;
    if (ny > 0) { nx = -nx; ny = -ny; }

    const P = (u, v) => [
        p.x + dx * u * SKALA_KEPALA + nx * v * SKALA_KEPALA,
        p.y + dy * u * SKALA_KEPALA + ny * v * SKALA_KEPALA
    ];

    const f = (q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;

    // Baji digambar dengan spline tertutup supaya sisinya mulus,
    // bukan poligon bersudut.
    const dunia = KEPALA_BAJI.map(([u, v]) => P(u, v));
    const baji = pathDari(spline([...dunia, dunia[0], dunia[1]], 8));

    const tanduk = menirusProfil(
        spline(TANDUK_KEPALA.titik.map(([u, v]) => P(u, v)), 10),
        TANDUK_KEPALA.lebar
    );

    // Mata: CELAH SEMPIT berbentuk lensa, bukan bulatan berpupil.
    // Mata bulat adalah kesalahan versi pertama: itu yang membuat
    // naganya terlihat lucu, bukan garang.
    const mata = [[8, 7], [30, 9], [34, 5], [10, 2]];
    const mataIsi = [[12, 6.6], [26, 8], [29, 5.4], [13, 3.4]];

    // Shading kepala: sisi ventral (bawah) lebih gelap, sisi
    // dorsal (atas) dapat rim light. Digambar sebagai poligon
    // yang dibentuk dari titik-titik baji, jadi selalu pas.
    const dorsal = [
        [-18, 15], [4, 14], [20, 11], [36, 6], [52, 2], [62, 0],
        [56, 4], [40, 8], [24, 12], [6, 15], [-18, 16]
    ];
    const ventral = [
        [-18, -11], [-4, -13], [10, -12], [26, -9], [42, -5], [56, -1],
        [48, -3], [32, -6], [16, -9], [0, -11], [-18, -12]
    ];

    const poligon = (daftar) =>
        pathDari(spline([...daftar.map(([u, v]) => P(u, v))], 8));

    return `  <!-- kepala: baji mulus meruncing, celah mata tipis -->
  <g fill="${HIJAU}">
    <path d="${baji}"/>
    <path d="${tanduk}"/>
  </g>

  <!-- shading kepala: ventral lebih gelap, dorsal dapat cahaya -->
  <path d="${poligon(ventral)}" fill="#0a4a34" opacity="0.45"
        filter="url(#lembut)"/>
  <path d="${poligon(dorsal)}" fill="${HIJAU_TERANG}" opacity="0.40"/>

  <!-- mata: CELAH SEMPIT, bukan bulatan berpupil -->
  <path d="M ${mata.map(([u, v]) => f(P(u, v))).join(" L ")} Z" fill="${LATAR}"/>
  <path d="M ${mataIsi.map(([u, v]) => f(P(u, v))).join(" L ")} Z" fill="${SIAN}"/>`;
}

// ---------------------------------------------------------
//  ISI GAMBAR
// ---------------------------------------------------------

function isi() {
    const tanduk = menirusProfil(
        spline(TANDUK_PUNGGUNG.titik, 10),
        TANDUK_PUNGGUNG.lebar
    );

    return `  <!-- ============ EKOR (dua helai, digambar DULU supaya
       pangkalnya tertutup badan yang menirus) ============ -->
  <g fill="${HIJAU_TENGAH}">
${ekor()}
  </g>

  <!-- ============ TANDUK PUNGGUNG (terpisah dari badan) ============ -->
  <path d="${tanduk}" fill="${HIJAU_TENGAH}"/>

  <!-- ============ KUMIS (tiga bilah dari satu akar) ============ -->
  <g fill="${HIJAU_TENGAH}">
${SULUR.map((s) => `    <path d="${menirusProfil(spline(s.titik, 12), LEBAR_SULUR)}"/>`).join("\n")}
  </g>

  <!-- ============ DURI GERGAJI ============ -->
${duriLeher()}

  <!-- ============ BADAN (satu pita melingkar) ============ -->
  <path d="${badan()}"
        fill="url(#badan)"/>

  <!-- ============ SHADING & TEKSTUR BADAN ============ -->
${badanShading()}

  <!-- ============ SISIK ============ -->
  <g>
${sisik()}
  </g>

${kepala()}`;
}

const DEFS = `  <defs>
    <!-- Gradien SANGAT tipis: cukup memberi arah, tidak sampai
         membuat bentuk tajam terlihat lunak seperti mainan. -->
    <linearGradient id="badan" x1="0.1" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${HIJAU_TERANG}"/>
      <stop offset="0.22" stop-color="${HIJAU}"/>
      <stop offset="0.72" stop-color="${HIJAU_TENGAH}"/>
      <stop offset="1" stop-color="${HIJAU_GELAP}"/>
    </linearGradient>
    <radialGradient id="cahaya" cx="0.58" cy="0.45" r="0.60">
      <stop offset="0" stop-color="${HIJAU}" stop-opacity="0.09"/>
      <stop offset="1" stop-color="${HIJAU}" stop-opacity="0"/>
    </radialGradient>

    <!-- Pelembut untuk bayangan dalam. Tanpa blur, batas
         bayangan terlihat sebagai garis keras dan bentuknya
         kembali terasa datar. -->
    <filter id="lembut" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="1.6"/>
    </filter>

    <!-- Butiran: lihat catatan di fungsi butiran(). Filter ini
         tetap ada untuk jaga-jaga, tetapi tidak dipakai. -->
    <filter id="butir" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.35"
                    numOctaves="2" seed="11" result="n"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>

    <clipPath id="lingkaranButir">
      <circle cx="256" cy="256" r="200"/>
    </clipPath>
  </defs>`;

// ---------------------------------------------------------
//  UKUR KOTAK ISI
// ---------------------------------------------------------

const MARGIN = 0.05;

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

function bungkus(transform, denganButiran = false) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Task Vault">
  <!--
    Naga bergaya logo Kali Linux, memakai palet Task Vault:
      latar ${LATAR} · badan ${HIJAU} ke ${HIJAU_GELAP}
      mata ${SIAN}

    Yang membuatnya garang adalah BENTUKNYA, bukan warnanya:
    satu pita melingkar dengan rongga lapang, ujung meruncing,
    kepala kecil bersudut, mata celah sempit, gigi gergaji di
    punggung leher, kumis tiga bilah yang mekar, dan ekor dua
    helai.

    Supaya tidak terasa seperti stiker datar, ada tiga lapis
    dimensi: bayangan dalam di sisi yang membelakangi cahaya,
    rim light di tepi yang menghadap cahaya, dan tekstur sisik
    di sepanjang pita. Ditambah butiran halus di seluruh kanvas.

    Proporsi diukur dari referensi lewat pelacakan kontur; lihat
    catatan di SPINE_BADAN. Berkas ini DIHASILKAN oleh
    scripts/gen-ikon-naga.mjs — jangan diedit tangan.
  -->
${DEFS}

  <rect width="512" height="512" fill="${LATAR}"/>
  <circle cx="256" cy="256" r="240" fill="url(#cahaya)"/>

  <g transform="${transform}">
${isi()}
  </g>
${denganButiran ? butiran() : ""}
</svg>
`;
}

// ---- ukur isi mentah, lalu hitung transform ----
//
// Pengukuran memakai SVG TANPA butiran: butiran menutupi seluruh
// kanvas, sehingga kotak isi akan terukur 512x512 dan skalanya
// jadi salah. Butiran baru ditambahkan pada berkas akhir.
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

fs.writeFileSync(path.join(AKAR, "favicon.svg"), bungkus(transform, true));

console.log("favicon.svg dibuat (naga bergaya Kali).");
console.log("kotak isi mentah :", lebarIsi + "x" + tinggiIsi,
    `(x ${kotak.minX}..${kotak.maxX}, y ${kotak.minY}..${kotak.maxY})`);
console.log("skala            :", skala.toFixed(4));
