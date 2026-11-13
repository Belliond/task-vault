// =========================================================
//  UJI END-TO-END dengan WhatsApp dan Telegram palsu.
//
//  Tidak ada koneksi sungguhan: paket `baileys` diganti
//  tiruan, dan Bot API Telegram diganti server HTTP lokal.
//  Tujuannya memastikan alur pesan benar-benar tersambung
//  (masuk, keluar, perintah, dan penyaringan), bukan hanya
//  fungsi murninya.
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

    if (a === b) {

        console.log("  ok   " + nama);

    }
    else {

        gagal += 1;

        console.log("  GAGAL " + nama + " | dapat " + a + " | harap " + b);

    }

}


// ---------------------------------------------------------
//  Telegram palsu: mencatat pesan keluar, menyajikan update
// ---------------------------------------------------------

const terkirim = [];
const antrean = [];
let nomorUpdate = 100;


const server = http.createServer((req, res) => {

    const url = new URL(req.url, "http://127.0.0.1");


    if (url.pathname.endsWith("/sendMessage")) {

        let badan = "";

        req.on("data", (c) => { badan += c; });

        req.on("end", () => {

            try {

                terkirim.push(JSON.parse(badan));

            }
            catch {

                terkirim.push({ rusak: badan });

            }

            res.writeHead(200, { "Content-Type": "application/json" });

            res.end(JSON.stringify({ ok: true, result: {} }));

        });

        return;

    }


    if (url.pathname.endsWith("/getUpdates")) {

        const offset = Number(url.searchParams.get("offset") || 0);

        res.writeHead(200, { "Content-Type": "application/json" });

        res.end(JSON.stringify({
            ok: true,
            result: antrean.filter((u) => u.update_id >= offset)
        }));

        return;

    }


    res.writeHead(404);

    res.end("{}");

});


// ---------------------------------------------------------
//  WhatsApp palsu.
//  Membaca `masuk.json` untuk memicu pesan masuk, dan
//  menulis `keluar.jsonl` setiap kali sendMessage dipanggil.
// ---------------------------------------------------------

const MODUL_TIRUAN = `
import fs from "node:fs";

const pendengar = {};

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

    const sock = {
        user: { id: "628111222333@s.whatsapp.net" },
        ev: {
            on(nama, fn) {
                (pendengar[nama] ||= []).push(fn);
            }
        },
        async sendMessage(jid, isi) {
            fs.appendFileSync(
                "./keluar.jsonl",
                JSON.stringify({ jid, teks: isi && isi.text }) + "\\n"
            );
        },
        async onWhatsApp(jid) {
            return [{ jid, exists: true }];
        },
        end() {}
    };

    // Pesan masuk dipantau dari berkas.
    setInterval(() => {
        try {
            if (!fs.existsSync("./masuk.json")) return;
            const isi = JSON.parse(fs.readFileSync("./masuk.json", "utf8"));
            fs.rmSync("./masuk.json");
            (pendengar["messages.upsert"] || []).forEach((fn) => fn(isi));
        }
        catch {}
    }, 150);

    // Koneksi terbuka setelah pendengar terpasang.
    setTimeout(() => {
        (pendengar["connection.update"] || []).forEach((fn) =>
            fn({ connection: "open" })
        );
    }, 100);

    return sock;
}
`;


// ---------------------------------------------------------
//  Bantuan
// ---------------------------------------------------------

async function tungguSampai(fn, label, ms = 15000) {

    const mulai = Date.now();

    while (Date.now() - mulai < ms) {

        if (fn()) return true;

        await tidur(150);

    }

    console.log("  (timeout menunggu " + label + ")");

    return false;

}


const adaTeks = (regex) =>
    terkirim.some((m) => regex.test(String(m.text || "")));


function bacaKeluar(dir) {

    const f = path.join(dir, "keluar.jsonl");

    if (!fs.existsSync(f)) return [];

    return fs.readFileSync(f, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((b) => JSON.parse(b));

}


// ---------------------------------------------------------
//  Jalankan
// ---------------------------------------------------------

const dirKerja = fs.mkdtempSync(path.join(os.tmpdir(), "wa-bridge-e2e-"));

let bridge = null;

try {

    fs.copyFileSync(
        path.join(AKAR, "bridge.mjs"),
        path.join(dirKerja, "bridge.mjs")
    );

    fs.copyFileSync(
        path.join(AKAR, "lib.mjs"),
        path.join(dirKerja, "lib.mjs")
    );

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

    // QR tidak pernah muncul di tiruan, tapi tetap disediakan.
    tulisModul("qrcode-terminal", "export default { generate() {} };");


    await new Promise((r) => server.listen(0, "127.0.0.1", r));

    const port = server.address().port;

    const env = {
        ...process.env,
        TELEGRAM_BOT_TOKEN: "123:uji",
        TELEGRAM_CHAT_ID: "9988",
        TELEGRAM_API_BASE: `http://127.0.0.1:${port}`,
        WA_BRIDGE_NAMA: "Krisna",
        WA_BRIDGE_TUJUAN: "08123456789"
    };

    bridge = spawn(process.execPath, ["bridge.mjs"], {
        cwd: dirKerja,
        env,
        stdio: ["ignore", "pipe", "pipe"]
    });

    let keluaran = "";

    bridge.stdout.on("data", (d) => { keluaran += d; });
    bridge.stderr.on("data", (d) => { keluaran += d; });


    // ---------- 1 ----------
    console.log("\n=== 1. WhatsApp tersambung ===");

    await tungguSampai(() => adaTeks(/Jembatan aktif/), "sapaan");

    cek("sapaan aktif terkirim", adaTeks(/Jembatan aktif, Krisna/), true);
    cek("nomor sendiri disebut", adaTeks(/628111222333/), true);


    // ---------- 2 ----------
    console.log("\n=== 2. pesan WhatsApp masuk -> Telegram ===");

    terkirim.length = 0;

    fs.writeFileSync(
        path.join(dirKerja, "masuk.json"),
        JSON.stringify({
            messages: [{
                key: {
                    remoteJid: "628999888777@s.whatsapp.net",
                    fromMe: false
                },
                pushName: "Teman",
                message: { conversation: "halo dari whatsapp" }
            }],
            type: "notify"
        })
    );

    await tungguSampai(() => adaTeks(/halo dari whatsapp/), "pesan masuk");

    cek("teks diteruskan", adaTeks(/halo dari whatsapp/), true);
    cek("nomor pengirim terlihat", adaTeks(/628999888777/), true);
    cek("berlabel wa", adaTeks(/^wa · /), true);


    // ---------- 3 ----------
    console.log("\n=== 3. pesan sendiri tidak diteruskan ===");

    terkirim.length = 0;

    fs.writeFileSync(
        path.join(dirKerja, "masuk.json"),
        JSON.stringify({
            messages: [{
                key: {
                    remoteJid: "628999888777@s.whatsapp.net",
                    fromMe: true
                },
                message: { conversation: "pesan dari hp sendiri" }
            }],
            type: "notify"
        })
    );

    await tidur(1500);

    cek("pesan fromMe diabaikan", terkirim.length, 0);


    // ---------- 4 ----------
    console.log("\n=== 4. media diberi label ===");

    terkirim.length = 0;

    fs.writeFileSync(
        path.join(dirKerja, "masuk.json"),
        JSON.stringify({
            messages: [{
                key: {
                    remoteJid: "628999888777@s.whatsapp.net",
                    fromMe: false
                },
                message: {
                    imageMessage: { caption: "lihat ini" }
                }
            }],
            type: "notify"
        })
    );

    await tungguSampai(() => adaTeks(/\[gambar\]/), "label media");

    cek("gambar diberi label", adaTeks(/\[gambar\] lihat ini/), true);


    // ---------- 5 ----------
    console.log("\n=== 5. /to dari Telegram -> WhatsApp ===");

    terkirim.length = 0;

    antrean.push({
        update_id: nomorUpdate++,
        message: {
            chat: { id: 9988 },
            text: "/to 08123456789 halo balik"
        }
    });

    await tungguSampai(() => adaTeks(/Terkirim ke/), "konfirmasi /to");

    cek("konfirmasi terkirim", adaTeks(/Terkirim ke 08123456789/), true);

    const keluar = bacaKeluar(dirKerja);

    cek("pesan benar-benar dikirim ke WhatsApp", keluar.length, 1);
    cek(
        "nomor dinormalkan ke 62",
        keluar[0]?.jid,
        "628123456789@s.whatsapp.net"
    );
    cek("isi pesan benar", keluar[0]?.teks, "halo balik");


    // ---------- 6 ----------
    console.log("\n=== 6. /status ===");

    terkirim.length = 0;

    antrean.push({
        update_id: nomorUpdate++,
        message: { chat: { id: 9988 }, text: "/status" }
    });

    await tungguSampai(() => adaTeks(/tersambung/), "status");

    cek("melaporkan tersambung", adaTeks(/WhatsApp : tersambung/), true);


    // ---------- 7 ----------
    console.log("\n=== 7. chat asing tidak boleh memerintah ===");

    terkirim.length = 0;

    antrean.push({
        update_id: nomorUpdate++,
        message: {
            chat: { id: 7777 },
            text: "/to 08123456789 jangan dikirim"
        }
    });

    await tidur(2000);

    cek("perintah dari chat asing diabaikan", terkirim.length, 0);
    cek(
        "tidak ada kiriman tambahan ke WhatsApp",
        bacaKeluar(dirKerja).length,
        1
    );


    // ---------- 8 ----------
    console.log("\n=== 8. teks biasa memakai tujuan default ===");

    terkirim.length = 0;

    antrean.push({
        update_id: nomorUpdate++,
        message: { chat: { id: 9988 }, text: "langsung kirim ya" }
    });

    await tungguSampai(() => adaTeks(/Terkirim ke 08123456789/), "tujuan default");

    const keluar2 = bacaKeluar(dirKerja);

    cek("kiriman bertambah", keluar2.length, 2);
    cek("isi sesuai", keluar2[1]?.teks, "langsung kirim ya");


    // ---------- 9 ----------
    console.log("\n=== 9. tidak ada galat di log ===");

    cek(
        "tidak ada unhandled rejection",
        /UnhandledPromiseRejection|ERR_UNHANDLED/.test(keluaran),
        false
    );

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
