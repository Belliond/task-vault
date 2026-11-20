// =========================================================
//  UJI LABEL SISA WAKTU DEADLINE
//
//  Bug yang diuji: label dulu dihitung dari selisih TANGGAL
//  kalender (kedua sisi di-startOfDay), sehingga tugas yang
//  deadline-nya pukul 00:00 malam ini tertulis "1 DAYS LEFT"
//  padahal tinggal beberapa jam. Jam deadline-nya hilang.
//
//  Kasus nyata: "Pengumpulan Tugas 10" Jaringan Komputer,
//  deadline 2026-11-21 pukul 00:00:00, dilihat 2026-11-20
//  pukul 18.52 -> seharusnya "04:52:00 LEFT", bukan "1 DAYS LEFT".
//
//  Aturan format:
//    >= 1 hari  : "3 DAYS LEFT"
//    <  1 hari  : "04:52:00 LEFT"  (jam:menit:detik, bergerak)
//
//  Fungsi diambil dari script.js asli (bukan salinan), lalu
//  dijalankan dengan waktu "sekarang" yang ditentukan tes.
//
//  Dijalankan: node scripts/test-deadline.mjs
// =========================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);

const sumber = fs.readFileSync(path.join(AKAR, "script.js"), "utf8");

// Potong fungsi asli beserta kurung kurawalnya.
function potong(nama) {
    const mulai = sumber.indexOf(`function ${nama}(`);
    if (mulai === -1) throw new Error(`fungsi ${nama} tidak ditemukan`);

    let i = sumber.indexOf("{", mulai);
    let dalam = 0;

    for (let j = i; j < sumber.length; j += 1) {
        if (sumber[j] === "{") dalam += 1;
        else if (sumber[j] === "}") {
            dalam -= 1;
            if (dalam === 0) return sumber.slice(mulai, j + 1);
        }
    }

    throw new Error(`fungsi ${nama} tidak tertutup`);
}

const api = new Function(
    [
        potong("deadlineMoment"),
        // startOfDay ikut disertakan supaya kalau suatu saat fungsi
        // ini dikembalikan ke versi lama (yang memakai startOfDay),
        // tes tetap berjalan dan GAGAL pada asersinya — bukan mati
        // dengan ReferenceError yang membingungkan.
        potong("startOfDay"),
        potong("getDeadlineInfo"),
        potong("durasi"),
        potong("teksSisaWaktu"),
        potong("taskDariAtribut"),
        "return { getDeadlineInfo, teksSisaWaktu, taskDariAtribut };"
    ].join("\n\n")
)();

let lulus = 0;
let gagal = 0;

function cek(nama, dapat, harap) {
    const a = JSON.stringify(dapat);
    const b = JSON.stringify(harap);

    if (a === b) {
        lulus += 1;
        console.log("  OK    " + nama);
    }
    else {
        gagal += 1;
        console.log("  GAGAL " + nama);
        console.log("         dapat : " + a);
        console.log("         harap : " + b);
    }
}

// Waktu "sekarang" dibuat eksplisit supaya hasil tes tidak
// berubah tergantung kapan tes dijalankan.
const jam = (teks) => new Date(teks);

// Tugas persis seperti yang tersimpan di perangkat.
const tugas10 = {
    deadline: "2026-11-21",
    deadline_time: "00:00:00"
};

console.log("=== kasus nyata: Jarkom Tugas 10 (deadline 21 Nov 00.00) ===");

cek(
    "20 Nov 18.52 -> 05:08:00 LEFT",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T18:52:00")).text,
    "05:08:00 LEFT"
);

cek(
    "20 Nov 19.01.57 -> 04:58:03 LEFT (sampai detik)",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T19:01:57")).text,
    "04:58:03 LEFT"
);

cek(
    "20 Nov 23.30 -> 00:30:00 LEFT (bukan 1 DAYS LEFT)",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T23:30:00")).text,
    "00:30:00 LEFT"
);

cek(
    "20 Nov 23.59.59 -> 00:00:01 LEFT",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T23:59:59")).text,
    "00:00:01 LEFT"
);

cek(
    "20 Nov 00.00 -> 1 DAY LEFT (tepat 24 jam, satuan hari)",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T00:00:00")).text,
    "1 DAY LEFT"
);

cek(
    "21 Nov 00.00 tepat -> sudah lewat",
    api.getDeadlineInfo(tugas10, jam("2026-11-21T00:00:00")).overdue,
    true
);

cek(
    "21 Nov 00.01 -> LATE BY 00:01:00",
    api.getDeadlineInfo(tugas10, jam("2026-11-21T00:01:00")).text,
    "LATE BY 00:01:00"
);

console.log("\n=== batas sehari: di bawah 24 jam pakai jam:menit:detik ===");

cek(
    "23 jam 59 menit -> 23:59:00 (bukan 23 HOURS)",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T00:01:00")).text,
    "23:59:00 LEFT"
);

cek(
    "1 jam 59 menit -> 01:59:00",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T22:01:00")).text,
    "01:59:00 LEFT"
);

cek(
    "59 menit -> 00:59:00",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T23:01:00")).text,
    "00:59:00 LEFT"
);

cek(
    "sisa 30 detik -> 00:00:30",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T23:59:30")).text,
    "00:00:30 LEFT"
);

cek(
    "sisa 0,4 detik -> tetap 00:00:01 (tidak pernah 00:00:00)",
    api.getDeadlineInfo(tugas10, new Date(
        jam("2026-11-21T00:00:00").getTime() - 400
    )).text,
    "00:00:01 LEFT"
);

console.log("\n=== >= 24 jam tetap satuan hari ===");

const jauh = { deadline: "2026-11-24", deadline_time: "23:59:00" };

cek(
    "20 Nov 12.00 -> 4 DAYS LEFT",
    api.getDeadlineInfo(jauh, jam("2026-11-20T12:00:00")).text,
    "4 DAYS LEFT"
);

cek(
    "23 Nov 23.58 -> 1 DAY LEFT (bukan jam:menit:detik)",
    api.getDeadlineInfo(jauh, jam("2026-11-23T23:58:00")).text,
    "1 DAY LEFT"
);

console.log("\n=== tugas tanpa jam dianggap akhir hari (23:59:59) ===");

const tanpaJam = { deadline: "2026-11-21", deadline_time: null };

cek(
    "20 Nov 12.00 -> 1 DAY LEFT",
    api.getDeadlineInfo(tanpaJam, jam("2026-11-20T12:00:00")).text,
    "1 DAY LEFT"
);

cek(
    "21 Nov 23.00 -> 00:59:59 LEFT",
    api.getDeadlineInfo(tanpaJam, jam("2026-11-21T23:00:00")).text,
    "00:59:59 LEFT"
);

console.log("\n=== tenggat lewat lebih dari sehari ===");

const lewat = { deadline: "2026-11-15", deadline_time: "23:59:00" };

cek(
    "20 Nov 12.00 -> LATE BY 4 DAYS",
    api.getDeadlineInfo(lewat, jam("2026-11-20T12:00:00")).text,
    "LATE BY 4 DAYS"
);

cek(
    "tenggat lewat ditandai overdue",
    api.getDeadlineInfo(lewat, jam("2026-11-20T12:00:00")).overdue,
    true
);

console.log("\n=== tanggal tidak sah ===");

cek(
    "deadline kosong -> '-'",
    api.getDeadlineInfo({ deadline: "", deadline_time: null }, jam("2026-11-20T12:00:00")).text,
    "-"
);

console.log("\n=== penanda untuk pengatur detak ===");

cek(
    "label harian tidak perlu detak",
    api.teksSisaWaktu(jauh, jam("2026-11-20T12:00:00")).rinci,
    false
);

cek(
    "label jam:menit:detik perlu detak",
    api.teksSisaWaktu(tugas10, jam("2026-11-20T19:01:57")).rinci,
    true
);

cek(
    "label tenggat lewat sehari tidak perlu detak",
    api.teksSisaWaktu(lewat, jam("2026-11-20T12:00:00")).rinci,
    false
);

console.log("\n=== atribut data-deadline dipisah tanggal & jam ===");

// Bug yang pernah lolos: atribut menyimpan "2026-11-21T00:00:00",
// lalu seluruhnya dimasukkan sebagai task.deadline. deadlineMoment()
// memotong 10 karakter pertama (tanggal saja) dan diam-diam memakai
// 23:59:59, sehingga hitung mundur meleset hampir sehari tanpa error.
const dariAtribut = api.taskDariAtribut("2026-11-21T00:00:00");

cek(
    "tanggal dipisah dari jam",
    [dariAtribut.deadline, dariAtribut.deadline_time],
    ["2026-11-21", "00:00:00"]
);

cek(
    "sisa waktu tetap benar setelah lewat atribut",
    api.getDeadlineInfo(dariAtribut, jam("2026-11-20T19:01:57")).text,
    "04:58:03 LEFT"
);

cek(
    "tanpa jam tetap terbaca",
    api.taskDariAtribut("2026-11-21").deadline,
    "2026-11-21"
);

cek(
    "atribut kosong tidak melempar",
    api.taskDariAtribut("").deadline,
    ""
);

console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);
process.exit(gagal ? 1 : 0);
