// Uji fungsi murni di scripts/sync-lms.mjs.
//
// Semua fungsi yang diuji di sini tidak menyentuh jaringan
// maupun database, jadi bisa dijalankan kapan saja:
//
//     npm test
//
// Yang paling penting diuji adalah pergeseran tanggal UTC -> WIB
// untuk Classroom. Kesalahan di situ tidak menimbulkan error,
// hanya tugas yang muncul di hari yang salah — jenis kesalahan
// yang paling sulit disadari.

import {
    tanggalWib,
    jamWib,
    tanggalWibDariUtc,
    susunBarisClassroom,
    cariUsang,
    cariUsangClassroom,
    saringKelasClassroom,
    petikToken,
    bersihkanTeks,
    ringkasSubmission,
    ringkasSubmissionMoodle,
    ringkasSubmissionClassroom
} from "./sync-lms.mjs";

let lulus = 0;
let gagal = 0;

function cek(nama, dapat, harap) {

    const a = JSON.stringify(dapat);
    const b = JSON.stringify(harap);

    if (a === b) {
        lulus += 1;
        console.log("  OK   " + nama);
    }
    else {
        gagal += 1;
        console.log("  GAGAL " + nama);
        console.log("        dapat : " + a);
        console.log("        harap : " + b);
    }

}

console.log("\n=== tanggalWibDariUtc ===");

// Kasus paling penting: 17:00 UTC sudah lewat tengah malam WIB,
// jadi harus tercatat sehari setelah tanggal UTC-nya.
cek(
    "17:00 UTC -> besok WIB",
    tanggalWibDariUtc(
        { year: 2026, month: 11, day: 17 },
        { hours: 17, minutes: 0 }
    ),
    "2026-11-18"
);

cek(
    "16:59 UTC -> masih hari yang sama WIB",
    tanggalWibDariUtc(
        { year: 2026, month: 11, day: 17 },
        { hours: 16, minutes: 59 }
    ),
    "2026-11-17"
);

cek(
    "23:59 UTC -> besok WIB",
    tanggalWibDariUtc(
        { year: 2026, month: 11, day: 17 },
        { hours: 23, minutes: 59 }
    ),
    "2026-11-18"
);

cek(
    "00:00 UTC -> hari yang sama WIB",
    tanggalWibDariUtc(
        { year: 2026, month: 11, day: 17 },
        { hours: 0, minutes: 0 }
    ),
    "2026-11-17"
);

// Tanpa jam: tanggal dipakai apa adanya.
cek(
    "tanpa dueTime",
    tanggalWibDariUtc({ year: 2026, month: 11, day: 17 }, null),
    "2026-11-17"
);

// Pergantian bulan dan tahun harus ikut benar.
cek(
    "31 Des 17:00 UTC -> 1 Jan WIB",
    tanggalWibDariUtc(
        { year: 2026, month: 12, day: 31 },
        { hours: 17, minutes: 0 }
    ),
    "2027-01-01"
);

cek(
    "tanpa dueDate",
    tanggalWibDariUtc(null, null),
    ""
);

console.log("\n=== susunBarisClassroom ===");

const courses = [
    { id: "111", name: "Kriptografi" },
    { id: "222", name: "Metodologi Penelitian" }
];

const coursework = [
    // aktif, jam UTC menggeser ke hari berikutnya
    {
        id: "900",
        courseId: "111",
        title: "Tugas 3",
        state: "PUBLISHED",
        dueDate: { year: 2026, month: 11, day: 17 },
        dueTime: { hours: 17, minutes: 0 }
    },
    // tanpa deadline
    {
        id: "901",
        courseId: "111",
        title: "Diskusi",
        state: "PUBLISHED"
    },
    // sudah lewat
    {
        id: "902",
        courseId: "111",
        title: "Tugas 1",
        state: "PUBLISHED",
        dueDate: { year: 2026, month: 11, day: 1 },
        dueTime: { hours: 3, minutes: 0 }
    },
    // draf
    {
        id: "903",
        courseId: "222",
        title: "Draf",
        state: "DRAFT",
        dueDate: { year: 2026, month: 11, day: 20 }
    },
    // deadline hari ini: masih aktif
    {
        id: "904",
        courseId: "222",
        title: "Kuis Hari Ini",
        state: "PUBLISHED",
        dueDate: { year: 2026, month: 11, day: 13 }
    }
];

const hasil = susunBarisClassroom({
    courses,
    coursework,
    hariIni: "2026-11-13"
});

cek("jumlah aktif", hasil.baris.length, 2);
cek("tanpa deadline", hasil.tanpaDeadline, 1);
cek("kedaluwarsa", hasil.kedaluwarsa, 1);
cek("draf", hasil.draf, 1);

cek("external_id sama dengan frontend", hasil.baris[0].external_id, "gc:111:900");
cek("nama kelas diisi", hasil.baris[0].class_name, "Kriptografi");
cek("deadline digeser ke WIB", hasil.baris[0].deadline, "2026-11-18");
cek("kategori", hasil.baris[0].category, "Classroom");
cek("source", hasil.baris[0].source, "classroom");
cek("deadline hari ini tetap aktif", hasil.baris[1].deadline, "2026-11-13");
cek("kelas kedua benar", hasil.baris[1].class_name, "Metodologi Penelitian");
cek("jam WIB dari dueTime", hasil.baris[0].deadline_time, "00:00:00");
cek("tanpa dueTime -> tanpa jam", hasil.baris[1].deadline_time, null);

console.log("\n=== cariUsangClassroom ===");

const existing = [
    // deadline lewat
    { id: 1, external_id: "gc:111:902", deadline: "2026-11-01" },
    // kelas tidak dikenal lagi
    { id: 2, external_id: "gc:999:1", deadline: "2026-12-01" },
    // masih berlaku
    { id: 3, external_id: "gc:111:900", deadline: "2026-11-18" },
    // bukan Classroom, jangan disentuh
    { id: 4, external_id: "assign:1016:1795", deadline: "2026-01-01" }
];

const usang = cariUsangClassroom({
    existing,
    idKelasDikenal: new Set(["111", "222"]),
    hariIni: "2026-11-13"
});

cek("jumlah usang", usang.map((r) => r.id), [1, 2]);

console.log("\n=== petikToken ===");

// Nilai yang ditempel dari halaman Moodle sering bukan token murni.
cek("token murni", petikToken("a86da19eb8eaef66d59392f43c63db11"), "a86da19eb8eaef66d59392f43c63db11");
cek(
    "dari URL",
    petikToken("https://kuliah2.itera.ac.id/webservice/rest/server.php?wstoken=a86da19eb8eaef66d59392f43c63db11&wsfunction=x"),
    "a86da19eb8eaef66d59392f43c63db11"
);
cek("dari teks berparameter", petikToken("token=a86da19eb8eaef66d59392f43c63db11"), "a86da19eb8eaef66d59392f43c63db11");
cek("kosong", petikToken(""), null);
cek("JWT bukan token Moodle", petikToken("eyJhbGciOiJIUzI1NiJ9.abc.def"), null);

console.log("\n=== tanggalWib (Moodle, Unix detik) ===");

// 2026-11-15 16:59:00 UTC = 23:59 WIB, masih tanggal 15.
cek(
    "16:59 UTC -> 15 Nov",
    tanggalWib(Date.UTC(2026, 10, 15, 16, 59, 0) / 1000),
    "2026-11-15"
);

// 2026-11-15 17:00:00 UTC = 00:00 WIB tanggal 16.
cek(
    "17:00 UTC -> 16 Nov",
    tanggalWib(Date.UTC(2026, 10, 15, 17, 0, 0) / 1000),
    "2026-11-16"
);

// Jam deadline harus ikut tersimpan dalam WIB.
cek(
    "jam 16:59 UTC -> 23:59:00 WIB",
    jamWib(Date.UTC(2026, 10, 15, 16, 59, 0) / 1000),
    "23:59:00"
);

console.log("\n=== cariUsang dengan mata kuliah dikecualikan ===");

// Baris Moodle dari mata kuliah yang tidak dicentang di halaman
// web harus ikut dibersihkan, bukan tertinggal di daftar.
const barisMoodle = [
    { id: 1, external_id: "assign:1016:1795", deadline: "2026-12-01" },
    { id: 2, external_id: "assign:968:2001", deadline: "2026-12-01" },
    { id: 3, external_id: "gc:876689741003:123", deadline: "2026-12-01" }
];

cek(
    "tanpa filter: tidak ada yang usang",
    cariUsang({
        existing: barisMoodle,
        idTerpilih: null,
        idKecuali: new Set(),
        hariIni: "2026-11-13"
    }).map((r) => r.id),
    []
);

cek(
    "mata kuliah 968 dikecualikan: barisnya dibuang",
    cariUsang({
        existing: barisMoodle,
        idTerpilih: null,
        idKecuali: new Set(["968"]),
        hariIni: "2026-11-13"
    }).map((r) => r.id),
    [2]
);

// Baris Classroom TIDAK boleh ikut terhapus oleh filter Moodle.
cek(
    "baris classroom tidak tersentuh",
    cariUsang({
        existing: barisMoodle,
        idTerpilih: null,
        idKecuali: new Set(["968"]),
        hariIni: "2026-11-13"
    }).some((r) => String(r.external_id).startsWith("gc:")),
    false
);

cek(
    "hanya + kecuali digabung",
    cariUsang({
        existing: barisMoodle,
        idTerpilih: new Set(["1016"]),
        idKecuali: new Set(["968"]),
        hariIni: "2026-11-13"
    }).map((r) => r.id),
    [2]
);

console.log("\n=== saringKelasClassroom ===");
// Kelas lama yang masih ACTIVE di Google pernah ikut tersync
// dan memunculkan "PBO RA 2026" di halaman web. Filter ini
// yang mencegahnya terulang.
const kelasUji = [
    { id: "876689741003", name: "Kriptografi" },
    { id: "843941141691", name: "PBO RA 2026" },
    { id: "850975217403", name: "Praktikum PBO RA" }
];

cek(
    "tanpa filter: semua dipakai",
    saringKelasClassroom({ courses: kelasUji }).dipakai.map((c) => c.name),
    ["Kriptografi", "PBO RA 2026", "Praktikum PBO RA"]
);

cek(
    "kecuali potongan nama persis",
    saringKelasClassroom({ courses: kelasUji, kecuali: ["PBO RA 2026"] })
        .dipakai.map((c) => c.name),
    ["Kriptografi", "Praktikum PBO RA"]
);

// Pencocokan harus case-insensitive: user mengetik huruf kecil.
cek(
    "kecuali nama huruf kecil tetap kena",
    saringKelasClassroom({ courses: kelasUji, kecuali: ["pbo ra 2026"] })
        .dipakai.map((c) => c.name),
    ["Kriptografi", "Praktikum PBO RA"]
);

// "PBO RA" TIDAK boleh ikut membuang "Praktikum PBO RA".
cek(
    "potongan nama tidak membuang kelas lain yang mirip",
    saringKelasClassroom({ courses: kelasUji, kecuali: ["PBO RA 2026"] })
        .dipakai.length,
    2
);

cek(
    "kecuali berdasarkan id",
    saringKelasClassroom({ courses: kelasUji, kecuali: ["843941141691"] })
        .dipakai.map((c) => c.id),
    ["876689741003", "850975217403"]
);

cek(
    "hanyaIds: ambil satu kelas saja",
    saringKelasClassroom({ courses: kelasUji, hanyaIds: ["876689741003"] })
        .dipakai.map((c) => c.name),
    ["Kriptografi"]
);

cek(
    "hanyaIds dan kecuali dipakai bersama",
    saringKelasClassroom({
        courses: kelasUji,
        hanyaIds: ["876689741003", "843941141691"],
        kecuali: ["PBO RA 2026"]
    }).dipakai.map((c) => c.name),
    ["Kriptografi"]
);

cek(
    "daftar dibuang ikut dilaporkan",
    saringKelasClassroom({ courses: kelasUji, kecuali: ["PBO RA 2026"] })
        .dibuang.map((c) => c.name),
    ["PBO RA 2026"]
);

cek(
    "string kosong diabaikan, bukan mencocokkan semua",
    saringKelasClassroom({ courses: kelasUji, kecuali: ["", "  "] })
        .dipakai.length,
    3
);

console.log("\n=== bersihkanTeks ===");

cek(
    "tag HTML dibuang, isi tetap",
    bersihkanTeks("<p>Halo <b>dunia</b></p><br>Baris 2"),
    "Halo dunia\n\nBaris 2"
);

cek(
    "entitas umum diterjemahkan",
    bersihkanTeks("A &amp; B &lt; C &quot;D&quot;"),
    'A & B < C "D"'
);

cek(
    "null menjadi string kosong",
    bersihkanTeks(null),
    ""
);

console.log("\n=== ringkasSubmission ===");

cek(
    "tanpa state dan tanpa berkas -> null",
    ringkasSubmission({ state: "", files: [] }),
    null
);

cek(
    "berkas tanpa nama dibuang",
    ringkasSubmission({
        state: "submitted",
        files: [{ name: "", url: "x" }, { name: "a.pdf", url: "https://x/a" }]
    }),
    {
        state: "submitted",
        submitted_at: null,
        files: [{ name: "a.pdf", url: "https://x/a" }]
    }
);

console.log("\n=== ringkasSubmissionMoodle ===");

cek(
    "belum ada submission -> null",
    ringkasSubmissionMoodle({ lastattempt: {} }),
    null
);

cek(
    "berkas submission diambil",
    ringkasSubmissionMoodle({
        lastattempt: {
            submission: {
                status: "submitted",
                timemodified: 1790501680,
                plugins: [{
                    type: "file",
                    fileareas: [{
                        files: [{
                            filename: "Laprak1.pdf",
                            fileurl: "https://moodle/x/Laprak1.pdf"
                        }]
                    }]
                }]
            }
        }
    }),
    {
        state: "submitted",
        submitted_at: "2026-09-27T09:34:40.000Z",
        files: [{
            name: "Laprak1.pdf",
            url: "https://moodle/x/Laprak1.pdf"
        }]
    }
);

console.log("\n=== ringkasSubmissionClassroom ===");

cek(
    "CREATED tetap dilaporkan sebagai belum dikirim",
    ringkasSubmissionClassroom({
        state: "CREATED",
        updateTime: "2026-11-11T08:36:58.389Z"
    }),
    {
        state: "CREATED",
        submitted_at: "2026-11-11T08:36:58.389Z",
        files: []
    }
);

cek(
    "lampiran drive diambil",
    ringkasSubmissionClassroom({
        state: "TURNED_IN",
        updateTime: "2026-11-04T05:22:53.778Z",
        assignmentSubmission: {
            attachments: [{
                driveFile: {
                    title: "Laporan.pdf",
                    alternateLink: "https://drive.google.com/file/d/abc/view"
                }
            }]
        }
    }),
    {
        state: "TURNED_IN",
        submitted_at: "2026-11-04T05:22:53.778Z",
        files: [{
            name: "Laporan.pdf",
            url: "https://drive.google.com/file/d/abc/view"
        }]
    }
);

console.log(
    "\n=== hasil: " + lulus + " lulus, " + gagal + " gagal ===\n"
);

process.exit(gagal === 0 ? 0 : 1);