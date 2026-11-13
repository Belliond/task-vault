// =========================================================
//  UJI: kode pasangan dibuat saat DIMINTA, bukan otomatis.
//
//  Dua bug yang pernah terjadi:
//   1. Kode hanya diminta sekali, lalu tidak pernah diperbarui
//      setelah kedaluwarsa -> pemasangan buntu.
//   2. Kode diminta ulang setiap QR berganti -> setiap kode
//      baru MEMBATALKAN kode sebelumnya, jadi kode yang
//      sedang diketik orang bisa mati di tengah jalan.
//
//  Desain yang benar: kode hanya dibuat saat /pasang.
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
//  Telegram palsu
// ---------------------------------------------------------

const terkirim = [];
let antrean = [];

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

        const offset = Number(url.searchParams.get("offset") || 0);

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


// ---------------------------------------------------------
//  Baileys tiruan
// ---------------------------------------------------------

const MODUL_TIRUAN = `
const pendengar = {};
let nomorKode = 0;

export function isJidGroup(jid) { return String(jid || "").endsWith("@g.us"); }
export async function fetchLatestBaileysVersion() { return { version: [2, 3000, 0] }; }
export async function useMultiFileAuthState() { return { state: {}, saveCreds: async () => {} }; }
export const DisconnectReason = { loggedOut: 401 };

export default function makeWASocket() {

    const sock = {
        user: { id: "628111222333@s.whatsapp.net" },
        ev: { on(nama, fn) { (pendengar[nama] ||= []).push(fn); } },

        async requestPairingCode() {
            nomorKode += 1;
            return "KODE" + String(nomorKode).padStart(4, "0");
        },

        async sendMessage() {},
        async onWhatsApp(jid) { return [{ jid, exists: true }]; },
        end() {}
    };

    const kirim = (u) => (pendengar["connection.update"] || []).forEach((fn) => fn(u));

    // WhatsApp mengirim QR berulang kali (seperti aslinya).
    setTimeout(() => kirim({ qr: "qr-1" }), 150);
    setTimeout(() => kirim({ qr: "qr-2" }), 400);
    setTimeout(() => kirim({ qr: "qr-3" }), 700);
    setTimeout(() => kirim({ qr: "qr-4" }), 1000);

    return sock;
}
`;


async function tungguSampai(fn, label, ms = 15000) {

    const mulai = Date.now();

    while (Date.now() - mulai < ms) {
        if (fn()) return true;
        await tidur(100);
    }

    console.log("  (timeout menunggu " + label + ")");
    return false;

}


const dirKerja = fs.mkdtempSync(path.join(os.tmpdir(), "wa-kode-"));

let bridge = null;
let nomorUpdate = 900;

function kirimPerintah(teks) {

    antrean.push({
        update_id: nomorUpdate++,
        message: { chat: { id: 9988 }, text: teks }
    });

}


try {

    fs.copyFileSync(path.join(AKAR, "bridge.mjs"), path.join(dirKerja, "bridge.mjs"));
    fs.copyFileSync(path.join(AKAR, "lib.mjs"), path.join(dirKerja, "lib.mjs"));

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


    bridge = spawn(process.execPath, ["bridge.mjs"], {
        cwd: dirKerja,
        env: {
            ...process.env,
            TELEGRAM_BOT_TOKEN: "123:uji",
            TELEGRAM_CHAT_ID: "9988",
            TELEGRAM_API_BASE: `http://127.0.0.1:${port}`,
            WA_BRIDGE_NAMA: "Krisna",
            WA_BRIDGE_PASANGAN: "628111222333"
        },
        stdio: ["ignore", "pipe", "pipe"]
    });

    let keluaran = "";
    bridge.stdout.on("data", (d) => { keluaran += d; });
    bridge.stderr.on("data", (d) => { keluaran += d; });


    // ---------- 1. Tidak ada kode otomatis ----------
    console.log("\n=== 1. kode tidak dibuat otomatis ===");

    await tidur(3000);

    cek(
        "tidak ada kode dibuat tanpa diminta",
        (keluaran.match(/KODE PASANGAN:/g) || []).length,
        0
    );


    // ---------- 2. /pasang membuat kode ----------
    console.log("\n=== 2. /pasang membuat kode ===");

    kirimPerintah("/pasang");

    const dapatKode = await tungguSampai(
        () => terkirim.some((m) => /Kode pasangan WhatsApp/.test(String(m.text || ""))),
        "kode dikirim ke Telegram"
    );

    cek("kode dikirim setelah /pasang", dapatKode, true);

    const kodePertama = (String(
        terkirim.find((m) => /Kode pasangan WhatsApp/.test(String(m.text || "")))?.text || ""
    ).match(/Kode pasangan WhatsApp: (\w+)/) || [])[1];

    cek("kode pertama berbentuk benar", kodePertama, "KODE0001");


    // ---------- 3. /pasang lagi membuat kode BARU ----------
    console.log("\n=== 3. /pasang lagi membuat kode baru ===");

    kirimPerintah("/pasang");

    const dapatKedua = await tungguSampai(
        () => terkirim.filter((m) => /Kode pasangan WhatsApp/.test(String(m.text || ""))).length >= 2,
        "kode kedua dikirim"
    );

    cek("kode kedua dikirim", dapatKedua, true);

    const semuaKode = terkirim
        .map((m) => String(m.text || ""))
        .map((t) => (t.match(/Kode pasangan WhatsApp: (\w+)/) || [])[1])
        .filter(Boolean);

    cek("kode kedua berbeda dari pertama", semuaKode[0] !== semuaKode[1], true);
    cek("kode kedua adalah KODE0002", semuaKode[1], "KODE0002");


    // ---------- 4. QR berulang tidak membuat kode ----------
    console.log("\n=== 4. QR berulang tidak memicu kode baru ===");

    const jumlahSebelum = (keluaran.match(/KODE PASANGAN:/g) || []).length;

    await tidur(2500);

    cek(
        "QR berganti tidak membuat kode tambahan",
        (keluaran.match(/KODE PASANGAN:/g) || []).length,
        jumlahSebelum
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
