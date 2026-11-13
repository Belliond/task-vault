// PROBE SEMENTARA: fungsi web service apa yang diizinkan token?
const URL_MOODLE = (process.env.MOODLE_URL || "https://kuliah2.itera.ac.id").replace(/\/$/, "");
const TOKEN = process.env.MOODLE_TOKEN;

if (!TOKEN) {
    console.error("MOODLE_TOKEN kosong");
    process.exit(1);
}

async function moodle(fungsi, params = {}) {
    const url = new URL(URL_MOODLE + "/webservice/rest/server.php");
    url.searchParams.set("wstoken", TOKEN);
    url.searchParams.set("wsfunction", fungsi);
    url.searchParams.set("moodlewsrestformat", "json");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url);
    const teks = await res.text();
    const j = JSON.parse(teks);
    if (j && j.exception) throw new Error(j.message || j.errorcode);
    return j;
}

const info = await moodle("core_webservice_get_site_info");
const fungsi = (info.functions || []).map((f) => f.name);

console.log("TOTAL FUNGSI: " + fungsi.length);

const penting = fungsi.filter((n) =>
    /assign|file|upload|submission/i.test(n)
);

console.log("\n=== FUNGSI TERKAIT TUGAS/BERKAS ===");
for (const n of penting) console.log("  " + n);

const cek = [
    "mod_assign_save_submission",
    "mod_assign_submit_for_grading",
    "mod_assign_get_submission_status",
    "core_files_upload",
    "core_files_get_files",
    "core_user_get_files"
];

console.log("\n=== KESIMPULAN IZIN ===");
for (const n of cek) {
    console.log("  " + (fungsi.includes(n) ? "BOLEH" : "TIDAK") + "  " + n);
}
