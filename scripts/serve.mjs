// =========================================================
//  SERVER STATIS LOKAL (TANPA DEPENDENSI)
//
//  Kenapa tidak pakai `npx serve`?
//  Perintah itu harus mengunduh paket dari internet lebih
//  dulu. Kalau offline atau registry lambat, `npm run dev`
//  gagal dengan pesan yang membingungkan. File ini hanya
//  memakai modul bawaan Node, jadi selalu siap dipakai.
//
//  Jalankan: npm run dev
// =========================================================

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);

const PORT = Number(process.env.PORT || 5173);

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
    ".map": "application/json; charset=utf-8"
};


// Jangan pernah menyajikan file rahasia / internal meskipun
// diminta langsung lewat URL.
const BLOCKED = [
    /^\.env/i,
    /^\.git($|\/)/i,
    /^node_modules($|\/)/i,
    /^supabase\/\.temp/i
];


function isBlocked(relativePath) {

    return BLOCKED.some((pattern) => pattern.test(relativePath));

}


function send(res, status, body, headers = {}) {

    res.writeHead(status, {
        "Cache-Control": "no-store",
        ...headers
    });

    res.end(body);

}


const server = http.createServer((req, res) => {

    let pathname;

    try {

        pathname = decodeURIComponent(
            new URL(req.url, "http://localhost").pathname
        );

    }
    catch (error) {

        return send(res, 400, "Bad request");

    }


    if (pathname.endsWith("/")) {

        pathname += "index.html";

    }


    // Cegah keluar dari folder proyek (../).
    const absolute = path.resolve(ROOT, "." + pathname);


    if (!absolute.startsWith(ROOT)) {

        return send(res, 403, "Forbidden");

    }


    const relative = path
        .relative(ROOT, absolute)
        .split(path.sep)
        .join("/");


    if (isBlocked(relative)) {

        return send(res, 403, "Forbidden");

    }


    fs.readFile(absolute, (error, data) => {

        if (error) {

            const status = error.code === "ENOENT" ? 404 : 500;

            return send(
                res,
                status,
                status === 404 ? "404 Not Found" : "500 Server Error",
                { "Content-Type": "text/plain; charset=utf-8" }
            );

        }


        send(res, 200, data, {
            "Content-Type":
                MIME[path.extname(absolute).toLowerCase()] ||
                "application/octet-stream"
        });

    });

});


if (!fs.existsSync(path.join(ROOT, "config.js"))) {

    console.warn(
        "\n  PERINGATAN: config.js belum ada.\n" +
        "  Halaman akan terbuka tapi tidak bisa konek ke Supabase.\n" +
        "  Jalankan: npm run env:build\n"
    );

}


server.on("error", (error) => {

    if (error.code === "EADDRINUSE") {

        console.error(
            `\n  Port ${PORT} sudah dipakai proses lain.\n` +
            `  Coba port lain:  $env:PORT=5174; npm run dev\n`
        );

    }
    else {

        console.error("\n  Server gagal jalan:", error.message, "\n");

    }

    process.exit(1);

});


server.listen(PORT, () => {

    console.log(`\n  Ghost Task Matrix berjalan di:`);
    console.log(`      http://localhost:${PORT}\n`);
    console.log(`  Folder : ${ROOT}`);
    console.log(`  Stop   : Ctrl + C\n`);

});
