// =========================================================
//  JEMBATAN WHATSAPP <-> TELEGRAM
//
//  Satu proses Node, tanpa browser. WhatsApp dihubungkan
//  lewat protokol WhatsApp Web (Baileys), Telegram lewat
//  Bot API resmi. Pesan WhatsApp masuk -> dikirim ke
//  Telegram. Pesan Telegram (dengan /to) -> dikirim ke
//  WhatsApp.
//
//  Semua data ada di folder ini: sesi WhatsApp (auth/) dan
//  .env. Tidak ada yang dikirim ke server pihak ketiga.
// =========================================================

import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    isJidGroup
} from "baileys";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import {
    parseEnv,
    ambilTeks,
    parsePerintah,
    jidDariNomor,
    nomorDariJid,
    potong,
    formatKeTelegram
} from "./lib.mjs";


const AKAR = path.dirname(fileURLToPath(import.meta.url));
const FOLDER_AUTH = path.join(AKAR, "auth");
const BERKAS_ENV = path.join(AKAR, ".env");
const BERKAS_LOG = path.join(AKAR, "bridge.log");


// ---------------------------------------------------------
//  Konfigurasi
// ---------------------------------------------------------

function muatEnv() {

    const dariBerkas = fs.existsSync(BERKAS_ENV)
        ? parseEnv(fs.readFileSync(BERKAS_ENV, "utf8"))
        : {};

    // Variabel lingkungan menang, supaya bisa ditimpa
    // tanpa mengedit berkas.
    return { ...dariBerkas, ...process.env };

}


const env = muatEnv();

const TOKEN = String(env.TELEGRAM_BOT_TOKEN || "").trim();
const CHAT_ID = String(env.TELEGRAM_CHAT_ID || "").trim();
const NAMA = String(env.WA_BRIDGE_NAMA || "Krisna").trim();
const KE_WA = String(env.WA_BRIDGE_KE_WA || "1") !== "0";
const KE_TG = String(env.WA_BRIDGE_KE_TG || "1") !== "0";
const ABAIKAN_DIRI = String(env.WA_BRIDGE_ABAIKAN_DIRI || "1") !== "0";

const AKTIF_TELEGRAM = Boolean(TOKEN && CHAT_ID);


// ---------------------------------------------------------
//  Log: ditulis ke layar dan ke bridge.log (dipangkas agar
//  tidak menumpuk di HP).
// ---------------------------------------------------------

function log(...bagian) {

    const baris =
        new Date().toLocaleString("id-ID") + "  " + bagian.join(" ");

    console.log(baris);

    try {

        if (fs.existsSync(BERKAS_LOG) &&
            fs.statSync(BERKAS_LOG).size > 512 * 1024) {

            fs.renameSync(BERKAS_LOG, BERKAS_LOG + ".old");

        }

        fs.appendFileSync(BERKAS_LOG, baris + "\n");

    }
    catch {

        // Log tidak boleh menjatuhkan proses.

    }

}


function tidur(ms) {

    return new Promise((r) => setTimeout(r, ms));

}


// ---------------------------------------------------------
//  Pasangan lewat kode 8 digit (tanpa QR)
//
//  QR hanya bisa dipindai dari perangkat lain. Kalau jembatan
//  jalan di HP yang sama dengan WhatsApp-nya, tidak ada layar
//  kedua untuk memindai. Kode pasangan menyelesaikan itu:
//  kode ditampilkan di terminal, lalu diketik di WhatsApp.
// ---------------------------------------------------------

const NOMOR_PASANGAN = String(
    env.WA_BRIDGE_PASANGAN || ""
).trim();

// Kode pasangan berlaku sekitar 60 detik, dan meminta kode
// baru MEMBATALKAN kode sebelumnya. Karena itu kode tidak
// boleh dibuat otomatis berulang-ulang: kalau dibuat tiap
// menit, orang bisa mengetik kode yang sudah mati.
//
// Jalur yang benar: kode dibuat saat diminta lewat /pasang
// di Telegram, jadi kode yang kamu lihat pasti yang terbaru.
let kodeTerakhir = "";
let kodeKedaluwarsa = 0;

const UMUR_KODE_MS = Number(env.WA_BRIDGE_UMUR_KODE_MS || 60000);


async function mintaKodePasangan() {

    if (!NOMOR_PASANGAN) return false;

    if (!sock || typeof sock.requestPairingCode !== "function") return false;


    try {

        const kode = await sock.requestPairingCode(NOMOR_PASANGAN);

        if (!kode) return false;

        kodeTerakhir = String(kode).toUpperCase();

        kodeKedaluwarsa = Date.now() + UMUR_KODE_MS;

        log("KODE PASANGAN: " + kodeTerakhir);

        return true;

    }
    catch (error) {

        log("gagal minta kode pasangan:", error.message);

        kodeTerakhir = "";

        return false;

    }

}


// ---------------------------------------------------------
//  Telegram
// ---------------------------------------------------------

// Bisa diarahkan ke server lain (dipakai uji otomatis).
const BASE_TELEGRAM = String(
    env.TELEGRAM_API_BASE || "https://api.telegram.org"
).replace(/\/+$/, "");

const URL_TELEGRAM = `${BASE_TELEGRAM}/bot${TOKEN}`;

let offsetTelegram = 0;
let telegramJalan = false;


async function kirimTelegram(teks) {

    if (!AKTIF_TELEGRAM) return false;

    try {

        const res = await fetch(`${URL_TELEGRAM}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: potong(teks),
                disable_web_page_preview: true
            })
        });

        if (!res.ok) {

            const isi = await res.text();

            log("telegram gagal:", res.status, isi.slice(0, 200));

            return false;

        }

        return true;

    }
    catch (error) {

        log("telegram error:", error.message);

        return false;

    }

}


// ---------------------------------------------------------
//  WhatsApp
// ---------------------------------------------------------

let sock = null;
let siap = false;
let nomorSendiri = "";
let qrTerakhir = "";

// Tujuan default untuk /to tanpa argumen, dan untuk pesan
// Telegram biasa yang tidak memakai /to.
let tujuanDefault = String(env.WA_BRIDGE_TUJUAN || "").trim();


async function mulaiWhatsApp() {

    const { state, saveCreds } = await useMultiFileAuthState(FOLDER_AUTH);

    let version;

    try {

        ({ version } = await fetchLatestBaileysVersion());

    }
    catch {

        version = undefined;

    }


    sock = makeWASocket({
        version,
        auth: state,

        // Riwayat TIDAK diperlukan sama sekali. Ini penting:
        // `syncFullHistory: false` saja tidak cukup. Default
        // Baileys masih menyinkronkan RECENT dan
        // INITIAL_BOOTSTRAP, yang membanjiri log dan membuat
        // proses mati di HP. Tolak semua jenis riwayat.
        syncFullHistory: false,

        shouldSyncHistoryMessage: () => false,

        // Jangan tandai online terus-menerus; cukup bisa
        // mengirim dan menerima.
        markOnlineOnConnect: false,

        // Jangan tampilkan sebagai "mengetik" saat mengirim.
        generateHighQualityLinkPreview: false,

        browser: ["TaskVault Bridge", "Chrome", "1.0.0"]
    });


    sock.ev.on("creds.update", saveCreds);


    sock.ev.on("connection.update", async (u) => {

        const { connection, lastDisconnect, qr } = u;


        if (qr) {

            // Dua jalur, tergantung di mana jembatan jalan:
            //
            //  - Di laptop/PC: QR di sini bisa langsung dipindai
            //    dari HP. Ini paling cepat (~1 detik), jauh
            //    lebih andal daripada mengetik 8 karakter.
            //
            //  - Di HP itu sendiri: tidak ada layar kedua untuk
            //    memindai, jadi pakai /pasang.
            //
            // Kode pasangan SENGAJA tidak diminta di sini:
            // meminta kode baru membatalkan kode sebelumnya.
            const qrcode = await import("qrcode-terminal");

            qrcode.default.generate(qr, { small: true });

            log("QR muncul. Pindai dari WhatsApp > Perangkat tertaut, atau kirim /pasang untuk kode 8 digit.");

            // Simpan QR terakhir supaya bisa ditampilkan lagi
            // lewat /qr (mis. setelah layar ter-scroll).
            qrTerakhir = qr;

        }


        if (connection === "open") {

            siap = true;

            nomorSendiri = nomorDariJid(
                sock.user?.id || ""
            );

            log("whatsapp tersambung sebagai", nomorSendiri || "?");

            await kirimTelegram(
                `Jembatan aktif, ${NAMA}.\n` +
                `WhatsApp ${nomorSendiri} sekarang tersambung ke Telegram ini.`
            );

        }


        if (connection === "close") {

            siap = false;

            const kode =
                lastDisconnect?.error?.output?.statusCode;

            const keluar =
                kode === DisconnectReason.loggedOut;


            log("whatsapp terputus, kode", kode, keluar ? "(logout)" : "");


            if (keluar) {

                // Sesi tidak valid lagi: hapus agar QR baru
                // bisa dipindai, jangan diam-diam gagal.
                try {

                    fs.rmSync(FOLDER_AUTH, { recursive: true, force: true });

                }
                catch {}

                await kirimTelegram(
                    `Sesi WhatsApp keluar, ${NAMA}. ` +
                    `Pindai QR baru di terminal.`
                );

            }


            // Sambung ulang dengan jeda bertingkat supaya
            // tidak menembak server terus-menerus.
            setTimeout(mulaiWhatsApp, keluar ? 2000 : 5000);

        }

    });


    // Pesan masuk -> Telegram
    sock.ev.on("messages.upsert", async ({ messages, type }) => {

        if (type !== "notify") return;

        for (const pesan of messages) {

            try {

                if (!pesan.message) continue;

                const dari = pesan.key.remoteJid || "";

                if (ABAIKAN_DIRI && pesan.key.fromMe) continue;

                // Status dan broadcast bukan percakapan.
                if (dari === "status@broadcast") continue;

                const isi = ambilTeks(pesan.message);

                if (!isi) continue;

                if (!KE_TG) continue;

                const pengirim = pesan.key.fromMe
                    ? "kamu"
                    : nomorDariJid(pesan.key.participant || dari);

                const grup = isJidGroup(dari)
                    ? (pesan.pushName || "grup")
                    : "";

                await kirimTelegram(
                    formatKeTelegram({
                        pengirim,
                        grup,
                        teks: isi.teks
                    })
                );

            }
            catch (error) {

                log("gagal meneruskan pesan:", error.message);

            }

        }

    });

}


// ---------------------------------------------------------
//  Telegram -> WhatsApp
// ---------------------------------------------------------

// Perintah yang datang saat WhatsApp masih menyambung tidak
// boleh langsung ditolak: pesan bisa tertahan di antrean
// Telegram (mis. HP baru hidup lagi) dan tiba sebelum
// koneksi WhatsApp siap. Tunggu sebentar, baru menyerah.
async function tungguSiap(ms = 30000) {

    const mulai = Date.now();

    while (!siap && Date.now() - mulai < ms) {

        await tidur(500);

    }

    return siap;

}


async function prosesTelegram(pesan) {

    const teks = String(pesan.text || "");

    if (!teks) return;


    const perintah = parsePerintah(teks);


    if (perintah?.nama === "start" || perintah?.nama === "help") {

        await kirimTelegram(
            `Halo ${NAMA}. Aku jembatan WhatsApp.\n\n` +
            `Pesan WhatsApp yang masuk otomatis diteruskan ke sini.\n\n` +
            `Untuk mengirim ke WhatsApp:\n` +
            `/to 08123456789 pesan kamu\n` +
            `/to 08123456789          (tanya nomor itu)\n\n` +
            `Kalau ${tujuanDefault ? "tujuan sudah diset" : "tujuan belum diset"}, ` +
            `pesan tanpa /to ${tujuanDefault ? "dikirim ke " + tujuanDefault : "diabaikan"}.\n\n` +
            `/pasang  buat kode pasangan WhatsApp\n` +
            `/status  cek koneksi`
        );

        return;

    }


    if (perintah?.nama === "pasang") {

        if (!NOMOR_PASANGAN) {

            await kirimTelegram(
                `Nomor WhatsApp belum diisi, ${NAMA}. ` +
                `Isi WA_BRIDGE_PASANGAN di .env dulu.`
            );

            return;

        }

        const berhasil = await mintaKodePasangan();

        if (!berhasil) {

            await kirimTelegram(
                `Gagal membuat kode pasangan. Coba /pasang lagi sebentar.`
            );

            return;

        }

        await kirimTelegram(
            `Kode pasangan WhatsApp: ${kodeTerakhir}\n\n` +
            `Buka WhatsApp di HP ini:\n` +
            `Pengaturan > Perangkat tertaut > Tautkan perangkat > ` +
            `Tautkan dengan nomor telepon\n\n` +
            `PENTING: kode ini hanya hidup sekitar 20 detik. ` +
            `Siapkan WhatsApp DULU di layar "Masukkan kode", ` +
            `baru kirim /pasang, lalu langsung ketik.\n\n` +
            `Kalau gagal, kirim /pasang lagi.`
        );

        return;

    }


    if (perintah?.nama === "qr") {

        if (siap) {

            await kirimTelegram(`WhatsApp sudah tersambung, ${NAMA}. Tidak perlu QR.`);

            return;

        }

        if (!qrTerakhir) {

            await kirimTelegram(
                `Belum ada QR. Tunggu sebentar, lalu coba /qr lagi.`
            );

            return;

        }

        // QR dikirim sebagai teks mentah: cukup di-scan dari
        // layar lain. Tidak perlu gambar.
        await kirimTelegram(
            `QR WhatsApp (berlaku ~20 detik):\n\n${qrTerakhir}\n\n` +
            `Cara pakai: jalankan jembatan di laptop, lalu pindai ` +
            `QR yang muncul di layar laptop dari HP.`
        );

        return;

    }


    if (perintah?.nama === "status") {

        await kirimTelegram(
            `WhatsApp : ${siap ? "tersambung" : "terputus"}\n` +
            `Nomor    : ${nomorSendiri || "-"}\n` +
            `Tujuan   : ${tujuanDefault || "-"}`
        );

        return;

    }


    if (perintah?.nama === "to") {

        const cocok = perintah.arg.match(/^(\S+)\s*([\s\S]*)$/);

        if (!cocok) {

            await kirimTelegram("Format: /to 08123456789 pesan kamu");

            return;

        }

        const jid = jidDariNomor(cocok[1]);

        const isi = cocok[2].trim();

        if (!jid) {

            await kirimTelegram("Nomor tidak valid. Contoh: /to 08123456789 halo");

            return;

        }

        if (!(await tungguSiap())) {

            await kirimTelegram(
                `WhatsApp belum tersambung, ${NAMA}. ` +
                `Coba lagi sebentar.`
            );

            return;

        }

        if (!isi) {

            // Tanpa isi: hanya tanya nomor itu ada atau tidak,
            // tanpa mengirim apa pun.
            const ada = await sock.onWhatsApp(jid);

            await kirimTelegram(
                ada?.[0]?.exists
                    ? `${cocok[1]} terdaftar di WhatsApp.`
                    : `${cocok[1]} tidak terdaftar di WhatsApp.`
            );

            return;

        }

        try {

            await sock.sendMessage(jid, { text: isi });

            await kirimTelegram(`Terkirim ke ${cocok[1]}.`);

        }
        catch (error) {

            await kirimTelegram(`Gagal mengirim: ${error.message}`);

        }

        return;

    }


    // Teks biasa tanpa /to: pakai tujuan default bila ada.
    if (tujuanDefault) {

        const jid = jidDariNomor(tujuanDefault);

        if (!jid) {

            await kirimTelegram("Nomor tujuan di .env tidak valid.");

            return;

        }

        if (!(await tungguSiap())) {

            await kirimTelegram(
                `WhatsApp belum tersambung, ${NAMA}. ` +
                `Coba lagi sebentar.`
            );

            return;

        }

        try {

            await sock.sendMessage(jid, { text: teks });

            await kirimTelegram(`Terkirim ke ${tujuanDefault}.`);

        }
        catch (error) {

            await kirimTelegram(`Gagal mengirim: ${error.message}`);

        }

        return;

    }


    await kirimTelegram(
        `Aku belum tahu mau dikirim ke siapa, ${NAMA}.\n` +
        `Pakai /to 08123456789 pesan kamu`
    );

}


async function putarTelegram() {

    if (!AKTIF_TELEGRAM || !KE_WA) return;

    telegramJalan = true;

    log("telegram siap menerima perintah");


    while (telegramJalan) {

        try {

            const res = await fetch(
                `${URL_TELEGRAM}/getUpdates?timeout=30&offset=${offsetTelegram}`
            );

            if (!res.ok) {

                throw new Error("HTTP " + res.status);

            }

            const data = await res.json();


            for (const update of data.result || []) {

                const pesan = update.message;


                // Konfirmasi (maju) SELALU dilakukan, apa pun
                // isinya. Kalau offset tidak dimajukan, update
                // yang sama diambil terus dan antrean tidak
                // pernah habis — pesan berikutnya tidak pernah
                // sampai.
                offsetTelegram = update.update_id + 1;


                if (!pesan) {

                    // Update bukan pesan (mis. edited_message).
                    // Tetap dicatat supaya saat memantau jelas
                    // bahwa polling memang menerima sesuatu.
                    log(`update ${update.update_id} tanpa pesan, dilewati`);

                    continue;

                }

                // Hanya pemilik chat yang boleh memerintah.
                if (String(pesan.chat?.id) !== String(CHAT_ID)) {

                    log(`abaikan pesan dari chat lain: ${pesan.chat?.id}`);

                    continue;

                }

                // Catat perintah yang masuk. Tanpa ini, mustahil
                // membedakan "pesan tidak sampai" dari "pesan
                // sampai tapi dibalas diam-diam".
                log(`perintah masuk: ${String(pesan.text || "").slice(0, 60)}`);

                try {

                    await prosesTelegram(pesan);

                }
                catch (error) {

                    log("perintah gagal:", error.message);

                }

            }

        }
        catch (error) {

            log("telegram polling error:", error.message);

            await tidur(5000);

        }

    }

}


// ---------------------------------------------------------
//  Start
// ---------------------------------------------------------

if (!AKTIF_TELEGRAM) {

    log("PERINGATAN: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum diisi.");
    log("Pesan WhatsApp tidak akan diteruskan sampai keduanya diisi.");

}


log(`jembatan mulai. ram ${(process.memoryUsage().rss / 1048576).toFixed(0)} MB`);

if (!fs.existsSync(FOLDER_AUTH)) {

    fs.mkdirSync(FOLDER_AUTH, { recursive: true });

}


// Panggil kode pasangan begitu socket ada. QR pertama datang
// setelah handshake, jadi tunggu sebentar agar socket siap.
if (NOMOR_PASANGAN) {

    log("nomor pasangan terdeteksi, akan memakai kode 8 digit.");

}


// Tangkap error tak terduga supaya tidak mati diam-diam.
// Tanpa ini, crash apa pun membuat jembatan berhenti tanpa
// jejak di log — persis yang bikin bingung saat memasang.
process.on("uncaughtException", (error) => {

    log("ERROR TAK TERTANGANI:", error?.message || error);

});

process.on("unhandledRejection", (error) => {

    log("JANJI GAGAL:", error?.message || error);

});


await mulaiWhatsApp();

putarTelegram();


// Keluar dengan rapi supaya sesi tidak korup.
for (const sinyal of ["SIGINT", "SIGTERM"]) {

    process.on(sinyal, () => {

        log("berhenti...");

        telegramJalan = false;

        try { sock?.end(undefined); } catch {}

        setTimeout(() => process.exit(0), 500);

    });

}
