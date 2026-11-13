// UJI ALUR SUBMIT (menulis lalu mencoba membatalkan).
// Target: assignment 2111 (Worksheet 10 RD, due 21 Des 2026).
//
// Urutan: unggah berkas uji -> save_submission -> cek status ->
// submit_for_grading -> cek status -> remove_submission -> cek.
// Hasil remove dilaporkan apa adanya.

const URL_MOODLE = (process.env.MOODLE_URL || "https://kuliah2.itera.ac.id").replace(/\/$/, "");
const TOKEN = process.env.MOODLE_TOKEN;
const ASSIGN = process.env.ASSIGN_ID || "2111";

const potong = (s, n = 300) => {
    const t = typeof s === "string" ? s : JSON.stringify(s);
    return t && t.length > n ? t.slice(0, n) + "…" : t;
};

async function moodle(fungsi, params = {}) {
    const url = new URL(URL_MOODLE + "/webservice/rest/server.php");
    url.searchParams.set("wstoken", TOKEN);
    url.searchParams.set("wsfunction", fungsi);
    url.searchParams.set("moodlewsrestformat", "json");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url);
    const teks = await res.text();
    let j;
    try { j = JSON.parse(teks); } catch { throw new Error("Bukan JSON: " + teks.slice(0, 200)); }
    if (j && j.exception) throw new Error(j.errorcode + ": " + (j.message || ""));
    return j;
}

async function status() {
    const st = await moodle("mod_assign_get_submission_status", { assignid: ASSIGN });
    const s = st?.lastattempt?.submission;
    const files = [];
    for (const p of s?.plugins || []) {
        if (p.type === "file") {
            for (const a of p.fileareas || []) {
                for (const f of a.files || []) files.push(f.filename);
            }
        }
    }
    return { status: s?.status || "(belum ada)", files };
}

console.log("TARGET: " + ASSIGN);
console.log("SEBELUM: " + JSON.stringify(await status()));

// 1. itemid draft
const draft = await moodle("core_files_get_unused_draft_itemid");
console.log("\n1. draft itemid: " + potong(draft));

// 2. unggah berkas uji ke draft
const isi = Buffer.from(
    "Berkas uji otomatis task-vault. Boleh dihapus.\n" +
    new Date().toISOString() + "\n"
);

const form = new FormData();
form.append("token", TOKEN);
form.append("filearea", "draft");
form.append("itemid", String(draft));
form.append("file_1", new Blob([isi], { type: "text/plain" }), "uji-submit.txt");

const resUpload = await fetch(URL_MOODLE + "/webservice/upload.php", {
    method: "POST",
    body: form
});

const teksUpload = await resUpload.text();
console.log("\n2. upload HTTP " + resUpload.status);
console.log("   " + potong(teksUpload, 500));

let itemid = String(draft);

try {
    const arr = JSON.parse(teksUpload);
    if (Array.isArray(arr) && arr[0]?.itemid) itemid = String(arr[0].itemid);
} catch { /* biarkan */ }

// 3. save_submission
console.log("\n3. save_submission (itemid " + itemid + ")");

try {
    const simpan = await moodle("mod_assign_save_submission", {
        assignmentid: ASSIGN,
        "plugindata[files_filemanager]": itemid,
        "plugindata[onlinetext_editor][text]": "Berkas uji otomatis task-vault.",
        "plugindata[onlinetext_editor][format]": "1",
        "plugindata[onlinetext_editor][itemid]": "0"
    });
    console.log("   OK: " + potong(simpan));
} catch (e) {
    console.log("   GAGAL: " + e.message);
}

console.log("   status: " + JSON.stringify(await status()));

// 4. submit_for_grading
console.log("\n4. submit_for_grading");

try {
    const kirim = await moodle("mod_assign_submit_for_grading", {
        assignmentid: ASSIGN,
        acceptsubmissionstatement: "1"
    });
    console.log("   OK: " + potong(kirim));
} catch (e) {
    console.log("   GAGAL: " + e.message);
}

console.log("   status: " + JSON.stringify(await status()));

// 5. BATALKAN
console.log("\n5. remove_submission (mencoba membatalkan)");

try {
    const hapus = await moodle("mod_assign_remove_submission", { assignid: ASSIGN });
    console.log("   OK: " + potong(hapus));
} catch (e) {
    console.log("   GAGAL: " + e.message);
}

console.log("   status akhir: " + JSON.stringify(await status()));
