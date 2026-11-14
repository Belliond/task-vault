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
    formatKeTelegram,
    jedaSambungUlang
} from "./lib.mjs";

import { buatAntrean, putuskan, tujuanAman } from "./outbox.mjs";


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
//  Logger untuk Baileys.
//
//  Bawaan Baileys adalah pino yang mencatat SEMUA isi sesi
//  terenkripsi (kunci, chain, ratchet) ke stdout. Di HP itu
//  membuat /sdcard/bridge.log cepat membengkak sampai 2 MB
//  dan menyulitkan mencari baris penting seperti
//  "whatsapp terputus".
//
//  Logger ini SENGAJA dibuat sendiri, tidak mengimpor pino:
//  pino hanya ikut terpasang sebagai dependensi Baileys, dan
//  mengimpornya langsung membuat bridge gagal start kalau
//  pino tidak ada (misalnya di folder uji yang hanya
//  menyediakan modul tiruan).
//
//  Yang dibutuhkan Baileys hanya: trace/debug/info/warn/
//  error/fatal, child(), dan properti `level`.
// ---------------------------------------------------------

function buatLoggerBaileys(level = "warn") {

    // Hanya pesan pada level ini dan yang lebih berat yang
    // dicetak. "warn" membuang trace/debug/info.
    const URUTAN = ["trace", "debug", "info", "warn", "error", "fatal"];

    const batas = URUTAN.indexOf(level);

    const tulis = (namaLevel, isi) => {

        if (URUTAN.indexOf(namaLevel) < batas) return;

        const bagian = Array.isArray(isi) ? isi : [isi];

        // Baileys memanggil logger.warn({ obj }, "pesan").
        // Objek dirapikan jadi teks pendek supaya log terbaca;
        // isi sesi terenkripsi tidak ikut ditulis.
        const teks = bagian
            .map((b) => {

                if (b instanceof Error) return b.message;

                if (b && typeof b === "object") {

                    try {

                        const kunci = Object.keys(b);

                        if (!kunci.length) return "";

                        // Ambil hanya nilai pendek yang aman
                        // dibaca; sisanya cukup disebut namanya.
                        return "{" + kunci.slice(0, 6).join(", ") + "}";

                    }
                    catch {

                        return "{...}";

                    }

                }

                return String(b);

            })
            .filter((t) => t !== "")
            .join(" ");

        log("baileys " + namaLevel + ":", teks);

    };

    const logger = {

        level,

        trace: (...a) => tulis("trace", a),
        debug: (...a) => tulis("debug", a),
        info: (...a) => tulis("info", a),
        warn: (...a) => tulis("warn", a),
        error: (...a) => tulis("error", a),
        fatal: (...a) => tulis("fatal", a),

        // Baileys membuat logger anak per modul. Level dan
        // tujuan tulisnya sama; cukup kembalikan logger ini.
        child: () => logger

    };

    return logger;

}


// ---------------------------------------------------------
//  Tutup kebocoran log dari libsignal.
//
//  libsignal (dipakai Baileys untuk enkripsi) TIDAK memakai
//  logger Baileys. Ia memanggil console.info/console.warn
//  langsung, sehingga pengaturan logger di atas tidak
//  berpengaruh:
//
//    console.info("Closing session:", session)
//    console.info("Opening session:", session)
//    console.warn("Session already closed", session)
//
//  `session` berisi kunci privat (privKey, rootKey, chainKey).
//  Akibatnya /sdcard/bridge.log -- yang bisa dibaca aplikasi
//  lain -- menyimpan salinan kunci sesi WhatsApp, dan
//  ukurannya membengkak sampai 2 MB.
//
//  Baris-baris itu dibuang. console.log milik jembatan
//  sendiri tidak disentuh.
// ---------------------------------------------------------

function tutupLogLibsignal() {

    const POLA = /^(Closing|Opening) session:|^Session already (closed|open)/;

    const saring = (asli) => (...bagian) => {

        try {

            if (POLA.test(String(bagian[0] ?? ""))) return;

        }
        catch {}

        return asli(...bagian);

    };

    console.info = saring(console.info);
    console.warn = saring(console.warn);

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


// ---------------------------------------------------------
//  Antrean notifikasi (GitHub Actions -> HP -> WhatsApp)
//
//  Notifikasi tugas disusun di server GitHub. Server itu
//  tidak bisa memanggil HP, jadi pesannya dititipkan ke
//  tabel wa_outbox. Di sini titipan itu diambil lalu
//  dikirim ke nomor utama.
// ---------------------------------------------------------

const antrean = buatAntrean(env, log);

const ANTREAN_JEDA_MS = Number(env.WA_BRIDGE_ANTREAN_JEDA_MS || 15000);

const tujuanAntrean = tujuanAman(env);

let antreanJalan = false;
let antreanSibuk = false;

// ---------------------------------------------------------
//  PENAHAN BANJIR NOTIFIKASI "JEMBATAN AKTIF"
//
//  WhatsApp kadang memutus koneksi berulang kali (kode 428)
//  saat jaringannya labil atau servernya sedang sibuk. Pada
//  14/11/2026 itu terjadi 146 kali dalam ~30 menit, dan
//  karena setiap sambungan mengabari Telegram, Telegram jadi
//  banjir sampai pesan penting tertutupi.
//
//  Aturannya sekarang:
//    - Sambungan PERTAMA: selalu dikabari.
//    - Putus sekali setelah lama tenang: dikabari biasa.
//    - Putus-sambung beruntun: DIDIAMKAN sama sekali. Baru
//      setelah koneksi benar-benar tenang (2 menit tanpa
//      putus) dikirim SATU ringkasan.
//
//  Dengan begitu badai 146 putus hanya menghasilkan satu
//  pesan di akhir, bukan 146 pesan.
// ---------------------------------------------------------

// Jangan pernah mengabari lebih sering dari ini, apa pun
// sebabnya. Ini jaring pengaman terakhir.
const JEDA_KABAR_MIN_MS = Number(
    env.WA_BRIDGE_JEDA_KABAR_MIN_MS || 10 * 60 * 1000
);

// Putus yang terjadi dalam rentang ini dihitung "beruntun".
// Artinya: sambungan harus bertahan selama ini sebelum
// dianggap benar-benar stabil. Kalau putus lagi sebelum
// itu, berarti masih badai.
const JEDA_STABIL_MS = Number(
    env.WA_BRIDGE_JEDA_STABIL_MS || 10 * 60 * 1000
);

// Koneksi harus bertahan selama ini sebelum ringkasan
// "sudah stabil lagi" dikirim.
const JEDA_TENANG_MS = Number(
    env.WA_BRIDGE_JEDA_TENANG_MS || 2 * 60 * 1000
);

// Jeda sambung ulang maksimum.
const JEDA_SAMBUNG_ULANG_MAKS_MS = Number(
    env.WA_BRIDGE_JEDA_SAMBUNG_ULANG_MAKS_MS || 5 * 60 * 1000
);

// Jeda dasar sambung ulang (sebelum digandakan).
const JEDA_SAMBUNG_ULANG_DASAR_MS = Number(
    env.WA_BRIDGE_JEDA_SAMBUNG_ULANG_DASAR_MS || 5000
);

let waktuPutusTerakhir = 0;
let jumlahPutusBeruntun = 0;
let waktuKabarTerakhir = 0;
let pernahTersambung = false;
let timerTenang = null;

// Kapan koneksi terakhir kali terbuka, dan berapa lama ia
// bertahan sebelum putus. Ini pembeda utama antara "putus
// sekali setelah lama normal" dan "putus-sambung beruntun".
let waktuSambungTerakhir = 0;
let lamaSambungSebelumPutus = 0;


function batalTimerTenang() {

    if (timerTenang) {

        clearTimeout(timerTenang);
        timerTenang = null;

    }

}


// Kirim kabar kondisi jembatan ke Telegram, sekaligus
// mencatat waktunya supaya tidak terlalu sering.
//
// Catatan: penghitung putus TIDAK direset di sini. Kalau
// direset setiap kali mengabari, badai putus-sambung tidak
// akan pernah terdeteksi sebagai badai -- setiap putus
// dihitung "yang pertama". Penghitung hanya direset saat
// koneksi benar-benar tenang.
async function kabariJembatan(teks) {

    await kirimTelegram(teks);

    waktuKabarTerakhir = Date.now();

}


// Dijadwalkan saat sambung ulang setelah putus. Kalau
// koneksi bertahan sampai timer menyala, berarti badainya
// sudah lewat -- kirim satu ringkasan (kalau memang badai),
// lalu reset penghitung.
function pasangTimerTenang() {

    batalTimerTenang();

    const putus = jumlahPutusBeruntun;

    timerTenang = setTimeout(async () => {

        timerTenang = null;

        if (!siap) return;

        // Koneksi bertahan: badai sudah lewat. Hitungan
        // putus mulai dari nol lagi.
        jumlahPutusBeruntun = 0;

        // Putus sekali-dua kali bukan badai; tidak perlu
        // ringkasan.
        if (putus < 3) return;

        // Jaring pengaman: jangan mengabari kalau baru saja
        // mengabari hal lain.
        if (Date.now() - waktuKabarTerakhir < JEDA_KABAR_MIN_MS) {

            log(
                "koneksi sudah tenang lagi setelah", putus, "kali putus, " +
                "tapi kabar dilewati (baru saja mengabari " +
                Math.round((Date.now() - waktuKabarTerakhir) / 60000) +
                " menit lalu)"
            );

            return;

        }

        log("koneksi tenang lagi setelah", putus, "kali putus; kirim ringkasan");

        await kabariJembatan(
            `Jembatan sudah stabil lagi, ${NAMA}.\n` +
            `WhatsApp ${nomorSendiri} sempat putus ${putus} kali ` +
            `karena jaringan di HP ini labil, sekarang sudah normal kembali.`
        );

    }, JEDA_TENANG_MS);

}


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

        // Baileys mencatat isi sesi terenkripsi (kunci, chain,
        // ratchet) ke stdout. Itu membuat /sdcard/bridge.log
        // cepat membengkak sampai 2 MB, dan menyulitkan
        // mencari baris penting seperti "whatsapp terputus".
        // Level "warn" membuang semua itu tapi tetap
        // menampilkan masalah sungguhan.
        logger: buatLoggerBaileys("warn"),

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

            // Berapa kali putus berturut-turut, dan apakah
            // sambungan sebelumnya sempat bertahan lama?
            const putusBeruntun = jumlahPutusBeruntun;

            // Sambungan sebelumnya bertahan lama = ini bukan
            // badai, cuma putus sekali.
            const sebelumnyaStabil =
                lamaSambungSebelumPutus >= JEDA_STABIL_MS;

            const terlaluBaru =
                Date.now() - waktuKabarTerakhir < JEDA_KABAR_MIN_MS;

            waktuSambungTerakhir = Date.now();

            if (!pernahTersambung) {

                // Sambungan pertama sejak jembatan dinyalakan.
                await kabariJembatan(
                    `Jembatan aktif, ${NAMA}.\n` +
                    `WhatsApp ${nomorSendiri} sekarang tersambung ke Telegram ini.`
                );

            }
            else if (sebelumnyaStabil && !terlaluBaru) {

                // Putus SEKALI setelah koneksi lama normal:
                // kejadian biasa (jaringan berganti, HP
                // sebentar tanpa sinyal). Kabari supaya
                // pemilik tahu.
                await kabariJembatan(
                    `Jembatan tersambung lagi, ${NAMA}.\n` +
                    `WhatsApp ${nomorSendiri} sempat terputus sebentar, sekarang sudah normal.`
                );

            }
            else {

                // Badai putus-sambung. Diamkan total supaya
                // Telegram tidak banjir. Satu ringkasan akan
                // dikirim kalau koneksi sudah tenang.
                log(
                    "badai putus-sambung; kabar Telegram ditahan " +
                    "(putus beruntun:", putusBeruntun + ")"
                );

                pasangTimerTenang();

            }

            pernahTersambung = true;

        }


        if (connection === "close") {

            siap = false;

            // Koneksi hilang: ringkasan "sudah tenang" tidak
            // berlaku lagi.
            batalTimerTenang();

            // Berapa lama sambungan tadi bertahan? Kalau lama,
            // berarti putus ini kejadian tersendiri, bukan
            // lanjutan badai.
            lamaSambungSebelumPutus = waktuSambungTerakhir
                ? Date.now() - waktuSambungTerakhir
                : 0;

            if (lamaSambungSebelumPutus >= JEDA_STABIL_MS) {

                jumlahPutusBeruntun = 0;

            }

            waktuPutusTerakhir = Date.now();
            jumlahPutusBeruntun += 1;

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
            //
            // Jeda tetap 5 detik terbukti buruk: saat WhatsApp
            // memutus berulang (kode 428), jembatan langsung
            // menyambung lagi dan server membalas dengan
            // pemutusan baru -- 146 kali dalam setengah jam.
            // Makin sering putus, makin lama menunggu.
            //
            // 5s, 10s, 20s, 40s, 80s, lalu mentok 5 menit.
            const jeda = keluar
                ? 2000
                : jedaSambungUlang(
                    jumlahPutusBeruntun,
                    JEDA_SAMBUNG_ULANG_DASAR_MS,
                    JEDA_SAMBUNG_ULANG_MAKS_MS
                );

            log("sambung ulang dalam", Math.round(jeda / 1000), "detik");

            setTimeout(mulaiWhatsApp, jeda);

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
            `Tujuan   : ${tujuanDefault || "-"}\n` +
            `Antrean  : ${antrean ? "aktif" : "tidak aktif (SUPABASE_URL/KEY kosong)"}`
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

            // Kesalahan paling sering di sini: nomor tujuan
            // tidak terdaftar di WhatsApp. Tanpa penjelasan,
            // pesan galat mentah dari library bikin bingung.
            const pesan = String(error?.message || error);

            if (/not.?on.?whatsapp|not.?registered|item-not-found|404/i.test(pesan)) {

                await kirimTelegram(
                    `Gagal mengirim: ${tujuanDefault} tidak terdaftar di WhatsApp.\n` +
                    `Cek nomornya di /status, atau kirim /to 62... untuk mencoba nomor lain.`
                );

            }
            else {

                await kirimTelegram(`Gagal mengirim: ${pesan}`);

            }

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
//  Antrean: ambil titipan notifikasi, kirim ke WhatsApp
// ---------------------------------------------------------

async function prosesAntrean() {

    if (!antrean || !tujuanAntrean) return;

    if (!siap) return;

    if (antreanSibuk) return;

    antreanSibuk = true;

    try {

        const jid = jidDariNomor(tujuanAntrean);

        if (!jid) {

            log("WA_BRIDGE_TUJUAN tidak valid:", tujuanAntrean);

            return;

        }

        const daftar = await antrean.ambil(5);

        for (const baris of daftar) {

            const putusan = putuskan(baris);

            if (putusan === "lewat") continue;


            if (putusan === "kedaluwarsa") {

                log(`antrean ${baris.id} kedaluwarsa, dilewati`);

                await antrean.kedaluwarsa(
                    baris.id,
                    "lebih tua dari 24 jam"
                );

                continue;

            }


            try {

                await sock.sendMessage(jid, {
                    text: potong(baris.pesan, 4000)
                });

                await antrean.terkirim(baris.id);

                log(
                    `antrean ${baris.id} terkirim ke ${tujuanAntrean} ` +
                    `(${String(baris.pesan).length} char)`
                );

            }
            catch (error) {

                const menyerah = await antrean.gagal(
                    baris.id,
                    baris.percobaan,
                    error?.message || error
                );

                log(
                    `antrean ${baris.id} gagal` +
                    (menyerah ? " (menyerah)" : " (akan dicoba lagi)") +
                    ":", error?.message || error
                );

            }

        }

    }
    catch (error) {

        log("antrean error:", error?.message || error);

    }
    finally {

        antreanSibuk = false;

    }

}


async function putarAntrean() {

    if (!antrean) {

        log("antrean WhatsApp tidak aktif: SUPABASE_URL / SUPABASE_KEY kosong.");

        return;

    }

    if (!tujuanAntrean) {

        log("antrean WhatsApp tidak aktif: WA_BRIDGE_TUJUAN kosong.");

        return;

    }

    antreanJalan = true;

    log(`antrean WhatsApp siap (tujuan ${tujuanAntrean}, tiap ${ANTREAN_JEDA_MS / 1000} detik)`);

    while (antreanJalan) {

        await prosesAntrean();

        await tidur(ANTREAN_JEDA_MS);

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

// Harus dipasang SEBELUM soket WhatsApp dibuat, karena
// libsignal menulis dump sesi saat handshake.
tutupLogLibsignal();

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

putarAntrean();


// Keluar dengan rapi supaya sesi tidak korup.
for (const sinyal of ["SIGINT", "SIGTERM"]) {

    process.on(sinyal, () => {

        log("berhenti...");

        telegramJalan = false;
        antreanJalan = false;

        try { sock?.end(undefined); } catch {}

        setTimeout(() => process.exit(0), 500);

    });

}
