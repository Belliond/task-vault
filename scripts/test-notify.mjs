// Uji fungsi murni scripts/notify-telegram.mjs.
// Tidak menyentuh jaringan atau database.

import assert from "node:assert/strict";
import {
    tanggalWib,
    jendelaDeadline,
    sudahDikerjakan,
    susunPesan
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

    assert.match(teks, /TUGAS BARU/);
    assert.match(teks, /Kriptografi \(RA\)/);
    assert.match(teks, /DEADLINE DEKAT/);
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


console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);

if (gagal > 0) process.exit(1);
