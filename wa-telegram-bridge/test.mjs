// Uji fungsi murni: tidak butuh WhatsApp maupun Telegram.
import assert from "node:assert/strict";

import {
    parseEnv,
    bukaPesan,
    ambilTeks,
    parsePerintah,
    jidDariNomor,
    nomorDariJid,
    potong,
    formatKeTelegram,
    jedaSambungUlang
} from "./lib.mjs";


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


uji("parseEnv membaca pasangan kunci nilai", () => {

    const env = parseEnv(
        "# komentar\n" +
        "TELEGRAM_BOT_TOKEN=abc:123\n" +
        "\n" +
        "TELEGRAM_CHAT_ID = 9988 \n" +
        'WA_BRIDGE_TUJUAN="08123456789"\n'
    );

    assert.equal(env.TELEGRAM_BOT_TOKEN, "abc:123");
    assert.equal(env.TELEGRAM_CHAT_ID, "9988");
    assert.equal(env.WA_BRIDGE_TUJUAN, "08123456789");

});


uji("parseEnv mengabaikan baris rusak", () => {

    const env = parseEnv("tanpa-tanda-sama-dengan\n=sahaja\nA=1");

    assert.deepEqual(env, { A: "1" });

});


uji("ambilTeks membaca teks biasa", () => {

    const hasil = ambilTeks({ conversation: "halo" });

    assert.equal(hasil.teks, "halo");

});


uji("ambilTeks membaca extendedTextMessage", () => {

    const hasil = ambilTeks({
        extendedTextMessage: { text: "halo juga" }
    });

    assert.equal(hasil.teks, "halo juga");

});


uji("ambilTeks membuka pesan sementara", () => {

    const hasil = ambilTeks({
        ephemeralMessage: {
            message: {
                extendedTextMessage: { text: "rahasia" }
            }
        }
    });

    assert.equal(hasil.teks, "rahasia");

});


uji("ambilTeks membuka pesan lihat sekali", () => {

    const hasil = ambilTeks({
        viewOnceMessageV2: {
            message: { conversation: "sekali lihat" }
        }
    });

    assert.equal(hasil.teks, "sekali lihat");

});


uji("ambilTeks membuka dokumen dengan caption", () => {

    const hasil = ambilTeks({
        documentWithCaptionMessage: {
            message: {
                documentMessage: { caption: "tugas.pdf", fileName: "tugas.pdf" }
            }
        }
    });

    assert.match(hasil.teks, /dokumen/);
    assert.match(hasil.teks, /tugas\.pdf/);

});


uji("ambilTeks memberi label media tanpa caption", () => {

    assert.equal(
        ambilTeks({ imageMessage: {} }).teks,
        "[gambar]"
    );

});


uji("ambilTeks mengembalikan null untuk pesan tak dikenal", () => {

    assert.equal(ambilTeks({ protocolMessage: {} }), null);
    assert.equal(ambilTeks(null), null);

});


uji("bukaPesan aman untuk rantai panjang", () => {

    const hasil = bukaPesan({
        ephemeralMessage: {
            message: {
                ephemeralMessage: {
                    message: { conversation: "dalam" }
                }
            }
        }
    });

    assert.equal(hasil.conversation, "dalam");

});


uji("parsePerintah membaca /to dengan argumen", () => {

    assert.deepEqual(
        parsePerintah("/to 08123456789 halo"),
        { nama: "to", arg: "08123456789 halo" }
    );

});


uji("parsePerintah membaca /status tanpa argumen", () => {

    assert.deepEqual(parsePerintah("/status"), { nama: "status", arg: "" });

});


uji("parsePerintah membuang @namabot", () => {

    assert.deepEqual(
        parsePerintah("/to@taskvault_bot 0812 halo"),
        { nama: "to", arg: "0812 halo" }
    );

});


uji("parsePerintah mengembalikan null untuk teks biasa", () => {

    assert.equal(parsePerintah("halo"), null);
    assert.equal(parsePerintah(""), null);

});


uji("jidDariNomor menormalkan nomor Indonesia", () => {

    assert.equal(jidDariNomor("08123456789"), "628123456789@s.whatsapp.net");
    assert.equal(jidDariNomor("628123456789"), "628123456789@s.whatsapp.net");
    assert.equal(jidDariNomor("+62 812-3456-789"), "628123456789@s.whatsapp.net");

});


uji("jidDariNomor menolak nomor terlalu pendek", () => {

    assert.equal(jidDariNomor("0812"), null);
    assert.equal(jidDariNomor(""), null);

});


uji("nomorDariJid membuang domain dan device", () => {

    assert.equal(nomorDariJid("628123456789@s.whatsapp.net"), "628123456789");
    assert.equal(nomorDariJid("628123456789:12@s.whatsapp.net"), "628123456789");

});


uji("potong memotong teks panjang", () => {

    const hasil = potong("a".repeat(50), 10);

    assert.equal(hasil.length, 10);
    assert.ok(hasil.endsWith("…"));

});


uji("potong membiarkan teks pendek", () => {

    assert.equal(potong("halo", 10), "halo");
    assert.equal(potong(null), "");

});


uji("formatKeTelegram menyertakan pengirim", () => {

    const hasil = formatKeTelegram({
        pengirim: "628123456789",
        grup: "",
        teks: "halo"
    });

    assert.match(hasil, /wa · 628123456789/);
    assert.match(hasil, /halo/);

});


uji("formatKeTelegram menyertakan grup", () => {

    const hasil = formatKeTelegram({
        pengirim: "628123456789",
        grup: "Kelas RA",
        teks: "halo"
    });

    assert.match(hasil, /di Kelas RA/);

});


// ---------------------------------------------------------
//  Jeda sambung ulang: makin sering putus, makin lama.
// ---------------------------------------------------------

uji("jeda sambung ulang bertambah tiap putus", () => {

    // Putus ke-1: 5s x 2 = 10s
    assert.equal(jedaSambungUlang(1, 5000, 300000), 10000);

    // Putus ke-2: 20s, ke-3: 40s, ke-4: 80s
    assert.equal(jedaSambungUlang(2, 5000, 300000), 20000);
    assert.equal(jedaSambungUlang(3, 5000, 300000), 40000);
    assert.equal(jedaSambungUlang(4, 5000, 300000), 80000);

});

uji("jeda sambung ulang mentok di batas maksimum", () => {

    // Berapa pun putusnya, jangan lebih dari 5 menit.
    assert.equal(jedaSambungUlang(6, 5000, 300000), 300000);
    assert.equal(jedaSambungUlang(50, 5000, 300000), 300000);

});

uji("jeda sambung ulang tidak meluap untuk angka besar", () => {

    // 2^1000 = Infinity; hasilnya harus tetap batas maksimum,
    // bukan Infinity atau NaN.
    const hasil = jedaSambungUlang(1000, 5000, 300000);

    assert.equal(Number.isFinite(hasil), true);
    assert.equal(hasil, 300000);

});

uji("jeda sambung ulang aman untuk masukan aneh", () => {

    // Nilai kosong/negatif dianggap belum pernah putus.
    assert.equal(jedaSambungUlang(0, 5000, 300000), 5000);
    assert.equal(jedaSambungUlang(-5, 5000, 300000), 5000);
    assert.equal(jedaSambungUlang(undefined, 5000, 300000), 5000);
    assert.equal(jedaSambungUlang("abc", 5000, 300000), 5000);

});

uji("jeda sambung ulang tidak pernah nol", () => {

    // Jeda 0 akan membuat jembatan menembak server tanpa
    // henti -- persis yang menyebabkan badai 146 putus.
    for (let n = 0; n <= 20; n += 1) {

        assert.ok(jedaSambungUlang(n, 5000, 300000) >= 5000);

    }

});


console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);

if (gagal > 0) process.exit(1);
