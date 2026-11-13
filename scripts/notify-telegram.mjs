// =========================================================
//  NOTIFIKASI TUGAS
//
//  Dua jenis pesan, dikirim sekali sehari (08.00 WIB):
//    1. Tugas LMS yang baru ditemukan sync (notified_at null)
//    2. Tugas yang deadline-nya H-3 sampai H-1 dan belum selesai
//
//  KEMANA PESANNYA PERGI
//  Tujuan utamanya WhatsApp. Runner GitHub tidak bisa
//  menghubungi HP, jadi pesan dititipkan ke tabel
//  wa_outbox, lalu jembatan yang jalan di HP mengambil dan
//  mengirimnya ke nomor utama. Telegram hanya salinan.
//
//  Kenapa lewat GitHub Actions, bukan halaman web?
//  Token bot Telegram adalah rahasia. Halaman statis tidak bisa
//  menyimpannya. Runner Actions sudah dipakai sync dan bisa
//  membaca Supabase tanpa membocorkan apa pun ke browser.
//
//  Perintah:
//      node scripts/notify-telegram.mjs
//      node scripts/notify-telegram.mjs --dry-run
//      node scripts/notify-telegram.mjs --uji
//      node scripts/notify-telegram.mjs --uji=tunggu
//
//  Secret yang dibutuhkan:
//      SUPABASE_URL, SUPABASE_KEY        (wajib)
//      TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID   (kalau NOTIFY_TELEGRAM=1)
//
//  Saklar tujuan (opsional, default 1):
//      NOTIFY_WA=0         jangan titipkan ke antrean WhatsApp
//      NOTIFY_TELEGRAM=0   jangan kirim salinan ke Telegram
// =========================================================

import path from "node:path";
import { fileURLToPath } from "node:url";

const ZONA = "Asia/Jakarta";
const BATAS_DAFTAR = 30;

// Nama yang dipakai bot saat menyapa. Bisa ditimpa lewat
// secret TELEGRAM_NAMA tanpa mengubah kode.
const NAMA = (process.env.TELEGRAM_NAMA || "").trim() || "Krisna";

// Ke mana notifikasi dikirim.
//
// WhatsApp adalah tujuan utama: pesan ditulis ke tabel
// wa_outbox, lalu jembatan di HP mengambilnya dan mengirim
// lewat nomor dummy ke nomor utama.
//
// Telegram tetap bisa dipakai sebagai salinan/arsip. Bisa
// dimatikan dengan NOTIFY_TELEGRAM=0 kalau tidak diperlukan.
const KE_WA = String(process.env.NOTIFY_WA ?? "1") !== "0";
const KE_TG = String(process.env.NOTIFY_TELEGRAM ?? "1") !== "0";


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


// Senin pada minggu yang memuat todayKey.
export function awalMinggu(todayKey) {

    const hari =
        new Date(todayKey + "T00:00:00Z").getUTCDay();

    return geserTanggal(todayKey, -((hari + 6) % 7));

}


// Nama hari pendek: "Sen", "Sel", dst.
export function hariTampil(key) {

    if (!key) return "";

    return new Intl.DateTimeFormat(
        "id-ID",
        { timeZone: "UTC", weekday: "short" }
    ).format(new Date(key + "T00:00:00Z"));

}


// Deadline lengkap (tanggal + jam WIB) sebagai Date.
// null bila tugas tidak punya jam.
export function waktuDeadline(task) {

    if (!task?.deadline || !task.deadline_time) return null;

    return new Date(
        task.deadline + "T" +
        String(task.deadline_time).slice(0, 8) +
        "+07:00"
    );

}


export function sisaJam(task, now = new Date()) {

    const waktu = waktuDeadline(task);

    return waktu ? (waktu - now) / 3600000 : null;

}


// Pengingat "3 jam sebelum deadline": hanya tugas berjam yang
// belum selesai dan masih di dalam jendela.
export function perluIngatDeadline(task, now = new Date(), batasJam = 3) {

    if (sudahDikerjakan(task)) return false;

    const sisa = sisaJam(task, now);

    return sisa !== null && sisa > 0 && sisa <= batasJam;

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


// Tanggal + jam (WIB) bila ada. Tanpa deadline_time tetap
// menampilkan tanggal saja, seperti tugas all-day.
function deadlineTampil(task) {

    const jam = task.deadline_time
        ? String(task.deadline_time).slice(0, 5).replace(":", ".")
        : "";

    return tanggalTampil(task.deadline) +
        (jam ? " · " + jam : "");

}


// Mengembalikan "" kalau tidak ada yang perlu dikirim, supaya
// bot tidak mengirim pesan kosong setiap hari.
export function susunPesan(baru, dekat, todayKey) {

    const bagian = [];

    if (baru.length > 0) {

        const baris = baru.slice(0, BATAS_DAFTAR).map(
            (task) => `• ${labelTugas(task)}\n  deadline ${deadlineTampil(task)}`
        );

        if (baru.length > BATAS_DAFTAR) {

            baris.push(`… dan ${baru.length - BATAS_DAFTAR} tugas lain`);

        }

        bagian.push("tugas baru:\n" + baris.join("\n"));

    }

    if (dekat.length > 0) {

        const baris = dekat.slice(0, BATAS_DAFTAR).map((task) => {

            const selisih = Math.round(
                (Date.parse(task.deadline + "T00:00:00Z") -
                 Date.parse(todayKey + "T00:00:00Z")) / 86400000
            );

            return `• H-${selisih} · ${deadlineTampil(task)}\n  ${labelTugas(task)}`;

        });

        if (dekat.length > BATAS_DAFTAR) {

            baris.push(`… dan ${dekat.length - BATAS_DAFTAR} tugas lain`);

        }

        bagian.push("yang udah deket:\n" + baris.join("\n"));

    }

    if (bagian.length === 0) return "";

    return "Pagi " + NAMA + ", ini update tugasnya yaaa\n\n" +
        bagian.join("\n\n");

}


function jamTampil(task) {

    return task.deadline_time
        ? String(task.deadline_time).slice(0, 5).replace(":", ".")
        : "";

}


// Pesan "3 jam sebelum deadline".
// Ditulis seperti orang ngingetin teman: pendek, huruf kecil,
// tanpa pembuka basa-basi.
export function susunPesanDeadline(daftar, now = new Date()) {

    if (daftar.length === 0) return "";

    const baris = daftar.map((task) => {

        const sisa = Math.max(1, Math.round(sisaJam(task, now)));

        return `• ${labelTugas(task)} — jam ${jamTampil(task)}, ` +
            `sisa ${sisa} jam`;

    });

    return "Deadline udah deket, " + NAMA + "\n\n" +
        baris.join("\n") +
        "\n\nkalau udah beres abaikan aja ya";

}


// Digest Senin: tugas minggu ini + yang selesai minggu lalu.
export function susunDigest(mingguIni, selesaiLalu) {

    const bagian = [];


    if (mingguIni.length > 0) {

        const baris = mingguIni.slice(0, BATAS_DAFTAR).map(
            (task) => `• ${hariTampil(task.deadline)}, ${deadlineTampil(task)}\n` +
                `  ${labelTugas(task)}`
        );

        if (mingguIni.length > BATAS_DAFTAR) {

            baris.push(`… dan ${mingguIni.length - BATAS_DAFTAR} tugas lain`);

        }

        bagian.push("minggu ini:\n" + baris.join("\n"));

    }
    else {

        bagian.push("minggu ini kosong, aman.");

    }


    bagian.push(
        selesaiLalu.length > 0
            ? `minggu lalu kamu kelar ${selesaiLalu.length} tugas.`
            : "minggu lalu belum ada yang kelar, gapapa."
    );

    return "Senin lagi, " + NAMA + ".\n\n" + bagian.join("\n\n");

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
    "select=id,course,class_name,deadline,deadline_time,status,source,lms_details,deadline_reminder_at,completed_at";


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


// Tugas hari ini & besok yang punya jam dan belum pernah
// diingatkan. Besok ikut diambil karena jendela 3 jam bisa
// melewati tengah malam (deadline 01.00 WIB, diingatkan 23.00).
async function ambilHariIni(todayKey) {

    const besok = geserTanggal(todayKey, 1);

    const res = await supabase(
        "GET",
        "tasks?" + KOLOM +
        `&deadline=in.(${todayKey},${besok})` +
        "&deadline_time=not.is.null" +
        "&deadline_reminder_at=is.null" +
        "&dismissed_at=is.null&order=deadline.asc,deadline_time.asc"
    );

    return res.json();

}


async function ambilMingguIni(mulai, selesai) {

    const res = await supabase(
        "GET",
        "tasks?" + KOLOM +
        `&deadline=gte.${mulai}&deadline=lte.${selesai}` +
        "&dismissed_at=is.null&order=deadline.asc"
    );

    const rows = await res.json();

    return rows.filter((task) => !sudahDikerjakan(task));

}


// Tugas yang completed_at-nya jatuh di rentang [mulai, selesai).
async function ambilSelesaiLalu(mulai, selesai) {

    const gte = encodeURIComponent(
        new Date(mulai + "T00:00:00+07:00").toISOString()
    );

    const lt = encodeURIComponent(
        new Date(selesai + "T00:00:00+07:00").toISOString()
    );

    const res = await supabase(
        "GET",
        "tasks?" + KOLOM +
        `&status=eq.Completed&completed_at=gte.${gte}&completed_at=lt.${lt}` +
        "&dismissed_at=is.null&order=completed_at.asc"
    );

    return res.json();

}


async function kirimTelegramSaja(teks) {

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


// WhatsApp tidak punya format HTML, sedangkan pesan disusun
// dengan escape HTML untuk Telegram. Tanpa ini, nama tugas
// yang mengandung "&" akan tampil sebagai "&amp;" di WhatsApp.
export function untukWhatsApp(teks) {

    return String(teks ?? "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");

}


// Titipkan pesan ke tabel antrean. Jembatan di HP yang akan
// benar-benar mengirim ke WhatsApp.
async function kirimAntrean(teks, sumber = "notify") {

    const res = await supabase("POST", "wa_outbox", {
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
            pesan: untukWhatsApp(teks),
            status: "menunggu",
            sumber
        })
    });

    return res;

}


// Kirim ke semua tujuan yang aktif. Kalau salah satu gagal,
// tujuan lain tetap dicoba, lalu galatnya dilaporkan setelah
// itu supaya jelas apa yang belum beres.
async function kirimPesan(teks, sumber = "notify") {

    const gagal = [];
    const berhasil = [];

    if (KE_WA) {

        try {

            await kirimAntrean(teks, sumber);
            berhasil.push("WhatsApp (antrean)");

        }
        catch (error) {

            gagal.push("WhatsApp: " + error.message);

        }

    }

    if (KE_TG) {

        try {

            await kirimTelegramSaja(teks);
            berhasil.push("Telegram");

        }
        catch (error) {

            gagal.push("Telegram: " + error.message);

        }

    }

    if (berhasil.length > 0) {

        console.log("Terkirim ke : " + berhasil.join(", "));

    }

    if (gagal.length > 0) {

        throw new Error(gagal.join(" | "));

    }

    if (berhasil.length === 0) {

        throw new Error(
            "Tidak ada tujuan yang aktif. " +
            "NOTIFY_WA dan NOTIFY_TELEGRAM dua-duanya 0."
        );

    }

}


// Cek isi antrean tanpa mengirim apa pun. Dipakai --uji dan
// pesan galat, supaya kelihatan apakah jembatan benar-benar
// sudah mengambil pesan.
async function antreanTerakhir() {

    const res = await supabase(
        "GET",
        "wa_outbox?select=id,status,dibuat_at,terkirim_at,galat" +
        "&order=id.desc&limit=1"
    );

    const baris = await res.json();

    return baris[0] || null;

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


async function tandaiIngat(daftar) {

    if (daftar.length === 0) return;

    const ids = daftar.map((task) => task.id);

    await supabase(
        "PATCH",
        "tasks?id=in.(" + ids.join(",") + ")",
        {
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
                deadline_reminder_at: new Date().toISOString()
            })
        }
    );

}


async function main() {

    const dryRun = process.argv.includes("--dry-run");

    const argMode = process.argv.find((a) => a.startsWith("--mode="));
    const mode = argMode ? argMode.slice("--mode=".length) : "harian";

    if (!["harian", "deadline"].includes(mode)) {

        throw new Error("--mode harus harian atau deadline.");

    }

    // Pesan tes: membuktikan jalur pengiriman benar tanpa
    // menyentuh database tugas atau menandai tugas apa pun.
    //
    // --uji=tunggu  tunggu sampai jembatan di HP melaporkan
    //               pesan sudah terkirim (paling lama 90 detik).
    //               Ini bukti nyata, bukan sekadar "sudah masuk
    //               antrean".
    if (process.argv.some((a) => a.startsWith("--uji"))) {

        const argUji = process.argv.find((a) => a.startsWith("--uji"));
        const tunggu = argUji.includes("tunggu");

        await kirimPesan(
            "tes. kalau pesan ini masuk, jalur notifikasi tugas " +
            "sampai ke WhatsApp, " + NAMA + ".",
            "uji"
        );

        console.log("Pesan tes dikirim.");

        if (tunggu) {

            const batas = Date.now() + 90000;
            let baris = null;

            while (Date.now() < batas) {

                baris = await antreanTerakhir();

                if (baris && baris.status !== "menunggu") break;

                await new Promise((r) => setTimeout(r, 3000));

            }

            if (!baris) {

                console.log("Antrean kosong: pesan tidak tercatat.");

            }
            else if (baris.status === "terkirim") {

                console.log(
                    "TERBUKTI: jembatan di HP sudah mengirim pesan " +
                    "ke WhatsApp pada " + baris.terkirim_at + "."
                );

            }
            else if (baris.status === "menunggu") {

                console.log(
                    "BELUM TERKIRIM: pesan masih menunggu di antrean. " +
                    "Jembatan di HP kemungkinan mati atau WhatsApp " +
                    "belum tersambung."
                );

            }
            else {

                console.log(
                    "GAGAL: jembatan mencoba mengirim tetapi gagal. " +
                    (baris.galat || "")
                );

            }

        }

        return;

    }

    // --tanggal=YYYY-MM-DD hanya untuk memeriksa pesan pada
    // tanggal lain tanpa menunggu hari itu tiba.
    const argTanggal = process.argv.find((a) => a.startsWith("--tanggal="));
    const todayKey = argTanggal ? argTanggal.slice("--tanggal=".length) : tanggalWib();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) {

        throw new Error("Format --tanggal harus YYYY-MM-DD.");

    }


    // ---------- MODE DEADLINE (tiap jam) ----------
    if (mode === "deadline") {

        const sekarang = new Date();

        const hariIni = await ambilHariIni(todayKey);

        const daftar = hariIni.filter(
            (task) => perluIngatDeadline(task, sekarang)
        );

        const teks = susunPesanDeadline(daftar, sekarang);

        console.log(`Tanggal : ${todayKey} (WIB)`);
        console.log(`Diingatkan : ${daftar.length}`);

        if (!teks) {

            console.log("Tidak ada yang perlu diingatkan.");
            return;

        }

        if (dryRun) {

            console.log("\n--- pesan (tidak dikirim) ---\n" + teks);
            return;

        }

        await kirimPesan(teks, "deadline");

        await tandaiIngat(daftar);

        return;

    }


    // ---------- MODE HARIAN (+ digest kalau Senin) ----------
    const baru = await ambilBaru();
    const baruIds = new Set(baru.map((task) => task.id));
    const dekat = (await ambilDekat(todayKey))
        .filter((task) => !baruIds.has(task.id));

    let digest = "";

    // 0 = Minggu, 1 = Senin.
    const senin =
        new Date(todayKey + "T00:00:00Z").getUTCDay() === 1;

    if (senin) {

        const mulai = awalMinggu(todayKey);
        const selesai = geserTanggal(mulai, 6);

        const mingguIni = await ambilMingguIni(mulai, selesai);

        const selesaiLalu = await ambilSelesaiLalu(
            geserTanggal(mulai, -7),
            mulai
        );

        digest = susunDigest(mingguIni, selesaiLalu);

        console.log(`Minggu ini : ${mingguIni.length}`);
        console.log(`Selesai lalu : ${selesaiLalu.length}`);

    }

    const teks = [susunPesan(baru, dekat, todayKey), digest]
        .filter(Boolean)
        .join("\n\n");

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

    await kirimPesan(teks, "harian");

    // Deadline dekat tidak ditandai: besok masih H-2/H-1 dan
    // memang perlu diingatkan lagi. Hanya tugas baru yang
    // ditandai supaya tidak diulang tiap hari.
    await tandaiTerkirim(baru);

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
