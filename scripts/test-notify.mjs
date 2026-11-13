// Uji fungsi murni scripts/notify-telegram.mjs.
// Tidak menyentuh jaringan atau database.

import assert from "node:assert/strict";
import {
    tanggalWib,
    jendelaDeadline,
    sudahDikerjakan,
    susunPesan,
    awalMinggu,
    hariTampil,
    waktuDeadline,
    perluIngatDeadline,
    susunPesanDeadline,
    susunDigest
} from "./notify-telegram.mjs";

let lulus = 0;
let gagal = 0;

function uji(nama, fn) {

    try {

        fn();
        lulus += 1;
        console.log("  ok  " + nama);

    }
    catch (error) {

        gagal += 1;
        console.log("  GAGAL  " + nama + " :: " + error.message);

    }

}


uji("tanggal WIB memakai hari Jakarta, bukan UTC", () => {

    // 2026-11-13 18:30 UTC = 2026-11-14 01:30 WIB.
    assert.equal(
        tanggalWib(new Date("2026-11-13T18:30:00Z")),
        "2026-11-14"
    );

});


uji("jendela deadline H-3 sampai H-1", () => {

    assert.deepEqual(
        jendelaDeadline("2026-11-13"),
        ["2026-11-14", "2026-11-15", "2026-11-16"]
    );

});


uji("jendela deadline melewati batas bulan dan tahun", () => {

    assert.deepEqual(
        jendelaDeadline("2026-12-30"),
        ["2026-12-31", "2027-01-01", "2027-01-02"]
    );

});


uji("tugas dianggap selesai dari status atau submission", () => {

    assert.equal(sudahDikerjakan({ status: "Completed" }), true);
    assert.equal(
        sudahDikerjakan({ status: "Pending", lms_details: { submission: { state: "submitted" } } }),
        true
    );
    assert.equal(
        sudahDikerjakan({ status: "Pending", lms_details: { submission: { state: "graded" } } }),
        true
    );
    assert.equal(
        sudahDikerjakan({ status: "Pending", lms_details: { submission: { state: "new" } } }),
        false
    );

});


uji("tidak ada tugas = tidak ada pesan", () => {

    assert.equal(susunPesan([], [], "2026-11-13"), "");

});


uji("pesan memuat bagian baru, deadline, dan H-x", () => {

    const teks = susunPesan(
        [{ course: "Kriptografi", class_name: "RA", deadline: "2026-11-20" }],
        [{
            course: "Praktikum",
            class_name: "RC",
            deadline: "2026-11-15",
            deadline_time: "23:59:00"
        }],
        "2026-11-13"
    );

    assert.match(teks, /tugas baru:/);
    assert.match(teks, /Kriptografi \(RA\)/);
    assert.match(teks, /yang udah deket:/);
    assert.match(teks, /H-2/);
    assert.match(teks, /15 Nov 2026 · 23\.59/);

});


uji("nama tugas di-escape agar HTML Telegram tidak rusak", () => {

    const teks = susunPesan(
        [{ course: "<b>Bocor</b> & co", class_name: "", deadline: "2026-11-20" }],
        [],
        "2026-11-13"
    );

    assert.match(teks, /&lt;b&gt;Bocor&lt;\/b&gt; &amp; co/);
    assert.doesNotMatch(teks, /<b>Bocor<\/b>/);

});


uji("awal minggu selalu hari Senin", () => {

    assert.equal(awalMinggu("2026-11-13"), "2026-11-09");
    assert.equal(awalMinggu("2026-11-09"), "2026-11-09");
    assert.equal(awalMinggu("2026-11-15"), "2026-11-09");

});


uji("nama hari pendek dari tanggal", () => {

    assert.equal(hariTampil("2026-11-17"), "Sel");

});


uji("deadline berjam dibaca sebagai waktu WIB", () => {

    const waktu = waktuDeadline({
        deadline: "2026-11-13",
        deadline_time: "15:00:00"
    });

    assert.equal(waktu.toISOString(), "2026-11-13T08:00:00.000Z");

    assert.equal(
        waktuDeadline({ deadline: "2026-11-13", deadline_time: null }),
        null
    );

});


uji("pengingat hanya 3 jam terakhir", () => {

    const tugas = {
        deadline: "2026-11-13",
        deadline_time: "15:00:00",
        status: "Pending"
    };

    // 12.00 WIB -> sisa 3 jam, masuk jendela.
    assert.equal(
        perluIngatDeadline(tugas, new Date("2026-11-13T05:00:00Z")),
        true
    );

    // 11.00 WIB -> sisa 4 jam, belum waktunya.
    assert.equal(
        perluIngatDeadline(tugas, new Date("2026-11-13T04:00:00Z")),
        false
    );

    // Sudah lewat.
    assert.equal(
        perluIngatDeadline(tugas, new Date("2026-11-13T09:00:00Z")),
        false
    );

    // Sudah selesai.
    assert.equal(
        perluIngatDeadline(
            { ...tugas, status: "Completed" },
            new Date("2026-11-13T05:00:00Z")
        ),
        false
    );

    // Tanpa jam (all-day) tidak ikut pengingat 3 jam.
    assert.equal(
        perluIngatDeadline(
            { ...tugas, deadline_time: null },
            new Date("2026-11-13T05:00:00Z")
        ),
        false
    );

});


uji("pesan pengingat memuat jam dan sisa waktu", () => {

    const teks = susunPesanDeadline(
        [{
            course: "Kriptografi",
            class_name: "RA",
            deadline: "2026-11-13",
            deadline_time: "15:00:00"
        }],
        new Date("2026-11-13T05:00:00Z")
    );

    assert.match(teks, /deadline udah deket/);
    assert.match(teks, /jam 15\.00/);
    assert.match(teks, /sisa 3 jam/);

});


uji("digest Senin memuat minggu ini dan minggu lalu", () => {

    const teks = susunDigest(
        [{
            course: "Kriptografi",
            class_name: "RA",
            deadline: "2026-11-17",
            deadline_time: "23:59:00"
        }],
        [{}, {}, {}]
    );

    assert.match(teks, /senin lagi/i);
    assert.match(teks, /minggu ini:/);
    assert.match(teks, /Sel, 17 Nov 2026 · 23\.59/);
    assert.match(teks, /kelar 3 tugas/);

});


uji("digest tetap terkirim walau tidak ada tugas", () => {

    const teks = susunDigest([], []);

    assert.match(teks, /minggu ini kosong/);
    assert.match(teks, /belum ada yang kelar/);

});


console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);

if (gagal > 0) process.exit(1);
