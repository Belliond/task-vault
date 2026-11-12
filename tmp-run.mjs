import { execFileSync } from "node:child_process";

// Ambil token dari credential helper git (Git Credential Manager).
// Token tidak dicetak; hanya dipakai untuk memanggil API.
const keluaran = execFileSync(
    "git",
    ["credential", "fill"],
    {
        input: "protocol=https\nhost=github.com\n\n",
        encoding: "utf8"
    }
);

const baris = Object.fromEntries(
    keluaran.split(/\r?\n/)
        .filter((l) => l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

const TOKEN = baris.password;
const REPO = "Belliond/task-vault";

const api = async (path, opsi = {}) => {
    const res = await fetch("https://api.github.com" + path, {
        ...opsi,
        headers: {
            Authorization: "Bearer " + TOKEN,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "task-vault-setup",
            ...(opsi.headers || {})
        }
    });
    const teks = await res.text();
    let data = null;
    try { data = teks ? JSON.parse(teks) : null; } catch { data = teks; }
    return { status: res.status, data };
};

// 1. Siapa pemilik token & scope apa saja yang dimiliki
const user = await api("/user");
console.log("=== token ===");
console.log("login  : " + (user.data?.login || "(gagal)"));
console.log("status : " + user.status);

const scopes = await fetch("https://api.github.com/user", {
    headers: { Authorization: "Bearer " + TOKEN }
}).then((r) => r.headers.get("x-oauth-scopes"));

console.log("scopes : " + (scopes || "(tidak dilaporkan)"));

if (user.data?.login !== "Belliond") {
    console.log("\nCATATAN: token milik akun '" + user.data?.login +
        "', bukan 'Belliond'. Kalau akun ini bukan kolaborator repo, " +
        "pemicuan workflow akan ditolak.");
}

// 2. Pastikan workflow terlihat
const wf = await api(`/repos/${REPO}/actions/workflows/sync.yml`);
console.log("\n=== workflow ===");
console.log("nama   : " + (wf.data?.name || "(tidak terbaca)"));
console.log("state  : " + (wf.data?.state || "-"));
console.log("status : " + wf.status);

// 3. Picu dry run
console.log("\n=== memicu dry run ===");
const dispatch = await api(`/repos/${REPO}/actions/workflows/sync.yml/dispatches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main", inputs: { dry_run: true } })
});

console.log("HTTP " + dispatch.status);
if (dispatch.status !== 204) {
    console.log(JSON.stringify(dispatch.data, null, 1));
    process.exit(1);
}

console.log("Workflow dipicu. Menunggu run muncul...");

// 4. Tunggu run baru, lalu pantau sampai selesai
let run = null;

for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const runs = await api(
        `/repos/${REPO}/actions/workflows/sync.yml/runs?per_page=3&event=workflow_dispatch`
    );
    const daftar = runs.data?.workflow_runs || [];
    run = daftar.find((r) => r.status !== "completed");
    if (run) break;
    if (daftar.length) { run = daftar[0]; break; }
}

if (!run) {
    console.log("Run tidak muncul dalam 60 detik.");
    process.exit(1);
}

console.log("run id  : " + run.id);
console.log("url     : " + run.html_url);
console.log("status  : " + run.status + " / " + run.conclusion);

// Pantau sampai selesai (maks 6 menit)
for (let i = 0; i < 60; i++) {
    if (run.status === "completed") break;
    await new Promise((r) => setTimeout(r, 6000));
    const satu = await api(`/repos/${REPO}/actions/runs/${run.id}`);
    run = satu.data;
    console.log("  ... " + run.status + " / " + run.conclusion);
}

console.log("\n=== hasil akhir ===");
console.log("status     : " + run.status);
console.log("conclusion : " + run.conclusion);
console.log("url        : " + run.html_url);

// 5. Ambil log (butuh izin; kalau gagal, tampilkan lewat API jobs)
const jobs = await api(`/repos/${REPO}/actions/runs/${run.id}/jobs`);
console.log("\n=== langkah per job ===");
for (const job of jobs.data?.jobs || []) {
    console.log("JOB: " + job.name + " -> " + job.conclusion);
    for (const step of job.steps || []) {
        console.log("   [" + step.conclusion + "] " + step.name);
    }
}

// 6. Coba unduh log mentah untuk melihat output skrip
const logRes = await fetch(
    `https://api.github.com/repos/${REPO}/actions/runs/${run.id}/logs`,
    { headers: { Authorization: "Bearer " + TOKEN }, redirect: "follow" }
);

console.log("\n=== log mentah: HTTP " + logRes.status + " ===");

if (logRes.status === 200) {
    const zip = Buffer.from(await logRes.arrayBuffer());
    const fs = await import("node:fs");
    fs.writeFileSync("tmp-run-logs.zip", zip);
    console.log("disimpan: tmp-run-logs.zip (" + zip.length + " byte)");
}
else {
    console.log(await logRes.text().then((t) => t.slice(0, 200)));
}
