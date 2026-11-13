// PROBE SEMENTARA (akan dihapus): buktikan field soal/submission
// Moodle benar-benar tersedia lewat web service.

const URL_MOODLE = (process.env.MOODLE_URL || "https://kuliah2.itera.ac.id").replace(/\/$/, "");
const TOKEN = process.env.MOODLE_TOKEN;

if (!TOKEN) {
    console.error("MOODLE_TOKEN kosong");
    process.exit(1);
}

const potong = (s, n = 500) => {
    if (s === undefined || s === null) return s;
    const t = String(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return t.length > n ? t.slice(0, n) + " …(" + t.length + " char)" : t;
};

async function moodle(fungsi, params = {}) {
    const url = new URL(URL_MOODLE + "/webservice/rest/server.php");
    url.searchParams.set("wstoken", TOKEN);
    url.searchParams.set("wsfunction", fungsi);
    url.searchParams.set("moodlewsrestformat", "json");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url);
    const teks = await res.text();
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = JSON.parse(teks);
    if (j && j.exception) throw new Error(j.message || j.errorcode);
    return j;
}

const situs = await moodle("core_webservice_get_site_info");
console.log("USER: " + situs.fullname + " | userid=" + situs.userid);
console.log("SITE: " + situs.sitename);

const matkul = await moodle("core_enrol_get_users_courses", { userid: situs.userid });
console.log("MATKUL: " + matkul.length);

// Hanya 4 matkul yang punya tugas aktif, tapi ambil semua yang
// punya assignment agar kesimpulan tidak bias.
let totalAssign = 0;

for (const m of matkul) {
    let asg;
    try {
        asg = await moodle("mod_assign_get_assignments", { courseids: String(m.id) });
    } catch (e) {
        console.log("\nMATKUL " + m.id + " " + m.fullname + " -> GAGAL " + e.message);
        continue;
    }

    const daftar = asg?.courses?.[0]?.assignments || [];
    if (!daftar.length) continue;

    console.log("\n==============================================");
    console.log("MATKUL " + m.id + " : " + m.fullname + " (" + daftar.length + " assignment)");
    console.log("==============================================");

    for (const a of daftar) {
        totalAssign++;

        const cfg = (nama) => a.configs?.find((c) => c.name === nama)?.value;

        console.log("\n--- assign " + a.id + " : " + potong(a.name, 120));
        console.log("  duedate          : " + a.duedate);
        console.log("  cut off          : " + a.cutoffdate);
        console.log("  intro (SOAL)     : " + potong(a.intro, 700));
        console.log("  introattachments : " + (Array.isArray(a.introattachments) ? a.introattachments.length + " file" : a.introattachments));
        console.log("  file enabled     : " + cfg("assignsubmission_file_enabled") + " maxfiles=" + cfg("assignsubmission_file_maxfiles"));
        console.log("  onlinetext       : " + cfg("assignsubmission_onlinetext_enabled"));
        console.log("  grading          : " + a.grade + " / " + a.gradingmethod);

        try {
            const st = await moodle("mod_assign_get_submission_status", { assignid: String(a.id) });
            const s = st?.lastattempt?.submission;

            if (!s) {
                console.log("  SUBMISSION       : (belum ada)");
                continue;
            }

            console.log("  SUBMISSION       : status=" + s.status + " attempt=" + s.attemptnumber +
                " timemodified=" + s.timemodified);

            for (const p of s.plugins || []) {
                if (p.type === "onlinetext") {
                    console.log("    onlinetext     : " + potong(p.editorfields?.[0]?.text, 900));
                } else if (p.type === "file") {
                    const files = p.fileareas?.[0]?.files || [];
                    console.log("    file           : " + files.length + " berkas");
                    for (const f of files.slice(0, 5)) {
                        console.log("      - " + f.filename + " (" + f.filesize + " B)");
                        console.log("        " + f.fileurl);
                    }
                } else {
                    console.log("    plugin " + p.type + " : " + potong(p, 300));
                }
            }

            if (st?.feedback) {
                console.log("  FEEDBACK         : " + potong(st.feedback.grade?.grade) + " | " + potong(st.feedback.plugins, 300));
            }
        } catch (e) {
            console.log("  SUBMISSION       : GAGAL " + e.message);
        }
    }
}

console.log("\nTOTAL ASSIGNMENT DIPERIKSA: " + totalAssign);
