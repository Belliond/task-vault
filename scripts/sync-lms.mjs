#!/usr/bin/env node
// =========================================================
//  SINKRONISASI OTOMATIS MOODLE -> SUPABASE
//
//  Kenapa ada skrip ini, padahal halaman SYNC sudah bisa
//  menarik tugas dari Moodle?
//
//  Karena tombol SYNC hanya berjalan kalau ada orang yang
//  membuka situs lalu mengkliknya. Skrip ini memindahkan
//  pekerjaan yang sama ke server, sehingga tugas baru masuk
//  sendiri tanpa perlu ada yang membuka browser.
//
//  Yang dipakai ulang dari sisi browser:
//    - urutan panggilan Moodle (site_info -> courses ->
//      mod_assign_get_assignments)
//    - bentuk external_id "assign:<courseId>:<assignId>"
//    - fungsi database sync_lms_tasks(), yang sudah menjaga
//      status pilihan user dan dismissed_at agar tidak
//      tertimpa sync
//
//  Bedanya dengan versi browser: TIDAK ada pemilih mata
//  kuliah, karena localStorage tidak ada di server. Semua
//  mata kuliah yang diikuti ikut disinkronkan. Kalau ingin
//  membatasi, isi MOODLE_COURSE_IDS (lihat README).
//
//  Sejak Google Classroom ikut disinkronkan, skrip ini menarik
//  dari DUA sumber sekaligus:
//
//    Moodle    -> token web service (tidak kedaluwarsa)
//    Classroom -> refresh token OAuth (dapat diperbarui sendiri)
//
//  Kalau kredensial Classroom belum diisi, bagian Classroom
//  dilewati dan Moodle tetap berjalan seperti biasa.
//
//  Pemakaian:
//      node scripts/sync-lms.mjs --dry-run   hanya tampilkan
//      node scripts/sync-lms.mjs             tulis ke database
//
//  Variabel yang dibaca (dari .env atau environment):
//      MOODLE_URL               https://kuliah2.itera.ac.id
//      MOODLE_TOKEN             token web service milik user
//      SUPABASE_URL             https://xxx.supabase.co
//      SUPABASE_KEY             publishable / anon key
//      MOODLE_COURSE_IDS        opsional, mis. "968,969"
//      CLASSROOM_SYNC_CLIENT_ID      OAuth client (Desktop app)
//      CLASSROOM_SYNC_CLIENT_SECRET  secret client yang sama
//      CLASSROOM_SYNC_REFRESH_TOKEN  hasil `npm run classroom:auth`
// =========================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    ".."
);

// Zona waktu kampus. Penting: server GitHub berjalan di UTC,
// sedangkan kolom tasks.deadline bertipe date tanpa jam. Kalau
// konversinya memakai UTC, tugas yang deadline-nya lewat
// tengah malam WIB akan tercatat sehari lebih awal.
const ZONA = "Asia/Jakarta";


// =========================================================
//  BAGIAN MURNI (tanpa jaringan) — mudah diuji
// =========================================================

export function parseEnv(teks) {

    const hasil = {};

    for (const baris of String(teks).split(/\r?\n/)) {

        const bersih = baris.trim();

        if (!bersih || bersih.startsWith("#")) continue;

        const pisah = bersih.indexOf("=");

        if (pisah < 0) continue;

        const kunci = bersih.slice(0, pisah).trim();
        let nilai = bersih.slice(pisah + 1).trim();

        // Buang kutip pembungkus kalau ada.
        if (
            (nilai.startsWith('"') && nilai.endsWith('"')) ||
            (nilai.startsWith("'") && nilai.endsWith("'"))
        ) {
            nilai = nilai.slice(1, -1);
        }

        hasil[kunci] = nilai;

    }

    return hasil;

}


// Tanggal kalender WIB (YYYY-MM-DD) dari Unix detik.
// Moodle mengirim duedate dalam UTC, jadi harus digeser.
export function tanggalWib(unixDetik) {

    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    return fmt.format(new Date(Number(unixDetik) * 1000));

}


export function hariIniWib(sekarangMs = Date.now()) {

    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    return fmt.format(new Date(sekarangMs));

}


// Ambil token 32 karakter dari nilai yang ditempel.
//
// Halaman Moodle menampilkan token di beberapa bentuk, dan yang
// tersalin kadang bukan hanya tokennya: bisa berupa URL lengkap
// (...?wstoken=xxxx), baris "token=xxxx", atau teks halaman.
// Daripada gagal karena itu, tokennya dipetik keluar.
//
// Mengembalikan null kalau tidak ada pola token di dalamnya.
export function petikToken(nilai) {

    const teks = String(nilai ?? "").trim();

    if (!teks) return null;

    // Bentuk yang benar: tepat 32 huruf/angka.
    if (/^[A-Za-z0-9]{32}$/.test(teks)) return teks;

    // Ditulis sebagai parameter: wstoken= / authtoken= / token=
    const berparameter = teks.match(
        /(?:wstoken|authtoken|token)=([A-Za-z0-9]{32})/i
    );

    if (berparameter) return berparameter[1];

    // 32 huruf/angka yang dibatasi pemisah (spasi, kutip, <, &, dll).
    //
    // Sengaja TIDAK memakai pencocokan bebas. Kalau nilainya berupa
    // gumpalan alfanumerik panjang tanpa pemisah, tidak ada cara tahu
    // 32 karakter mana yang dimaksud; memetik yang pertama hanya akan
    // menghasilkan sampah yang bentuknya mirip token lalu ditolak
    // Moodle dengan pesan yang menyesatkan. Lebih baik kembalikan
    // null supaya nilai aslinya dilaporkan apa adanya.
    const berbatas = teks.match(
        /(?:^|[^A-Za-z0-9])([A-Za-z0-9]{32})(?=[^A-Za-z0-9]|$)/
    );

    if (berbatas) return berbatas[1];

    return null;

}


// =========================================================
//  RINGKASAN SOAL & SUBMISSION
//
//  Disimpan di kolom tasks.lms_details (jsonb). Dipisah
//  sebagai fungsi murni supaya bisa diuji tanpa jaringan.
// =========================================================

// Ubah HTML dari LMS menjadi teks biasa.
//
// Tag SELALU dibuang, bukan disimpan: isi soal berasal dari
// situs luar, dan menaruhnya sebagai HTML di halaman ini
// membuka celah XSS. Teksnya tetap utuh.
export function bersihkanTeks(html) {

    if (!html) return "";

    return String(html)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, "&")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

}

// Bentuk akhir satu submission. Mengembalikan null bila tidak
// ada apa pun yang berguna untuk ditampilkan.
export function ringkasSubmission({ state, submittedAt, files }) {

    const daftar = [];

    for (const f of files || []) {

        if (!f || !f.name) continue;

        daftar.push({
            name: String(f.name),
            url: String(f.url || "")
        });

    }

    if (!state && daftar.length === 0) return null;

    return {
        state: String(state || ""),
        submitted_at: submittedAt || null,
        files: daftar
    };

}

// Moodle: mod_assign_get_submission_status.
// status: new | draft | submitted | reopened
export function ringkasSubmissionMoodle(status) {

    const sub = status?.lastattempt?.submission;

    if (!sub) return null;

    const files = [];

    for (const plugin of sub.plugins || []) {

        if (plugin.type !== "file") continue;

        for (const area of plugin.fileareas || []) {

            for (const f of area.files || []) {

                files.push({ name: f.filename, url: f.fileurl });

            }

        }

    }

    return ringkasSubmission({
        state: sub.status,
        submittedAt: sub.timemodified
            ? new Date(Number(sub.timemodified) * 1000).toISOString()
            : null,
        files
    });

}

// Classroom: studentSubmissions[0].
// state: CREATED (belum dikirim) | TURNED_IN | RETURNED
export function ringkasSubmissionClassroom(sub) {

    if (!sub) return null;

    const files = [];

    for (const lampiran of sub.assignmentSubmission?.attachments || []) {

        const f =
            lampiran.driveFile ||
            lampiran.link ||
            lampiran.youTubeVideo ||
            lampiran.form;

        if (!f) continue;

        files.push({
            name: f.title || "Lampiran",
            url: f.alternateLink || ""
        });

    }

    return ringkasSubmission({
        state: sub.state,
        submittedAt: sub.updateTime,
        files
    });

}


// Susun baris siap kirim ke sync_lms_tasks().
//
// Aturannya sengaja sama dengan versi browser:
//   - tugas tanpa deadline dilewati (duedate 0)
//   - tugas yang deadline-nya sudah lewat dilewati, supaya
//     tidak muncul lagi setiap kali sync berjalan
//   - mata kuliah yang tidak ikut dipilih dilewati
export function susunBaris({
    courses,
    namaMatkul,
    idTerpilih,
    hariIni,
    urlMoodle
}) {

    const baris = [];
    let tanpaDeadline = 0;
    let kedaluwarsa = 0;

    for (const course of courses || []) {

        const idCourse = String(course.id);

        if (idTerpilih && !idTerpilih.has(idCourse)) continue;

        for (const tugas of course.assignments || []) {

            const duedate = Number(tugas.duedate) || 0;

            if (duedate <= 0) {
                tanpaDeadline += 1;
                continue;
            }

            const tanggal = tanggalWib(duedate);

            // Deadline hari ini masih dianggap aktif.
            if (tanggal < hariIni) {
                kedaluwarsa += 1;
                continue;
            }

            baris.push({
                course: String(tugas.name || "-"),
                class_name: namaMatkul[idCourse] || "-",
                deadline: tanggal,
                category: "Moodle",
                source: "moodle",
                external_id: `assign:${idCourse}:${tugas.id}`,
                synced_at: new Date().toISOString(),
                lms_details: {
                    description: bersihkanTeks(tugas.intro),
                    link: tugas.cmid && urlMoodle
                        ? `${urlMoodle}/mod/assign/view.php?id=${tugas.cmid}`
                        : "",
                    // Diisi belakangan oleh syncMoodle, karena
                    // butuh satu panggilan API per tugas.
                    submission: null
                }
            });

        }

    }

    return { baris, tanpaDeadline, kedaluwarsa };

}


// Tentukan baris Moodle yang sudah tidak relevan.
//
// Dua alasan sebuah baris dianggap usang:
//   1. deadline-nya sudah lewat
//   2. mata kuliahnya tidak lagi ikut disinkronkan (hanya
//      kalau daftar mata kuliah dibatasi lewat MOODLE_COURSE_IDS
//      atau filter dari halaman web)
//
// Baris dari sumber lain (classroom) tidak pernah disentuh.
export function cariUsang({ existing, idTerpilih, idKecuali, hariIni }) {

    const usang = [];

    for (const row of existing || []) {

        const bagian = String(row.external_id || "").split(":");

        if (bagian[0] !== "assign") continue;

        const idCourse = bagian[1];

        if (idTerpilih && !idTerpilih.has(String(idCourse))) {

            usang.push(row);
            continue;

        }

        // Mata kuliah yang dikecualikan juga dibersihkan,
        // supaya tugasnya tidak tertinggal di daftar.
        if (idKecuali && idKecuali.has(String(idCourse))) {

            usang.push(row);
            continue;

        }

        const tanggal = String(row.deadline || "").slice(0, 10);

        if (tanggal !== "" && tanggal < hariIni) {

            usang.push(row);

        }

    }

    return usang;

}


// =========================================================
//  BAGIAN MURNI: GOOGLE CLASSROOM
// =========================================================

// Classroom mengirim deadline sebagai pasangan dueDate +
// dueTime yang KEDUANYA dalam UTC (bukan waktu lokal):
//
//     { "dueDate": { "year": 2026, "month": 11, "day": 17 },
//       "dueTime": { "hours": 16, "minutes": 59 } }
//
// Artinya 2026-11-17 16:59 UTC = 2026-11-17 23:59 WIB, tapi
// kalau jamnya 17:30 UTC hasilnya sudah 2026-11-18 WIB. Karena
// kolom tasks.deadline hanya menyimpan tanggal, penggeseran ini
// menentukan tugas masuk di hari yang benar atau tidak.
//
// Kalau dueTime tidak ada, tanggalnya dipakai apa adanya —
// tidak ada jam yang bisa digeser.
export function tanggalWibDariUtc(dueDate, dueTime) {

    if (!dueDate || !dueDate.year) return "";

    const pad = (n) => String(n).padStart(2, "0");

    const tanggal =
        dueDate.year + "-" + pad(dueDate.month) + "-" + pad(dueDate.day);

    if (!dueTime || dueTime.hours == null) return tanggal;

    const unixMs = Date.UTC(
        dueDate.year,
        dueDate.month - 1,
        dueDate.day,
        Number(dueTime.hours) || 0,
        Number(dueTime.minutes) || 0,
        Number(dueTime.seconds) || 0
    );

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date(unixMs));

}


// Susun baris Classroom siap kirim ke sync_lms_tasks().
//
// Aturannya sama dengan versi Moodle: lewati yang tanpa
// deadline dan yang sudah lewat. Bedanya, di sini tidak ada
// pemilih kelas — semua kelas yang diikuti ikut, karena
// daftar kelas tidak disimpan di server.
export function susunBarisClassroom({ courses, coursework, hariIni }) {

    const baris = [];
    let tanpaDeadline = 0;
    let kedaluwarsa = 0;
    let draf = 0;

    // Nama kelas dicari lewat id, karena courseWork tidak
    // membawa nama kelasnya sendiri.
    const namaKelas = {};

    for (const course of courses || []) {
        namaKelas[String(course.id)] =
            course.name || course.section || `Kelas ${course.id}`;
    }

    for (const kerja of coursework || []) {

        // Siswa hanya melihat yang PUBLISHED, tapi kalau
        // suatu saat akun ini jadi guru, draf akan ikut
        // terbawa. Draf belum tentu jadi tugas.
        if (kerja.state && kerja.state !== "PUBLISHED") {
            draf += 1;
            continue;
        }

        const tanggal = tanggalWibDariUtc(kerja.dueDate, kerja.dueTime);

        if (!tanggal) {
            tanpaDeadline += 1;
            continue;
        }

        if (tanggal < hariIni) {
            kedaluwarsa += 1;
            continue;
        }

        baris.push({
            course: String(kerja.title || "-"),
            class_name: namaKelas[String(kerja.courseId)] || "-",
            deadline: tanggal,
            category: "Classroom",
            source: "classroom",
            // Bentuknya sama dengan yang dipakai frontend di
            // script.js, supaya sync browser dan sync server
            // tidak membuat baris kembar.
            external_id: `gc:${kerja.courseId}:${kerja.id}`,
            synced_at: new Date().toISOString(),
            lms_details: {
                description: bersihkanTeks(kerja.description),
                link: String(kerja.alternateLink || ""),
                // Diisi belakangan oleh syncClassroom.
                submission: null
            }
        });

    }

    return { baris, tanpaDeadline, kedaluwarsa, draf };

}


// Baris Classroom yang sudah tidak relevan: deadline lewat,
// atau kelasnya tidak muncul lagi di daftar kelas akun ini
// (mis. kelas diarsipkan / akses dicabut).
export function cariUsangClassroom({ existing, idKelasDikenal, hariIni }) {

    const usang = [];

    for (const row of existing || []) {

        const bagian = String(row.external_id || "").split(":");

        if (bagian[0] !== "gc") continue;

        if (idKelasDikenal && !idKelasDikenal.has(String(bagian[1]))) {
            usang.push(row);
            continue;
        }

        const tanggal = String(row.deadline || "").slice(0, 10);

        if (tanggal !== "" && tanggal < hariIni) {
            usang.push(row);
        }

    }

    return usang;

}


// =========================================================
//  BAGIAN JARINGAN
// =========================================================

function rapikanUrl(url) {

    return String(url || "").trim().replace(/\/+$/, "");

}


export async function ambilJson(url, opsi = {}, percobaan = 2) {

    let terakhir = null;

    for (let i = 1; i <= percobaan; i++) {

        try {

            const res = await fetch(url, {
                ...opsi,
                signal: AbortSignal.timeout(30000)
            });

            const teks = await res.text();

            let data = null;

            // Body kosong BUKAN kesalahan. Supabase membalas
            // 200/201 tanpa isi ketika diminta `Prefer:
            // return=minimal` (dipakai simpanDaftarKelas /
            // simpanDaftarMatkul). Dulu JSON.parse("") melempar
            // di sini, sehingga log menulis "gagal disimpan"
            // padahal datanya sudah masuk — dan permintaan
            // dikirim ulang sia-sia.
            if (teks.trim() === "") {

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} tanpa isi`);
                }

                return null;

            }

            try {
                data = JSON.parse(teks);
            }
            catch {
                // Bukan JSON: biasanya halaman error HTML dari
                // portal kampus (login, blokir, maintenance).
                throw new Error(
                    `Balasan bukan JSON (HTTP ${res.status}): ` +
                    teks.replace(/\s+/g, " ").slice(0, 160)
                );
            }

            if (!res.ok) {

                throw new Error(
                    `HTTP ${res.status}: ` +
                    JSON.stringify(data).slice(0, 200)
                );

            }

            return data;

        }
        catch (error) {

            terakhir = error;

            if (i < percobaan) {

                await new Promise((r) => setTimeout(r, 3000 * i));

            }

        }

    }

    throw terakhir;

}


async function moodleRest({ url, token }, params) {

    const body = new URLSearchParams({
        wstoken: token,
        moodlewsrestformat: "json",
        ...params
    });

    const data = await ambilJson(
        rapikanUrl(url) + "/webservice/rest/server.php",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
        }
    );

    if (data && data.errorcode) {

        // Pesan khusus untuk kesalahan yang paling sering terjadi,
        // supaya tidak perlu menebak dari "Invalid token".
        if (data.errorcode === "invalidtoken") {

            throw new Error(
                "Moodle menolak token (invalidtoken). Penyebab tersering:\n" +
                "  1. Token milik situs/akun lain — pastikan diambil dari " +
                "kuliah2.itera.ac.id saat login sebagai akun yang benar.\n" +
                "  2. Token sudah dihapus/di-reset di halaman Security keys.\n" +
                "  3. Yang disalin bukan token service 'moodle_mobile_app'.\n" +
                "  Ambil ulang di: https://kuliah2.itera.ac.id/user/managetoken.php\n" +
                "  lalu perbarui secret MOODLE_TOKEN di GitHub."
            );

        }

        throw new Error(
            `Moodle menolak permintaan (${data.errorcode}): ` +
            `${data.message || "-"}`
        );

    }

    return data;

}


async function supabaseRpc({ url, key }, rows) {

    return ambilJson(
        rapikanUrl(url) + "/rest/v1/rpc/sync_lms_tasks",
        {
            method: "POST",
            headers: {
                apikey: key,
                Authorization: "Bearer " + key,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ rows })
        }
    );

}


async function supabaseGet({ url, key }, query) {

    return ambilJson(
        rapikanUrl(url) + "/rest/v1/tasks?" + query,
        {
            headers: {
                apikey: key,
                Authorization: "Bearer " + key
            }
        }
    );

}


// Simpan daftar mata kuliah Moodle yang terlihat server ke
// database, supaya panel filter di halaman web bisa
// menampilkannya tanpa token di browser.
async function simpanDaftarMatkul({ url, key }, courses) {

    if (!courses?.length) {
        return;
    }

    const baris = courses.map((c) => ({
        course_id: String(c.id),
        name: String(c.fullname || c.shortname || `Course ${c.id}`),
        seen_at: new Date().toISOString()
    }));

    try {

        await ambilJson(
            rapikanUrl(url) + "/rest/v1/moodle_courses?on_conflict=course_id",
            {
                method: "POST",
                headers: {
                    apikey: key,
                    Authorization: "Bearer " + key,
                    "Content-Type": "application/json",
                    Prefer: "resolution=merge-duplicates,return=minimal"
                },
                body: JSON.stringify(baris)
            }
        );

        console.log(`Daftar   : ${baris.length} mata kuliah disimpan untuk halaman web`);

    }
    catch (error) {

        console.log(
            "Daftar   : gagal disimpan (" + error.message.slice(0, 120) + ")"
        );

    }

}


// Simpan daftar kelas yang terlihat server ke database.
//
// Halaman web memakai ini untuk menampilkan pilihan filter,
// supaya user tidak perlu menghubungkan akun Google dulu hanya
// untuk melihat daftar kelas. Token OAuth di browser hanya
// berlaku ~1 jam; daftar kelas tidak boleh bergantung padanya.
async function simpanDaftarKelas({ url, key }, courses) {

    if (!courses?.length) {
        return;
    }

    const baris = courses.map((c) => ({
        course_id: String(c.id),
        name: String(c.name || ""),
        section: String(c.section || ""),
        course_state: String(c.courseState || ""),
        seen_at: new Date().toISOString()
    }));

    try {

        await ambilJson(
            rapikanUrl(url) + "/rest/v1/classroom_courses?on_conflict=course_id",
            {
                method: "POST",
                headers: {
                    apikey: key,
                    Authorization: "Bearer " + key,
                    "Content-Type": "application/json",
                    // Gabungkan bila sudah ada, jangan gagal.
                    Prefer: "resolution=merge-duplicates,return=minimal"
                },
                body: JSON.stringify(baris)
            }
        );

        console.log(`Daftar   : ${baris.length} kelas disimpan untuk halaman web`);

    }
    catch (error) {

        // Jangan gagalkan sync hanya karena daftar kelas gagal
        // disimpan; tugas tetap yang utama.
        console.log(
            "Daftar   : gagal disimpan (" + error.message.slice(0, 120) + ")"
        );

    }

}


// Baca pengaturan filter yang diubah dari halaman web.
//
// Tabel ini bukan rahasia — isinya cuma daftar kelas yang
// tidak diinginkan. Nilai dari GitHub Secrets (kalau ada)
// tetap diutamakan, supaya pengaturan bisa dikunci dari sisi
// server kalau perlu.
async function ambilPengaturanSync({ url, key }) {

    try {

        const data = await ambilJson(
            rapikanUrl(url) + "/rest/v1/sync_settings?select=classroom_exclude,classroom_only,moodle_only,moodle_exclude,updated_at&id=eq.1",
            {
                headers: {
                    apikey: key,
                    Authorization: "Bearer " + key
                }
            }
        );

        return Array.isArray(data) && data.length ? data[0] : null;

    }
    catch (error) {

        // Tabel belum ada (migrasi belum dijalankan) atau
        // jaringan bermasalah. Jangan gagalkan sync hanya
        // karena pengaturan opsional tidak terbaca.
        console.log(
            "Pengaturan: tidak terbaca (" + error.message.slice(0, 120) + ")"
        );

        return null;

    }

}


async function supabaseDelete({ url, key }, idList) {
    const daftar = idList.map((id) => `"${id}"`).join(",");

    const res = await fetch(
        rapikanUrl(url) +
        "/rest/v1/tasks?id=in.(" + encodeURIComponent(daftar) + ")",
        {
            method: "DELETE",
            headers: {
                apikey: key,
                Authorization: "Bearer " + key,
                Prefer: "return=representation"
            },
            signal: AbortSignal.timeout(30000)
        }
    );

    const teks = await res.text();

    if (!res.ok) {

        throw new Error(
            `Gagal menghapus baris usang (HTTP ${res.status}): ` +
            teks.slice(0, 200)
        );

    }

    try {
        return JSON.parse(teks).length;
    }
    catch {
        return idList.length;
    }

}


// =========================================================
//  ALUR UTAMA
// =========================================================

// Tukar refresh token menjadi access token baru.
//
// Ini inti dari otomatisasi Classroom: access token hanya
// berlaku ~1 jam, tapi refresh token bisa ditukar ulang
// kapan saja tanpa campur tangan manusia — SELAMA project
// Google-nya berstatus "In production". Selama masih
// "Testing", Google mematikan refresh token setelah 7 hari
// dan tidak ada cara memperpanjangnya dari sisi skrip.
async function classroomAccessToken({ clientId, clientSecret, refreshToken }) {

    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(30000)
    });

    const teks = await res.text();

    let data = null;

    try { data = JSON.parse(teks); }
    catch { throw new Error("Balasan token Google bukan JSON: " + teks.slice(0, 160)); }

    if (!res.ok || !data.access_token) {

        const kode = data.error || `HTTP ${res.status}`;

        // Pesan yang menunjuk penyebab, bukan sekadar
        // "invalid_grant" yang tidak menjelaskan apa pun.
        if (kode === "invalid_grant") {

            throw new Error(
                "Google menolak refresh token (invalid_grant). Penyebab tersering:\n" +
                "  1. Project Google masih berstatus 'Testing'. Google mematikan\n" +
                "     refresh token setelah 7 hari. Buka Google Auth Platform ->\n" +
                "     Audience -> Publish app, lalu jalankan `npm run classroom:auth` lagi.\n" +
                "  2. Akses aplikasi dicabut di https://myaccount.google.com/permissions\n" +
                "  3. Refresh token berasal dari client ID yang berbeda."
            );

        }

        if (kode === "invalid_client") {

            throw new Error(
                "Google menolak client ID/secret (invalid_client). Pastikan\n" +
                "CLASSROOM_SYNC_CLIENT_ID dan CLASSROOM_SYNC_CLIENT_SECRET\n" +
                "berasal dari OAuth client yang sama (tipe Desktop app)."
            );

        }

        throw new Error(
            `Gagal menukar refresh token (${kode}): ` +
            `${data.error_description || "-"}`
        );

    }

    return data.access_token;

}


async function classroomGet(accessToken, jalur) {

    const res = await fetch(
        "https://classroom.googleapis.com" + jalur,
        {
            headers: { Authorization: "Bearer " + accessToken },
            signal: AbortSignal.timeout(30000)
        }
    );

    const teks = await res.text();

    let data = null;

    try { data = JSON.parse(teks); }
    catch {
        throw new Error(
            `Balasan Classroom bukan JSON (HTTP ${res.status}): ` +
            teks.replace(/\s+/g, " ").slice(0, 160)
        );
    }

    if (!res.ok) {

        const pesan = data?.error?.message || `HTTP ${res.status}`;

        // Kesalahan yang paling mungkin terjadi di sini adalah
        // API belum diaktifkan di project, atau scope kurang.
        throw new Error(
            `Classroom menolak permintaan (${jalur.split("?")[0]}): ${pesan}`
        );

    }

    return data;

}


// Ambil SEMUA halaman hasil list. Tanpa ini, akun dengan
// banyak kelas/tugas akan kehilangan data diam-diam karena
// Classroom membatasi jumlah per halaman.
async function classroomGetAll(accessToken, jalur, kunci) {

    const hasil = [];
    let pageToken = "";

    for (let halaman = 0; halaman < 50; halaman++) {

        const pemisah = jalur.includes("?") ? "&" : "?";
        const url =
            jalur + pemisah +
            (pageToken ? "pageToken=" + encodeURIComponent(pageToken) : "pageSize=100");

        const data = await classroomGet(accessToken, url);

        for (const item of data[kunci] || []) hasil.push(item);

        pageToken = data.nextPageToken || "";

        if (!pageToken) break;

    }

    return hasil;

}


// Daftar kelas yang diikuti (siswa maupun guru), yang tidak
// diarsipkan. courseState ARCHIVED sengaja dibuang karena
// kelas arsip tidak lagi punya tugas berjalan.
async function ambilKelasClassroom(accessToken) {

    const semua = await classroomGetAll(
        accessToken,
        "/v1/courses?studentId=me&courseStates=ACTIVE&courseStates=PROVISIONED",
        "courses"
    );

    return semua.filter(
        (c) => !c.courseState || c.courseState === "ACTIVE" || c.courseState === "PROVISIONED"
    );

}

async function main() {

    const dryRun = process.argv.includes("--dry-run");

    // .env hanya dipakai saat dijalankan lokal. Di GitHub
    // Actions nilainya datang dari Secrets, dan file .env
    // tidak ada di runner.
    let env = { ...process.env };

    const envPath = path.join(ROOT, ".env");

    if (fs.existsSync(envPath)) {

        env = { ...parseEnv(fs.readFileSync(envPath, "utf8")), ...env };

    }

    const tokenMentah = String(env.MOODLE_TOKEN || "").trim();
    const tokenBersih = petikToken(tokenMentah);

    const moodle = {
        url: rapikanUrl(env.MOODLE_URL || "https://kuliah2.itera.ac.id"),
        // Kalau yang ditempel bukan token murni (mis. URL yang
        // memuat wstoken=...), tokennya dipetik keluar. Kalau
        // tidak ada pola token sama sekali, nilai aslinya dipakai
        // supaya pesan galatnya tetap masuk akal.
        token: tokenBersih || tokenMentah
    };

    // Kredensial Classroom untuk SERVER memakai nama sendiri
    // (CLASSROOM_SYNC_*), bukan CLASSROOM_CLIENT_ID.
    //
    // Alasannya konkret dan sudah diuji ke server Google:
    // CLASSROOM_CLIENT_ID dipakai situs untuk implicit flow
    // dengan redirect https, dan client bertipe "Web
    // application" MENOLAK redirect http://127.0.0.1
    // (redirect_uri_mismatch). Sync otomatis butuh client
    // bertipe "Desktop app" yang berbeda. Kalau keduanya
    // memakai nama variabel yang sama, salah satunya pasti
    // tertimpa dan rusak diam-diam.
    //
    // Nama lama tetap dibaca sebagai cadangan supaya
    // konfigurasi yang sudah ada tidak langsung mati.
    const ambilEnv = (...nama) => {
        for (const n of nama) {
            const v = String(env[n] || "").trim();
            if (v) return v;
        }
        return "";
    };

    const classroom = {
        clientId: ambilEnv("CLASSROOM_SYNC_CLIENT_ID", "CLASSROOM_CLIENT_ID"),
        clientSecret: ambilEnv("CLASSROOM_SYNC_CLIENT_SECRET", "CLASSROOM_CLIENT_SECRET"),
        refreshToken: ambilEnv("CLASSROOM_SYNC_REFRESH_TOKEN", "CLASSROOM_REFRESH_TOKEN")
    };

    const supabase = {
        url: String(env.SUPABASE_URL || "").trim(),
        key: String(env.SUPABASE_KEY || "").trim()
    };

    if (!supabase.url || !supabase.key) {
        throw new Error("SUPABASE_URL / SUPABASE_KEY kosong.");
    }

    const batasi = String(env.MOODLE_COURSE_IDS || "").trim();

    // Filter Moodle: GitHub Secrets menang bila diisi, kalau
    // tidak pakai pengaturan dari halaman web.
    const pengaturanAwal = await ambilPengaturanSync(supabase);

    const mentahMoodleHanya = String(
        batasi || pengaturanAwal?.moodle_only || ""
    ).trim();

    const mentahMoodleKecuali = String(
        env.MOODLE_EXCLUDE_COURSES || pengaturanAwal?.moodle_exclude || ""
    ).trim();

    const idTerpilih = mentahMoodleHanya
        ? new Set(mentahMoodleHanya.split(",").map((s) => s.trim()).filter(Boolean))
        : null;

    const idMoodleKecuali = new Set(
        mentahMoodleKecuali.split(",").map((s) => s.trim()).filter(Boolean)
    );

    console.log(
        `Filter   : moodle hanya="${mentahMoodleHanya || "(kosong)"}" ` +
        `kecuali="${mentahMoodleKecuali || "(kosong)"}"`
    );

    const hariIni = hariIniWib();

    // Classroom dianggap aktif hanya kalau KETIGA nilainya ada.
    // Kalau baru sebagian terisi, itu hampir pasti salah tempel,
    // jadi lebih baik diberitahu daripada dilewati diam-diam.
    const classroomLengkap = Boolean(
        classroom.clientId && classroom.clientSecret && classroom.refreshToken
    );

    const classroomSebagian = !classroomLengkap && Boolean(
        classroom.clientId || classroom.clientSecret || classroom.refreshToken
    );

    if (!moodle.token && !classroomLengkap) {
        throw new Error(
            "Tidak ada sumber yang bisa disinkronkan.\n" +
            "  Moodle    : isi MOODLE_TOKEN.\n" +
            "  Classroom : isi CLASSROOM_SYNC_CLIENT_ID,\n" +
            "              CLASSROOM_SYNC_CLIENT_SECRET, dan\n" +
            "              CLASSROOM_SYNC_REFRESH_TOKEN (lihat `npm run classroom:auth`)."
        );
    }

    console.log(`Supabase : ${supabase.url}`);
    console.log(`Tanggal  : ${hariIni} (${ZONA})`);
    console.log(`Mode     : ${dryRun ? "DRY-RUN (tidak menulis)" : "TULIS"}`);

    const gagal = [];

    // -----------------------------------------------------
    //  MOODLE
    // -----------------------------------------------------

    if (!moodle.token) {

        console.log("\n--- Moodle ---");
        console.log("Dilewati: MOODLE_TOKEN kosong.");

    }
    else {

        try {

            await syncMoodle({
                moodle,
                supabase,
                idTerpilih,
                idMoodleKecuali,
                hariIni,
                dryRun,
                tokenMentah,
                tokenBersih
            });

        }
        catch (error) {

            gagal.push(["Moodle", error]);

        }

    }

    // -----------------------------------------------------
    //  CLASSROOM
    // -----------------------------------------------------

    if (classroomSebagian) {

        console.log("\n--- Classroom ---");
        console.log(
            "Dilewati: kredensial Classroom baru terisi sebagian. " +
            "Isi ketiganya (client ID, client secret, refresh token)."
        );

    }
    else if (!classroomLengkap) {

        console.log("\n--- Classroom ---");
        console.log(
            "Dilewati: belum dikonfigurasi. " +
            "Jalankan `npm run classroom:auth` untuk mengaktifkan."
        );

    }
    else {

        try {

            await syncClassroom({ classroom, supabase, hariIni, dryRun, env });

        }
        catch (error) {

            gagal.push(["Classroom", error]);

        }

    }

    // -----------------------------------------------------
    //  HASIL AKHIR
    // -----------------------------------------------------

    // Satu sumber gagal tidak boleh membuat sumber lain ikut
    // batal — Moodle yang sudah tertulis tetap tersimpan. Tapi
    // run tetap harus berakhir GAGAL supaya masalahnya terlihat
    // di GitHub Actions, bukan lewat diam-diam.
    if (gagal.length) {

        console.log("");

        for (const [nama, error] of gagal) {
            console.error(`${nama} GAGAL: ${error.message || error}`);
        }

        const ringkas = gagal.map(([nama]) => nama).join(", ");

        throw new Error(
            `Sumber berikut gagal disinkronkan: ${ringkas}. ` +
            "Sumber lain tetap diproses seperti terlihat di atas."
        );

    }

    console.log("\nSelesai.");

}


// =========================================================
//  MOODLE
// =========================================================

async function syncMoodle({
    moodle,
    supabase,
    idTerpilih,
    idMoodleKecuali,
    hariIni,
    dryRun,
    tokenMentah,
    tokenBersih
}) {

    console.log("\n--- Moodle ---");
    console.log(`Moodle   : ${moodle.url}`);

    // Token TIDAK dicetak. Yang dilaporkan hanya bentuknya, supaya
    // kesalahan salin-tempel bisa dikenali tanpa membocorkan nilainya.
    //
    //   panjang 32 + hanya huruf/angka -> bentuk token Moodle normal
    //   ada spasi / baris baru         -> ikut tersalin dari halaman
    //   ada tanda kutip                -> ikut tersalin pembungkusnya
    //   diawali "Bearer "              -> yang disalin token akses, bukan wstoken
    const ciri = (nilai) => {

        const t = String(nilai);

        if (/^https?:\/\//i.test(t)) return "URL, bukan token";
        if (/^ey[A-Za-z0-9_-]+\./.test(t)) return "JWT (token akses OAuth), bukan wstoken";
        if (/^(gh[pousr]_|github_pat_)/.test(t)) return "token GitHub, bukan token Moodle";
        if (/^sb_(publishable|secret)_/.test(t)) return "kunci Supabase, bukan token Moodle";
        if (/^bearer\s/i.test(t)) return "token akses 'Bearer ...', bukan wstoken";
        if (/^[A-Za-z0-9]{32}$/.test(t)) return "bentuk token Moodle normal (32 karakter)";
        if (/^[A-Za-z0-9]+$/.test(t)) {
            return `hanya huruf/angka tapi ${t.length} karakter ` +
                "(token Moodle seharusnya 32)";
        }

        return "ada karakter tak biasa (spasi, tanda kutip, atau simbol)";

    };

    console.log(
        `Token    : ${moodle.token.length} karakter — ` + ciri(moodle.token)
    );

    // Kalau nilai asli lebih panjang dari token yang dipakai,
    // berarti tokennya berhasil dipetik dari teks/URL. Ini
    // dilaporkan supaya tidak terlihat seperti nilai ajaib.
    if (tokenBersih && tokenBersih !== tokenMentah) {

        console.log(
            `           Dipetik dari nilai ${tokenMentah.length} karakter ` +
            "(isi tempelan bukan token murni, tapi tokennya ada di dalamnya)."
        );

    }

    if (moodle.token.length !== 32) {

        console.log(
            "           Token Moodle (wstoken) selalu 32 karakter huruf/angka. " +
            "Kalau bukan 32, hampir pasti yang tersimpan bukan tokennya."
        );

    }


    // 1. Validasi token + id user
    const siteInfo = await moodleRest(moodle, {
        wsfunction: "core_webservice_get_site_info"
    });

    console.log(`Login    : ${siteInfo.username || "?"} (userid ${siteInfo.userid})`);

    // 2. Mata kuliah yang diikuti
    const courses = await moodleRest(moodle, {
        wsfunction: "core_enrol_get_users_courses",
        userid: siteInfo.userid
    });

    if (!Array.isArray(courses) || courses.length === 0) {
        throw new Error("Tidak ada mata kuliah pada akun Moodle ini.");
    }

    const namaMatkul = {};

    for (const course of courses) {
        namaMatkul[String(course.id)] =
            course.fullname || course.shortname || `Course ${course.id}`;
    }

    // Daftar mata kuliah disimpan supaya panel filter di
    // halaman web bisa menampilkannya tanpa token Moodle.
    await simpanDaftarMatkul(supabase, courses);

    const dipakai = courses
        .filter((c) => !idTerpilih || idTerpilih.has(String(c.id)))
        .filter((c) => !idMoodleKecuali.has(String(c.id)));

    console.log(`Matkul   : ${dipakai.length} dari ${courses.length} diikuti`);

    if (idMoodleKecuali.size && dipakai.length !== courses.length) {
        const dibuang = courses.filter((c) => idMoodleKecuali.has(String(c.id)));
        for (const c of dibuang) {
            console.log(`           - dilewati: ${c.fullname || c.id} (id ${c.id})`);
        }
    }

    if (dipakai.length === 0) {
        throw new Error(
            "Semua mata kuliah Moodle tersaring. Periksa filter " +
            "MOODLE_COURSE_IDS / MOODLE_EXCLUDE_COURSES, atau centang " +
            "minimal satu mata kuliah di halaman Sync."
        );
    }

    // 3. Assignment, dibagi 20 mata kuliah per permintaan
    const coursesWithAssignments = [];

    for (let i = 0; i < dipakai.length; i += 20) {

        const kelompok = dipakai.slice(i, i + 20);

        const params = { wsfunction: "mod_assign_get_assignments" };

        kelompok.forEach((course, index) => {
            params[`courseids[${index}]`] = course.id;
        });

        const hasil = await moodleRest(moodle, params);

        for (const course of hasil.courses || []) {
            coursesWithAssignments.push(course);
        }

    }

    // 4. Saring + bentuk baris
    const { baris, tanpaDeadline, kedaluwarsa } = susunBaris({
        courses: coursesWithAssignments,
        namaMatkul,
        idTerpilih,
        hariIni,
        urlMoodle: moodle.url
    });

    console.log(
        `Tugas    : ${baris.length} aktif ` +
        `(dilewati: ${tanpaDeadline} tanpa deadline, ` +
        `${kedaluwarsa} sudah lewat)`
    );

    if (dryRun) {

        console.log("\nContoh baris:");
        console.log(JSON.stringify(baris.slice(0, 3), null, 1));

        const existing = await supabaseGet(
            supabase,
            "select=id,external_id,deadline&source=eq.moodle"
        );

        const usang = cariUsang({ existing, idTerpilih, idKecuali: idMoodleKecuali, hariIni });

        console.log(
            `\nAkan menghapus ${usang.length} baris usang dari ` +
            `${existing.length} baris Moodle yang ada.`
        );

        if (usang.length) {
            console.log(JSON.stringify(usang.slice(0, 3), null, 1));
        }

        return;

    }

    // 4b. Isi soal sudah ikut di baris. Submission butuh satu
    // panggilan API per tugas, jadi hanya untuk tugas aktif.
    // Kegagalan satu tugas tidak boleh menggagalkan sync.
    for (const row of baris) {

        const assignId = row.external_id.split(":")[2];

        try {

            const status = await moodleRest(moodle, {
                wsfunction: "mod_assign_get_submission_status",
                assignid: assignId
            });

            row.lms_details.submission =
                ringkasSubmissionMoodle(status);

        } catch (error) {

            console.log(
                `           ! submission ${assignId}: ${error.message}`
            );

        }

    }

    // 5. Tulis (satu permintaan untuk semua tugas)
    if (baris.length === 0) {

        console.log("Tidak ada tugas aktif untuk ditulis.");

    }
    else {

        const [hasil] = await supabaseRpc(supabase, baris);

        console.log(
            `Tersimpan: ${hasil?.created ?? 0} baru, ` +
            `${hasil?.updated ?? 0} diperbarui`
        );

    }

    // 6. Bersihkan baris usang
    const existing = await supabaseGet(
        supabase,
        "select=id,external_id,deadline&source=eq.moodle"
    );

    const usang = cariUsang({ existing, idTerpilih, idKecuali: idMoodleKecuali, hariIni });

    if (usang.length) {

        const jumlah = await supabaseDelete(
            supabase,
            usang.map((row) => row.id)
        );

        console.log(`Dihapus : ${jumlah} baris usang`);

    }
    else {

        console.log("Dihapus : 0 baris usang");

    }

}


// =========================================================
//  GOOGLE CLASSROOM
// =========================================================

// Saring daftar kelas Classroom sesuai pengaturan.
//
// Dipisah sebagai fungsi murni supaya bisa diuji tanpa
// jaringan: kesalahan di sini tidak memunculkan error, hanya
// membuat tugas dari kelas yang salah ikut masuk — jenis
// kesalahan yang paling sulit disadari.
//
// Pencocokan dilakukan case-insensitive, dan bisa berupa:
//   - id angka      ("843941141691")
//   - potongan nama ("PBO RA 2026")
export function saringKelasClassroom({ courses, hanyaIds, kecuali }) {

    const daftarId = new Set(
        (hanyaIds || []).map((s) => String(s).trim()).filter(Boolean)
    );

    const daftarKecuali = (kecuali || [])
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean);

    const cocokKecuali = (c) => {
        const id = String(c.id);
        const nama = String(c.name || "").toLowerCase();
        const bagian = String(c.section || "").toLowerCase();
        return daftarKecuali.some(
            (p) => p === id || nama.includes(p) || bagian.includes(p)
        );
    };

    let dipakai = courses || [];

    if (daftarId.size) {
        dipakai = dipakai.filter((c) => daftarId.has(String(c.id)));
    }

    if (daftarKecuali.length) {
        dipakai = dipakai.filter((c) => !cocokKecuali(c));
    }

    const dibuang = (courses || []).filter((c) => !dipakai.includes(c));

    return { dipakai, dibuang };

}


async function syncClassroom({ classroom, supabase, hariIni, dryRun, env }) {

    console.log("Classroom: googleapis.com (OAuth refresh token)");

    // 1. Tukar refresh token -> access token.
    //    Nilai token tidak pernah dicetak, hanya panjangnya.
    const accessToken = await classroomAccessToken(classroom);

    console.log(`Token    : diperbarui (${accessToken.length} karakter, berlaku ~1 jam)`);

    // 2. Kelas yang diikuti
    const semuaKelas = await ambilKelasClassroom(accessToken);

    if (semuaKelas.length === 0) {
        throw new Error(
            "Tidak ada kelas Classroom aktif pada akun ini. " +
            "Kalau kelasnya diarsipkan, sync memang tidak mengambilnya."
        );
    }

    // Daftar kelas disimpan supaya panel filter di halaman web
    // bisa menampilkannya tanpa perlu token OAuth di browser.
    // Tanpa ini, user harus "hubungkan manual" dulu setiap kali
    // token browser kedaluwarsa hanya untuk melihat daftar.
    await simpanDaftarKelas(supabase, semuaKelas);

    // Filter kelas opsional.
    //
    // Kelas lama yang masih ACTIVE di Google (mis. dari semester
    // lalu) tetap ikut terbawa kalau tidak dibatasi. Sync manual
    // di halaman web punya pemilih matkul, jadi perilakunya
    // terasa berbeda.
    //
    // Urutan prioritas:
    //   1. GitHub Secrets (kalau diisi) — mengunci pengaturan
    //      dari sisi server, tidak bisa diubah dari web.
    //   2. Tabel sync_settings — diubah lewat halaman web.
    const pengaturan = await ambilPengaturanSync(supabase);

    const mentahKecuali = String(
        env.CLASSROOM_EXCLUDE_COURSES ||
        pengaturan?.classroom_exclude ||
        ""
    ).trim();

    const mentahHanya = String(
        env.CLASSROOM_COURSE_IDS ||
        pengaturan?.classroom_only ||
        ""
    ).trim();

    // Dicetak apa adanya (bukan rahasia), supaya kalau nilainya
    // tidak sampai ke runner — mis. lupa menaruh di blok env
    // workflow — kelihatan di log, bukan diam-diam diabaikan.
    console.log(
        `Filter   : kecuali="${mentahKecuali || "(kosong)"}" ` +
        `hanya="${mentahHanya || "(kosong)"}"` +
        (pengaturan ? ` (dari web, diubah ${pengaturan.updated_at || "?"})` : "")
    );

    const { dipakai: courses, dibuang } = saringKelasClassroom({
        courses: semuaKelas,
        hanyaIds: mentahHanya.split(",").map((s) => s.trim()).filter(Boolean),
        kecuali: mentahKecuali.split(",").map((s) => s.trim()).filter(Boolean)
    });

    if (dibuang.length) {

        console.log(
            `Kelas    : ${courses.length} dipakai, ${dibuang.length} disaring keluar`
        );

        for (const c of dibuang) {
            console.log(`           - dilewati: ${c.name || c.id} (id ${c.id})`);
        }

        if (courses.length === 0) {
            throw new Error(
                "Semua kelas tersaring keluar. Periksa CLASSROOM_COURSE_IDS / " +
                "CLASSROOM_EXCLUDE_COURSES di .env atau GitHub Secrets."
            );
        }

    }
    else {
        console.log(`Kelas    : ${courses.length} aktif`);
    }

    // 3. Course work tiap kelas
    const coursework = [];

    for (const course of courses) {

        const items = await classroomGetAll(
            accessToken,
            `/v1/courses/${course.id}/courseWork`,
            "courseWork"
        );

        // courseWork.list tidak mengembalikan nama kelas,
        // jadi courseId ditempelkan di sini.
        for (const item of items) {
            coursework.push({ ...item, courseId: course.id });
        }

    }

    // 4. Saring + bentuk baris
    const { baris, tanpaDeadline, kedaluwarsa, draf } = susunBarisClassroom({
        courses,
        coursework,
        hariIni
    });

    console.log(
        `Tugas    : ${baris.length} aktif ` +
        `(dilewati: ${tanpaDeadline} tanpa deadline, ` +
        `${kedaluwarsa} sudah lewat, ${draf} draf)`
    );

    const idKelasDikenal = new Set(courses.map((c) => String(c.id)));

    if (dryRun) {

        console.log("\nContoh baris:");
        console.log(JSON.stringify(baris.slice(0, 3), null, 1));

        const existing = await supabaseGet(
            supabase,
            "select=id,external_id,deadline&source=eq.classroom"
        );

        const usang = cariUsangClassroom({
            existing,
            idKelasDikenal,
            hariIni
        });

        console.log(
            `\nAkan menghapus ${usang.length} baris usang dari ` +
            `${existing.length} baris Classroom yang ada.`
        );

        if (usang.length) {
            console.log(JSON.stringify(usang.slice(0, 3), null, 1));
        }

        return;

    }

    // 4b. Submission milik akun ini. Satu panggilan per tugas
    // aktif; kegagalan satu tugas tidak menggagalkan sync.
    for (const row of baris) {

        const [, idCourse, idKerja] = row.external_id.split(":");

        try {

            const subs = await classroomGetAll(
                accessToken,
                `/v1/courses/${idCourse}/courseWork/${idKerja}` +
                `/studentSubmissions?userId=me`,
                "studentSubmissions"
            );

            row.lms_details.submission =
                ringkasSubmissionClassroom(subs[0]);

        } catch (error) {

            console.log(
                `           ! submission ${idKerja}: ${error.message}`
            );

        }

    }

    // 5. Tulis
    if (baris.length === 0) {

        console.log("Tidak ada tugas aktif untuk ditulis.");

    }
    else {

        const [hasil] = await supabaseRpc(supabase, baris);

        console.log(
            `Tersimpan: ${hasil?.created ?? 0} baru, ` +
            `${hasil?.updated ?? 0} diperbarui`
        );

    }

    // 6. Bersihkan baris usang
    const existing = await supabaseGet(
        supabase,
        "select=id,external_id,deadline&source=eq.classroom"
    );

    const usang = cariUsangClassroom({
        existing,
        idKelasDikenal,
        hariIni
    });

    if (usang.length) {

        const jumlah = await supabaseDelete(
            supabase,
            usang.map((row) => row.id)
        );

        console.log(`Dihapus : ${jumlah} baris usang`);

    }
    else {

        console.log("Dihapus : 0 baris usang");

    }

}


// Hanya jalankan kalau dipanggil langsung, supaya fungsi di
// atas bisa diimpor oleh skrip uji.
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
