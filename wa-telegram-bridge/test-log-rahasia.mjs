// =========================================================
//  UJI: isi sesi terenkripsi tidak boleh masuk ke log.
//
//  libsignal (dipakai Baileys) memanggil console.info
//  langsung -- tidak lewat logger Baileys:
//
//    console.info("Closing session:", session)
//
//  `session` berisi kunci privat (privKey, rootKey,
//  chainKey). Kalau bocor ke /sdcard/bridge.log, aplikasi
//  lain di HP bisa membacanya, dan log membengkak sampai
//  2 MB sehingga baris penting tenggelam.
//
//  Uji ini memastikan baris itu dibuang, sementara
//  console.log milik jembatan sendiri tetap jalan.
// =========================================================

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
//  WhatsApp palsu yang meniru kebiasaan libsignal:
//  mencetak dump sesi lewat console.info / console.warn.
// ---------------------------------------------------------

const MODUL_TIRUAN = `
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

    // libsignal mencetak kunci sebagai Buffer, dan Buffer
    // dicetak sebagai <Buffer 4b 55 4e ...> alias HEX.
    // Jadi yang harus diperiksa adalah hex-nya, bukan teks
    // aslinya -- teks aslinya memang tidak akan pernah
    // muncul walau bocor.
    const sesi = {
        currentRatchet: {
            ephemeralKeyPair: {
                privKey: Buffer.from("KUNCI-RAHASIA-JANGAN-BOCOR")
            },
            rootKey: Buffer.from("ROOT-KEY-RAHASIA")
        }
    };

    // Persis seperti libsignal.
    console.info("Closing session:", sesi);
    console.info("Opening session:", sesi);
    console.warn("Session already closed", sesi);

    const sock = {
        user: { id: "628111222333@s.whatsapp.net" },
        ev: { on(nama, fn) { (pendengar[nama] ||= []).push(fn); } },
        async sendMessage() {},
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


// Hex dari kunci rahasia di atas. Inilah yang benar-benar
// tercetak kalau dump sesi lolos.
const HEX_PRIV = Buffer.from("KUNCI-RAHASIA-JANGAN-BOCOR").toString("hex");
const HEX_ROOT = Buffer.from("ROOT-KEY-RAHASIA").toString("hex");


const dirKerja = fs.mkdtempSync(path.join(os.tmpdir(), "wa-bridge-log-"));

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


    bridge = spawn(process.execPath, ["bridge.mjs"], {
        cwd: dirKerja,
        env: {
            ...process.env,
            TELEGRAM_BOT_TOKEN: "123:uji",
            TELEGRAM_CHAT_ID: "9988",
            // Sengaja tidak bisa dihubungi: kita hanya
            // memeriksa log, bukan pengiriman.
            TELEGRAM_API_BASE: "http://127.0.0.1:1",
            WA_BRIDGE_NAMA: "Krisna",
            WA_BRIDGE_TUJUAN: "08123456789"
        },
        stdio: ["ignore", "pipe", "pipe"]
    });

    let keluaran = "";

    bridge.stdout.on("data", (d) => { keluaran += d; });
    bridge.stderr.on("data", (d) => { keluaran += d; });

    await tidur(2500);

    console.log("\n=== 1. kunci privat tidak bocor ===");

    cek("dump sesi tidak muncul", /Closing session|Opening session|Session already closed/.test(keluaran), false);

    // Ini yang paling penting: isi kuncinya sendiri. Buffer
    // dicetak sebagai hex, jadi periksa hex-nya.
    cek("kunci privat (hex) tidak tercetak", keluaran.includes(HEX_PRIV), false);
    cek("root key (hex) tidak tercetak", keluaran.includes(HEX_ROOT), false);
    cek("tidak ada penanda Buffer sama sekali", /<Buffer /.test(keluaran), false);

    console.log("\n=== 2. log jembatan sendiri tetap jalan ===");

    // Penyaringan tidak boleh ikut membungkam log jembatan.
    cek("log jembatan tetap tercetak", /jembatan mulai/.test(keluaran), true);
    cek("sambungan tercatat", /whatsapp tersambung sebagai/.test(keluaran), true);

}
catch (error) {

    gagal += 1;
    console.error("ERROR: " + error.message);

}
finally {

    try { bridge?.kill(); } catch {}

    await tidur(300);
    try { fs.rmSync(dirKerja, { recursive: true, force: true }); } catch {}

    console.log(`\n=== hasil: ${gagal === 0 ? "SEMUA LULUS" : gagal + " GAGAL"} ===`);
    process.exit(gagal === 0 ? 0 : 1);

}
