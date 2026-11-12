// Uji logika filter DUA SUMBER (Classroom + Moodle) memakai
// kode ASLI dari script.js, bukan salinan.
//
// Caranya: potong fungsi murni dari script.js lalu jalankan
// dengan DOM tiruan kecil. Dengan begitu yang diuji benar-benar
// kode yang dikirim ke browser.
//
// Dijalankan dari akar repo: `npm test` atau
// `node scripts/test-filter-ui.mjs`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Baca script.js dari akar repo, bukan dari cwd — supaya uji ini
// tetap benar walau dipanggil dari folder lain.
const ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);

const sumber = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");

function potong(nama) {
    const mulai = sumber.indexOf(`function ${nama}(`);
    if (mulai === -1) throw new Error(`fungsi ${nama} tidak ditemukan`);
    // Cari kurung kurawal pembuka, lalu cocokkan sampai tertutup.
    let i = sumber.indexOf("{", mulai);
    let dalam = 0;
    for (let j = i; j < sumber.length; j++) {
        if (sumber[j] === "{") dalam++;
        else if (sumber[j] === "}") {
            dalam--;
            if (dalam === 0) return sumber.slice(mulai, j + 1);
        }
    }
    throw new Error(`fungsi ${nama} tidak tertutup`);
}

// ---- DOM tiruan -------------------------------------------------

function elemen(tag) {
    return {
        tag,
        children: [],
        value: "",
        checked: false,
        type: "",
        className: "",
        textContent: "",
        innerHTML: "",
        appendChild(c) { this.children.push(c); return c; },
        addEventListener() {},
        querySelectorAll(sel) {
            if (sel !== "input[type=checkbox]") return [];
            // DOM asli mencari ke SELURUH keturunan, bukan hanya
            // anak langsung — checkbox ada di dalam <label>.
            const hasil = [];
            const jelajah = (node) => {
                for (const c of node.children || []) {
                    if (c.tag === "input") hasil.push(c);
                    jelajah(c);
                }
            };
            jelajah(this);
            return hasil;
        }
    };
}

function daftar() {
    const d = elemen("div");
    d.innerHTML = "";
    return d;
}

// renderPicker memanggil document.createElement.
globalThis.document = { createElement: elemen };

// ---- Rakit fungsi asli ------------------------------------------

const kode = [
    "let autoSyncSettings = null;",
    "let autoSyncDirty = false;",
    "let autoSyncSaveFilter = null;",
    "const autoSyncFilterStatus = null;",
    potong("setAutoSyncStatus"),
    potong("pecahDaftar"),
    potong("gabungDaftar"),
    potong("kelasDipakai"),
    potong("renderPicker"),
    potong("tandaiBelumDisimpan"),
    potong("susunFilterDariCentang"),
    potong("semuaDilepas"),
    "return { kelasDipakai, susunFilterDariCentang, renderPicker, semuaDilepas, setSettings: (s) => { autoSyncSettings = s; } };"
].join("\n\n");

const api = new Function(kode)();

let lulus = 0;
let gagal = 0;

function cek(nama, dapat, harap) {
    const a = JSON.stringify(dapat);
    const b = JSON.stringify(harap);
    if (a === b) { lulus++; console.log("  OK   " + nama); }
    else { gagal++; console.log("  GAGAL " + nama + "\n         dapat : " + a + "\n         harap : " + b); }
}

// ---- 1. kelasDipakai memakai awalan sumber ----------------------

console.log("=== kelasDipakai: filter terpisah per sumber ===");

const pengaturan = {
    classroom_only: "",
    classroom_exclude: "PBO RA 2026",
    moodle_only: "",
    moodle_exclude: "1016"
};

const kelas = { id: "843941141691", name: "PBO RA 2026" };
const kelasLain = { id: "876689741003", name: "Kriptografi" };
const matkul = { id: "1016", name: "Praktikum Jaringan Komputer" };
const matkulLain = { id: "968", name: "Basis Data" };

cek("kelas dikecualikan classroom", api.kelasDipakai(kelas, pengaturan, "classroom"), false);
cek("kelas lain tetap dipakai", api.kelasDipakai(kelasLain, pengaturan, "classroom"), true);
cek("matkul dikecualikan moodle", api.kelasDipakai(matkul, pengaturan, "moodle"), false);
cek("matkul lain tetap dipakai", api.kelasDipakai(matkulLain, pengaturan, "moodle"), true);

// Filter Classroom TIDAK boleh memengaruhi Moodle dan sebaliknya:
// memanggil dengan awalan "classroom" hanya membaca kolom
// classroom_*, jadi nilai moodle_exclude diabaikan.
cek(
    "kolom moodle diabaikan saat memeriksa classroom",
    api.kelasDipakai(matkul, { moodle_exclude: "1016" }, "classroom"),
    true
);

cek(
    "kolom classroom diabaikan saat memeriksa moodle",
    api.kelasDipakai(kelas, { classroom_exclude: "PBO RA 2026" }, "moodle"),
    true
);

// ---- 2. renderPicker menggambar checkbox -----------------------

console.log("\n=== renderPicker ===");

api.setSettings(pengaturan);

const daftarMoodle = daftar();
api.renderPicker(daftarMoodle, [matkul, matkulLain], pengaturan, "moodle", "kosong");

cek("jumlah checkbox moodle", daftarMoodle.children.length, 2);
cek("checkbox 1016 tidak dicentang", daftarMoodle.children[0].children[0].checked, false);
cek("checkbox 968 dicentang", daftarMoodle.children[1].children[0].checked, true);
cek("label memakai nama matkul", daftarMoodle.children[0].children[1].textContent, "Praktikum Jaringan Komputer");

const daftarKelas = daftar();
api.renderPicker(daftarKelas, [kelas, kelasLain], pengaturan, "classroom", "kosong");

cek("jumlah checkbox kelas", daftarKelas.children.length, 2);
cek("PBO RA 2026 tidak dicentang", daftarKelas.children[0].children[0].checked, false);

// Daftar kosong -> satu pesan, tanpa checkbox.
const daftarKosong = daftar();
api.renderPicker(daftarKosong, [], pengaturan, "moodle", "Belum ada daftar.");

cek("daftar kosong: 1 pesan", daftarKosong.children.length, 1);
cek("daftar kosong: teks pesan", daftarKosong.children[0].textContent, "Belum ada daftar.");

// ---- 3. susunFilterDariCentang ---------------------------------

console.log("\n=== susunFilterDariCentang ===");

// Semua dicentang -> only dikosongkan supaya kelas baru ikut.
const semua = daftar();
api.renderPicker(semua, [matkul, matkulLain], { moodle_exclude: "" }, "moodle", "kosong");
const hasilSemua = api.susunFilterDariCentang(semua, [matkul, matkulLain], "moodle", {});

cek("semua dicentang: only kosong", hasilSemua.only, "");
cek("semua dicentang: exclude kosong", hasilSemua.exclude, "");
cek("semua dicentang: berubah", hasilSemua.berubah, true);

// Satu dilepas -> only berisi yang dicentang, exclude berisi yang tidak.
const sebagian = daftar();
api.renderPicker(sebagian, [matkul, matkulLain], {}, "moodle", "kosong");
sebagian.children[0].children[0].checked = false;

const hasilSebagian = api.susunFilterDariCentang(sebagian, [matkul, matkulLain], "moodle", {});

cek("sebagian: only berisi yang dicentang", hasilSebagian.only, "968");
cek("sebagian: exclude berisi yang dilepas", hasilSebagian.exclude, "1016");

// Daftar belum termuat -> JANGAN menimpa filter yang sudah ada.
const belumTermuat = daftar();
const hasilKosong = api.susunFilterDariCentang(
    belumTermuat,
    [],
    "moodle",
    { moodle_only: "968", moodle_exclude: "1016" }
);

cek("belum termuat: only dipertahankan", hasilKosong.only, "968");
cek("belum termuat: exclude dipertahankan", hasilKosong.exclude, "1016");
cek("belum termuat: berubah=false", hasilKosong.berubah, false);

// daftar null (elemen tidak ada di halaman) -> juga tidak menimpa.
const hasilNull = api.susunFilterDariCentang(null, [], "classroom", { classroom_only: "abc" });
cek("daftar null: only dipertahankan", hasilNull.only, "abc");
cek("daftar null: berubah=false", hasilNull.berubah, false);

// ---- 4. semuaDilepas -------------------------------------------

console.log("\n=== semuaDilepas (semua centang dilepas) ===");

cek(
    "semua dilepas terdeteksi",
    api.semuaDilepas({ only: "", exclude: "1016, 968", berubah: true }),
    true
);

cek(
    "sebagian dilepas bukan 'semua'",
    api.semuaDilepas({ only: "968", exclude: "1016", berubah: true }),
    false
);

cek(
    "semua dicentang bukan 'semua dilepas'",
    api.semuaDilepas({ only: "", exclude: "", berubah: true }),
    false
);

cek(
    "daftar belum termuat tidak dianggap dilepas",
    api.semuaDilepas({ only: "", exclude: "", berubah: false }),
    false
);

// ---- hasil ------------------------------------------------------

console.log(`\n=== hasil: ${lulus} lulus, ${gagal} gagal ===`);
process.exit(gagal ? 1 : 0);
