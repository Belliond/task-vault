// Uji ambilJson: body kosong harus dianggap SUKSES, bukan gagal.
//
// Bug yang diuji: Supabase membalas 201 tanpa isi saat diminta
// `Prefer: return=minimal`. Dulu JSON.parse("") melempar,
// sehingga log menulis "gagal disimpan" padahal data sudah masuk
// — dan permintaan dikirim ulang sia-sia.
//
// Dijalankan: node scripts/test-http.mjs

import http from "node:http";
import { ambilJson } from "./sync-lms.mjs";

let lulus = 0;
let gagal = 0;

function cek(nama, dapat, harap) {
    const a = JSON.stringify(dapat);
    const b = JSON.stringify(harap);
    if (a === b) { lulus++; console.log("  OK   " + nama); }
    else { gagal++; console.log("  GAGAL " + nama + "\n         dapat : " + a + "\n         harap : " + b); }
}

// Server tiruan: beberapa perilaku Supabase yang penting.
const server = http.createServer((req, res) => {

    if (req.url === "/kosong-201") {
        // Persis seperti Supabase dengan return=minimal.
        res.writeHead(201, { "Content-Type": "text/plain" });
        res.end("");
        return;
    }

    if (req.url === "/kosong-204") {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === "/kosong-500") {
        // Body kosong TAPI status gagal: ini harus tetap error.
        res.writeHead(500);
        res.end("");
        return;
    }

    if (req.url === "/json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify([{ ok: true }]));
        return;
    }

    if (req.url === "/html") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<html><body>Login required</body></html>");
        return;
    }

    res.writeHead(404);
    res.end("");

});

await new Promise((r) => server.listen(0, "127.0.0.1", r));

const PORT = server.address().port;
const base = `http://127.0.0.1:${PORT}`;

console.log("=== ambilJson ===");

// Inti perbaikan: 201 tanpa isi = sukses, hasil null.
cek(
    "201 body kosong -> null (bukan error)",
    await ambilJson(base + "/kosong-201", { method: "POST" }, 1),
    null
);

cek(
    "204 body kosong -> null",
    await ambilJson(base + "/kosong-204", { method: "POST" }, 1),
    null
);

// Body kosong dengan status gagal HARUS tetap melempar.
let pesan500 = "";
try {
    await ambilJson(base + "/kosong-500", { method: "POST" }, 1);
}
catch (e) {
    pesan500 = e.message;
}
cek("500 body kosong -> tetap error", pesan500.includes("500"), true);

// JSON normal tetap terbaca.
cek(
    "JSON biasa -> objek",
    await ambilJson(base + "/json", {}, 1),
    [{ ok: true }]
);

// HTML (halaman login kampus) tetap dilaporkan sebagai bukan JSON.
let pesanHtml = "";
try {
    await ambilJson(base + "/html", {}, 1);
}
catch (e) {
    pesanHtml = e.message;
}
cek("HTML -> error 'bukan JSON'", pesanHtml.includes("bukan JSON"), true);
cek("HTML -> isi balasan ikut dilaporkan", pesanHtml.includes("Login required"), true);

server.close();

console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);
process.exit(gagal ? 1 : 0);
