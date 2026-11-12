// =========================================================
//  Generate SUPABASE_SETUP.sql dari supabase/migrations/
//
//  Migrasi adalah SATU-SATUNYA sumber kebenaran. File
//  SUPABASE_SETUP.sql hanya kemasan praktis untuk yang mau
//  copy-paste ke SQL Editor tanpa memasang CLI. Dengan
//  di-generate, keduanya tidak mungkin berbeda isi.
//
//  Jalankan: npm run db:sql
// =========================================================

import fs from "node:fs";
import path from "node:path";

const DIR = "supabase/migrations";
const OUT = "SUPABASE_SETUP.sql";

const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

if (files.length === 0) {
    console.error("Tidak ada migrasi ditemukan di " + DIR);
    process.exit(1);
}

const header = `-- =========================================================
--  GHOST TASK MATRIX - SETUP SUPABASE
--
--  FILE INI DI-GENERATE OTOMATIS. JANGAN DIEDIT MANUAL.
--  Sumbernya: supabase/migrations/*.sql
--  Regenerate dengan: npm run db:sql
--
--  Cara pakai cepat (tanpa CLI):
--    Supabase Dashboard -> SQL Editor -> paste seluruh file
--    ini -> Run. Hasil yang diharapkan:
--    "Success. No rows returned".
--
--  Cara yang disarankan (versi terkontrol):
--    npm install && npx supabase link --project-ref <REF>
--    npx supabase db push
--
--  Semua perintah idempoten: boleh dijalankan berulang.
-- =========================================================
`;

const body = files
    .map((file) => {
        const sql = fs.readFileSync(path.join(DIR, file), "utf8").trim();
        const bar = "=".repeat(57);
        return `
-- ${bar}
--  DARI MIGRASI: ${file}
-- ${bar}

${sql}
`;
    })
    .join("\n");

fs.writeFileSync(OUT, header + body, "utf8");

const lines = (header + body).split("\n").length;
console.log(`Generated ${OUT} dari ${files.length} migrasi (${lines} baris):`);
files.forEach((f) => console.log("  - " + f));
