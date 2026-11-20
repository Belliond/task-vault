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
//  pukul 18.52 -> seharusnya "5 HOURS LEFT", bukan "1 DAYS LEFT".
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
        "return { getDeadlineInfo };"
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
    "20 Nov 18.52 -> 5 HOURS LEFT",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T18:52:00")).text,
    "5 HOURS LEFT"
);

cek(
    "20 Nov 23.30 -> 30 MINUTES LEFT (bukan 1 DAYS LEFT)",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T23:30:00")).text,
    "30 MINUTES LEFT"
);

cek(
    "20 Nov 20.00 tepat -> 4 HOURS LEFT",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T20:00:00")).text,
    "4 HOURS LEFT"
);

cek(
    "20 Nov 00.00 -> 1 DAY LEFT (tepat 24 jam, bukan 1 DAYS)",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T00:00:00")).text,
    "1 DAY LEFT"
);

cek(
    "21 Nov 00.00 tepat -> sudah lewat (LATE BY ...)",
    api.getDeadlineInfo(tugas10, jam("2026-11-21T00:00:00")).overdue,
    true
);

cek(
    "21 Nov 00.01 -> LATE BY 1 MINUTE",
    api.getDeadlineInfo(tugas10, jam("2026-11-21T00:01:00")).text,
    "LATE BY 1 MINUTE"
);

console.log("\n=== pembulatan ke bawah: label tidak boleh lebih longgar ===");

cek(
    "23 jam 59 menit -> 23 HOURS (bukan 1 DAY)",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T00:01:00")).text,
    "23 HOURS LEFT"
);

cek(
    "1 jam 59 menit -> 1 HOUR (bukan 2 HOURS)",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T22:01:00")).text,
    "1 HOUR LEFT"
);

cek(
    "59 menit -> 59 MINUTES",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T23:01:00")).text,
    "59 MINUTES LEFT"
);

cek(
    "sisa 30 detik -> tetap 1 MINUTE (tidak pernah 0)",
    api.getDeadlineInfo(tugas10, jam("2026-11-20T23:59:30")).text,
    "1 MINUTE LEFT"
);

console.log("\n=== tugas tanpa jam dianggap akhir hari (23:59:59) ===");

const tanpaJam = { deadline: "2026-11-21", deadline_time: null };

cek(
    "20 Nov 12.00 -> 1 DAY LEFT",
    api.getDeadlineInfo(tanpaJam, jam("2026-11-20T12:00:00")).text,
    "1 DAY LEFT"
);

cek(
    "21 Nov 23.00 -> 59 MINUTES LEFT",
    api.getDeadlineInfo(tanpaJam, jam("2026-11-21T23:00:00")).text,
    "59 MINUTES LEFT"
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

console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);
process.exit(gagal ? 1 : 0);
