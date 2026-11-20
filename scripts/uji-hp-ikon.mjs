// Uji ikon Task Vault di HP lewat Chrome DevTools Protocol.
//
// Memeriksa hal yang tidak bisa dilihat dari PC:
//   1. manifest.json benar-benar diambil & diparse Chrome
//   2. setiap ikon benar-benar terunduh (200, image/png, byte cocok)
//   3. favicon.svg & apple-touch-icon terpasang
//   4. tidak ada gambar gagal
//   5. service worker menyajikan ikon baru (bukan cache lama)

const DAFTAR = "http://127.0.0.1:9222/json/list";
const PORT = process.env.UJI_PORT || "5173";

const daftar = JSON.parse(await (await fetch(DAFTAR, {
    signal: AbortSignal.timeout(10000)
})).text());

const tab = daftar.find((t) => t.url.includes(PORT));
if (!tab) {
    console.log("GAGAL: tidak ada tab Task Vault (" + PORT + ")");
    process.exit(1);
}

console.log("url :", tab.url);

const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const tunggu = new Map();

function kirim(method, params) {
    return new Promise((selesai, gagal) => {
        const n = ++id;
        tunggu.set(n, { selesai, gagal });
        ws.send(JSON.stringify({ id: n, method, params: params || {} }));
        setTimeout(() => {
            if (tunggu.has(n)) { tunggu.delete(n); gagal(new Error("timeout " + method)); }
        }, 20000);
    });
}

ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && tunggu.has(m.id)) {
        const t = tunggu.get(m.id);
        tunggu.delete(m.id);
        if (m.error) t.gagal(new Error(JSON.stringify(m.error)));
        else t.selesai(m.result);
    }
});

await new Promise((ok, no) => {
    ws.addEventListener("open", ok);
    ws.addEventListener("error", () => no(new Error("ws gagal")));
});

await kirim("Runtime.enable");

const ekspresi = `
(async () => {
    const hasil = {};

    const link = document.querySelector('link[rel="manifest"]');
    hasil.manifestHref = link ? link.href : null;

    if (link) {
        const r = await fetch(link.href, { cache: "no-store" });
        hasil.manifestStatus = r.status;
        hasil.manifestTipe = r.headers.get("content-type");
        const m = await r.json();
        hasil.nama = m.name;
        hasil.pendek = m.short_name;
        hasil.warna = [m.background_color, m.theme_color];
        hasil.ikon = [];
        for (const i of (m.icons || [])) {
            const u = new URL(i.src, link.href).href;
            const ri = await fetch(u, { cache: "no-store" });
            const b = await ri.blob();
            hasil.ikon.push({
                src: i.src, sizes: i.sizes, purpose: i.purpose,
                status: ri.status, tipe: ri.headers.get("content-type"),
                byte: b.size
            });
        }
    }

    // favicon.svg: pastikan isinya naga (ada gradien), bukan </>.
    const fav = document.querySelector('link[rel="icon"]');
    hasil.faviconHref = fav ? fav.href : null;
    if (fav) {
        const r = await fetch(fav.href, { cache: "no-store" });
        const t = await r.text();
        hasil.faviconStatus = r.status;
        hasil.faviconGradien = /linearGradient/.test(t);
        hasil.faviconHijau = /#4dffb2/i.test(t);
        hasil.faviconByte = t.length;
    }

    const apel = document.querySelector('link[rel="apple-touch-icon"]');
    hasil.appleHref = apel ? apel.href : null;

    // Service worker: apakah aktif dan menyimpan ikon baru?
    hasil.swAktif = !!navigator.serviceWorker.controller;
    if ("caches" in window) {
        const nama = await caches.keys();
        hasil.cache = nama;
        for (const n of nama) {
            const c = await caches.open(n);
            hasil["isi_" + n] = (await c.keys()).map((k) => {
                const u = new URL(k.url);
                return u.pathname;
            }).sort();
        }
    }

    return JSON.stringify(hasil);
})()
`;

const r = await kirim("Runtime.evaluate", {
    expression: ekspresi,
    awaitPromise: true,
    returnByValue: true
});

if (r.exceptionDetails) {
    console.log("GAGAL evaluasi:", JSON.stringify(r.exceptionDetails).slice(0, 600));
    process.exit(1);
}

const h = JSON.parse(r.result.value);

console.log("\n=== manifest ===");
console.log("  href   :", h.manifestHref);
console.log("  status :", h.manifestStatus, h.manifestTipe);
console.log("  nama   :", h.nama, "/", h.pendek);
console.log("  warna  :", h.warna.join(" / "));

console.log("\n=== ikon ===");
for (const i of h.ikon) {
    console.log(`  ${i.src.padEnd(26)} ${i.sizes.padEnd(9)} ${i.purpose.padEnd(9)} ` +
        `HTTP ${i.status}  ${String(i.byte).padStart(6)} byte  ${i.tipe}`);
}

console.log("\n=== favicon ===");
console.log("  href    :", h.faviconHref);
console.log("  status  :", h.faviconStatus, "| gradien:", h.faviconGradien,
    "| hijau #4dffb2:", h.faviconHijau);
console.log("  apple   :", h.appleHref);

console.log("\n=== service worker ===");
console.log("  aktif   :", h.swAktif);
console.log("  cache   :", (h.cache || []).join(", "));
for (const n of (h.cache || [])) {
    const isi = h["isi_" + n] || [];
    console.log(`  ${n} (${isi.length} berkas):`);
    console.log("    " + isi.join("  "));
}

ws.close();
