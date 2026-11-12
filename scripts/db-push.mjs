// =========================================================
//  JALANKAN MIGRASI KE DATABASE SUPABASE
//
//  Kenapa pakai script ini, bukan `supabase db push`?
//  CLI Supabase butuh login akun + menulis riwayat migrasi
//  ke schema supabase_migrations. Untuk proyek ini kita
//  hanya perlu menjalankan file SQL yang sudah idempoten,
//  jadi koneksi Postgres langsung lebih sederhana dan tidak
//  mengubah apa pun di luar schema public.
//
//  Perintah:
//      npm run db:check     cek koneksi saja (tidak menulis)
//      npm run db:push      jalankan semua migrasi
//      npm run db:push -- --dry-run   tampilkan tanpa eksekusi
//
//  Password dibaca dari .env:
//      SUPABASE_DB_PASSWORD   (atau)
//      SUPABASE_DB_URL        (connection string penuh)
// =========================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);

const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

const DRY_RUN = process.argv.includes("--dry-run");
const CHECK_ONLY = process.argv.includes("--check");


// ---------------------------------------------------------
//  Baca .env (tanpa dependensi tambahan)
// ---------------------------------------------------------

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


function fail(message, hint = "") {

    console.error("\n  GAGAL: " + message + "\n");

    if (hint) {
        console.error(hint.split("\n").map((l) => "  " + l).join("\n") + "\n");
    }

    process.exit(1);

}


const envPath = path.join(ROOT, ".env");

if (!fs.existsSync(envPath)) {

    fail(
        "File .env tidak ditemukan.",
        "Salin dulu contohnya:\n" +
        "    copy .env.example .env"
    );

}


const env = parseEnv(fs.readFileSync(envPath, "utf8"));


// ---------------------------------------------------------
//  Susun connection string
// ---------------------------------------------------------

function projectRefFromUrl(url) {

    const match = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i.exec(
        String(url || "").trim()
    );

    return match ? match[1] : null;

}


// Supabase tidak memberi tahu region project lewat API publik,
// jadi kita coba beberapa kandidat berurutan dan pakai yang
// pertama berhasil.
//
// Dua variabel:
//   POOLER_INDEX  -> host bisa aws-0-... atau aws-1-...
//   REGION_HINTS  -> region project (dari pengujian: Tokyo)
const POOLER_INDEXES = ["0", "1"];

const REGION_HINTS = [
    "ap-northeast-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-south-1",
    "ap-northeast-2",
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "sa-east-1",
    "ca-central-1"
];


function buildCandidates() {

    const explicit = String(env.SUPABASE_DB_URL || "").trim();
    const password = String(env.SUPABASE_DB_PASSWORD || "").trim();
    const ref = projectRefFromUrl(env.SUPABASE_URL);

    if (!ref) {

        fail(
            "SUPABASE_URL di .env tidak valid.",
            "Bentuk yang benar: https://<ref>.supabase.co"
        );

    }


    const candidates = [];

    // SUPABASE_DB_URL hanya dipakai kalau bentuknya memang
    // connection string Postgres. Kesalahan umum: mengisinya
    // dengan URL API (https://xxx.supabase.co), yang bukan
    // alamat database sama sekali.
    if (explicit) {

        if (/^postgres(ql)?:\/\//i.test(explicit)) {

            candidates.push({
                url: explicit,
                label: "SUPABASE_DB_URL"
            });

        }
        else {

            console.warn(
                "\n  PERINGATAN: SUPABASE_DB_URL di .env bukan connection\n" +
                "  string Postgres (harus diawali postgresql://).\n" +
                "  Nilai itu diabaikan; memakai SUPABASE_DB_PASSWORD.\n"
            );

        }

    }


    if (!password) {

        if (candidates.length > 0) {

            return candidates;

        }

        fail(
            "SUPABASE_DB_PASSWORD masih kosong di .env.",
            "Buka .env dan isi barisnya:\n" +
            "\n" +
            "    SUPABASE_DB_PASSWORD=password-database-anda\n" +
            "\n" +
            "Ambil / reset di:\n" +
            "    Dashboard -> Project Settings -> Database\n" +
            "    -> Reset database password"
        );

    }


    const pass = encodeURIComponent(password);

    // 1. Koneksi langsung (kalau jaringan mendukung IPv6).
    candidates.push({
        url: `postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres`,
        label: "direct db." + ref + ".supabase.co"
    });

    // 2. Session pooler per region + index pooler.
    //    Project ini terbukti berada di ap-northeast-1, jadi
    //    region itu dicoba lebih dulu.
    for (const region of REGION_HINTS) {

        for (const index of POOLER_INDEXES) {

            candidates.push({
                url:
                    `postgresql://postgres.${ref}:${pass}` +
                    `@aws-${index}-${region}.pooler.supabase.com:5432/postgres`,
                label: `pooler aws-${index} ${region}`
            });

        }

    }

    return candidates;

}


const candidates = buildCandidates();


// ---------------------------------------------------------
//  Muat driver pg (diunduh saat pertama kali dipakai)
// ---------------------------------------------------------

let pg;

try {

    pg = await import("pg");

}
catch (error) {

    fail(
        "Driver database belum terpasang.",
        "Jalankan dulu:\n" +
        "    npm install"
    );

}


const { Client } = pg.default || pg;


// ---------------------------------------------------------
//  Kumpulkan migrasi
// ---------------------------------------------------------

if (!fs.existsSync(MIGRATIONS_DIR)) {

    fail("Folder supabase/migrations tidak ditemukan.");

}


const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();


if (files.length === 0) {

    fail("Tidak ada file migrasi di supabase/migrations.");

}


// ---------------------------------------------------------
//  Jalankan
// ---------------------------------------------------------

const redacted = (url) =>
    url.replace(/:\/\/([^:]+):[^@]*@/, "://$1:***@");


console.log("\n  Mode    : " + (
    CHECK_ONLY ? "cek koneksi saja"
        : DRY_RUN ? "dry-run (tidak menulis)"
            : "APPLY (menulis ke database)"
));
console.log("  Migrasi : " + files.length + " file");
console.log("  Kandidat: " + candidates.length + " endpoint\n");


// ---------------------------------------------------------
//  Cari endpoint yang bisa dihubungi
// ---------------------------------------------------------

let client = null;
let usedLabel = null;
let lastError = null;
let authError = null;
let authLabel = null;


for (const candidate of candidates) {

    process.stdout.write("  coba " + candidate.label.padEnd(38) + " ... ");

    const attempt = new Client({
        connectionString: candidate.url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000
    });

    try {

        await attempt.connect();

        // Pastikan benar-benar database proyek ini, bukan
        // proyek lain yang kebetulan menerima koneksi.
        const who = await attempt.query(
            "select current_database() as db, current_user as usr"
        );

        console.log("OK");

        client = attempt;
        usedLabel = candidate.label;

        console.log(
            "\n  Terhubung -> " + redacted(candidate.url)
        );
        console.log(
            "  Database : " + who.rows[0].db +
            "   User : " + who.rows[0].usr + "\n"
        );

        break;

    }
    catch (error) {

        lastError = error;

        const isAuth =
            /password|authentication|SASL|SCRAM/i.test(error.message);

        // Simpan error auth secara terpisah: itu bukti bahwa
        // host-nya BENAR dan hanya password yang salah.
        if (isAuth) {

            authError = error;
            authLabel = candidate.label;

        }


        const short =
            isAuth
                ? "password salah"
                : /ENOTFOUND|getaddrinfo/i.test(error.message)
                    ? "host tidak ditemukan"
                    : /timeout|ETIMEDOUT|ECONNREFUSED/i.test(error.message)
                        ? "tidak bisa dijangkau"
                        : error.message.slice(0, 60);

        console.log("- " + short);

        await attempt.end().catch(() => {});

    }

}


if (!client) {

    // Bedakan dua penyebab yang sangat berbeda:
    //   - host benar tapi password salah  -> perbaiki .env
    //   - host tidak ada (tenant not found) -> region salah
    if (authError) {

        console.error(
            "\n  GAGAL: server database DITEMUKAN, tapi password DITOLAK.\n"
        );

        console.error(
            "  Endpoint : " + authLabel + "\n" +
            "  Kode     : " + (authError.code || "-") + "\n" +
            "  Artinya  : koneksi ke server sudah benar, hanya\n" +
            "             password di .env yang tidak cocok.\n\n" +
            "  Ini bukan masalah kode. Password database berbeda\n" +
            "  dari password akun Supabase Anda.\n\n" +
            "  Perbaiki:\n" +
            "      1. Buka Dashboard -> Project Settings -> Database\n" +
            "      2. Klik \"Reset database password\"\n" +
            "      3. Salin password yang muncul (biasanya panjang\n" +
            "         dan acak) ke .env:\n" +
            "             SUPABASE_DB_PASSWORD=<password-baru>\n" +
            "      4. Jalankan lagi:  npm run db:check\n\n" +
            "  Alternatif tanpa password sama sekali:\n" +
            "      Buka Dashboard -> SQL Editor, lalu jalankan isi\n" +
            "      SUPABASE_SETUP.sql (lihat README cara C).\n"
        );

    }
    else {

        console.error("\n  GAGAL: tidak ada endpoint yang bisa dihubungi.\n");

        if (lastError) {
            console.error("  Error terakhir: " + lastError.message + "\n");
        }

        console.error(
            "  Kemungkinan besar region project bukan salah satu\n" +
            "  yang dicoba. Isi langsung di .env dengan connection\n" +
            "  string dari:\n" +
            "      Dashboard -> Project Settings -> Database\n" +
            "      -> Connection string -> Session pooler\n\n" +
            "  Bentuknya:\n" +
            "      SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres\n"
        );

    }

    process.exit(1);

}


try {
    if (CHECK_ONLY) {

        const t = await client.query(
            "select to_regclass('public.tasks') as tbl"
        );

        console.log(
            "  Tabel public.tasks : " +
            (t.rows[0].tbl ? "ADA" : "belum ada")
        );

        const fn = await client.query(
            "select count(*)::int as n from pg_proc " +
            "where proname = 'sync_lms_tasks'"
        );

        console.log(
            "  Fungsi sync_lms_tasks : " +
            (fn.rows[0].n > 0 ? "ADA" : "belum ada")
        );

        console.log("\n  Cek selesai. Tidak ada yang diubah.\n");

        await client.end();

        process.exit(0);

    }


    for (const file of files) {

        const sql = fs.readFileSync(
            path.join(MIGRATIONS_DIR, file),
            "utf8"
        );


        if (DRY_RUN) {

            console.log("  [dry-run] " + file + " (" + sql.length + " char)");

            continue;

        }


        process.stdout.write("  -> " + file + " ... ");


        // Setiap file dijalankan dalam transaksi sendiri,
        // jadi migrasi yang gagal tidak meninggalkan
        // perubahan setengah jadi.
        try {

            await client.query("begin");

            await client.query(sql);

            await client.query("commit");

            console.log("OK");

        }
        catch (error) {

            await client.query("rollback").catch(() => {});

            console.log("GAGAL");

            console.error("\n  Error: " + error.message);

            if (error.position) {
                console.error("  Posisi: " + error.position);
            }

            if (error.hint) {
                console.error("  Hint  : " + error.hint);
            }

            console.error(
                "\n  Migrasi dibatalkan pada file ini. " +
                "File sebelumnya sudah tersimpan.\n"
            );

            await client.end().catch(() => {});

            process.exit(1);

        }

    }


    if (!DRY_RUN) {

        console.log("\n  --- Verifikasi ---");

        const cols = await client.query(
            "select column_name from information_schema.columns " +
            "where table_schema='public' and table_name='tasks' " +
            "order by ordinal_position"
        );

        console.log(
            "  Kolom tasks : " +
            cols.rows.map((r) => r.column_name).join(", ")
        );


        const def = await client.query(
            "select column_default from information_schema.columns " +
            "where table_schema='public' and table_name='tasks' " +
            "and column_name='status'"
        );

        console.log(
            "  Default status : " +
            (def.rows[0]?.column_default || "(tidak ada)")
        );


        const fn = await client.query(
            "select count(*)::int as n from pg_proc " +
            "where proname = 'sync_lms_tasks'"
        );

        console.log(
            "  sync_lms_tasks : " +
            (fn.rows[0].n > 0 ? "ADA" : "TIDAK ADA")
        );


        const stat = await client.query(
            "select status, count(*)::int as n from public.tasks " +
            "group by status order by status"
        );

        console.log(
            "  Status data : " +
            (stat.rows.length === 0
                ? "(kosong)"
                : stat.rows.map((r) => r.status + "=" + r.n).join(", "))
        );

    }


    console.log("\n  Selesai.\n");

}
catch (error) {

    console.error("\n  GAGAL terhubung / menjalankan migrasi:\n");
    console.error("  " + error.message + "\n");

    if (/password|authentication/i.test(error.message)) {

        console.error(
            "  Sepertinya password database salah.\n" +
            "  Reset di: Dashboard -> Project Settings -> Database\n" +
            "            -> Reset database password\n"
        );

    }
    else if (/ENOTFOUND|getaddrinfo/i.test(error.message)) {

        console.error(
            "  Host tidak ditemukan. Region project mungkin bukan\n" +
            "  ap-southeast-1. Isi SUPABASE_DB_URL di .env dengan\n" +
            "  connection string dari Dashboard -> Database.\n"
        );

    }

    await client.end().catch(() => {});

    process.exit(1);

}
finally {

    await client.end().catch(() => {});

}
