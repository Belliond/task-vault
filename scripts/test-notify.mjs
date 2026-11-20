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
    susunDigest,
    untukWhatsApp
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


uji("pesan memuat bagian baru, deadline, dan sisa hari", () => {

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

    assert.match(teks, /tugas baru nih/i);
    assert.match(teks, /Kriptografi \(RA\)/);

    // "yang udah mepet" menggantikan "yang udah deket".
    assert.match(teks, /yang udah mepet/i);

    // "2 hari lagi" menggantikan notasi "H-2" yang terasa
    // seperti keluaran sistem.
    assert.match(teks, /2 hari lagi/);
    assert.doesNotMatch(teks, /H-2/);

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

    assert.match(teks, /deadline udah deket/i);
    assert.match(teks, /jam 15\.00/);
    assert.match(teks, /3 jam/);

});


// Bug lama: Math.round membuat sisa 2 jam 30 menit tertulis
// "sisa 3 jam" — melebihkan waktu yang masih ada. Orang yang
// membaca "3 jam" akan merasa longgar padahal mepet.
uji("sisa waktu dibulatkan ke bawah, tidak melebihkan", () => {

    const tugas = {
        course: "Kriptografi",
        class_name: "RA",
        deadline: "2026-11-13",
        deadline_time: "15:00:00"
    };

    // 12.30 WIB -> sisa tepat 2,5 jam.
    const teks = susunPesanDeadline(
        [tugas],
        new Date("2026-11-13T05:30:00Z")
    );

    assert.match(teks, /2 jam setengah/);
    assert.doesNotMatch(teks, /3 jam/);

});


uji("sisa di bawah sejam ditulis dalam menit", () => {

    const tugas = {
        course: "Kriptografi",
        class_name: "RA",
        deadline: "2026-11-13",
        deadline_time: "15:00:00"
    };

    // 14.15 WIB -> sisa 45 menit.
    assert.match(
        susunPesanDeadline([tugas], new Date("2026-11-13T07:15:00Z")),
        /45 menit lagi/
    );

    // 14.59.30 -> sisa 30 detik, tetap "1 menit" bukan "0 menit".
    assert.match(
        susunPesanDeadline([tugas], new Date("2026-11-13T07:59:30Z")),
        /1 menit lagi/
    );

});


// Nada pesan mengikuti tingkat mendesak, bukan satu nada untuk
// semua. Sisa setengah jam tidak boleh terdengar sama santai
// dengan sisa tiga jam.
// Tugas tanpa jam tidak boleh ditulis "1 menit lagi". Sebelum
// diperbaiki, Math.max(0, null) = 0 sehingga pesannya berbohong
// tentang sisa waktu yang sebenarnya tidak ada.
uji("tugas tanpa jam tidak ditulis '1 menit lagi'", () => {

    const tanpaJam = {
        course: "Laporan",
        class_name: "RA",
        deadline: "2026-11-13",
        deadline_time: null
    };

    assert.equal(
        susunPesanDeadline([tanpaJam], new Date("2026-11-13T05:00:00Z")),
        ""
    );

});


uji("nada pengingat makin mendesak saat waktu makin sedikit", () => {

    const tugas = {
        course: "Kriptografi",
        class_name: "RA",
        deadline: "2026-11-13",
        deadline_time: "15:00:00"
    };

    const santai = susunPesanDeadline(
        [tugas],
        new Date("2026-11-13T05:10:00Z")   // sisa ~2,8 jam
    );

    const mepet = susunPesanDeadline(
        [tugas],
        new Date("2026-11-13T07:40:00Z")   // sisa ~20 menit
    );

    assert.match(santai, /reminder/i);
    assert.match(mepet, /mepet banget/i);
    assert.notEqual(santai, mepet);

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
    assert.match(teks, /cuma ada 1 tugas/i);
    assert.match(teks, /Sel, 17 Nov 2026 · 23\.59/);
    assert.match(teks, /kelar 3 tugas/);

});


uji("digest tetap terkirim walau tidak ada tugas", () => {

    const teks = susunDigest([], []);

    assert.match(teks, /minggu ini kosong/);
    assert.match(teks, /belum ada yang kelar/);

});


// WhatsApp tidak mengerti HTML. Tanpa ini, nama tugas dengan
// "&" akan tampil "&amp;" di pesan WhatsApp.
uji("escape HTML dibuka kembali untuk WhatsApp", () => {

    assert.equal(
        untukWhatsApp("&lt;b&gt;Bocor&lt;/b&gt; &amp; co"),
        "<b>Bocor</b> & co"
    );

    // Teks biasa tidak berubah.
    assert.equal(
        untukWhatsApp("Laporan Praktikum 7 (RB)"),
        "Laporan Praktikum 7 (RB)"
    );

    // Urutan penggantian penting: &amp; paling akhir, supaya
    // "&amp;lt;" tidak berubah jadi "<".
    assert.equal(untukWhatsApp("&amp;lt;"), "&lt;");

});


uji("pesan untuk WhatsApp bebas dari entitas HTML", () => {

    const teks = susunPesan(
        [{ course: "Riset & Metode", class_name: "RA", deadline: "2026-11-20" }],
        [],
        "2026-11-13"
    );

    assert.match(teks, /&amp;/);

    const wa = untukWhatsApp(teks);

    assert.match(wa, /Riset & Metode/);
    assert.doesNotMatch(wa, /&amp;|&lt;|&gt;/);

});


// Dulu pesan menyapa nama ("Pagi Krisna, ..."). Sekarang nama
// sengaja TIDAK disebut: notifikasi ini masuk ke WhatsApp diri
// sendiri, jadi menyebut nama justru terasa seperti sistem.
uji("pesan tidak menyebut nama", () => {

    const nama = "Krisna";

    const tugas = [{ course: "A", class_name: "B", deadline: "2026-11-20" }];

    const semua = [
        susunPesan(tugas, tugas, "2026-11-20"),
        susunPesanDeadline(
            [{
                course: "A",
                class_name: "B",
                deadline: "2026-11-20",
                deadline_time: "15:00:00"
            }],
            new Date("2026-11-20T05:00:00Z")
        ),
        susunDigest(tugas, tugas)
    ];

    for (const teks of semua) {

        assert.ok(teks.length > 0, "pesan tidak boleh kosong");
        assert.doesNotMatch(teks, new RegExp(nama));

    }

});


// "Pagi" yang dikirim pukul 19.47 langsung terasa seperti
// template. Sapaan harus ikut jam WIB sebenarnya.
uji("sapaan mengikuti jam WIB, bukan selalu Pagi", () => {

    const tugas = [{ course: "A", class_name: "B", deadline: "2026-11-20" }];

    const buat = (iso) =>
        susunPesan(tugas, [], "2026-11-13", new Date(iso), () => 0);

    // WIB = UTC+7.
    assert.match(buat("2026-11-13T00:00:00Z"), /^Pagi/);      // 07.00 WIB
    assert.match(buat("2026-11-13T05:00:00Z"), /^Siang/);     // 12.00 WIB
    assert.match(buat("2026-11-13T09:00:00Z"), /^Sore/);      // 16.00 WIB
    assert.match(buat("2026-11-13T12:47:00Z"), /^Malam/);     // 19.47 WIB
    assert.match(buat("2026-11-13T18:00:00Z"), /^Pagi/);      // 01.00 WIB

});


// Bug yang pernah terjadi: aturan otomatis "panjangkan vokal
// terakhir" menghasilkan "Siangmm" (siang berakhiran konsonan)
// dan "Malam" yang tidak dipanjangkan. Sekarang bentuknya
// ditulis eksplisit, jadi tes ini mengunci hasil akhirnya.
uji("sapaan akrab ditulis eksplisit, tidak dihasilkan aturan", () => {

    const tugas = [{ course: "A", class_name: "B", deadline: "2026-11-20" }];

    const buat = (iso) =>
        susunPesan(tugas, [], "2026-11-13", new Date(iso), () => 0);

    assert.match(buat("2026-11-13T00:00:00Z"), /^Pagiii, /);   // 07.00 WIB
    assert.match(buat("2026-11-13T05:00:00Z"), /^Siang, /);    // 12.00 WIB
    assert.match(buat("2026-11-13T09:00:00Z"), /^Soreee, /);   // 16.00 WIB
    assert.match(buat("2026-11-13T12:47:00Z"), /^Malammm, /);  // 19.47 WIB

    // Bentuk yang salah tidak boleh muncul lagi.
    const semua = [
        buat("2026-11-13T00:00:00Z"),
        buat("2026-11-13T05:00:00Z"),
        buat("2026-11-13T09:00:00Z"),
        buat("2026-11-13T12:47:00Z")
    ].join("\n");

    assert.doesNotMatch(semua, /Siangmm/);
    assert.doesNotMatch(semua, /Pagipagi/);

});


// Pembuka dipilih acak supaya tidak terasa seperti template,
// tetapi `acak` bisa dikunci agar hasilnya bisa diuji.
uji("pembuka pesan bervariasi tetapi tetap bisa diuji", () => {

    const tugas = [{ course: "A", class_name: "B", deadline: "2026-11-20" }];

    const a = susunPesan(tugas, [], "2026-11-13", new Date("2026-11-13T00:00:00Z"), () => 0);
    const b = susunPesan(tugas, [], "2026-11-13", new Date("2026-11-13T00:00:00Z"), () => 0.99);

    assert.notEqual(a, b);
    assert.match(a, /^Pagiii/);
    assert.match(b, /^Pagiii/);

});


console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);

if (gagal > 0) process.exit(1);
