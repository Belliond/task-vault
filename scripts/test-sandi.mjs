// =========================================================
//  UJI GERBANG SANDI CRUD TUGAS
//
//  Yang diuji adalah KODE ASLI dari script.js, bukan salinan:
//  potongan gerbang sandi (PIN_HASH .. syncMenu) diekstrak lalu
//  dijalankan dengan DOM tiruan kecil.
//
//  Kenapa perlu diuji, bukan sekadar dilihat:
//
//    1. Gerbang memakai PROMISE. Kalau resolve-nya lupa
//       dipanggil, tombol tambah tugas akan diam saja selamanya
//       tanpa pesan error — bug yang tidak terlihat di layar
//       sampai benar-benar diklik.
//    2. Kunci SYNC dan kunci TUGAS harus TERPISAH. Kalau
//       tercampur, membuka daftar tugas ikut membuka halaman
//       SYNC yang memuat token LMS.
//    3. Setelah PIN benar, modal harus tertutup dan promise
//       selesai dengan true; setelah ABORT, dengan false.
//
//  PIN asli TIDAK dipakai di sini (hash-nya diganti hash PIN uji),
//  karena yang diuji mekanismenya, bukan nilai rahasianya.
//
//  Dijalankan: node scripts/test-uji-sandi.mjs
// =========================================================

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const AKAR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sumber = fs.readFileSync(path.join(AKAR, "script.js"), "utf8");

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

// ---- DOM tiruan -------------------------------------------------

function kelas() {
    const isi = new Set(["hidden"]);
    return {
        add: (k) => isi.add(k),
        remove: (k) => isi.delete(k),
        contains: (k) => isi.has(k),
        isi
    };
}

function elemen() {
    return {
        classList: kelas(),
        textContent: "",
        value: "",
        focus() { this.fokus = true; },
        select() { this.dipilih = true; },
        addEventListener(jenis, fn) { this["on" + jenis] = fn; }
    };
}

const dom = {
    pinModal: elemen(),
    pinTitle: elemen(),
    pinMessage: elemen(),
    pinInput: elemen(),
    pinError: elemen(),
    pinForm: elemen(),
    pinCancel: elemen(),
    syncMenu: elemen()
};

// pinError mulai tersembunyi, seperti di HTML.
dom.pinError.classList.add("hidden");

const simpanan = new Map();

const tiruan = {
    sessionStorage: {
        getItem: (k) => (simpanan.has(k) ? simpanan.get(k) : null),
        setItem: (k, v) => simpanan.set(k, String(v))
    },
    document: {
        activeElement: { focus() {} },
        getElementById: (id) => dom[id] || null
    },
    // Bagian halaman SYNC tidak diuji di sini; cukup dicatat
    // kalau sampai terpanggil tanpa izin.
    showPage() { tiruan._halamanSync = (tiruan._halamanSync || 0) + 1; },
    syncSection: {},
    renderMoodleStatus() {},
    loadMoodleConfig: () => null,
    tryRenderCoursePicker() {}
};

// ---- Rakit potongan kode asli ----------------------------------

const MULAI = sumber.indexOf("const PIN_HASH =");
const AKHIR = sumber.indexOf('syncMenu.addEventListener("click", bukaSync);');

if (MULAI === -1 || AKHIR === -1) {
    console.log("GAGAL potongan gerbang sandi tidak ditemukan di script.js");
    process.exit(1);
}

let potongan = sumber.slice(
    MULAI,
    AKHIR + 'syncMenu.addEventListener("click", bukaSync);'.length
);

// Hash PIN asli diganti hash PIN uji, supaya nilai rahasia tidak
// perlu ikut masuk ke berkas uji.
const PIN_UJI = "135790";
const HASH_UJI = createHash("sha256").update(PIN_UJI).digest("hex");

potongan = potongan.replace(
    /const PIN_HASH =\s*"[0-9a-f]{64}";/,
    `const PIN_HASH = "${HASH_UJI}";`
);

if (!potongan.includes(HASH_UJI)) {
    console.log("GAGAL hash PIN gagal diganti — pola PIN_HASH berubah?");
    process.exit(1);
}

const kode = [
    "const sessionStorage = tiruan.sessionStorage;",
    "const document = tiruan.document;",
    "const showPage = tiruan.showPage;",
    "const syncSection = tiruan.syncSection;",
    "const renderMoodleStatus = tiruan.renderMoodleStatus;",
    "const loadMoodleConfig = tiruan.loadMoodleConfig;",
    "const tryRenderCoursePicker = tiruan.tryRenderCoursePicker;",
    "const pinModal = dom.pinModal;",
    "const pinTitle = dom.pinTitle;",
    "const pinMessage = dom.pinMessage;",
    "const pinInput = dom.pinInput;",
    "const pinError = dom.pinError;",
    "const pinForm = dom.pinForm;",
    "const pinCancel = dom.pinCancel;",
    "const syncMenu = dom.syncMenu;",
    potongan,
    "return { bukaPin, closePinModal, mintaIzinTugas, pinCocok," +
    "   isPinModalOpen," +
    "   dapat: () => ({ syncUnlocked, tugasUnlocked })," +
    "   atur: (s) => { syncUnlocked = s.sync; tugasUnlocked = s.tugas; } };"
].join("\n");

const api = new Function("tiruan", "dom", kode)(tiruan, dom);

// Kirim PIN lewat form asli (handler submit yang dipasang kode).
async function kirimPin(nilai) {
    dom.pinInput.value = nilai;
    await dom.pinForm.onsubmit({ preventDefault() {} });
}


// ---- 1. Gerbang tugas: PIN diminta sekali ----------------------

console.log("=== gerbang tugas ===");

cek("awalnya terkunci", api.dapat().tugasUnlocked, false);
cek("modal sandi awalnya tertutup", api.isPinModalOpen(), false);

const janji = api.mintaIzinTugas();

cek("modal sandi terbuka", api.isPinModalOpen(), true);
cek("judul modal untuk tugas", dom.pinTitle.textContent, "Task PIN");
cek(
    "pesan menyebut tambah/ubah/hapus",
    dom.pinMessage.textContent.includes("menambah") &&
    dom.pinMessage.textContent.includes("menghapus"),
    true
);

// Belum dijawab: promise harus masih menggantung, bukan selesai.
let selesai = "belum";
janji.then((v) => { selesai = v; });
await new Promise((r) => setImmediate(r));
cek("promise belum selesai sebelum PIN diisi", selesai, "belum");


// ---- 2. PIN salah ---------------------------------------------

console.log("\n=== PIN salah ===");

await kirimPin("000000");

cek("PIN salah tidak membuka", api.dapat().tugasUnlocked, false);
cek("modal tetap terbuka", api.isPinModalOpen(), true);
cek("pesan error ditampilkan", dom.pinError.classList.contains("hidden"), false);
cek("promise masih menggantung", selesai, "belum");


// ---- 3. PIN benar ---------------------------------------------

console.log("\n=== PIN benar ===");

await kirimPin(PIN_UJI);

cek("gerbang tugas terbuka", api.dapat().tugasUnlocked, true);
cek("modal tertutup", api.isPinModalOpen(), false);
cek("kunci disimpan di sessionStorage", simpanan.get("tugasUnlocked"), "1");

await new Promise((r) => setImmediate(r));
cek("promise selesai dengan true", selesai, true);


// ---- 4. Sekali per sesi ---------------------------------------

console.log("\n=== sekali per sesi ===");

const janji2 = api.mintaIzinTugas();
cek("tidak menanyakan PIN lagi", api.isPinModalOpen(), false);
cek("langsung diizinkan", await janji2, true);


// ---- 5. Kunci SYNC terpisah -----------------------------------

console.log("\n=== kunci SYNC terpisah ===");

const janjiSync = api.bukaPin("sync");

cek("membuka tugas TIDAK membuka SYNC", api.dapat().syncUnlocked, false);
cek("modal sandi terbuka lagi untuk SYNC", api.isPinModalOpen(), true);
cek("judul modal untuk SYNC", dom.pinTitle.textContent, "Sync PIN");
cek(
    "halaman SYNC belum dirender",
    tiruan._halamanSync === undefined,
    true
);

await kirimPin(PIN_UJI);
await new Promise((r) => setImmediate(r));

cek("SYNC terbuka setelah PIN benar", api.dapat().syncUnlocked, true);
cek("promise SYNC selesai", await janjiSync, true);


// ---- 6. ABORT -------------------------------------------------

console.log("\n=== ABORT ===");

// Kunci baru: sesi dihapus, seperti tab yang baru dibuka.
// Variabel `let` di dalam modul tidak ikut terhapus oleh
// sessionStorage.clear(), jadi statusnya direset eksplisit.
simpanan.clear();
api.atur({ sync: false, tugas: false });

const janji3 = api.mintaIzinTugas();
dom.pinCancel.onclick();

cek("ABORT menutup modal", api.isPinModalOpen(), false);
cek("ABORT tidak membuka gerbang", api.dapat().tugasUnlocked, false);
cek("ABORT selesai dengan false", await janji3, false);


// ---- 7. Dua permintaan bertumpuk ------------------------------

console.log("\n=== permintaan bertumpuk ===");

const janjiA = api.mintaIzinTugas();
const janjiB = api.mintaIzinTugas();

cek("permintaan kedua langsung ditolak", await janjiB, false);
cek("modal tetap satu", api.isPinModalOpen(), true);

dom.pinCancel.onclick();
cek("permintaan pertama selesai dengan false", await janjiA, false);


// ---- 8. Gerbang terpasang di SEMUA jalur CRUD ------------------
//
// Ini pemeriksaan statis: memastikan tidak ada jalur tambah,
// edit, atau hapus yang lolos tanpa memanggil gerbang. Tanpa
// ini, gerbang bisa saja hanya terpasang di satu tombol.

console.log("\n=== gerbang terpasang di semua jalur ===");

function badanFungsi(nama) {
    const mulai = sumber.indexOf(`function ${nama}(`);

    if (mulai === -1) throw new Error(`fungsi ${nama} tidak ada`);

    let i = sumber.indexOf("{", mulai);
    let dalam = 0;

    for (let j = i; j < sumber.length; j += 1) {
        if (sumber[j] === "{") dalam += 1;
        else if (sumber[j] === "}") {
            dalam -= 1;
            if (dalam === 0) return sumber.slice(mulai, j + 1);
        }
    }

    throw new Error(`fungsi ${nama} tidak tertutup`);
}

function badanHandler(penanda) {
    const mulai = sumber.indexOf(penanda);

    if (mulai === -1) throw new Error(`handler ${penanda} tidak ada`);

    // Ambil 1200 karakter setelah penanda: cukup untuk memuat
    // bagian awal handler tempat gerbang dipasang.
    return sumber.slice(mulai, mulai + 1200);
}

const jalur = [
    ["openAddTaskModal (tombol tambah)", badanFungsi("openAddTaskModal")],
    ["openEditModal (tombol edit)", badanFungsi("openEditModal")],
    ["deleteTask (tombol hapus)", badanFungsi("deleteTask")],
    ["taskForm submit", badanHandler('taskForm.addEventListener(')],
    ["editForm submit", badanHandler('editForm.addEventListener(')]
];

for (const [nama, badan] of jalur) {
    cek(
        nama + " memanggil gerbang sandi",
        badan.includes("bukaPin(\"tugas\")") ||
        badan.includes("mintaIzinTugas()"),
        true
    );
}

// Halaman SYNC tidak boleh ikut terbuka hanya karena gerbang
// tugas dibuka.
cek(
    "gerbang tugas tidak memanggil tampilSync",
    badanFungsi("mintaIzinTugas").includes("tampilSync"),
    false
);


console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);
process.exit(gagal ? 1 : 0);