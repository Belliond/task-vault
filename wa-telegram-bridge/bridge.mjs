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

        // Riwayat penuh tidak perlu: menghemat RAM dan
        // mempercepat start di HP.
        syncFullHistory: false,

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

            // QR ditampilkan di terminal. Di Termux bisa
            // dipindai langsung dari layar HP lain.
            const qrcode = await import("qrcode-terminal");

            qrcode.default.generate(qr, { small: true });

            log("QR muncul. Pindai dari WhatsApp > Perangkat tertaut.");

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
            `/status  cek koneksi`
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


                if (!pesan) continue;

                // Hanya pemilik chat yang boleh memerintah.
                if (String(pesan.chat?.id) !== String(CHAT_ID)) continue;

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
