// =========================================================
//  Generator config.js dari .env
//
//  Browser tidak bisa membaca file .env, jadi nilai dari
//  .env "dipanggang" menjadi config.js saat development.
//  File hasilnya di-gitignore karena berisi kredensial.
//
//  Jalankan: npm run env:build
// =========================================================

import fs from "node:fs";
import path from "node:path";

const ENV_FILE = ".env";
const EXAMPLE_FILE = ".env.example";
const OUT_FILE = "config.js";


function parseEnv(text) {

    const values = {};

    for (const rawLine of text.split(/\r?\n/)) {

        const line = rawLine.trim();

        if (!line || line.startsWith("#")) {
            continue;
        }

        const eq = line.indexOf("=");

        if (eq === -1) {
            continue;
        }

        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();

        // Buang tanda kutip pembungkus bila ada.
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        values[key] = value;

    }

    return values;

}


function fail(message) {

    console.error("\n  GAGAL: " + message + "\n");
    process.exit(1);

}


if (!fs.existsSync(ENV_FILE)) {

    fail(
        "File .env tidak ditemukan.\n" +
        "  Salin dulu contohnya:\n" +
        "      copy .env.example .env     (Windows)\n" +
        "      cp .env.example .env       (macOS/Linux)"
    );

}


const env = parseEnv(fs.readFileSync(ENV_FILE, "utf8"));
const example = fs.existsSync(EXAMPLE_FILE)
    ? parseEnv(fs.readFileSync(EXAMPLE_FILE, "utf8"))
    : {};

const required = ["SUPABASE_URL", "SUPABASE_KEY"];

for (const key of required) {

    if (!env[key]) {
        fail(`${key} belum diisi di .env`);
    }

}

if (!/^https:\/\/.+\.supabase\.co\/?$/.test(env.SUPABASE_URL)) {

    console.error(
        "  PERINGATAN: SUPABASE_URL tidak berbentuk " +
        "https://<ref>.supabase.co — pastikan bukan URL dashboard."
    );

}

// Jangan pernah membiarkan secret key masuk ke browser.
if (/service_role|sb_secret/i.test(env.SUPABASE_KEY)) {

    fail(
        "SUPABASE_KEY terlihat seperti SECRET key.\n" +
        "  Secret key memberi akses penuh dan TIDAK boleh " +
        "dikirim ke browser.\n" +
        "  Pakai publishable / anon key dari Project Settings -> API."
    );

}


// Kunci tambahan yang opsional: ambil dari .env, kalau tidak
// ada pakai nilai contoh supaya UI tetap punya default.
function pick(key) {

    return env[key] || example[key] || "";

}

// Penjaga: kunci yang HANYA boleh ada di server. Kalau suatu
// saat ada yang menambahkannya ke objek config di bawah, build
// harus gagal di sini, bukan setelah rahasianya terlanjur
// terbit di GitHub Pages.
const HANYA_SERVER = [
    "CLASSROOM_CLIENT_SECRET",
    "CLASSROOM_REFRESH_TOKEN",
    "MOODLE_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_DB_URL"
];

const config = {
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_KEY: env.SUPABASE_KEY,
    MOODLE_URL: pick("MOODLE_URL"),
    CLASSROOM_CLIENT_ID: pick("CLASSROOM_CLIENT_ID"),
    CLASSROOM_REDIRECT: pick("CLASSROOM_REDIRECT")
};

const bocor = HANYA_SERVER.filter((k) => k in config);

if (bocor.length) {

    fail(
        "Kunci berikut tidak boleh masuk config.js:\n" +
        "  " + bocor.join(", ") + "\n" +
        "  Nilai itu hanya untuk server (GitHub Secrets)."
    );

}


const body = `// =========================================================
//  FILE INI DI-GENERATE OTOMATIS - JANGAN DIEDIT MANUAL
//  Sumber: .env  (dibuat oleh scripts/build-config.mjs)
//  Regenerate: npm run env:build
//
//  File ini TIDAK ikut ter-commit karena berisi kredensial.
//  Nilai di dalamnya tetap terlihat oleh siapa pun yang
//  membuka web, jadi jangan taruh secret di sini.
// =========================================================

window.APP_CONFIG = ${JSON.stringify(config, null, 4)};
`;


fs.writeFileSync(OUT_FILE, body, "utf8");

console.log(`Generated ${OUT_FILE} dari ${ENV_FILE}:`);
console.log("  SUPABASE_URL       : " + config.SUPABASE_URL);
console.log("  SUPABASE_KEY       : " + config.SUPABASE_KEY.slice(0, 12) + "…");
console.log("  MOODLE_URL         : " + (config.MOODLE_URL || "(kosong)"));
console.log("  CLASSROOM_CLIENT_ID: " + (config.CLASSROOM_CLIENT_ID ? config.CLASSROOM_CLIENT_ID.slice(0, 14) + "…" : "(kosong)"));
console.log("  CLASSROOM_REDIRECT : " + (config.CLASSROOM_REDIRECT || "(otomatis dari URL halaman)"));
