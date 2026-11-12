#!/usr/bin/env node
// =========================================================
//  AMBIL REFRESH TOKEN GOOGLE CLASSROOM (SEKALI SAJA)
//
//  Kenapa perlu skrip ini?
//
//  Situs task-vault berjalan di browser dan memakai implicit
//  flow, yang HANYA memberi access token berumur ~1 jam. Itu
//  cukup untuk tombol sync manual, tapi tidak cukup untuk
//  GitHub Actions yang harus jalan sendiri tiap 4 jam.
//
//  Refresh token hanya diberikan oleh authorization code flow
//  dengan akses offline. Skrip ini menjalankan alur itu:
//
//    1. buka browser ke halaman consent Google
//    2. tangkap kode di http://127.0.0.1:<port> (loopback)
//    3. tukar kode -> refresh token
//    4. cetak nilainya untuk ditempel ke .env / GitHub Secrets
//
//  Kenapa loopback, bukan copy-paste?
//  Google sudah menutup alur "oob" (salin-tempel kode) sejak
//  2022. Loopback adalah cara resmi untuk aplikasi desktop.
//
//  Kenapa PKCE?
//  OAuth client tipe "Desktop app" adalah public client: client
//  secret-nya tidak benar-benar rahasia. PKCE memastikan kode
//  yang dicegat tidak bisa ditukar oleh pihak lain.
//
//  Pemakaian:
//      node scripts/classroom-auth.mjs
//
//  Yang dibutuhkan:
//      CLASSROOM_CLIENT_ID      OAuth client tipe Desktop app
//      CLASSROOM_CLIENT_SECRET  secret dari client yang sama
//
//  Keduanya dibaca dari .env. Kalau belum ada, skrip menjelaskan
//  cara membuatnya.
// =========================================================

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { parseEnv } from "./sync-lms.mjs";

const ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);

// Hanya baca data Classroom, jangan pernah menulis apa pun.
// Cukup untuk daftar kelas dan daftar tugas beserta deadline.
const SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly"
].join(" ");

const envPath = path.join(ROOT, ".env");

let env = {};

if (fs.existsSync(envPath)) {
    env = parseEnv(fs.readFileSync(envPath, "utf8"));
}

const clientId = String(env.CLASSROOM_CLIENT_ID || "").trim();
const clientSecret = String(env.CLASSROOM_CLIENT_SECRET || "").trim();

if (!clientId || !clientSecret) {

    console.error(
        "\nCLASSROOM_CLIENT_ID dan CLASSROOM_CLIENT_SECRET belum diisi di .env.\n\n" +
        "Cara membuatnya (sekali saja):\n" +
        "  1. Buka https://console.cloud.google.com/auth/clients\n" +
        "  2. Pastikan project yang benar sudah dipilih di bagian atas.\n" +
        "  3. Klik CREATE CLIENT -> Application type: Desktop app -> Create.\n" +
        "  4. Salin Client ID dan Client secret ke .env:\n" +
        "         CLASSROOM_CLIENT_ID=...apps.googleusercontent.com\n" +
        "         CLASSROOM_CLIENT_SECRET=...\n" +
        "  5. Jalankan lagi: npm run classroom:auth\n\n" +
        "Tipe HARUS 'Desktop app'. Client tipe 'Web application' tidak\n" +
        "mengizinkan redirect ke http://127.0.0.1, jadi alur ini gagal.\n"
    );

    process.exit(1);

}

// ---------------------------------------------------------
//  PKCE
// ---------------------------------------------------------

const base64url = (buf) =>
    Buffer.from(buf)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

const codeVerifier = base64url(crypto.randomBytes(32));
const codeChallenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest()
);

// state mencegah orang lain menyelipkan kode asing ke callback.
const state = base64url(crypto.randomBytes(16));

// ---------------------------------------------------------
//  Server loopback
// ---------------------------------------------------------

const server = http.createServer();

// Port 0 = biarkan sistem memilih port kosong. Google
// mengizinkan port apa pun untuk loopback pada client
// tipe Desktop, jadi tidak perlu didaftarkan lebih dulu.
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const port = server.address().port;
const redirectUri = `http://127.0.0.1:${port}`;

const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: SCOPES,
        // access_type=offline yang meminta refresh token.
        access_type: "offline",
        // prompt=consent memaksa Google mengirim refresh token
        // lagi. Tanpa ini, consent kedua tidak memberi refresh
        // token baru dan hasilnya membingungkan.
        prompt: "consent",
        include_granted_scopes: "true",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256"
    }).toString();

console.log("\n=== Izin Google Classroom ===\n");
console.log("Membuka browser untuk meminta izin...");
console.log("Kalau browser tidak terbuka sendiri, buka alamat ini:\n");
console.log(authUrl + "\n");
console.log("Menunggu jawaban Google di " + redirectUri + " ...");

// Buka browser bawaan. Gagal membuka browser bukan alasan
// berhenti — alamatnya sudah dicetak di atas.
const buka = (url) => {
    const perintah =
        process.platform === "win32"
            ? `start "" "${url}"`
            : process.platform === "darwin"
                ? `open "${url}"`
                : `xdg-open "${url}"`;
    exec(perintah, () => {});
};

buka(authUrl);

// ---------------------------------------------------------
//  Tangkap kode
// ---------------------------------------------------------

const kode = await new Promise((resolve, reject) => {

    const batas = setTimeout(() => {
        reject(new Error("Tidak ada jawaban dari Google dalam 5 menit."));
    }, 5 * 60 * 1000);

    server.on("request", (req, res) => {

        const url = new URL(req.url, redirectUri);
        const params = url.searchParams;

        const selesai = (pesan) => {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(
                "<!doctype html><meta charset=utf-8>" +
                "<body style='font-family:system-ui;padding:3rem;max-width:40rem'>" +
                "<h2>" + pesan + "</h2>" +
                "<p>Tab ini boleh ditutup, kembali ke terminal.</p></body>"
            );
        };

        // Permintaan lain (mis. /favicon.ico) diabaikan.
        if (!params.has("code") && !params.has("error")) {
            res.writeHead(404);
            res.end();
            return;
        }

        if (params.get("error")) {

            selesai("Izin ditolak");
            clearTimeout(batas);
            reject(new Error(
                "Google mengembalikan error: " + params.get("error")
            ));
            return;

        }

        if (params.get("state") !== state) {

            selesai("state tidak cocok");
            clearTimeout(batas);
            reject(new Error(
                "Nilai state tidak cocok. Permintaan ini diabaikan " +
                "demi keamanan; jalankan ulang skripnya."
            ));
            return;

        }

        selesai("Berhasil");
        clearTimeout(batas);
        resolve(params.get("code"));

    });

});

server.close();

// ---------------------------------------------------------
//  Tukar kode -> refresh token
// ---------------------------------------------------------

console.log("Kode diterima. Menukar dengan refresh token...");

const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: kode,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
    }).toString()
});

const data = await res.json();

if (!res.ok || !data.refresh_token) {

    console.error("\nGagal menukar kode:");
    console.error(JSON.stringify(data, null, 1));

    if (data.error === "invalid_grant") {
        console.error(
            "\nKode sudah kedaluwarsa atau pernah dipakai. " +
            "Kode hanya berlaku sekali dan sebentar — jalankan ulang."
        );
    }

    if (!data.refresh_token) {
        console.error(
            "\nTidak ada refresh_token pada balasan. Biasanya karena izin\n" +
            "sebelumnya masih dianggap berlaku. Cabut izin aplikasi di\n" +
            "https://myaccount.google.com/permissions lalu jalankan ulang."
        );
    }

    process.exit(1);

}

// ---------------------------------------------------------
//  Buktikan tokennya benar-benar bekerja
// ---------------------------------------------------------

// Mencetak token lalu berharap-harap tidak cukup. Token yang
// baru didapat langsung dipakai memanggil API, supaya kalau
// ada yang salah (scope kurang, Classroom API belum aktif,
// akun tanpa kelas) ketahuan SEKARANG, bukan nanti saat sync
// otomatis gagal diam-diam.
console.log("Memeriksa token ke Classroom API...");

const cekRes = await fetch(
    "https://classroom.googleapis.com/v1/courses?studentId=me&pageSize=5",
    { headers: { Authorization: "Bearer " + data.access_token } }
);

const cek = await cekRes.json();

if (!cekRes.ok) {

    console.error("\nToken didapat, tapi Classroom API menolak:");
    console.error(JSON.stringify(cek, null, 1));
    console.error(
        "\nPeriksa:\n" +
        "  1. Google Classroom API sudah ENABLE di project ini?\n" +
        "     https://console.cloud.google.com/apis/library/classroom.googleapis.com\n" +
        "  2. Akun ini benar-benar punya kelas Classroom?\n"
    );

    process.exit(1);

}

const jumlahKelas = (cek.courses || []).length;

console.log("\n=== Berhasil ===\n");
console.log("Token diterima Classroom API.");
console.log("Kelas terlihat : " + jumlahKelas +
    (cek.nextPageToken ? " (masih ada lagi)" : ""));

for (const c of cek.courses || []) {
    console.log("  - " + (c.name || "(tanpa nama)") +
        (c.section ? " [" + c.section + "]" : ""));
}

console.log(
    "\nTempel tiga baris ini ke .env (dan ke GitHub Secrets):\n"
);

console.log("CLASSROOM_CLIENT_ID=" + clientId);
console.log("CLASSROOM_CLIENT_SECRET=<secret yang sudah ada di .env>");
console.log("CLASSROOM_REFRESH_TOKEN=" + data.refresh_token);

console.log(
    "\nCatatan:\n" +
    "  - Refresh token ini setara password untuk Classroom Anda.\n" +
    "    Jangan di-commit; .env sudah masuk .gitignore.\n" +
    "  - Refresh token hanya bertahan selama project Google berstatus\n" +
    "    'In production'. Selama masih 'Testing', Google mematikannya\n" +
    "    setelah 7 hari dan skrip sync akan gagal dengan invalid_grant.\n" +
    "  - Kalau token ini bocor, cabut di\n" +
    "    https://myaccount.google.com/permissions lalu jalankan ulang.\n"
);
