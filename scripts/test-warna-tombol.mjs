// =========================================================
//  UJI WARNA TOMBOL MODAL
//
//  Bug yang dijaga di sini: ABORT dulu HIJAU dan UNLOCK dulu
//  MERAH — warnanya tertukar, sehingga tombol batal terlihat
//  seperti aksi utama dan tombol buka terlihat berbahaya.
//
//  Yang diperiksa bukan "apakah CSS ada", melainkan nilai warna
//  yang benar-benar dipakai tiap tombol, dihitung dari aturan
//  yang menang (spesifisitas + urutan), seperti browser.
//
//  Dijalankan: node scripts/test-warna-tombol.mjs
// =========================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const css = fs.readFileSync(path.join(AKAR, "style.css"), "utf8");
const html = fs.readFileSync(path.join(AKAR, "index.html"), "utf8");

let lulus = 0;
let gagal = 0;

function cek(nama, dapat, harap) {
    if (dapat === harap) {
        lulus += 1;
        console.log("  OK    " + nama);
    }
    else {
        gagal += 1;
        console.log(
            "  GAGAL " + nama +
            "\n         dapat : " + dapat +
            "\n         harap : " + harap
        );
    }
}

// ---- 1. Variabel warna tema ------------------------------------

console.log("=== variabel warna ===");

const variabel = {};

for (const cocok of css.matchAll(/(--[a-z-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
    variabel[cocok[1]] = cocok[2].toLowerCase();
}

cek("--green ada", variabel["--green"], "#4dffb2");
cek("--danger ada", variabel["--danger"], "#ff5d73");

const HIJAU = variabel["--green"];
const MERAH = variabel["--danger"];

// ---- 2. Nilai `color` tiap kelas -------------------------------
//
// Cara baca: ambil SEMUA aturan yang selectornya menyebut kelas
// itu tanpa :hover/:focus, lalu pakai yang TERAKHIR — persis
// seperti CSS menimpa aturan sebelumnya.

function aturanSelektor() {
    const hasil = [];

    // Buang komentar dulu supaya isinya tidak terbaca sebagai
    // selektor.
    const bersih = css.replace(/\/\*[\s\S]*?\*\//g, "");

    for (const cocok of bersih.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selektor = cocok[1].trim();
        const isi = cocok[2];

        if (!selektor || selektor.startsWith("@")) continue;

        const warna = isi.match(/(?:^|;|\s)color:\s*([^;]+);/);

        if (!warna) continue;

        hasil.push({
            selektor,
            color: warna[1].trim()
        });
    }

    return hasil;
}

const semuaAturan = aturanSelektor();

function warnaKelas(namaKelas) {
    let akhir = null;

    for (const aturan of semuaAturan) {
        // Hanya aturan yang selector-nya persis kelas ini (boleh
        // digabung dengan koma), tanpa state :hover/:focus.
        const bagian = aturan.selektor
            .split(",")
            .map((s) => s.trim());

        if (!bagian.includes("." + namaKelas)) continue;

        akhir = aturan.color;
    }

    return akhir;
}

function selesaikan(nilai) {
    if (!nilai) return null;
    const cocok = nilai.match(/^var\((--[a-z-]+)\)$/);
    if (cocok) return variabel[cocok[1]];
    return nilai.toLowerCase();
}

// ---- 3. ABORT harus merah, UNLOCK harus hijau ------------------

console.log("\n=== warna tombol ===");

cek(
    ".confirm-cancel (ABORT) merah",
    selesaikan(warnaKelas("confirm-cancel")),
    MERAH
);

cek(
    ".confirm-accept (UNLOCK) hijau",
    selesaikan(warnaKelas("confirm-accept")),
    HIJAU
);

// DELETE memakai .confirm-accept, jadi harus punya penimpa merah.
cek(
    ".confirm-accept-danger (DELETE) merah",
    selesaikan(warnaKelas("confirm-accept-danger")),
    MERAH
);

// ---- 4. Kelas benar-benar dipasang di HTML ---------------------

console.log("\n=== pemasangan kelas di HTML ===");

const pinModal = html.slice(html.indexOf('id="pinModal"'));
const tombolPin = pinModal.slice(0, pinModal.indexOf("</form>"));

cek(
    "ABORT di modal sandi memakai .confirm-cancel",
    /id="pinCancel"[\s\S]*?class="confirm-cancel"/.test(tombolPin),
    true
);

cek(
    "UNLOCK di modal sandi TIDAK memakai .confirm-accept-danger",
    /UNLOCK[\s\S]{0,200}?confirm-accept-danger/.test(tombolPin),
    false
);

cek(
    "tombol hapus di modal konfirmasi memakai .confirm-accept-danger",
    /id="confirmAccept"[\s\S]*?confirm-accept-danger/.test(html),
    true
);

// ---- 5. Hover juga harus ikut arah yang sama ------------------

console.log("\n=== warna hover ===");

function warnaHover(namaKelas) {
    let akhir = null;

    for (const aturan of semuaAturan) {
        const bagian = aturan.selektor
            .split(",")
            .map((s) => s.trim());

        if (!bagian.includes("." + namaKelas + ":hover")) continue;

        akhir = aturan.color;
    }

    return akhir;
}

const hoverBatal = selesaikan(warnaHover("confirm-cancel"));
const hoverBuka = selesaikan(warnaHover("confirm-accept"));

cek(
    "hover ABORT tidak hijau",
    hoverBatal !== HIJAU,
    true
);

cek(
    "hover UNLOCK tidak merah",
    hoverBuka !== MERAH,
    true
);

console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);
process.exit(gagal ? 1 : 0);
