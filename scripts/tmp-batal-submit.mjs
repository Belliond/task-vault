// Coba semua jalur pembatalan yang tersedia untuk assignment 2111.
const URL_MOODLE = (process.env.MOODLE_URL || "https://kuliah2.itera.ac.id").replace(/\/$/, "");
const TOKEN = process.env.MOODLE_TOKEN;
const ASSIGN = process.env.ASSIGN_ID || "2111";
const USERID = process.env.USER_ID || "36098";

const potong = (s, n = 400) => {
    const t = typeof s === "string" ? s : JSON.stringify(s);
    return t && t.length > n ? t.slice(0, n) + "…" : t;
};

async function moodle(fungsi, params = {}) {
    const url = new URL(URL_MOODLE + "/webservice/rest/server.php");
    url.searchParams.set("wstoken", TOKEN);
    url.searchParams.set("wsfunction", fungsi);
    url.searchParams.set("moodlewsrestformat", "json");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const j = JSON.parse(await (await fetch(url)).text());
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

console.log("STATUS AWAL: " + JSON.stringify(await status()));

const percobaan = [
    ["remove_submission (assignid + userid)", "mod_assign_remove_submission", {
        assignid: ASSIGN,
        userid: USERID
    }],
    ["revert_submissions_to_draft", "mod_assign_revert_submissions_to_draft", {
        assignmentid: ASSIGN,
        "userids[0]": USERID
    }],
    ["revert_submissions_to_draft (assignid)", "mod_assign_revert_submissions_to_draft", {
        assignid: ASSIGN,
        "userids[0]": USERID
    }]
];

for (const [nama, fungsi, params] of percobaan) {
    console.log("\n--- " + nama);
    try {
        const hasil = await moodle(fungsi, params);
        console.log("    OK: " + potong(hasil));
    } catch (e) {
        console.log("    GAGAL: " + e.message);
    }
    console.log("    status: " + JSON.stringify(await status()));
}
