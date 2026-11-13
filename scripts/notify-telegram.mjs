// =========================================================
//  NOTIFIKASI TELEGRAM
//
//  Dua jenis pesan, dikirim sekali sehari (08.00 WIB):
//    1. Tugas LMS yang baru ditemukan sync (notified_at null)
//    2. Tugas yang deadline-nya H-3 sampai H-1 dan belum selesai
//
//  Kenapa lewat GitHub Actions, bukan halaman web?
//  Token bot Telegram adalah rahasia. Halaman statis tidak bisa
//  menyimpannya. Runner Actions sudah dipakai sync dan bisa
//  membaca Supabase tanpa membocorkan apa pun ke browser.
//
//  Perintah:
//      node scripts/notify-telegram.mjs
//      node scripts/notify-telegram.mjs --dry-run
//
//  Secret yang dibutuhkan:
//      TELEGRAM_BOT_TOKEN   dari @BotFather
//      TELEGRAM_CHAT_ID     id chat kamu (bisa negatif untuk grup)
//      SUPABASE_URL, SUPABASE_KEY   sama seperti sync
// =========================================================

import path from "node:path";
import { fileURLToPath } from "node:url";

const ZONA = "Asia/Jakarta";
const BATAS_DAFTAR = 30;


// ---------------------------------------------------------
//  Fungsi murni (diuji scripts/test-notify.mjs)
// ---------------------------------------------------------

// Tanggal hari ini menurut WIB, bentuk YYYY-MM-DD. Runner
// Actions memakai UTC, jadi tanggal UTC tidak boleh dipakai:
// pukul 08.00 WIB sudah 01.00 UTC di hari yang sama, tetapi
// pukul 00.30 WIB masih hari sebelumnya di UTC.
export function tanggalWib(now = new Date()) {

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: ZONA,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).format(now);

}


function geserTanggal(key, hari) {

    const [y, m, d] = key.split("-").map(Number);

    return new Date(Date.UTC(y, m - 1, d + hari))
        .toISOString()
        .slice(0, 10);

}


// H-3, H-2, H-1.
export function jendelaDeadline(todayKey) {

    return [1, 2, 3].map((n) => geserTanggal(todayKey, n));

}


// Sama dengan aturan kalender di web: status Completed, atau
// submission Moodle/Classroom sudah submitted/graded.
export function sudahDikerjakan(task) {

    if (String(task.status || "").toLowerCase() === "completed") {

        return true;

    }

    const state =
        String(task.lms_details?.submission?.state || "")
            .toLowerCase();

    return state === "submitted" || state === "graded";

}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}


function tanggalTampil(key) {

    if (!key) return "tanpa deadline";

    return new Intl.DateTimeFormat(
        "id-ID",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC"
        }
    ).format(new Date(key + "T00:00:00Z"));

}


function labelTugas(task) {

    const kelas = task.class_name ? ` (${task.class_name})` : "";

    return `${escapeHtml(task.course)}${escapeHtml(kelas)}`;

}


// Mengembalikan "" kalau tidak ada yang perlu dikirim, supaya
// bot tidak mengirim pesan kosong setiap hari.
export function susunPesan(baru, dekat, todayKey) {

    const bagian = [];

    if (baru.length > 0) {

        const baris = baru.slice(0, BATAS_DAFTAR).map(
            (task) => `• ${labelTugas(task)}\n  deadline ${tanggalTampil(task.deadline)}`
        );

        if (baru.length > BATAS_DAFTAR) {

            baris.push(`… dan ${baru.length - BATAS_DAFTAR} tugas lain`);

        }

        bagian.push("<b>TUGAS BARU</b>\n" + baris.join("\n"));

    }

    if (dekat.length > 0) {

        const baris = dekat.slice(0, BATAS_DAFTAR).map((task) => {

            const selisih = Math.round(
                (Date.parse(task.deadline + "T00:00:00Z") -
                 Date.parse(todayKey + "T00:00:00Z")) / 86400000
            );

            return `• H-${selisih} · ${tanggalTampil(task.deadline)}\n  ${labelTugas(task)}`;

        });

        if (dekat.length > BATAS_DAFTAR) {

            baris.push(`… dan ${dekat.length - BATAS_DAFTAR} tugas lain`);

        }

        bagian.push("<b>DEADLINE DEKAT</b>\n" + baris.join("\n"));

    }

    if (bagian.length === 0) return "";

    return "<b>TASK VAULT</b>\n\n" + bagian.join("\n\n");

}


// ---------------------------------------------------------
//  Bagian jaringan
// ---------------------------------------------------------

function wajibEnv(nama) {

    const nilai = (process.env[nama] || "").trim();

    if (!nilai) {

        throw new Error(
            `Secret ${nama} belum diisi. ` +
            "Isi di Settings -> Secrets and variables -> Actions."
        );

    }

    return nilai;

}


function rapikanUrl(url) {

    return url.replace(/\/+$/, "");

}


async function supabase(metode, jalur, init = {}) {

    const url = rapikanUrl(wajibEnv("SUPABASE_URL")) + "/rest/v1/" + jalur;
    const key = wajibEnv("SUPABASE_KEY");

    const res = await fetch(url, {
        method: metode,
        headers: {
            apikey: key,
            Authorization: "Bearer " + key,
            "Content-Type": "application/json",
            ...(init.headers || {})
        },
        body: init.body
    });

    if (!res.ok) {

        throw new Error(
            `Supabase ${metode} ${jalur.split("?")[0]} gagal ` +
            `(HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`
        );

    }

    return res;

}


const KOLOM =
    "select=id,course,class_name,deadline,status,source,lms_details";


async function ambilBaru() {

    const res = await supabase(
        "GET",
        "tasks?" + KOLOM +
        "&source=neq.manual&notified_at=is.null&dismissed_at=is.null" +
        "&order=deadline.asc"
    );

    return res.json();

}


async function ambilDekat(todayKey) {

    const [mulai, selesai] = [
        jendelaDeadline(todayKey)[0],
        jendelaDeadline(todayKey)[2]
    ];

    const res = await supabase(
        "GET",
        "tasks?" + KOLOM +
        `&deadline=gte.${mulai}&deadline=lte.${selesai}` +
        "&dismissed_at=is.null&order=deadline.asc"
    );

    const rows = await res.json();

    return rows.filter((task) => !sudahDikerjakan(task));

}


async function kirimTelegram(teks) {

    const token = wajibEnv("TELEGRAM_BOT_TOKEN");
    const chatId = wajibEnv("TELEGRAM_CHAT_ID");

    const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: teks,
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
        }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {

        throw new Error(
            `Telegram menolak pesan (HTTP ${res.status}): ` +
            (data.description || "tanpa keterangan")
        );

    }

}


// Ditandai hanya setelah pesan terkirim. Kalau Telegram gagal,
// tugas tetap notified_at null dan dicoba lagi besok.
async function tandaiTerkirim(daftar) {

    if (daftar.length === 0) return;

    const ids = daftar.map((task) => task.id);

    await supabase(
        "PATCH",
        "tasks?id=in.(" + ids.join(",") + ")",
        {
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ notified_at: new Date().toISOString() })
        }
    );

}


async function main() {

    const dryRun = process.argv.includes("--dry-run");

    // --tanggal=YYYY-MM-DD hanya untuk memeriksa pesan pada
    // tanggal lain tanpa menunggu hari itu tiba.
    const argTanggal = process.argv.find((a) => a.startsWith("--tanggal="));
    const todayKey = argTanggal ? argTanggal.slice("--tanggal=".length) : tanggalWib();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) {

        throw new Error("Format --tanggal harus YYYY-MM-DD.");

    }

    const baru = await ambilBaru();
    const baruIds = new Set(baru.map((task) => task.id));
    const dekat = (await ambilDekat(todayKey))
        .filter((task) => !baruIds.has(task.id));
    const teks = susunPesan(baru, dekat, todayKey);

    console.log(`Tanggal : ${todayKey} (WIB)`);
    console.log(`Baru    : ${baru.length}`);
    console.log(`Dekat   : ${dekat.length}`);

    if (!teks) {

        console.log("Tidak ada yang perlu dikirim.");
        return;

    }

    if (dryRun) {

        console.log("\n--- pesan (tidak dikirim) ---\n" + teks);
        return;

    }

    await kirimTelegram(teks);

    // Deadline dekat tidak ditandai: besok masih H-2/H-1 dan
    // memang perlu diingatkan lagi. Hanya tugas baru yang
    // ditandai supaya tidak diulang tiap hari.
    await tandaiTerkirim(baru);

    console.log("Terkirim.");

}


if (
    process.argv[1] &&
    path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
) {

    main().catch((error) => {

        console.error("\nGAGAL: " + (error.message || error));
        process.exit(1);

    });

}
