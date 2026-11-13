// Uji aturan antrean WhatsApp: tidak butuh jaringan,
// tidak butuh WhatsApp, tidak butuh Supabase.
import assert from "node:assert/strict";

import {
    masihBerlaku,
    putuskan,
    ringkasGalat,
    tujuanAman,
    buatAntrean
} from "./outbox.mjs";


let lulus = 0;
let gagal = 0;


function uji(nama, fn) {

    try {

        fn();

        lulus += 1;

        console.log("  ok   " + nama);

    }
    catch (error) {

        gagal += 1;

        console.log("  GAGAL " + nama + " :: " + error.message);

    }

}


const SEKARANG = Date.parse("2026-11-14T10:00:00Z");


function baris(ubah = {}) {

    return {
        id: 1,
        pesan: "Pagi Krisna, ini update tugasnya yaaa",
        status: "menunggu",
        dibuat_at: new Date(SEKARANG - 60000).toISOString(),
        percobaan: 0,
        ...ubah
    };

}


uji("pesan baru harus dikirim", () => {

    assert.equal(putuskan(baris(), SEKARANG), "kirim");

});


uji("pesan yang sudah terkirim dilewati", () => {

    assert.equal(
        putuskan(baris({ status: "terkirim" }), SEKARANG),
        "lewat"
    );

});


uji("pesan gagal tidak dicoba lagi", () => {

    assert.equal(
        putuskan(baris({ status: "gagal" }), SEKARANG),
        "lewat"
    );

});


uji("pesan kosong dilewati", () => {

    assert.equal(putuskan(baris({ pesan: "   " }), SEKARANG), "lewat");

});


uji("pesan lebih tua dari 24 jam kedaluwarsa", () => {

    const tua = baris({
        dibuat_at: new Date(SEKARANG - 25 * 3600000).toISOString()
    });

    assert.equal(putuskan(tua, SEKARANG), "kedaluwarsa");

});


uji("pesan 23 jam masih dikirim", () => {

    const hampir = baris({
        dibuat_at: new Date(SEKARANG - 23 * 3600000).toISOString()
    });

    assert.equal(putuskan(hampir, SEKARANG), "kirim");

});


uji("tanggal rusak dianggap tidak berlaku", () => {

    assert.equal(masihBerlaku({ dibuat_at: "bukan tanggal" }, SEKARANG), false);
    assert.equal(masihBerlaku({}, SEKARANG), false);

});


uji("null dan objek kosong tidak membuat proses jatuh", () => {

    assert.equal(putuskan(null, SEKARANG), "lewat");
    assert.equal(putuskan({}, SEKARANG), "lewat");
    assert.equal(putuskan(undefined, SEKARANG), "lewat");

});


uji("galat panjang dipotong jadi satu baris", () => {

    const hasil = ringkasGalat("baris satu\n\nbaris dua   " + "x".repeat(500));

    assert.doesNotMatch(hasil, /\n/);
    assert.ok(hasil.length <= 300);
    assert.ok(hasil.endsWith("…"));

});


uji("galat berbentuk objek tetap terbaca", () => {

    assert.equal(ringkasGalat({ message: "item-not-found" }), "item-not-found");
    assert.equal(ringkasGalat(null), "");

});


uji("tujuan hanya dari env, tidak pernah dari antrean", () => {

    assert.equal(
        tujuanAman({ WA_BRIDGE_TUJUAN: "6281377753182" }),
        "6281377753182"
    );

    // Nomor lain yang mungkin diselipkan ke baris antrean
    // tidak berpengaruh apa pun.
    assert.equal(tujuanAman({ WA_BRIDGE_TUJUAN: "" }), "");
    assert.equal(tujuanAman({}), "");
    assert.equal(tujuanAman(null), "");

});


uji("antrean tidak aktif tanpa kredensial Supabase", () => {

    assert.equal(buatAntrean({}), null);
    assert.equal(buatAntrean({ SUPABASE_URL: "https://x.supabase.co" }), null);
    assert.equal(buatAntrean({ SUPABASE_KEY: "k" }), null);

});


uji("antrean aktif dengan kredensial lengkap", () => {

    const a = buatAntrean({
        SUPABASE_URL: "https://contoh.supabase.co/",
        SUPABASE_KEY: "kunci"
    });

    assert.ok(a);
    assert.equal(a.aktif, true);

});


console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);

if (gagal > 0) process.exit(1);
