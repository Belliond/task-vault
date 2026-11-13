// =========================================================
//  TAMPILKAN QR DI LAYAR LAPTOP
//
//  Kenapa perlu: QR tidak bisa dipindai dari HP yang sama
//  dengan WhatsApp-nya. Solusinya tampilkan QR di laptop,
//  lalu pindai dari HP. Setelah tersambung, folder sesi
//  (auth/) disalin ke HP supaya jembatan di HP bisa jalan
//  tanpa pairing ulang.
// =========================================================

import makeWASocket, {
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} from "baileys";
import qrcode from "qrcode";
import QRCodeTerminal from "qrcode-terminal";
import fs from "node:fs";
import path from "node:path";

const FOLDER_AUTH = path.resolve("auth-laptop");

let percobaan = 0;

async function mulai() {

    percobaan += 1;

    const { state, saveCreds } = await useMultiFileAuthState(FOLDER_AUTH);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        browser: ["TaskVault Bridge", "Chrome", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u) => {

        const { connection, lastDisconnect, qr } = u;

        if (qr) {

            // Terminal: supaya bisa dipindai langsung dari layar.
            QRCodeTerminal.generate(qr, { small: true });

            // File PNG: cadangan kalau terminal terlalu kecil.
            try {
                await qrcode.toFile("qr-laptop.png", qr, {
                    width: 720,
                    margin: 2,
                    errorCorrectionLevel: "M"
                });
                console.log("\n>>> QR juga disimpan: qr-laptop.png");
            }
            catch (e) {
                console.log("gagal simpan png:", e.message);
            }

            console.log("\n>>> QR BARU. Pindai SEKARANG dari HP:");
            console.log("    WhatsApp > Perangkat tertaut > Tautkan perangkat\n");

        }

        if (connection === "open") {

            console.log("\n=========================================");
            console.log("  TERSAMBUNG!");
            console.log("  Nomor : " + (sock.user?.id || "?"));
            console.log("  Sesi  : " + FOLDER_AUTH);
            console.log("=========================================\n");

            // Beri waktu kredensial tersimpan ke disk.
            setTimeout(() => {
                console.log("SESI-SIAP");
                process.exit(0);
            }, 3000);

        }

        if (connection === "close") {

            const kode = lastDisconnect?.error?.output?.statusCode;

            console.log("terputus, kode", kode);

            if (kode === DisconnectReason.loggedOut) {
                console.log("LOGOUT: sesi tidak valid.");
                process.exit(1);
            }

            if (percobaan < 5) {
                console.log("mencoba lagi...");
                setTimeout(mulai, 2000);
            }
            else {
                console.log("GAGAL: terlalu banyak percobaan.");
                process.exit(1);
            }

        }

    });

}

fs.rmSync(FOLDER_AUTH, { recursive: true, force: true });
await mulai();
