// PROBE (baca saja, tidak mengubah apa pun): detail assignment
// yang belum dikumpulkan, untuk memilih target uji yang aman.
const URL_MOODLE = (process.env.MOODLE_URL || "https://kuliah2.itera.ac.id").replace(/\/$/, "");
const TOKEN = process.env.MOODLE_TOKEN;

async function moodle(fungsi, params = {}) {
    const url = new URL(URL_MOODLE + "/webservice/rest/server.php");
    url.searchParams.set("wstoken", TOKEN);
    url.searchParams.set("wsfunction", fungsi);
    url.searchParams.set("moodlewsrestformat", "json");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url);
    const j = JSON.parse(await res.text());
    if (j && j.exception) throw new Error(j.message || j.errorcode);
    return j;
}

const info = await moodle("core_webservice_get_site_info");
const matkul = await moodle("core_enrol_get_users_courses", { userid: info.userid });

const kandidat = [];

for (const m of matkul) {
    let asg;
    try {
        asg = await moodle("mod_assign_get_assignments", { "courseids[0]": String(m.id) });
    } catch { continue; }

    for (const a of asg?.courses?.[0]?.assignments || []) {
        let st;
        try {
            st = await moodle("mod_assign_get_submission_status", { assignid: String(a.id) });
        } catch { continue; }

        const sub = st?.lastattempt?.submission;
        const status = sub?.status || "new";

        if (status !== "new" && status !== "draft") continue;

        kandidat.push({
            id: a.id,
            matkul: m.fullname,
            nama: a.name,
            due: new Date(Number(a.duedate) * 1000).toISOString().slice(0, 10),
            status,
            submissiondrafts: a.submissiondrafts,
            requiresubmissionstatement: a.requiresubmissionstatement,
            configs: (a.configs || []).map((c) => c.name + "=" + c.value)
        });
    }
}

kandidat.sort((a, b) => (a.due < b.due ? 1 : -1));

console.log("KANDIDAT (belum dikumpulkan / masih draft): " + kandidat.length);

for (const k of kandidat.slice(0, 6)) {
    console.log("\n--- " + k.id + " | " + k.nama);
    console.log("  matkul     : " + k.matkul);
    console.log("  due        : " + k.due);
    console.log("  status     : " + k.status);
    console.log("  draft mode : " + k.submissiondrafts);
    console.log("  statement  : " + k.requiresubmissionstatement);
    console.log("  configs    : " + (k.configs.length ? k.configs.join(", ") : "(kosong)"));
}
