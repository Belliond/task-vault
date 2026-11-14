// =========================================================
//  FUNGSI MURNI
//  Tidak menyentuh jaringan atau berkas, supaya bisa diuji
//  langsung oleh test.mjs tanpa perlu login WhatsApp.
// =========================================================


// Parser .env sederhana. Cukup KEY=VALUE, abaikan komentar
// dan baris kosong. Tanda kutip di ujung nilai dibuang.
export function parseEnv(teks) {

    const hasil = {};

    for (const baris of String(teks || "").split(/\r?\n/)) {

        const bersih = baris.trim();

        if (!bersih || bersih.startsWith("#")) continue;

        const pisah = bersih.indexOf("=");

        if (pisah < 1) continue;

        const kunci = bersih.slice(0, pisah).trim();

        let nilai = bersih.slice(pisah + 1).trim();

        const kutipGanda =
            nilai.startsWith('"') && nilai.endsWith('"');

        const kutipTunggal =
            nilai.startsWith("'") && nilai.endsWith("'");

        if (kutipGanda || kutipTunggal) {

            nilai = nilai.slice(1, -1);

        }

        hasil[kunci] = nilai;

    }

    return hasil;

}


// Pesan WhatsApp sering dibungkus lapisan tambahan
// (pesan sementara, lihat sekali, dokumen + caption).
// Isi aslinya ada di lapisan paling dalam.
const BUNGKUS = [
    "ephemeralMessage",
    "viewOnceMessage",
    "viewOnceMessageV2",
    "viewOnceMessageV2Extension",
    "documentWithCaptionMessage",
    "editedMessage"
];


export function bukaPesan(pesan) {

    let isi = pesan;

    for (let i = 0; i < 6; i += 1) {

        const kunci = BUNGKUS.find((k) => isi && isi[k]?.message);

        if (!kunci) break;

        isi = isi[kunci].message;

    }

    return isi || null;

}


// Ambil teks yang bisa dibaca manusia dari satu pesan.
// Media tidak diunduh (agar tetap ringan): hanya labelnya.
// Mengembalikan null untuk pesan yang tidak perlu diteruskan
// (mis. kunci enkripsi, tanda sudah dibaca).
export function ambilTeks(pesan) {

    const isi = bukaPesan(pesan);

    if (!isi) return null;


    if (typeof isi.conversation === "string") {

        return { teks: isi.conversation, jenis: "teks" };

    }

    if (typeof isi.extendedTextMessage?.text === "string") {

        return { teks: isi.extendedTextMessage.text, jenis: "teks" };

    }


    const media = [
        ["imageMessage", "gambar"],
        ["videoMessage", "video"],
        ["documentMessage", "dokumen"],
        ["audioMessage", "audio"],
        ["stickerMessage", "stiker"]
    ];

    for (const [kunci, label] of media) {

        const m = isi[kunci];

        if (!m) continue;

        const ket = m.caption || m.fileName || "";

        return {
            teks: ket ? `[${label}] ${ket}` : `[${label}]`,
            jenis: label
        };

    }


    if (isi.locationMessage) {

        return { teks: "[lokasi]", jenis: "lokasi" };

    }

    if (isi.contactMessage || isi.contactsArrayMessage) {

        return { teks: "[kontak]", jenis: "kontak" };

    }


    return null;

}


// Perintah Telegram: "/to 08123" -> { nama: "to", arg: "08123" }.
// Teks biasa mengembalikan null.
export function parsePerintah(teks) {

    const t = String(teks || "").trim();

    if (!t.startsWith("/")) return null;


    const spasi = t.indexOf(" ");

    const nama = (spasi < 0 ? t.slice(1) : t.slice(1, spasi)).toLowerCase();

    const arg = spasi < 0 ? "" : t.slice(spasi + 1).trim();


    // "/to@namabot 08123" juga lazim dikirim dari grup.
    return { nama: nama.split("@")[0], arg };

}


// Nomor Indonesia diawali 0, sedangkan WhatsApp memakai 62.
export function jidDariNomor(nomor) {

    const digit = String(nomor || "").replace(/\D/g, "");

    if (digit.length < 8) return null;

    const normal = digit.startsWith("0")
        ? "62" + digit.slice(1)
        : digit;

    if (normal.length < 10) return null;

    return normal + "@s.whatsapp.net";

}


export function nomorDariJid(jid) {

    return String(jid || "").split("@")[0].split(":")[0];

}


export function potong(teks, maks = 3500) {

    const t = String(teks ?? "");

    if (t.length <= maks) return t;

    return t.slice(0, maks - 1) + "…";

}


// Format pesan yang masuk ke Telegram.
export function formatKeTelegram({ pengirim, grup, teks }) {

    const kepala = grup
        ? `wa · ${pengirim} di ${grup}`
        : `wa · ${pengirim}`;

    return `${kepala}\n\n${potong(teks)}`;

}


// ---------------------------------------------------------
//  Jeda sambung ulang WhatsApp.
//
//  Saat WhatsApp memutus koneksi berulang (kode 428), jembatan
//  yang langsung menyambung lagi membuat server membalas
//  dengan pemutusan baru. Pada 14/11/2026 itu berlangsung 146
//  kali dalam ~30 menit. Makin sering putus, makin lama
//  jembatan harus menunggu sebelum mencoba lagi.
//
//  Contoh dengan dasar 5 detik: 10s, 20s, 40s, 80s, 160s,
//  lalu mentok di batas maksimum (5 menit).
// ---------------------------------------------------------

export function jedaSambungUlang(
    jumlahPutus,
    dasarMs = 5000,
    maksMs = 5 * 60 * 1000
) {

    const n = Math.max(0, Number(jumlahPutus) || 0);

    // Digandakan tiap putus, tapi jangan sampai meluap:
    // 2^10 sudah lebih dari cukup untuk mencapai batas.
    const pangkat = Math.min(n, 10);

    return Math.min(dasarMs * Math.pow(2, pangkat), maksMs);

}
