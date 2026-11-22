// Uji TOMBOL PASANG APLIKASI di browser sungguhan.
//
// Yang dibuktikan:
//   1. tombol tersembunyi sebelum browser menawarkan pemasangan
//   2. tombol muncul saat beforeinstallprompt menyala
//   3. banner bawaan browser ditahan (preventDefault)
//   4. klik memanggil prompt() dan mengubah tombol jadi penanda
//   5. saat dibuka sebagai app (display-mode: standalone) tombol
//      langsung tampil sebagai penanda yang tidak bisa diklik
//   6. tanpa tawaran pemasangan, tombol tetap tersembunyi
//
// Catatan penting: di localhost situs ini SUNGGUH installable, jadi
// browser mengirim beforeinstallprompt asli dan tombol langsung
// terlihat. Untuk menguji "keadaan awal tersembunyi" secara
// deterministik, manifest.json diblokir lebih dulu sehingga browser
// tidak menganggap halaman bisa dipasang. Event buatan lalu dipakai
// untuk menguji reaksi kode tanpa bergantung pada waktu kedatangan
// event asli.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pastikanServer } from "./uji-server.mjs";

const AKAR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BROWSER = process.env.BROWSER ||
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PROFIL = path.join(AKAR, "tmp-profil-tombol-" + Date.now());
const PORT = Number(process.env.PORT_DBG || 9371);
const URL_UJI = process.env.UJI_URL || "http://127.0.0.1:5199/index.html";

// Halaman uji butuh HTTP (manifest + service worker tidak jalan di
// file://). Kalau server belum menyala, nyalakan sendiri.
const server = URL_UJI.startsWith("http://127.0.0.1") ||
               URL_UJI.startsWith("http://localhost")
    ? await pastikanServer(URL_UJI)
    : { berhenti: () => {} };

let lulus = 0;
let gagal = 0;

function cek(nama, dapat, harap) {
    const a = JSON.stringify(dapat);
    const b = JSON.stringify(harap);
    if (a === b) {
        lulus += 1;
        console.log("  OK    " + nama);
    }
    else {
        gagal += 1;
        console.log(
            "  GAGAL " + nama +
            "\n         dapat : " + a +
            "\n         harap : " + b
        );
    }
}

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = spawn(BROWSER, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFIL}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--proxy-server=direct://",
    "--proxy-bypass-list=*",
    "--window-size=1280,900",
    "about:blank"
], { stdio: "ignore" });

async function target() {
    for (let i = 0; i < 120; i += 1) {
        try {
            const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
            const daftar = await res.json();
            const halaman = daftar.find(
                (t) => t.type === "page" && t.webSocketDebuggerUrl
            );
            if (halaman) return halaman;
        }
        catch {}
        await tidur(200);
    }
    throw new Error("browser tidak mau terbuka");
}

const t = await target();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nomor = 0;
const menunggu = new Map();
const errorJs = [];

ws.onmessage = (p) => {
    const d = JSON.parse(p.data);
    if (d.id && menunggu.has(d.id)) {
        const { resolve, reject } = menunggu.get(d.id);
        menunggu.delete(d.id);
        if (d.error) reject(new Error(JSON.stringify(d.error)));
        else resolve(d.result);
        return;
    }
    if (d.method === "Runtime.exceptionThrown") {
        errorJs.push(
            d.params.exceptionDetails.exception?.description ||
            d.params.exceptionDetails.text
        );
    }
};

const kirim = (method, params = {}) => {
    nomor += 1;
    const id = nomor;
    return new Promise((resolve, reject) => {
        menunggu.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });
};

const eval_ = async (e) => {
    const h = await kirim("Runtime.evaluate", {
        expression: e,
        awaitPromise: true,
        returnByValue: true
    });
    if (h.exceptionDetails) {
        return "EXC: " + (h.exceptionDetails.exception?.description ||
            h.exceptionDetails.text);
    }
    return h.result?.value;
};

async function tungguSelesai() {
    for (let i = 0; i < 150; i += 1) {
        if (await eval_("document.readyState === 'complete'")) return;
        await tidur(200);
    }
}

await kirim("Runtime.enable");
await kirim("Page.enable");
await kirim("Network.enable");

// Manifest diblokir supaya browser TIDAK menawarkan pemasangan.
// Dengan begitu keadaan awal tombol bisa diuji dengan pasti.
await kirim("Network.setBlockedURLs", { urls: ["*manifest.json*"] });

const nav = await kirim("Page.navigate", { url: URL_UJI });
if (nav.errorText) {
    console.log("GAGAL membuka " + URL_UJI + " : " + nav.errorText);
    ws.close();
    browser.kill();
    process.exit(1);
}
await tungguSelesai();
await tidur(2500);


// ---- 1. Sebelum event: tersembunyi ----------------------------

console.log("=== keadaan awal (manifest diblokir) ===");

cek(
    "tombol ada di DOM",
    await eval_("!!document.getElementById('installApp')"),
    true
);

cek(
    "tombol tersembunyi sebelum ditawarkan",
    await eval_(
        "document.getElementById('installApp').classList.contains('hidden')"
    ),
    true
);

cek(
    "label awal masih PASANG APP dan belum terkunci",
    await eval_(
        "document.getElementById('installAppLabel').textContent + '|' + " +
        "document.getElementById('installApp').disabled"
    ),
    "PASANG APP|false"
);


// ---- 2. Event menyala: tombol muncul -------------------------

console.log("\n=== setelah beforeinstallprompt ===");

// Event buatan: meniru bentuk asli, dengan prompt() yang mencatat
// pemanggilan. preventDefault() dicatat untuk memastikan kode
// menahan banner bawaan.
const hasilEvent = await eval_(`
    (() => {
        const e = new Event('beforeinstallprompt', { cancelable: true });
        e.platforms = ['web'];
        window.__promptDipanggil = 0;
        window.__preventDefault = false;
        const asliPrevent = e.preventDefault.bind(e);
        e.preventDefault = () => { window.__preventDefault = true; asliPrevent(); };
        e.prompt = () => { window.__promptDipanggil += 1; };
        e.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
        window.dispatchEvent(e);
        return {
            preventDefault: window.__preventDefault,
            hidden: document.getElementById('installApp')
                        .classList.contains('hidden'),
            label: document.getElementById('installAppLabel').textContent
        };
    })()
`);

cek("banner bawaan ditahan (preventDefault)", hasilEvent.preventDefault, true);
cek("tombol jadi terlihat", hasilEvent.hidden, false);
cek("label tombol benar", hasilEvent.label, "PASANG APP");


// ---- 3. Klik memanggil prompt() ------------------------------

console.log("\n=== klik tombol ===");

await eval_("document.getElementById('installApp').click(); true");
await tidur(800);

cek(
    "prompt() benar-benar dipanggil",
    await eval_("window.__promptDipanggil"),
    1
);

cek(
    "setelah diterima, tombol jadi penanda",
    await eval_("document.getElementById('installAppLabel').textContent"),
    "APP TERPASANG"
);

cek(
    "penanda tidak bisa diklik lagi",
    await eval_("document.getElementById('installApp').disabled"),
    true
);


// ---- 4. Tanpa tawaran: tetap tersembunyi ---------------------

console.log("\n=== muat ulang tanpa event ===");

await kirim("Page.reload", { ignoreCache: true });
await tungguSelesai();
await tidur(2500);

cek(
    "tanpa event, tombol tetap tersembunyi",
    await eval_(
        "document.getElementById('installApp').classList.contains('hidden')"
    ),
    true
);


// ---- 5. Dibuka sebagai aplikasi (standalone) -----------------

console.log("\n=== display-mode: standalone ===");

// Emulation.setEmulatedMedia tidak bisa memalsukan display-mode di
// Edge, jadi matchMedia ditambal SEBELUM halaman dimuat. Dengan
// begitu kode asli benar-benar menjalankan jalur sudahTerpasang(),
// dan kita menguji perilaku tombolnya - bukan nama fungsi internal.
await kirim("Page.addScriptToEvaluateOnNewDocument", {
    source: `
        (() => {
            const asli = window.matchMedia.bind(window);
            window.matchMedia = (query) => {
                if (/display-mode:\\s*standalone/.test(query)) {
                    return {
                        matches: true,
                        media: query,
                        onchange: null,
                        addListener() {},
                        removeListener() {},
                        addEventListener() {},
                        removeEventListener() {},
                        dispatchEvent() { return false; }
                    };
                }
                return asli(query);
            };
        })();
    `
});

await kirim("Page.reload", { ignoreCache: true });
await tungguSelesai();
await tidur(2500);

cek(
    "media query standalone terbaca",
    await eval_("matchMedia('(display-mode: standalone)').matches"),
    true
);

cek(
    "tombol tampil sebagai penanda saat sudah jadi app",
    await eval_("document.getElementById('installAppLabel').textContent"),
    "APP TERPASANG"
);

cek(
    "penanda nonaktif saat sudah jadi app",
    await eval_("document.getElementById('installApp').disabled"),
    true
);


// ---- 6. Tata letak navbar di layar sempit --------------------

console.log("\n=== tata letak navbar (layar sempit) ===");

// Tombol ini pernah membuat navbar membengkak dari 65px jadi
// 121px di HP: dengan margin-left: auto ia naik ke baris sendiri
// di atas tautan navigasi. Uji ini menjaga agar tidak terulang.
await kirim("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 780, deviceScaleFactor: 1, mobile: true
});
await tidur(1200);

const tataLetak = await eval_(`
    (() => {
        const b = document.getElementById('installApp');
        const nav = document.querySelector('.navbar-nav');
        const header = document.getElementById('appNavbar');
        const r = b.getBoundingClientRect();
        const rn = nav.getBoundingClientRect();

        // Hanya tautan yang masih terlihat di dalam area nav yang
        // dihitung; yang tergulir keluar memang di luar pandangan.
        const kiriTampak = Math.max(rn.left, 0);
        const kananTampak = Math.min(rn.right, window.innerWidth);
        const tumpang = [...document.querySelectorAll('.nav-link')].some(t => {
            const k = t.getBoundingClientRect();
            const kiri = Math.max(k.left, kiriTampak);
            const kanan = Math.min(k.right, kananTampak);
            if (kanan <= kiri) return false;
            return kanan > r.left && kiri < r.right &&
                   k.bottom > r.top && k.top < r.bottom;
        });

        const diTitik = document.elementFromPoint(
            r.left + r.width / 2, r.top + r.height / 2
        );

        return {
            tinggiHeader: Math.round(header.getBoundingClientRect().height),
            tombolSeBarisDenganNav: Math.abs(r.top - rn.top) < 30,
            tumpangTindih: tumpang,
            tombolBisaDiklik: diTitik === b || b.contains(diTitik),
            diDalamLayar: r.right <= window.innerWidth + 0.5 && r.left >= -0.5,
            gulirHorizontalHalaman:
                document.documentElement.scrollWidth > window.innerWidth + 1,
            labelDisembunyikan:
                getComputedStyle(document.getElementById('installAppLabel'))
                    .display === 'none',
            adaAriaLabel: !!b.getAttribute('aria-label')
        };
    })()
`);

cek("navbar tetap satu baris (<= 80px)", tataLetak.tinggiHeader <= 80, true);
cek("tombol sebaris dengan tautan navigasi", tataLetak.tombolSeBarisDenganNav, true);
cek("tombol tidak menimpa tautan", tataLetak.tumpangTindih, false);
cek("tombol tetap bisa diklik", tataLetak.tombolBisaDiklik, true);
cek("tombol tidak keluar layar", tataLetak.diDalamLayar, true);
cek("halaman tidak menggulir mendatar", tataLetak.gulirHorizontalHalaman, false);
cek("label teks disembunyikan di layar sempit", tataLetak.labelDisembunyikan, true);
cek("aria-label tetap ada untuk pembaca layar", tataLetak.adaAriaLabel, true);

await kirim("Emulation.clearDeviceMetricsOverride");


// ---- 7. Tidak ada error JavaScript ---------------------------

console.log("\n=== kesehatan halaman ===");

cek(
    "tidak ada error JavaScript",
    errorJs.length ? errorJs[0].split("\n")[0] : null,
    null
);

cek(
    "initPasangApp bisa dipanggil ulang tanpa error",
    await eval_(
        "(typeof initPasangApp === 'function') ? " +
        "(initPasangApp(), 'ok') : 'tidak ada fungsi'"
    ),
    "ok"
);

ws.close();
browser.kill();
server.berhenti();
await tidur(400);
fs.rmSync(PROFIL, { recursive: true, force: true });

console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);
process.exit(gagal ? 1 : 0);
