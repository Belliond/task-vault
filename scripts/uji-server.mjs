// =========================================================
//  PEMBANTU SERVER UNTUK UJI BROWSER
//
//  Uji browser butuh halaman yang disajikan lewat HTTP (bukan
//  file://), karena service worker dan manifest tidak bekerja di
//  file://. Sebelumnya uji mengandalkan server yang dinyalakan
//  manual di port 5199; kalau lupa, hasilnya gagal dengan pesan
//  yang membingungkan ("browser tidak mau terbuka").
//
//  Helper ini memeriksa dulu apakah URL uji sudah hidup. Kalau
//  belum, ia menyalakan scripts/serve.mjs sendiri dan mematikannya
//  lagi setelah uji selesai.
// =========================================================

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));


// Apakah URL ini sudah dilayani sesuatu?
async function hidup(url) {

    try {

        const res = await fetch(url, { method: "GET" });

        // Status apa pun berarti ada yang menjawab.
        return res.status > 0;

    }
    catch {

        return false;

    }

}


// Pastikan ada server untuk URL uji.
//
// Mengembalikan fungsi `berhenti()` yang aman dipanggil walau
// server tidak dinyalakan helper ini (jadi tidak mematikan server
// milik pengguna).
export async function pastikanServer(urlUji, port = 5199) {

    if (await hidup(urlUji)) {

        return { berhenti: () => {}, dipakaiSendiri: false };

    }

    const server = spawn(
        process.execPath,
        [path.join(AKAR, "scripts", "serve.mjs")],
        {
            cwd: AKAR,
            env: { ...process.env, PORT: String(port) },
            stdio: "ignore"
        }
    );

    // Tunggu sampai benar-benar menjawab.
    for (let i = 0; i < 100; i += 1) {

        await tidur(150);

        if (await hidup(urlUji)) {

            return {
                berhenti: () => {

                    try { server.kill(); }
                    catch {}

                },
                dipakaiSendiri: true
            };

        }

        if (server.exitCode !== null) break;

    }

    try { server.kill(); }
    catch {}

    throw new Error(
        "Server uji tidak bisa dinyalakan di " + urlUji +
        ". Jalankan manual: $env:PORT=\"5199\"; node scripts/serve.mjs"
    );

}
