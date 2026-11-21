// Uji di BROWSER SUNGGUHAN lewat Chrome DevTools Protocol.
//
// Uji tiruan (test-sandi.mjs) memakai DOM buatan. Berkas ini
// memeriksa hal yang hanya bisa dibuktikan browser asli:
//
//   - modal benar-benar tampil / tersembunyi
//   - WARNA tombol yang benar-benar dipakai (hasil cascade CSS)
//   - handler klik & submit asli terpasang
//   - tidak ada error JavaScript saat halaman dimuat
//
// PIN asli tidak dipakai: yang diuji di sini adalah gerbang
// menolak PIN salah dan ABORT benar-benar membatalkan.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PROFIL = path.join(AKAR, "tmp-chrome-profil");
const PORT = 9333;
const URL_UJI = process.env.UJI_URL || "http://127.0.0.1:5199/index.html";

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

// ---- Jalankan Chrome --------------------------------------------

fs.rmSync(PROFIL, { recursive: true, force: true });

const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFIL}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-extensions",
    "--window-size=1280,900",
    URL_UJI
], { stdio: "ignore" });

async function target() {
    for (let i = 0; i < 100; i += 1) {
        try {
            const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
            const daftar = await res.json();
            const halaman = daftar.find(
                (t) => t.type === "page" && t.webSocketDebuggerUrl
            );
            if (halaman) return halaman;
        }
        catch {
            // Chrome belum siap.
        }
        await tidur(150);
    }
    throw new Error("Chrome tidak mau terbuka");
}

const t = await target();

const ws = new WebSocket(t.webSocketDebuggerUrl);

await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("gagal menyambung CDP"));
});

let nomor = 0;
const menunggu = new Map();
const errorHalaman = [];

ws.onmessage = (pesan) => {
    const data = JSON.parse(pesan.data);

    if (data.id && menunggu.has(data.id)) {
        const { resolve, reject } = menunggu.get(data.id);
        menunggu.delete(data.id);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
        return;
    }

    if (data.method === "Runtime.exceptionThrown") {
        errorHalaman.push(
            data.params.exceptionDetails.exception?.description ||
            data.params.exceptionDetails.text
        );
    }

    if (data.method === "Runtime.consoleAPICalled" &&
        data.params.type === "error") {
        errorHalaman.push(
            data.params.args
                .map((a) => a.value ?? a.description ?? "")
                .join(" ")
        );
    }
};

function kirim(method, params = {}) {
    nomor += 1;
    const id = nomor;
    return new Promise((resolve, reject) => {
        menunggu.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });
}

async function eval_ (ekspresi) {
    const hasil = await kirim("Runtime.evaluate", {
        expression: ekspresi,
        awaitPromise: true,
        returnByValue: true
    });

    if (hasil.exceptionDetails) {
        throw new Error(
            "eval gagal: " +
            (hasil.exceptionDetails.exception?.description ||
             hasil.exceptionDetails.text)
        );
    }

    return hasil.result.value;
}

await kirim("Runtime.enable");
await kirim("Page.enable");

// Tunggu halaman selesai dimuat.
for (let i = 0; i < 100; i += 1) {
    const siap = await eval_("document.readyState === 'complete'");
    if (siap) break;
    await tidur(150);
}

// Beri waktu script.js selesai memasang handler.
await tidur(600);


// ---- 1. Halaman bersih ----------------------------------------

console.log("=== halaman dimuat ===");

cek(
    "tidak ada error JavaScript saat memuat",
    errorHalaman.filter((e) => !/supabase|fetch|Failed to load/i.test(e)),
    []
);

cek(
    "fungsi gerbang tersedia",
    await eval_(
        "typeof mintaIzinTugas === 'function' && typeof bukaPin === 'function'"
    ),
    true
);

cek(
    "modal sandi awalnya tersembunyi",
    await eval_(
        "document.getElementById('pinModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "gerbang tugas awalnya terkunci",
    await eval_(
        "sessionStorage.getItem('tugasUnlocked') === null && " +
        "sessionStorage.getItem('syncUnlocked') === null"
    ),
    true
);


// ---- 2. Klik tombol tambah -> sandi muncul --------------------

console.log("\n=== klik TAMBAH memunculkan sandi ===");

await eval_(`
    document.getElementById('addTaskFromList').click();
    true
`);

await tidur(250);

cek(
    "modal sandi terbuka",
    await eval_(
        "!document.getElementById('pinModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "judul modal: Task PIN",
    await eval_("document.getElementById('pinTitle').textContent.trim()"),
    "Task PIN"
);

cek(
    "pesan menyebut tambah/ubah/hapus",
    await eval_(`
        (() => {
            const t = document.getElementById('pinMessage').textContent;
            return t.includes('menambah') &&
                   t.includes('mengubah') &&
                   t.includes('menghapus');
        })()
    `),
    true
);

cek(
    "form tambah tugas BELUM terbuka",
    await eval_(
        "document.getElementById('addTaskModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "kursor sudah di kolom PIN",
    await eval_(
        "document.activeElement === document.getElementById('pinInput')"
    ),
    true
);


// ---- 3. Warna tombol (hasil cascade CSS asli) -----------------

console.log("\n=== warna tombol di browser ===");

const warna = await eval_(`
    (() => {
        const ambil = (sel) => {
            const el = document.querySelector(sel);
            const s = getComputedStyle(el);
            return { color: s.color, border: s.borderTopColor };
        };

        const unlock = document.querySelector(
            '#pinForm button[type="submit"]'
        );

        return {
            abort: ambil("#pinCancel"),
            unlock: {
                color: getComputedStyle(unlock).color,
                border: getComputedStyle(unlock).borderTopColor
            }
        };
    })()
`);

const HIJAU = "rgb(77, 255, 178)";   // #4dffb2
const MERAH = "rgb(255, 93, 115)";   // #ff5d73

cek("teks ABORT merah", warna.abort.color, MERAH);
cek("garis ABORT merah", warna.abort.border, MERAH);
cek("teks UNLOCK hijau", warna.unlock.color, HIJAU);
cek("garis UNLOCK hijau", warna.unlock.border, HIJAU);


// ---- 4. PIN salah ---------------------------------------------

console.log("\n=== PIN salah ===");

await eval_(`
    (() => {
        const input = document.getElementById('pinInput');
        input.value = '000000';
        document.getElementById('pinForm').requestSubmit();
        return true;
    })()
`);

await tidur(500);

cek(
    "PIN salah: modal tetap terbuka",
    await eval_(
        "!document.getElementById('pinModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "PIN salah: pesan error tampil",
    await eval_(`
        !document.getElementById('pinError').classList.contains('hidden')
    `),
    true
);

cek(
    "PIN salah: form tambah tetap tertutup",
    await eval_(
        "document.getElementById('addTaskModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "PIN salah: gerbang tetap terkunci",
    await eval_("sessionStorage.getItem('tugasUnlocked') === null"),
    true
);


// ---- 5. ABORT -------------------------------------------------

console.log("\n=== ABORT ===");

await eval_("document.getElementById('pinCancel').click(); true");
await tidur(250);

cek(
    "ABORT menutup modal sandi",
    await eval_(
        "document.getElementById('pinModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "ABORT tidak membuka form tambah",
    await eval_(
        "document.getElementById('addTaskModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "ABORT tidak membuka gerbang",
    await eval_("sessionStorage.getItem('tugasUnlocked') === null"),
    true
);


// ---- 6. Halaman SYNC tetap terkunci ---------------------------

console.log("\n=== kunci SYNC terpisah ===");

await eval_(`
    (() => {
        document.getElementById('syncMenu').click();
        return true;
    })()
`);

await tidur(250);

cek(
    "klik SYNC menampilkan sandi, bukan halaman SYNC",
    await eval_(
        "!document.getElementById('pinModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "judul modal: Sync PIN",
    await eval_("document.getElementById('pinTitle').textContent.trim()"),
    "Sync PIN"
);

await eval_("document.getElementById('pinCancel').click(); true");
await tidur(200);


// ---- 7. Warna tombol konfirmasi hapus -------------------------

console.log("\n=== warna tombol konfirmasi hapus ===");

const warnaKonfirmasi = await eval_(`
    (async () => {
        openConfirmModal({
            title: "Hapus?",
            message: "uji",
            acceptLabel: "DELETE",
            cancelLabel: "ABORT"
        });

        // openConfirmModal memfokuskan tombol ABORT, sehingga
        // browser memakai warna :focus-visible. Lepas fokus dulu
        // supaya yang terukur warna normal.
        document.activeElement.blur();

        const accept = document.getElementById('confirmAccept');
        const cancel = document.getElementById('confirmCancel');

        const hasil = {
            accept: getComputedStyle(accept).color,
            acceptBorder: getComputedStyle(accept).borderTopColor,
            cancel: getComputedStyle(cancel).color,
            cancelBorder: getComputedStyle(cancel).borderTopColor
        };

        closeConfirmModal(false);
        return hasil;
    })()
`);

cek("DELETE tetap merah", warnaKonfirmasi.accept, MERAH);
cek("garis DELETE merah", warnaKonfirmasi.acceptBorder, MERAH);
cek("ABORT di dialog hapus merah", warnaKonfirmasi.cancel, MERAH);


// Tombol ABORT otomatis difokuskan saat modal dibuka. Warna
// :focus-visible-nya juga harus merah (lebih terang), bukan hijau.
const warnaFokusAbort = await eval_(`
    (async () => {
        openConfirmModal({
            title: "Hapus?",
            message: "uji",
            acceptLabel: "DELETE",
            cancelLabel: "ABORT"
        });

        // Tombol ABORT difokuskan oleh openConfirmModal.
        const hasil = getComputedStyle(
            document.getElementById('confirmCancel')
        ).color;

        closeConfirmModal(false);
        return hasil;
    })()
`);

const merahMuda = /^rgb\(255, 1[0-9]{2}, 1[0-9]{2}\)$/;

cek(
    "ABORT saat difokuskan tetap merah (bukan hijau)",
    merahMuda.test(warnaFokusAbort) && warnaFokusAbort !== HIJAU,
    true
);


// ---- 8. KIRIM memakai hijau (aksi utama) ----------------------

console.log("\n=== warna tombol KIRIM ===");

const warnaKirim = await eval_(`
    (async () => {
        openConfirmModal({
            title: "Kirim?",
            message: "uji",
            acceptLabel: "KIRIM",
            cancelLabel: "BATAL",
            danger: false
        });

        const accept = document.getElementById('confirmAccept');
        const hasil = getComputedStyle(accept).color;

        closeConfirmModal(false);
        return hasil;
    })()
`);

cek("KIRIM hijau", warnaKirim, HIJAU);


// ---- 9. Buka-tutup berulang tidak menumpuk -------------------

console.log("\n=== buka-tutup berulang ===");

const berulang = await eval_(`
    (async () => {
        for (let i = 0; i < 3; i += 1) {
            document.getElementById('addTaskFromList').click();
            await new Promise(r => setTimeout(r, 60));
            document.getElementById('pinCancel').click();
            await new Promise(r => setTimeout(r, 60));
        }

        return {
            pin: document.getElementById('pinModal').classList.contains('hidden'),
            form: document.getElementById('addTaskModal').classList.contains('hidden'),
            terkunci: sessionStorage.getItem('tugasUnlocked') === null
        };
    })()
`);

cek("modal sandi tertutup rapi", berulang.pin, true);
cek("form tambah tidak ikut terbuka", berulang.form, true);
cek("gerbang tetap terkunci", berulang.terkunci, true);


// ---- 11. Setelah gerbang terbuka, form langsung muncul --------
//
// PIN asli tidak dipakai. Penanda sesi diisi langsung, sama
// seperti yang dilakukan gerbang setelah PIN benar — jadi jalur
// "sudah terbuka" diuji tanpa menyentuh rahasia.

console.log("\n=== jalur positif: gerbang sudah terbuka ===");

await eval_("sessionStorage.setItem('tugasUnlocked', '1'); true");
await kirim("Page.reload", { ignoreCache: true });

for (let i = 0; i < 100; i += 1) {
    const siap = await eval_("document.readyState === 'complete'");
    if (siap) break;
    await tidur(150);
}

await tidur(600);

cek(
    "penanda sesi terbaca saat halaman dimuat",
    await eval_("sessionStorage.getItem('tugasUnlocked')"),
    "1"
);

await eval_("document.getElementById('addTaskFromList').click(); true");
await tidur(300);

cek(
    "form tambah langsung terbuka tanpa sandi",
    await eval_(
        "!document.getElementById('addTaskModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "modal sandi tidak muncul",
    await eval_(
        "document.getElementById('pinModal').classList.contains('hidden')"
    ),
    true
);

// Tutup lagi untuk uji berikutnya.
await eval_("document.getElementById('closeAddModal').click(); true");
await tidur(200);

cek(
    "form tambah bisa ditutup",
    await eval_(
        "document.getElementById('addTaskModal').classList.contains('hidden')"
    ),
    true
);


// ---- 12. Edit & hapus tetap lewat gerbang ---------------------
//
// Saat gerbang SUDAH terbuka, memanggil edit/hapus tidak boleh
// memunculkan sandi lagi — tapi juga tidak boleh langsung jalan
// tanpa dialog. Yang diuji: edit membuka form edit, hapus
// membuka dialog konfirmasi.

console.log("\n=== edit & hapus saat gerbang terbuka ===");

const tugasUji = {
    id: "uji-1",
    course: "Uji",
    class_name: "Kelas",
    deadline: "2026-12-31",
    deadline_time: "23:59",
    category: "Tugas",
    status: "Pending"
};

await eval_(`
    openEditModal(${JSON.stringify(tugasUji)});
    true
`);

await tidur(300);

cek(
    "edit membuka form edit",
    await eval_(
        "!document.getElementById('editModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "edit tidak memunculkan sandi lagi",
    await eval_(
        "document.getElementById('pinModal').classList.contains('hidden')"
    ),
    true
);

await eval_("closeEditModal(false); true");
await tidur(200);


// ---- 13. Hapus tanpa gerbang -> sandi, bukan dialog hapus -----

console.log("\n=== hapus saat gerbang terkunci ===");

await eval_("sessionStorage.clear(); true");
await kirim("Page.reload", { ignoreCache: true });

for (let i = 0; i < 100; i += 1) {
    const siap = await eval_("document.readyState === 'complete'");
    if (siap) break;
    await tidur(150);
}

await tidur(600);

await eval_(`
    deleteTask(${JSON.stringify(tugasUji)});
    true
`);

await tidur(400);

cek(
    "hapus memunculkan sandi lebih dulu",
    await eval_(
        "!document.getElementById('pinModal').classList.contains('hidden')"
    ),
    true
);

cek(
    "dialog konfirmasi hapus BELUM muncul",
    await eval_(
        "document.getElementById('confirmModal').classList.contains('hidden')"
    ),
    true
);

await eval_("document.getElementById('pinCancel').click(); true");
await tidur(300);

cek(
    "setelah ABORT, dialog hapus tetap tidak muncul",
    await eval_(
        "document.getElementById('confirmModal').classList.contains('hidden')"
    ),
    true
);


// ---- 14. Tidak ada error baru ---------------------------------

console.log("\n=== error halaman ===");

cek(
    "tidak ada error JavaScript selama pengujian",
    errorHalaman.filter(
        (e) => !/supabase|fetch|Failed to load|net::/i.test(e)
    ),
    []
);

ws.close();
chrome.kill();

// Bersihkan profil sementara.
await tidur(300);
fs.rmSync(PROFIL, { recursive: true, force: true });

console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);
process.exit(gagal ? 1 : 0);
