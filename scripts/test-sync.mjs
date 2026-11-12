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
    tanggalWibDariUtc,
    susunBarisClassroom,
    cariUsangClassroom,
    petikToken
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

console.log(
    "\n=== hasil: " + lulus + " lulus, " + gagal + " gagal ===\n"
);

process.exit(gagal === 0 ? 0 : 1);
