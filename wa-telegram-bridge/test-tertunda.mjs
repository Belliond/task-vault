// =========================================================
//  UJI: pesan dikirim saat jembatan BELUM hidup,
//  lalu jembatan dinyalakan belakangan.
//
//  Meniru "pesan jam 10, internet hidup jam 11".
//  Telegram palsu menahan update di antrean (seperti
//  server Telegram yang menyimpan update belum dikonfirmasi),
//  lalu bridge dijalankan dan harus tetap memprosesnya.
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
//  Telegram palsu. Update diantrekan dan HANYA dihapus
//  setelah dikonfirmasi lewat offset — sama seperti aslinya.
// ---------------------------------------------------------

let antrean = [];
let nomorUpdate = 500;
let panggilanGetUpdates = 0;

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

        panggilanGetUpdates += 1;

        const offset = Number(url.searchParams.get("offset") || 0);

        // Konfirmasi: update di bawah offset dibuang permanen.
        // Karena `antrean` dipakai di beberapa tempat, jangan
        // diganti referensinya — potong di tempat.
        if (offset > 0) {

            for (let i = antrean.length - 1; i >= 0; i -= 1) {

                if (antrean[i].update_id < offset) antrean.splice(i, 1);

            }

        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, result: antrean.slice(0, 100) }));

        return;

    }


    res.writeHead(404);
    res.end("{}");

});


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
        ev: { on(nama, fn) { (pendengar[nama] ||= []).push(fn); } },
        async sendMessage(jid, isi) {
            fs.appendFileSync(
                "./keluar.jsonl",
                JSON.stringify({ jid, teks: isi && isi.text }) + "\\n"
            );
        },
        async onWhatsApp(jid) { return [{ jid, exists: true }]; },
        end() {}
    };

    setTimeout(() => {
        (pendengar["connection.update"] || []).forEach((fn) =>
            fn({ connection: "open" })
        );
    }, 100);

    return sock;
}
`;


async function tungguSampai(fn, label, ms = 15000) {

    const mulai = Date.now();

    while (Date.now() - mulai < ms) {

        if (fn()) return true;

        await tidur(150);

    }

    console.log("  (timeout menunggu " + label + ")");

    return false;

}


const dirKerja = fs.mkdtempSync(path.join(os.tmpdir(), "wa-bridge-offline-"));

let bridge = null;

try {

    fs.copyFileSync(path.join(AKAR, "bridge.mjs"), path.join(dirKerja, "bridge.mjs"));
    fs.copyFileSync(path.join(AKAR, "lib.mjs"), path.join(dirKerja, "lib.mjs"));
    fs.copyFileSync(path.join(AKAR, "outbox.mjs"), path.join(dirKerja, "outbox.mjs"));

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


    // ---------- FASE 1: "jam 10", jembatan mati ----------
    console.log("\n=== 1. pesan dikirim saat jembatan mati ===");

    const pesanJam10 = {
        update_id: nomorUpdate++,
        message: {
            chat: { id: 9988 },
            text: "/to 08123456789 pesan yang dikirim jam 10"
        }
    };

    antrean.push(pesanJam10);

    cek("update tertahan di server", antrean.length, 1);
    cek("belum ada proses jembatan", bridge === null, true);


    // ---------- FASE 2: "jam 11", internet hidup ----------
    console.log("\n=== 2. jembatan dinyalakan (jam 11) ===");

    bridge = spawn(process.execPath, ["bridge.mjs"], {
        cwd: dirKerja,
        env: {
            ...process.env,
            TELEGRAM_BOT_TOKEN: "123:uji",
            TELEGRAM_CHAT_ID: "9988",
            TELEGRAM_API_BASE: `http://127.0.0.1:${port}`,
            WA_BRIDGE_NAMA: "Krisna"
        },
        stdio: ["ignore", "pipe", "pipe"]
    });

    let keluaran = "";
    bridge.stdout.on("data", (d) => { keluaran += d; });
    bridge.stderr.on("data", (d) => { keluaran += d; });


    const masuk = await tungguSampai(
        () => terkirim.some((m) => /Terkirim ke/.test(String(m.text || ""))),
        "pesan lama diproses"
    );

    cek("pesan jam 10 tetap diproses", masuk, true);
    cek(
        "konfirmasi menyebut nomor tujuan",
        terkirim.some((m) => /Terkirim ke 08123456789/.test(String(m.text || ""))),
        true
    );


    const keluarFile = path.join(dirKerja, "keluar.jsonl");

    const keluar = fs.existsSync(keluarFile)
        ? fs.readFileSync(keluarFile, "utf8").split("\n").filter(Boolean).map((b) => JSON.parse(b))
        : [];

    cek("benar-benar terkirim ke WhatsApp", keluar.length, 1);
    cek("isi sesuai pesan asli", keluar[0]?.teks, "pesan yang dikirim jam 10");


    // ---------- FASE 3: tidak dobel ----------
    console.log("\n=== 3. tidak diproses dua kali ===");

    await tidur(2500);

    cek("antrean server sudah dikonfirmasi", antrean.length, 0);
    cek("tidak ada kiriman dobel", keluar.length, 1);


    // ---------- FASE 4: dua pesan sekaligus ----------
    console.log("\n=== 4. dua pesan tertahan sekaligus ===");

    antrean.push({
        update_id: nomorUpdate++,
        message: { chat: { id: 9988 }, text: "/to 08123456789 pertama" }
    });

    antrean.push({
        update_id: nomorUpdate++,
        message: { chat: { id: 9988 }, text: "/to 08123456789 kedua" }
    });

    await tungguSampai(() => {
        const k = fs.existsSync(keluarFile)
            ? fs.readFileSync(keluarFile, "utf8").split("\n").filter(Boolean)
            : [];
        return k.length >= 3;
    }, "dua pesan diproses");

    const keluar2 = fs.readFileSync(keluarFile, "utf8").split("\n").filter(Boolean).map((b) => JSON.parse(b));

    cek("dua pesan lama ikut terkirim", keluar2.length, 3);
    cek("urutan pertama benar", keluar2[1]?.teks, "pertama");
    cek("urutan kedua benar", keluar2[2]?.teks, "kedua");


    // ---------- FASE 5: restart tidak menggandakan ----------
    console.log("\n=== 5. jembatan dimatikan lalu dinyalakan lagi ===");

    bridge.kill();
    await tidur(500);

    const sebelum = fs.readFileSync(keluarFile, "utf8").split("\n").filter(Boolean).length;

    bridge = spawn(process.execPath, ["bridge.mjs"], {
        cwd: dirKerja,
        env: {
            ...process.env,
            TELEGRAM_BOT_TOKEN: "123:uji",
            TELEGRAM_CHAT_ID: "9988",
            TELEGRAM_API_BASE: `http://127.0.0.1:${port}`,
            WA_BRIDGE_NAMA: "Krisna"
        },
        stdio: ["ignore", "pipe", "pipe"]
    });

    await tidur(3000);

    const sesudah = fs.readFileSync(keluarFile, "utf8").split("\n").filter(Boolean).length;

    cek("tidak ada pengiriman ulang setelah restart", sesudah, sebelum);

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
