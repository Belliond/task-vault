// =========================================================
//  UJI: penahan banjir "Jembatan aktif".
//
//  Latar belakang: pada 14/11/2026 koneksi WhatsApp putus-
//  sambung 146 kali dalam ~30 menit (kode 428). Setiap kali
//  tersambung, jembatan mengabari Telegram -- Telegram jadi
//  banjir dan pesan penting tertutupi.
//
//  Yang diuji:
//    1. Sambungan pertama SELALU dikabari.
//    2. Putus-sambung beruntun TIDAK mengabari sama sekali.
//    3. Setelah koneksi tenang, dikirim SATU ringkasan.
//    4. Putus sekali setelah lama tenang tetap dikabari.
//
//  Jeda sambung ulang dipercepat lewat .env supaya tes tidak
//  perlu menunggu menit-menitan. Rumus jedanya sendiri diuji
//  terpisah di test.mjs.
// =========================================================

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const AKAR = path.dirname(fileURLToPath(import.meta.url));
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

let gagal = 0;

function cek(nama, dapat, harap) {

    const a = JSON.stringify(dapat);
    const b = JSON.stringify(harap);

    if (a === b) console.log("  ok   " + nama);
    else { gagal += 1; console.log("  GAGAL " + nama + " | dapat " + a + " | harap " + b); }

}


// ---------------------------------------------------------
//  Telegram palsu: hanya mencatat pesan keluar.
// ---------------------------------------------------------

const terkirim = [];

const server = http.createServer((req, res) => {

    const url = new URL(req.url, "http://127.0.0.1");

    if (url.pathname.endsWith("/sendMessage")) {

        let badan = "";

        req.on("data", (c) => { badan += c; });

        req.on("end", () => {

            try { terkirim.push(JSON.parse(badan)); }
            catch { terkirim.push({ rusak: badan }); }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, result: {} }));

        });

        return;

    }

    if (url.pathname.endsWith("/getUpdates")) {

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, result: [] }));

        return;

    }

    res.writeHead(404);
    res.end("{}");

});


// ---------------------------------------------------------
//  WhatsApp palsu.
//
//  Menyerupai Baileys: soket baru otomatis "terbuka"
//  setelah 100 ms. Putus diperintahkan lewat kendali.json.
//  Hanya soket terbaru yang memancarkan kejadian.
// ---------------------------------------------------------

const MODUL_TIRUAN = `
import fs from "node:fs";

let soketAktif = null;

export function isJidGroup(jid) {
    return String(jid || "").endsWith("@g.us");
}

export async function fetchLatestBaileysVersion() {
    return { version: [2, 3000, 0] };
}

export async function useMultiFileAuthState() {
    return { state: {}, saveCreds: async () => {} };
}

export const DisconnectReason = { loggedOut: 401 };

export default function makeWASocket() {

    const pendengar = {};

    const sock = {
        user: { id: "628111222333@s.whatsapp.net" },
        ev: { on(nama, fn) { (pendengar[nama] ||= []).push(fn); } },
        async sendMessage() {},
        async onWhatsApp(jid) { return [{ jid, exists: true }]; },
        end() {}
    };

    soketAktif = sock;

    setTimeout(() => {

        if (soketAktif !== sock) return;

        (pendengar["connection.update"] || []).forEach((fn) =>
            fn({ connection: "open" })
        );

    }, 100);

    setInterval(() => {

        if (soketAktif !== sock) return;

        try {

            if (!fs.existsSync("./kendali.json")) return;

            const isi = JSON.parse(fs.readFileSync("./kendali.json", "utf8"));

            fs.rmSync("./kendali.json");

            if (isi.aksi === "close") {

                (pendengar["connection.update"] || []).forEach((fn) =>
                    fn({
                        connection: "close",
                        lastDisconnect: {
                            error: { output: { statusCode: isi.kode || 428 } }
                        }
                    })
                );

            }

        }
        catch {}

    }, 50);

    return sock;
}
`;


const adaTeks = (regex) =>
    terkirim.some((m) => regex.test(String(m.text || "")));

const jumlahKabar = () =>
    terkirim.filter((m) =>
        /Jembatan (aktif|tersambung lagi|sudah stabil lagi)/.test(String(m.text || ""))
    ).length;


const dirKerja = fs.mkdtempSync(path.join(os.tmpdir(), "wa-bridge-spam-"));

let bridge = null;

try {

    for (const f of ["bridge.mjs", "lib.mjs", "outbox.mjs"]) {
        fs.copyFileSync(path.join(AKAR, f), path.join(dirKerja, f));
    }

    const tulisModul = (nama, isi) => {

        const folder = path.join(dirKerja, "node_modules", nama);

        fs.mkdirSync(folder, { recursive: true });

        fs.writeFileSync(
            path.join(folder, "package.json"),
            JSON.stringify({ name: nama, type: "module", main: "index.mjs" })
        );

        fs.writeFileSync(path.join(folder, "index.mjs"), isi);

    };

    tulisModul("baileys", MODUL_TIRUAN);
    tulisModul("qrcode-terminal", "export default { generate() {} };");


    await new Promise((r) => server.listen(0, "127.0.0.1", r));

    const port = server.address().port;

    const perintah = (aksi, kode) => {
        fs.writeFileSync(
            path.join(dirKerja, "kendali.json"),
            JSON.stringify({ aksi, kode })
        );
    };

    bridge = spawn(process.execPath, ["bridge.mjs"], {
        cwd: dirKerja,
        env: {
            ...process.env,
            TELEGRAM_BOT_TOKEN: "123:uji",
            TELEGRAM_CHAT_ID: "9988",
            TELEGRAM_API_BASE: `http://127.0.0.1:${port}`,
            WA_BRIDGE_NAMA: "Krisna",
            WA_BRIDGE_TUJUAN: "08123456789",

            // Dipercepat supaya tes cepat. Nilai aslinya
            // (5 detik -> 5 menit) diuji di test.mjs.
            WA_BRIDGE_JEDA_SAMBUNG_ULANG_DASAR_MS: "40",
            WA_BRIDGE_JEDA_SAMBUNG_ULANG_MAKS_MS: "160",
            WA_BRIDGE_JEDA_TENANG_MS: "1200",
            WA_BRIDGE_JEDA_KABAR_MIN_MS: "0",

            // Jendela "putus beruntun" diperkecil. Badai di
            // tes berlangsung hanya beberapa detik, jadi
            // 2 detik sudah cukup untuk menandainya beruntun
            // -- dan tetap menyisakan jarak untuk menguji
            // putus tunggal setelah tenang.
            WA_BRIDGE_JEDA_STABIL_MS: "2000"
        },
        stdio: ["ignore", "pipe", "pipe"]
    });

    let keluaran = "";
    bridge.stdout.on("data", (d) => { keluaran += d; });
    bridge.stderr.on("data", (d) => { keluaran += d; });

    // Berapa kali jembatan melaporkan tersambung (ke log,
    // bukan ke Telegram). Dipakai untuk tahu sambung ulang
    // sudah terjadi.
    const jumlahSambung = () =>
        (keluaran.match(/whatsapp tersambung sebagai/g) || []).length;

    async function tungguSampai(fn, label, ms = 15000) {

        const mulai = Date.now();

        while (Date.now() - mulai < ms) {

            if (fn()) return true;

            await tidur(50);

        }

        console.log("  (timeout menunggu " + label + ")");

        return false;

    }


    // ---------- 1 ----------
    console.log("\n=== 1. sambungan pertama dikabari ===");

    await tungguSampai(() => jumlahKabar() >= 1, "kabar pertama");

    cek("kabar pertama terkirim", jumlahKabar(), 1);
    cek("menyebut jembatan aktif", adaTeks(/Jembatan aktif, Krisna/), true);


    // ---------- 2 ----------
    console.log("\n=== 2. putus-sambung beruntun tidak membanjiri ===");

    terkirim.length = 0;

    // Tiru kejadian nyata: 20 kali putus lalu sambung lagi.
    let siklus = 0;

    for (let i = 0; i < 20; i += 1) {

        const sebelum = jumlahSambung();

        perintah("close", 428);

        // Tunggu jembatan benar-benar menyambung ulang,
        // jangan hanya menebak lewat tidur.
        const ok = await tungguSampai(
            () => jumlahSambung() > sebelum,
            "sambung ulang ke-" + (i + 1),
            8000
        );

        if (!ok) break;

        siklus += 1;

    }

    await tidur(500);

    // Tanpa ini, tes bisa lulus hanya karena siklusnya tidak
    // pernah berjalan.
    cek("benar-benar terjadi 20 siklus putus-sambung", siklus, 20);
    cek("20 putus-sambung tidak mengirim kabar", jumlahKabar(), 0);
    cek("kabar ditahan (ada catatan log)",
        /badai putus-sambung; kabar Telegram ditahan/.test(keluaran), true);
    cek("tidak ada kabar 'tersambung lagi' di tengah badai",
        adaTeks(/Jembatan tersambung lagi/), false);
    cek("putus tercatat di log", /whatsapp terputus/.test(keluaran), true);


    // ---------- 3 ----------
    console.log("\n=== 3. setelah tenang, satu ringkasan ===");

    await tungguSampai(() => jumlahKabar() >= 1, "ringkasan tenang", 8000);

    cek("ringkasan dikirim setelah tenang", jumlahKabar(), 1);
    cek("ringkasan menyebut sudah stabil",
        adaTeks(/Jembatan sudah stabil lagi, Krisna/), true);
    cek("ringkasan menyebut jumlah putus",
        adaTeks(/sempat putus \d+ kali/), true);

    // Tunggu lagi: tidak boleh ada ringkasan kedua.
    await tidur(2500);

    cek("ringkasan tidak diulang", jumlahKabar(), 1);


    // ---------- 4 ----------
    console.log("\n=== 4. putus sekali setelah lama tenang tetap dikabari ===");

    terkirim.length = 0;

    // Tunggu cukup lama supaya putus berikutnya tidak lagi
    // dianggap bagian dari badai sebelumnya.
    await tidur(2500);

    const sebelum = jumlahSambung();

    perintah("close", 428);

    await tungguSampai(() => jumlahSambung() > sebelum, "sambung ulang", 8000);
    await tungguSampai(() => jumlahKabar() >= 1, "kabar setelah tenang", 8000);

    cek("putus tunggal setelah tenang dikabari", jumlahKabar(), 1);
    cek("kabarnya berbunyi tersambung lagi",
        adaTeks(/Jembatan tersambung lagi, Krisna/), true);


    // ---------- 5 ----------
    console.log("\n=== 5. tidak ada galat ===");

    cek("tidak ada unhandled rejection",
        /UnhandledPromiseRejection|ERR_UNHANDLED/.test(keluaran), false);

}
catch (error) {

    gagal += 1;
    console.error("ERROR: " + error.message);

}
finally {

    try { bridge?.kill(); } catch {}
    try { server.close(); } catch {}

    await tidur(300);
    try { fs.rmSync(dirKerja, { recursive: true, force: true }); } catch {}

    console.log(`\n=== hasil: ${gagal === 0 ? "SEMUA LULUS" : gagal + " GAGAL"} ===`);
    process.exit(gagal === 0 ? 0 : 1);

}
