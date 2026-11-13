// =========================================================
// TASK VAULT
// SCRIPT.JS
// =========================================================


// =========================================================
// KONFIGURASI
//  Nilai diambil dari config.js, yang di-generate dari .env
//  oleh `npm run env:build`. Kalau file itu belum ada,
//  aplikasi tetap jalan tapi menampilkan instruksi yang
//  jelas alih-alih gagal tanpa penjelasan.
// =========================================================

const APP_CONFIG =
    (typeof window !== "undefined" && window.APP_CONFIG) || {};

const CONFIG_MISSING =
    !APP_CONFIG.SUPABASE_URL || !APP_CONFIG.SUPABASE_KEY;

const SUPABASE_URL = APP_CONFIG.SUPABASE_URL || "";
const SUPABASE_KEY = APP_CONFIG.SUPABASE_KEY || "";


// Jika CDN Supabase gagal dimuat atau config belum ada,
// jangan sampai seluruh script crash.
const supabaseClient =
    !CONFIG_MISSING &&
    typeof window.supabase !== "undefined" &&
    typeof window.supabase.createClient === "function"
        ? window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        )
        : null;


const CONFIG_HELP =
    "This site is not connected to its database yet. The deploy is " +
    "missing the SUPABASE_URL and SUPABASE_KEY secrets, so config.js " +
    "was never generated. Locally: copy .env.example to .env, fill in " +
    "both values, then run `npm run env:build` and reload.";


// =========================================================
// DOM ELEMENT
// =========================================================

const homePage =
    document.getElementById("homePage");

const mainContent =
    document.getElementById("mainContent");


// Navigasi (navbar horizontal)

const homeMenu =
    document.getElementById("homeMenu");

const listMenu =
    document.getElementById("listMenu");

const scheduleMenu =
    document.getElementById("scheduleMenu");

const syncMenu =
    document.getElementById("syncMenu");


// Halaman

const taskListSection =
    document.getElementById("taskListSection");

const scheduleSection =
    document.getElementById("scheduleSection");

const courseDetailSection =
    document.getElementById("courseDetailSection");

const syncSection =
    document.getElementById("syncSection");


// Beranda

const courseDirectory =
    document.getElementById("courseDirectory");


// Detail mata kuliah

const courseDetailTitle =
    document.getElementById("courseDetailTitle");

const courseDetailSubtitle =
    document.getElementById("courseDetailSubtitle");

const courseDetailContainer =
    document.getElementById("courseDetailContainer");

const courseBackButton =
    document.getElementById("courseBackButton");

const courseAddTaskButton =
    document.getElementById("courseAddTaskButton");

const addTaskFromList =
    document.getElementById("addTaskFromList");


// Kalender (sekarang tinggal di Beranda, bukan halaman sendiri)

const calendarGrid =
    document.getElementById("calendarGrid");

const calendarMonthLabel =
    document.getElementById("calendarMonthLabel");

const calendarMonthCount =
    document.getElementById("calendarMonthCount");

const calendarToday =
    document.getElementById("calendarToday");

const calendarPrev =
    document.getElementById("calendarPrev");

const calendarNext =
    document.getElementById("calendarNext");

const calendarDayTitle =
    document.getElementById("calendarDayTitle");

const calendarDayList =
    document.getElementById("calendarDayList");


// Form tambah tugas (sekarang modal)

const addTaskModal =
    document.getElementById("addTaskModal");

const closeAddModal =
    document.getElementById("closeAddModal");


const taskForm =
    document.getElementById("taskForm");

const taskContainer =
    document.getElementById("taskContainer");

const emptyTask =
    document.getElementById("emptyTask");


const totalTasks =
    document.getElementById("totalTasks");

const upcomingTasks =
    document.getElementById("upcomingTasks");


// =========================================================
// SYNC ELEMENT
// =========================================================

const moodleForm =
    document.getElementById("moodleForm");

const moodleUrl =
    document.getElementById("moodleUrl");

const moodleUsername =
    document.getElementById("moodleUsername");

const moodlePassword =
    document.getElementById("moodlePassword");

const moodleConnect =
    document.getElementById("moodleConnect");

const moodleForgetToken =
    document.getElementById("moodleForgetToken");

const moodleStatus =
    document.getElementById("moodleStatus");

const moodleSync =
    document.getElementById("moodleSync");

const syncLog =
    document.getElementById("syncLog");

const ssoLaunch =
    document.getElementById("ssoLaunch");

const ssoPaste =
    document.getElementById("ssoPaste");

const ssoUse =
    document.getElementById("ssoUse");

const coursePicker =
    document.getElementById("coursePicker");

const courseList =
    document.getElementById("courseList");


// =========================================================
// GOOGLE CLASSROOM — REFERENSI ELEMEN
// =========================================================

const classroomClientIdForm =
    document.getElementById("classroomIdForm");

const classroomClientId =
    document.getElementById("classroomClientId");

const classroomConnectArea =
    document.getElementById("classroomConnectArea");

const classroomConnect =
    document.getElementById("classroomConnect");

const classroomAuthLink =
    document.getElementById("classroomAuthLink");

const classroomPaste =
    document.getElementById("classroomPaste");

const classroomPasteUse =
    document.getElementById("classroomPasteUse");

const classroomStatus =
    document.getElementById("classroomStatus");

const classroomForget =
    document.getElementById("classroomForget");

const classroomBadge =
    document.getElementById("classroomBadge");

const classroomPicker =
    document.getElementById("classroomPicker");

const classroomCourseList =
    document.getElementById("classroomCourseList");

const classroomSync =
    document.getElementById("classroomSync");

const classroomSyncLog =
    document.getElementById("classroomSyncLog");


// --- Sinkronisasi otomatis (filter kelas) ---

const autoSyncBadge =
    document.getElementById("autoSyncBadge");

const autoSyncLastRun =
    document.getElementById("autoSyncLastRun");

const autoSyncCourseList =
    document.getElementById("autoSyncCourseList");

const autoSyncMoodleList =
    document.getElementById("autoSyncMoodleList");

const autoSyncRefreshCourses =
    document.getElementById("autoSyncRefreshCourses");

const autoSyncSaveFilter =
    document.getElementById("autoSyncSaveFilter");

const autoSyncFilterStatus =
    document.getElementById("autoSyncFilterStatus");


// =========================================================
// EDIT MODAL
// =========================================================

const editModal =
    document.getElementById("editModal");

const closeModal =
    document.getElementById("closeModal");


// =========================================================
// CONFIRM MODAL (pengganti window.confirm bawaan browser)
// =========================================================

const confirmModal =
    document.getElementById("confirmModal");

const confirmTitle =
    document.getElementById("confirmTitle");

const confirmMessage =
    document.getElementById("confirmMessage");

const confirmAccept =
    document.getElementById("confirmAccept");

const confirmCancel =
    document.getElementById("confirmCancel");

const editForm =
    document.getElementById("editForm");

const editId =
    document.getElementById("editId");

const editCourse =
    document.getElementById("editCourse");

const editClassName =
    document.getElementById("editClassName");

const editDeadline =
    document.getElementById("editDeadline");

const editCategory =
    document.getElementById("editCategory");

const editStatus =
    document.getElementById("editStatus");

const toastContainer =
    document.getElementById("toastContainer");


// =========================================================
// DATA
// =========================================================

let tasks = [];


// =========================================================
// REALTIME (SUPABASE POSTGRES CHANGES)
//  Ledger ini dipakai bersama: teman yang membuka link
//  yang sama bisa menambah/mengubah/menghapus tugas.
//  Tanpa langganan ini, layar hanya diperbarui saat user
//  melakukan sesuatu (klik menu, sync, reload) — sehingga
//  perubahan orang lain tidak terlihat sampai di-refresh.
//
//  Catatan setup: tabel `tasks` harus didaftarkan dulu di
//  Supabase Dashboard → Database → Replication, kalau tidak
//  langganan ini tidak akan pernah berbunyi (tanpa error).
// =========================================================

const REALTIME_CHANNEL = "ghost-matrix-tasks";

let realtimeChannel = null;
let realtimeActive = false;
let realtimeNoticeShown = false;


// Perubahan dari tab ini sendiri sudah ditangani langsung
// oleh aksi user (insert/update/delete lalu loadTasks()),
// jadi event yang datang < 1 detik setelah aksi lokal
// diabaikan agar tidak memicu render ganda.
let lastLocalWriteAt = 0;

const LOCAL_WRITE_WINDOW = 1000;


function markLocalWrite() {

    lastLocalWriteAt = Date.now();

}


function startRealtime() {

    if (!supabaseClient ||
        typeof supabaseClient.channel !== "function") {

        return;

    }


    if (realtimeChannel) {

        return;

    }


    try {

        realtimeChannel =
            supabaseClient
                .channel(REALTIME_CHANNEL)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "tasks"
                    },
                    (payload) => {

                        // Abaikan gema dari aksi tab ini sendiri.
                        if (Date.now() - lastLocalWriteAt <
                            LOCAL_WRITE_WINDOW) {

                            return;

                        }


                        // Beranda, daftar tugas, detail matkul, dan
                        // kalender semuanya membaca array `tasks`
                        // yang sama, jadi semuanya perlu disegarkan.
                        // Dulu ada guard "hanya bila dashboard
                        // terlihat"; sekarang tidak ada satu halaman
                        // dashboard lagi, jadi muat ulang selalu.
                        loadTasks({ silent: true });


                        // Beri tahu sekali saja, jangan beruntun.
                        if (!realtimeNoticeShown &&
                            payload?.eventType) {

                            realtimeNoticeShown = true;

                            showToast(
                                "Ledger updated by another user.",
                                "info"
                            );

                            setTimeout(() => {

                                realtimeNoticeShown = false;

                            }, 4000);

                        }

                    }
                )
                .subscribe((status) => {

                    realtimeActive = (status === "SUBSCRIBED");

                    renderRealtimeStatus();

                });

    }
    catch (error) {

        // Realtime bersifat tambahan: bila gagal, aplikasi
        // tetap berfungsi dengan pembaruan manual.
        console.error(error);

    }

}


// Titik indikator di dalam tombol SYNC supaya user tahu apakah
// perubahan dari perangkat lain akan muncul otomatis.
function renderRealtimeStatus() {

    const badge =
        document.getElementById("realtimeBadge");


    if (!badge) {

        return;

    }


    badge.classList.toggle("hidden", !realtimeActive);

}


function showToast(message, type = "info") {

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {

        toast.classList.add("show");

    });

    setTimeout(() => {

        toast.classList.remove("show");

        setTimeout(() => {

            toast.remove();

        }, 250);

    }, 2400);

}


// =========================================================
// NAVIGATION
//  Satu <main> berisi beberapa <section class="page-view">.
//  Hanya satu yang terlihat pada satu waktu.
// =========================================================

const PAGES = [
    homePage,
    taskListSection,
    scheduleSection,
    courseDetailSection,
    syncSection
];

const NAV_BUTTONS = [
    homeMenu,
    listMenu,
    scheduleMenu,
    syncMenu
];

// Mata kuliah yang sedang dibuka di halaman detail.
let activeCourse = null;


function setActiveNav(button) {

    NAV_BUTTONS.forEach((item) => {

        if (!item) return;

        item.classList.toggle("active", item === button);

        if (item === button) {

            item.setAttribute("aria-current", "page");

        }
        else {

            item.removeAttribute("aria-current");

        }

    });


    // Di layar sempit navbar-nav bisa digulir mendatar. Tanpa ini,
    // halaman yang dibuka dari tautan paling kanan (CALENDAR, SYNC)
    // tampil tanpa penanda aktif yang terlihat — pengguna tidak tahu
    // di halaman mana dia berada.
    if (button &&
        typeof button.scrollIntoView === "function") {

        button.scrollIntoView({
            block: "nearest",
            inline: "nearest",
            behavior: "instant"
        });

    }

}


// Tampilkan satu halaman saja.
//  - scrollToTop = gulir ke atas (kecuali saat pindah halaman
//    dari dalam daftar panjang, di mana pengguna mungkin ingin
//    tetap di posisinya).
function showPage(page, { button = null, scrollToTop = true } = {}) {

    PAGES.forEach((item) => {

        if (!item) return;

        item.classList.toggle("hidden", item !== page);

    });


    // Konteks mata kuliah hanya berlaku selama halaman detailnya
    // terbuka. Kalau tidak direset, modal "Add Task" akan terus
    // mengisi nama matkul lama walaupun dibuka dari Beranda.
    if (page !== courseDetailSection) {

        activeCourse = null;

    }


    setActiveNav(button);


    if (scrollToTop) {

        window.scrollTo({ top: 0, behavior: "instant" });

    }


    // Fokus ke konten utama supaya pembaca layar langsung
    // membacakan halaman yang baru, bukan tetap di navbar.
    mainContent.focus({ preventScroll: true });

}


// ---------- BERANDA ----------

function showHome() {

    showPage(homePage, { button: homeMenu });

    // Kalender sekarang bagian dari Beranda, jadi ikut disegarkan
    // setiap kali Beranda dibuka (data bisa berubah dari halaman lain).
    renderCalendar();

}


homeMenu.addEventListener("click", showHome);


// ---------- DAFTAR SEMUA TUGAS ----------

function showTaskList() {

    showPage(taskListSection, { button: listMenu });

    loadTasks();

}


listMenu.addEventListener("click", showTaskList);


// ---------- JADWAL ----------

scheduleMenu.addEventListener(
    "click",
    () => {

        showPage(scheduleSection, { button: scheduleMenu });

        renderSchedule();

    }
);


// ---------- SYNC LMS ----------

syncMenu.addEventListener(
    "click",
    () => {

        showPage(syncSection, { button: syncMenu });

        renderMoodleStatus();


        // Muat daftar kelas (untuk picker) kalau sudah connect
        const config = loadMoodleConfig();


        if (config?.token) {

            tryRenderCoursePicker(config);

        }

    }
);


// =========================================================
// MODAL TAMBAH TUGAS
//  Navbar "Add / Remove" dihapus; form sekarang modal agar
//  bisa dibuka dari navbar, Beranda, maupun halaman matkul.
// =========================================================

let addModalReturnFocus = null;


function openAddTaskModal() {

    if (!addTaskModal) return;

    addModalReturnFocus = document.activeElement;

    addTaskModal.classList.remove("hidden");


    // Kalau dibuka dari halaman detail matkul, isi otomatis
    // nama matkulnya supaya tidak perlu mengetik ulang.
    const courseInput = document.getElementById("course");

    if (courseInput && activeCourse &&
        !courseInput.value.trim()) {

        courseInput.value = activeCourse;

    }


    courseInput?.focus();

}


function closeAddTaskModal() {

    if (!addTaskModal) return;

    addTaskModal.classList.add("hidden");


    if (addModalReturnFocus &&
        typeof addModalReturnFocus.focus === "function") {

        addModalReturnFocus.focus();

    }

    addModalReturnFocus = null;

}


// Tombol tambah tugas hanya ada di halaman Tasks dan halaman
// detail mata kuliah (navbar tidak lagi punya tombol ini).
courseAddTaskButton?.addEventListener("click", openAddTaskModal);

// Tombol di halaman Tasks (dulu milik section "Add / Remove").
addTaskFromList?.addEventListener("click", openAddTaskModal);

closeAddModal?.addEventListener("click", closeAddTaskModal);


// Klik di area gelap luar kartu menutup modal
addTaskModal?.addEventListener(
    "click",
    (event) => {

        if (event.target === addTaskModal) {

            closeAddTaskModal();

        }

    }
);


document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape" &&
            addTaskModal &&
            !addTaskModal.classList.contains("hidden")) {

            closeAddTaskModal();

        }

    }
);



// =========================================================
// TAMBAH TUGAS
// =========================================================

taskForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const course =
            document
                .getElementById("course")
                .value
                .trim();

        const className =
            document
                .getElementById("className")
                .value
                .trim();

        const deadline =
            document
                .getElementById("deadline")
                .value;

        const category =
            document
                .getElementById("category")
                .value
                .trim();

        const status =
            normalizeStatus(
                document
                    .getElementById("status")
                    .value
            );


        if (
            !course ||
            !className ||
            !deadline ||
            !category
        ) {

            showToast("All fields are required.", "error");

            return;

        }


        if (!supabaseClient) {

            showToast(
                "Database client is unavailable. Reload the page.",
                "error"
            );

            return;

        }


        const payload = {
            course: course,
            class_name: className,
            deadline: deadline,
            category: category,
            status: status
        };


        markLocalWrite();

        let insertResult =
            await supabaseClient
                .from("tasks")
                .insert([payload])
                .select("id");


        const {
            data: createdRows,
            error
        } = insertResult;


        if (error) {

            console.error(error);

            showToast(
                "Task creation failed: " + error.message,
                "error"
            );

            return;

        }


        if (!createdRows || createdRows.length === 0) {

            showToast(
                "Task was not created. Check the insert policy for anon access.",
                "warning"
            );

            return;

        }


        showToast("Task added to the matrix.", "success");


        taskForm.reset();


        // Setelah menyimpan, modal ditutup dan halaman yang sedang
        // dibuka dipertahankan. Dulu pengguna dilempar ke daftar
        // tugas; sekarang menambah tugas dari Beranda atau dari
        // halaman matkul tidak menghilangkan konteksnya.
        closeAddTaskModal();


        await loadTasks();

    }
);


// =========================================================
// MOODLE SYNC (FASE 1)
// =========================================================

const MOODLE_STORAGE_KEY =
    "ghost_matrix_moodle_auth";
// Nilai awal dari .env (MOODLE_URL). Hanya dipakai sebagai
// default saat kolom Site URL kosong — user tetap bisa
// mengganti URL lain di UI.
const DEFAULT_MOODLE_URL =
    normalizeSiteUrl(APP_CONFIG.MOODLE_URL) ||
    "https://kuliah2.itera.ac.id";


// =========================================================
// UPSERT BATCH (DIPAKAI KEDUA SYNC)
//  Sebelumnya tiap tugas = satu request HTTP. Untuk 40 tugas
//  berarti 40 round-trip dan tidak atomik. Sekarang seluruh
//  batch dikirim sekali ke fungsi database sync_lms_tasks().
//
//  Status dan dismissed_at sengaja tidak ikut di-update oleh
//  fungsi itu, sehingga pilihan user tidak tertimpa sync.
//  Kalau fungsi belum ada (migrasi belum dijalankan),
//  helper ini melaporkan pesan yang jelas.
// =========================================================

const SYNC_BATCH_SIZE = 200;


async function syncRowsBatch(rows) {

    let created = 0;
    let updated = 0;


    for (let i = 0; i < rows.length; i += SYNC_BATCH_SIZE) {

        const chunk =
            rows.slice(i, i + SYNC_BATCH_SIZE);


        const {
            data,
            error
        } = await supabaseClient.rpc(
            "sync_lms_tasks",
            { rows: chunk }
        );


        if (error) {

            console.error(error);

            if (error.code === "PGRST202") {

                throw new Error(
                    "Sync function missing. Run SUPABASE_SETUP.sql " +
                    "(or `npm run db:push`) first."
                );

            }

            throw new Error(error.message);

        }


        // Fungsi mengembalikan satu baris {created, updated}.
        const result =
            Array.isArray(data) ? data[0] : data;


        created += Number(result?.created || 0);
        updated += Number(result?.updated || 0);

    }


    return { created, updated };

}


function loadMoodleConfig() {

    try {

        const raw =
            localStorage.getItem(MOODLE_STORAGE_KEY);

        return raw ? JSON.parse(raw) : null;

    }
    catch (error) {

        console.error(error);

        return null;

    }

}


function saveMoodleConfig(config) {

    localStorage.setItem(
        MOODLE_STORAGE_KEY,
        JSON.stringify(config)
    );

}


function setMoodleStatus(message, type = "") {

    moodleStatus.textContent = message;

    moodleStatus.classList.toggle(
        "success",
        type === "success"
    );

    moodleStatus.classList.toggle(
        "error",
        type === "error"
    );

}


function setSyncLog(message, type = "") {

    syncLog.textContent = message;

    syncLog.classList.toggle(
        "error",
        type === "error"
    );

}


function renderMoodleStatus() {

    const config = loadMoodleConfig();


    if (config?.token) {

        setMoodleStatus(
            `Token stored • ${config.username || "?"} @ ${config.url}`,
            "success"
        );

        moodleForgetToken.classList.remove("hidden");

        moodleSync.disabled = false;

        moodleConnect.textContent = "RECONNECT";

        if (moodleUrl.value !== config.url) {

            moodleUrl.value = config.url;

        }

        if (moodleUsername.value !== config.username) {

            moodleUsername.value = config.username || "";

        }

    }
    else {

        setMoodleStatus(
            "Not connected. Enter your Moodle account to obtain a token."
        );

        moodleForgetToken.classList.add("hidden");

        moodleSync.disabled = true;

        moodleConnect.textContent = "CONNECT & SAVE TOKEN";

    }

}


// HTTP helper: Moodle REST memakai form-urlencoded (simple request,
// lolos CORS tanpa preflight — server Moodle ITERA mengirim ACAO *)

async function moodlePost(url, params) {

    if (typeof fetch !== "function") {

        throw new Error(
            "This browser does not support fetch()."
        );

    }


    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type":
                "application/x-www-form-urlencoded"
        },
        body:
            new URLSearchParams(params).toString()
    });


    if (!response.ok) {

        throw new Error(
            `Moodle responded with HTTP ${response.status}.`
        );

    }


    const text = await response.text();


    try {

        return JSON.parse(text);

    }
    catch (error) {

        throw new Error(
            "Unexpected (non-JSON) response from Moodle."
        );

    }

}


function normalizeSiteUrl(url) {

    return String(url || "")
        .trim()
        .replace(/\/+$/, "");

}


function mapMoodleError(info) {

    const code = info?.errorcode || "";


    if (code === "invalidtoken") {

        return "Token expired or revoked. Reconnect with your Moodle account.";

    }


    if (code === "invalidlogin") {

        return "Wrong Moodle username or password.";

    }


    if (code === "invalidservice" ||
        code === "webservicesnotenabled") {

        return "Web services are disabled on this Moodle site.";

    }


    return (
        info?.message ||
        info?.error ||
        "Unknown Moodle error."
    );

}


async function moodleRest(config, params) {

    const data = await moodlePost(
        normalizeSiteUrl(config.url) +
        "/webservice/rest/server.php",
        {
            wstoken: config.token,
            moodlewsrestformat: "json",
            ...params
        }
    );


    if (data && data.errorcode) {

        throw new Error(mapMoodleError(data));

    }


    return data;

}


function unixToLocalDate(unixSeconds) {

    const date =
        new Date(Number(unixSeconds) * 1000);

    const pad = (n) =>
        String(n).padStart(2, "0");


    return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate())
    );

}


function chunkArray(items, size) {

    const chunks = [];

    for (let i = 0; i < items.length; i += size) {

        chunks.push(items.slice(i, i + size));

    }

    return chunks;

}


// CONNECT: tukar username+password -> token (sekali saja)

moodleForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        setSyncLog("");


        const url =
            normalizeSiteUrl(moodleUrl.value);

        const username =
            moodleUsername.value.trim();

        const password =
            moodlePassword.value;


        if (!username || !password) {

            setMoodleStatus(
                "Enter your Moodle username and password.",
                "error"
            );

            return;

        }


        moodleConnect.disabled = true;
        moodleConnect.textContent = "REQUESTING TOKEN...";


        try {

            const data =
                await moodlePost(
                    url + "/login/token.php",
                    {
                        username: username,
                        password: password,
                        service: "moodle_mobile_app"
                    }
                );


            if (!data.token) {

                throw new Error(
                    mapMoodleError(data)
                );

            }


            saveMoodleConfig({
                url: url,
                username: username,
                token: data.token
            });

            // Password TIDAK pernah disimpan
            moodlePassword.value = "";

            setMoodleStatus(
                `Token stored • ${username} @ ${url}`,
                "success"
            );

            setSyncLog(
                "Token saved in this browser. Press SYNC to pull your assignments."
            );

            showToast("Moodle connection established.", "success");

            tryRenderCoursePicker(loadMoodleConfig());

        }
        catch (error) {

            console.error(error);

            setMoodleStatus(
                error.message || "Connection failed.",
                "error"
            );

        }
        finally {

            moodleConnect.disabled = false;


            const config =
                loadMoodleConfig();


            if (config?.token) {

                renderMoodleStatus();

            }
            else {

                // Pertahankan pesan error yang baru muncul
                moodleConnect.textContent =
                    "CONNECT & SAVE TOKEN";

            }

        }

    }
);


moodleForgetToken.addEventListener(
    "click",
    () => {

        localStorage.removeItem(MOODLE_STORAGE_KEY);

        moodleUsername.value = "";
        moodlePassword.value = "";

        setSyncLog("");

        renderMoodleStatus();

        showToast("Moodle token removed from this browser.", "warning");

    }
);


// =========================================================
// CONNECT VIA GOOGLE SSO (mekanisme resmi aplikasi Moodle)
//  Akun kampus yang hanya bisa login Google tidak punya
//  password lokal, sehingga token.php tidak berfungsi.
//  Alur resminya: launch.php melempar token sebagai URL
//  moodlemobile://token=base64(siteid:::wstoken[:::priv])
//  setelah login Google. Pengguna menyalin URL hasil
//  lemparan itu; di sini kita decode, verifikasi langsung
//  ke server Moodle, lalu simpan tokennya.
// =========================================================

const MOODLE_SSO_KEY =
    "ghost_matrix_moodle_sso";


function decodeMoodleLaunch(pasted) {

    const text =
        String(pasted || "").trim();


    if (!text) {

        throw new Error(
            "Paste the moodlemobile:// link first."
        );

    }


    const match =
        text.match(/token=([A-Za-z0-9+/=_-]+)/);


    const blob =
        match
            ? match[1]
            : (/^[A-Za-z0-9+/=_-]+$/.test(text)
                ? text
                : null);


    if (!blob) {

        throw new Error(
            "That does not look like a moodlemobile://token=... link."
        );

    }


    let decoded;


    try {

        const base64 =
            blob
                .replace(/-/g, "+")
                .replace(/_/g, "/") +
            "=".repeat((4 - (blob.length % 4)) % 4);

        decoded = atob(base64);

    }
    catch (error) {

        throw new Error(
            "The pasted link could not be decoded."
        );

    }


    const parts =
        decoded.split(":::");

    const token =
        (parts[1] || "").trim();


    if (!/^[A-Za-z0-9]{20,}$/.test(token)) {

        throw new Error(
            "Decoded link does not contain a valid token."
        );

    }


    return token;

}


ssoLaunch.addEventListener(
    "click",
    () => {

        const url =
            normalizeSiteUrl(moodleUrl.value) ||
            DEFAULT_MOODLE_URL;


        const passport =
            "gtm" +
            Date.now().toString(36) +
            ":" +
            Math.random().toString(36).slice(2) +
            Math.random().toString(36).slice(2);


        localStorage.setItem(
            MOODLE_SSO_KEY,
            JSON.stringify({
                passport: passport,
                url: url
            })
        );


        const launchUrl =
            url +
            "/admin/tool/mobile/launch.php" +
            "?service=moodle_mobile_app" +
            "&passport=" + encodeURIComponent(passport) +
            "&confirmed=1";


        if (typeof window.open === "function") {

            try {

                window.open(launchUrl, "_blank");

            }
            catch (error) {

                console.error(error);

            }

        }


        setSyncLog(
            "New tab opened. Log in with Google there, " +
            "then paste the moodlemobile:// link below."
        );

    }
);


ssoUse.addEventListener(
    "click",
    async () => {

        setSyncLog("");


        let token;


        try {

            token =
                decodeMoodleLaunch(ssoPaste.value);

        }
        catch (error) {

            setMoodleStatus(error.message, "error");

            return;

        }


        let pending = null;


        try {

            pending = JSON.parse(
                localStorage.getItem(MOODLE_SSO_KEY)
            );

        }
        catch (error) {

            console.error(error);

        }


        const url =
            normalizeSiteUrl(
                pending?.url || moodleUrl.value
            ) ||
            DEFAULT_MOODLE_URL;


        ssoUse.disabled = true;
        ssoUse.textContent = "VERIFYING TOKEN...";


        try {

            const info =
                await moodleRest(
                    { url: url, token: token },
                    { wsfunction: "core_webservice_get_site_info" }
                );


            saveMoodleConfig({
                url: url,
                username:
                    info.username ||
                    info.fullname ||
                    "sso-user",
                token: token
            });


            ssoPaste.value = "";

            localStorage.removeItem(MOODLE_SSO_KEY);

            renderMoodleStatus();

            setSyncLog(
                "SSO token verified and saved in this browser. " +
                "Press SYNC to pull your assignments."
            );

            showToast(
                "Moodle SSO connection established.",
                "success"
            );

            tryRenderCoursePicker(loadMoodleConfig());

        }
        catch (error) {

            console.error(error);

            setMoodleStatus(
                error.message || "Token check failed.",
                "error"
            );

        }
        finally {

            ssoUse.disabled = false;
            ssoUse.textContent =
                "2. USE PASTED LINK & SAVE TOKEN";

        }

    }
);


// =========================================================
// PEMILIH KELAS (COURSE PICKER)
//  Akun kampus sering masih terdaftar di kelas lama yang
//  sudah tidak diikuti. Sebelum sync, pengguna memilih
//  kelas aktif mana saja yang boleh masuk; tugas Moodle
//  dari kelas yang tidak dicentang dihapus dari daftar.
// =========================================================

const MOODLE_COURSE_KEY =
    "ghost_matrix_moodle_courses";


function loadCourseSelection() {

    try {

        const raw =
            localStorage.getItem(MOODLE_COURSE_KEY);

        return raw ? JSON.parse(raw) : null;

    }
    catch (error) {

        console.error(error);

        return null;

    }

}


function saveCourseSelection(ids) {

    localStorage.setItem(
        MOODLE_COURSE_KEY,
        JSON.stringify(ids)
    );

}


function renderCoursePicker(courses) {

    const stored = loadCourseSelection();

    courseList.innerHTML = "";


    courses.forEach((course) => {

        const label =
            document.createElement("label");

        label.className = "course-item";


        const box =
            document.createElement("input");

        box.type = "checkbox";
        box.value = String(course.id);
        box.checked =
            Array.isArray(stored)
                ? stored.includes(String(course.id))
                : true;


        const name =
            document.createElement("span");

        name.textContent =
            course.fullname ||
            course.shortname ||
            `Course ${course.id}`;


        label.appendChild(box);
        label.appendChild(name);

        courseList.appendChild(label);

    });


    coursePicker.classList.remove("hidden");

}


function selectedCourseIds() {

    return Array.from(
        courseList.querySelectorAll(
            "input[type=checkbox]:checked"
        )
    ).map((box) => box.value);

}


// Pilihan langsung diingat tiap checkbox diubah
courseList.addEventListener(
    "change",
    () => {

        saveCourseSelection(selectedCourseIds());

    }
);


// Muat daftar kelas setelah connect (gagal = diam saja,
// picker tetap muncul saat tombol SYNC ditekan)
async function tryRenderCoursePicker(config) {

    try {

        const siteInfo =
            await moodleRest(config, {
                wsfunction: "core_webservice_get_site_info"
            });


        const courses =
            await moodleRest(config, {
                wsfunction: "core_enrol_get_users_courses",
                userid: siteInfo.userid
            });


        if (Array.isArray(courses) &&
            courses.length > 0) {

            renderCoursePicker(courses);

        }

    }
    catch (error) {

        console.error(error);

    }

}


// SYNC: tarik daftar course + assignment, masukkan ke task ledger

moodleSync.addEventListener(
    "click",
    async () => {

        const config = loadMoodleConfig();


        if (!config?.token) {

            setSyncLog(
                "Connect your Moodle account first.",
                "error"
            );

            return;

        }


        if (!supabaseClient) {

            setSyncLog(
                "Database client unavailable. Reload the page.",
                "error"
            );

            return;

        }


        moodleSync.disabled = true;
        moodleSync.textContent = "SYNCING...";

        setSyncLog("Contacting Moodle...");


        try {

            // 1. Validasi token + ambil id user
            const siteInfo =
                await moodleRest(config, {
                    wsfunction: "core_webservice_get_site_info"
                });


            setSyncLog("Loading enrolled courses...");


            // 2. Daftar mata kuliah semester ini
            const courses =
                await moodleRest(config, {
                    wsfunction: "core_enrol_get_users_courses",
                    userid: siteInfo.userid
                });


            if (!Array.isArray(courses) ||
                courses.length === 0) {

                throw new Error(
                    "No enrolled courses found on this Moodle account."
                );

            }


            const courseNameById = {};

            courses.forEach((course) => {

                courseNameById[course.id] =
                    course.fullname ||
                    course.shortname ||
                    `Course ${course.id}`;

            });


            // 2b. pemilih kelas: tampilkan picker, baca pilihan
            renderCoursePicker(courses);

            const selected = selectedCourseIds();


            if (selected.length === 0) {

                throw new Error(
                    "Select at least one course, then press SYNC again."
                );

            }

            saveCourseSelection(selected);


            const selectedSet =
                new Set(selected.map(String));

            const selectedCourses = courses.filter(
                (course) =>
                    selectedSet.has(String(course.id))
            );


            // 3. Semua assignment (dibagi per 20 course)
            setSyncLog("Loading assignments...");

            const assignments = [];


            for (const group of
                chunkArray(selectedCourses, 20)) {

                const params = {
                    wsfunction: "mod_assign_get_assignments"
                };

                group.forEach((course, index) => {

                    params[`courseids[${index}]`] =
                        course.id;

                });


                const result =
                    await moodleRest(config, params);


                (result.courses || []).forEach(
                    (course) => {

                        // Pertahanan kedua: abaikan course yang
                        // tidak diminta / tidak dicentang
                        if (!selectedSet.has(
                            String(course.id)
                        )) {

                            return;

                        }

                        (course.assignments || []).forEach(
                            (assignment) => {

                                assignments.push({
                                    id: assignment.id,
                                    name: assignment.name,
                                    duedate: assignment.duedate,
                                    courseId: course.id
                                });

                            }
                        );

                    }
                );

            }


            // 4. Hanya yang punya deadline
            const withDue =
                assignments.filter((item) =>
                    Number(item.duedate) > 0
                );

            const skipped =
                assignments.length - withDue.length;


            // 4b. Saring yang sudah lewat deadline — tugas lama
            // tidak boleh masuk, apalagi muncul lagi saat sync ulang.
            // (Tugas yang deadline-nya hari ini masih dianggap aktif.)
            const todayDateStr =
                unixToLocalDate(Date.now() / 1000);


            const active = withDue.filter(
                (item) =>
                    unixToLocalDate(item.duedate) >=
                    todayDateStr
            );

            const expired =
                withDue.length - active.length;


            // 5. Baris Moodle yang sudah ada — dipakai untuk
            //    menentukan mana yang usang (langkah 6b).
            const {
                data: existingRows,
                error: existingError
            } = await supabaseClient
                .from("tasks")
                .select("id, external_id, deadline")
                .eq("source", "moodle");


            if (existingError) {

                if (existingError.code === "42703") {

                    throw new Error(
                        "Missing sync columns. Run SUPABASE_SETUP.sql first."
                    );

                }


                throw new Error(existingError.message);

            }


            // 6. Upsert batch — satu request untuk semua tugas
            //    (sebelumnya satu request per tugas).
            markLocalWrite();


            const syncPayload = active.map((item) => ({
                course: item.name,
                class_name:
                    courseNameById[item.courseId] || "-",
                deadline:
                    unixToLocalDate(item.duedate),
                category: "Moodle",
                source: "moodle",
                external_id:
                    `assign:${item.courseId}:${item.id}`,
                synced_at:
                    new Date().toISOString()
            }));


            const {
                created,
                updated
            } = await syncRowsBatch(syncPayload);


            // 6b. Hapus tugas Moodle yang usang:
            //     - dari kelas yang tidak dicentang
            //     - atau sudah lewat deadline
            const staleRows = (existingRows || [])
                .filter((row) => {

                    const parts =
                        String(row.external_id || "")
                            .split(":");

                    if (parts[0] !== "assign") {

                        return false;

                    }


                    // Kelas tidak dicentang -> usang
                    if (!selectedSet.has(parts[1])) {

                        return true;

                    }


                    // Deadline sudah lewat -> usang
                    const deadline =
                        String(row.deadline || "")
                            .slice(0, 10);


                    return (
                        deadline !== "" &&
                        deadline < todayDateStr
                    );

                });

            const staleIds =
                staleRows.map((row) => row.id);


            let removed = 0;


            if (staleIds.length > 0) {

                const {
                    error: deleteError
                } = await supabaseClient
                    .from("tasks")
                    .delete()
                    .eq("source", "moodle")
                    .in("id", staleIds);


                if (deleteError) {

                    throw new Error(deleteError.message);

                }


                removed = staleIds.length;

            }


            const summary =
                `Sync complete.\n` +
                `New: ${created} • Updated: ${updated} • ` +
                `No deadline (skipped): ${skipped}` +
                (expired > 0
                    ? ` • Expired (skipped): ${expired}`
                    : "") +
                (removed > 0
                    ? `\nRemoved (unselected/expired): ${removed}`
                    : "");


            setSyncLog(summary);

            showToast(
                `Moodle sync: ${created} new, ${updated} updated.`,
                "success"
            );


            // 7. Tampilkan hasilnya
            showHome();

            await loadTasks();

        }
        catch (error) {

            console.error(error);

            setSyncLog(
                error.message || "Sync failed.",
                "error"
            );

            showToast(
                "Moodle sync failed: " +
                (error.message || "unknown error"),
                "error"
            );

        }
        finally {

            moodleSync.disabled = false;
            moodleSync.textContent =
                "⟳ SYNC ASSIGNMENTS FROM MOODLE";

        }

    }
);


// =========================================================
// GOOGLE CLASSROOM (OAUTH 2.0 — CLIENT-SIDE)
//  Web statis tanpa backend: pakai implicit flow resmi
//  Google. Client ID milik user sendiri disimpan di
//  browser. Token ditangkap dari halaman redirect
//  (hash #access_token=...) lalu disimpan lokal.
// =========================================================

const CLASSROOM_CLIENT_KEY =
    "ghost_matrix_classroom_client";

const CLASSROOM_AUTH_KEY =
    "ghost_matrix_classroom_auth";

const CLASSROOM_COURSE_KEY =
    "ghost_matrix_classroom_courses";

const CLASSROOM_SCOPES =
    "https://www.googleapis.com/auth/classroom.courses.readonly " +
    "https://www.googleapis.com/auth/classroom.coursework.me";

// Halaman GitHub Pages dipakai sebagai tujuan redirect
// (Google menerima https sebagai redirect URI).
// Bisa dipaksa lewat CLASSROOM_REDIRECT di .env; kalau
// kosong, diturunkan dari lokasi halaman supaya build
// lokal / preview juga bisa dipakai.
const CLASSROOM_REDIRECT =
    APP_CONFIG.CLASSROOM_REDIRECT ||
    (window.location.origin + window.location.pathname);


// Client ID boleh disiapkan sekali di .env supaya user
// tidak perlu menempelkannya manual. Nilai yang tersimpan
// di browser (kalau ada) tetap diutamakan.
const CLASSROOM_CLIENT_FALLBACK =
    String(APP_CONFIG.CLASSROOM_CLIENT_ID || "").trim();


function loadClassroomClient() {

    return (
        localStorage.getItem(CLASSROOM_CLIENT_KEY) ||
        CLASSROOM_CLIENT_FALLBACK ||
        ""
    );

}


function loadClassroomAuth() {

    try {

        const raw =
            localStorage.getItem(CLASSROOM_AUTH_KEY);

        return raw ? JSON.parse(raw) : null;

    }
    catch (error) {

        console.error(error);

        return null;

    }

}


function saveClassroomAuth(auth) {

    localStorage.setItem(
        CLASSROOM_AUTH_KEY,
        JSON.stringify(auth)
    );

}


function classroomTokenValid() {

    const auth = loadClassroomAuth();


    return !!(
        auth &&
        auth.accessToken &&
        Number(auth.expiresAt) > Date.now() + 60000

    );

}


function setClassroomStatus(message, type = "") {

    classroomStatus.textContent = message;

    classroomStatus.classList.toggle(
        "success",
        type === "success"
    );

    classroomStatus.classList.toggle(
        "error",
        type === "error"
    );

}


function setClassroomLog(message, type = "") {

    classroomSyncLog.textContent = message;

    classroomSyncLog.classList.toggle(
        "error",
        type === "error"
    );

}


function renderClassroomStatus() {

    const hasClient = !!loadClassroomClient();
    const connected = classroomTokenValid();


    classroomConnectArea.classList.toggle(
        "hidden",
        !hasClient
    );


    classroomBadge.textContent =
        connected ? "LIVE" : "OFFLINE";

    classroomBadge.classList.toggle(
        "sync-badge-live",
        connected
    );

    classroomBadge.classList.toggle(
        "sync-badge-pending",
        !connected
    );


    if (connected) {

        setClassroomStatus(
            "Token stored in this browser.",
            "success"
        );

        classroomForget.classList.remove("hidden");
        classroomSync.disabled = false;

    }
    else if (loadClassroomAuth()) {

        setClassroomStatus(
            "Token expired. Press CONNECT GOOGLE " +
            "CLASSROOM again to refresh it.",
            "error"
        );

        classroomForget.classList.remove("hidden");
        classroomSync.disabled = true;

    }
    else {

        setClassroomStatus("Not connected.", "");

        classroomForget.classList.add("hidden");
        classroomSync.disabled = true;

    }

}


function classroomAuthUrl() {

    const clientId =
        loadClassroomClient();


    if (!clientId) {

        throw new Error(
            "Save your OAuth Client ID first."
        );

    }


    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: CLASSROOM_REDIRECT,
        response_type: "token",
        scope: CLASSROOM_SCOPES,
        include_granted_scopes: "true"
    });


    return (
        "https://accounts.google.com/o/oauth2/v2/auth?" +
        params.toString()
    );

}


// Tangkap token dari URL redirect (hash) —
// dipakai both halaman popup dan halaman manual.
function captureClassroomHash() {

    const hash =
        window.location.hash || "";


    if (!hash.includes("access_token=")) {

        return null;

    }


    const params =
        new URLSearchParams(hash.slice(1));

    const accessToken =
        params.get("access_token");

    const expiresIn =
        Number(params.get("expires_in") || 3600);


    if (!accessToken) {

        return null;

    }


    const auth = {
        accessToken: accessToken,
        expiresAt: Date.now() + expiresIn * 1000,
        obtainedAt: new Date().toISOString()
    };


    saveClassroomAuth(auth);


    // Bersihkan token dari address bar & history
    try {

        window.history.replaceState(
            null,
            "",
            window.location.pathname +
            window.location.search
        );

    }
    catch (error) {

        console.error(error);

    }


    // Kalau halaman ini terbuka sebagai popup dari
    // tab utama, kabari opener lalu tutup diri.
    if (window.opener &&
        typeof window.opener.postMessage === "function") {

        try {

            window.opener.postMessage(
                {
                    type: "classroom-token",
                    auth: auth
                },
                "*"
            );

        }
        catch (error) {

            console.error(error);

        }


        setTimeout(() => {

            try {

                window.close();

            }
            catch (error) {

                console.error(error);

            }

        }, 300);

    }


    return auth;

}


// Terima token dari popup (cross-origin pun aman)
window.addEventListener(
    "message",
    (event) => {

        const data = event.data;


        if (data &&
            data.type === "classroom-token" &&
            data.auth?.accessToken) {

            saveClassroomAuth(data.auth);

            renderClassroomStatus();

            showToast(
                "Google Classroom token captured.",
                "success"
            );

            tryRenderClassroomPicker();

        }

    }
);


// Kalau user kembali ke tab utama (popup sudah
// ditutup), cek ulang localStorage.
window.addEventListener(
    "focus",
    () => {

        if (loadClassroomAuth()) {

            renderClassroomStatus();

        }

    }
);


// Nama elemen di HTML adalah "classroomIdForm"; variabel
// referensinya classroomClientIdForm. Sebelumnya baris ini
// memakai nama yang tidak pernah dideklarasikan sehingga
// melempar ReferenceError dan menghentikan sisa script.
classroomClientIdForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();


        const value =
            classroomClientId.value.trim();


        if (!/\.apps\.googleusercontent\.com$/.test(value)) {

            setClassroomStatus(
                "That does not look like a Google " +
                "Client ID (must end with " +
                ".apps.googleusercontent.com).",
                "error"
            );

            return;

        }


        localStorage.setItem(
            CLASSROOM_CLIENT_KEY,
            value
        );

        classroomClientId.value = "";

        renderClassroomStatus();

        setClassroomStatus(
            "Client ID saved in this browser.",
            "success"
        );

        showToast(
            "Classroom Client ID saved.",
            "success"
        );

    }
);


classroomConnect.addEventListener(
    "click",
    () => {

        try {

            const url =
                classroomAuthUrl();


            if (typeof window.open === "function") {

                try {

                    window.open(url, "_blank");

                }
                catch (error) {

                    console.error(error);

                }

            }

            setClassroomLog(
                "Google window opened. Allow access — " +
                "the token is captured automatically."
            );

        }
        catch (error) {

            setClassroomStatus(
                error.message,
                "error"
            );

        }

    }
);


classroomAuthLink.addEventListener(
    "click",
    () => {

        try {

            const url =
                classroomAuthUrl();


            if (typeof window.open === "function") {

                try {

                    window.open(url, "_blank");

                }
                catch (error) {

                    console.error(error);

                }

            }

        }
        catch (error) {

            setClassroomStatus(
                error.message,
                "error"
            );

        }

    }
);


classroomPasteUse.addEventListener(
    "click",
    () => {

        const text =
            String(classroomPaste.value || "").trim();


        if (!text.includes("access_token=")) {

            setClassroomStatus(
                "That does not look like a redirect " +
                "link containing #access_token=...",
                "error"
            );

            return;

        }


        const params =
            new URLSearchParams(
                text.split("#")[1] || ""
            );

        const accessToken =
            params.get("access_token");

        const expiresIn =
            Number(params.get("expires_in") || 3600);


        if (!accessToken) {

            setClassroomStatus(
                "No access_token found in the pasted link.",
                "error"
            );

            return;

        }


        saveClassroomAuth({
            accessToken: accessToken,
            expiresAt: Date.now() + expiresIn * 1000,
            obtainedAt: new Date().toISOString()
        });


        classroomPaste.value = "";

        renderClassroomStatus();

        showToast(
            "Google Classroom token saved.",
            "success"
        );

        tryRenderClassroomPicker();

    }
);


classroomForget.addEventListener(
    "click",
    () => {

        localStorage.removeItem(
            CLASSROOM_AUTH_KEY
        );

        classroomCourseList.innerHTML = "";
        classroomPicker.classList.add("hidden");

        setClassroomLog("");

        renderClassroomStatus();

        showToast(
            "Classroom token removed from this browser.",
            "warning"
        );

    }
);


// ---------- REST ke Classroom API ----------

async function classroomRest(path) {

    const auth = loadClassroomAuth();


    if (!classroomTokenValid()) {

        throw new Error(
            "Classroom token expired. Press CONNECT " +
            "GOOGLE CLASSROOM again."
        );

    }


    const response = await fetch(
        "https://classroom.googleapis.com" + path,
        {
            headers: {
                Authorization:
                    "Bearer " + auth.accessToken
            }
        }
    );


    const data =
        await response.json().catch(() => null);


    if (!response.ok || data?.error) {

        throw new Error(
            data?.error?.message ||
            `Classroom API error (${response.status}).`
        );

    }


    return data;

}


// ---------- Pemilih kelas Classroom ----------

function loadClassroomCourseSelection() {

    try {

        const raw =
            localStorage.getItem(
                CLASSROOM_COURSE_KEY
            );

        return raw ? JSON.parse(raw) : null;

    }
    catch (error) {

        console.error(error);

        return null;

    }

}


function saveClassroomCourseSelection(ids) {

    localStorage.setItem(
        CLASSROOM_COURSE_KEY,
        JSON.stringify(ids)
    );

}


function renderClassroomPicker(courses) {

    const stored =
        loadClassroomCourseSelection();

    classroomCourseList.innerHTML = "";


    courses.forEach((course) => {

        const label =
            document.createElement("label");

        label.className = "course-item";


        const box =
            document.createElement("input");

        box.type = "checkbox";
        box.value = String(course.id);
        box.checked =
            Array.isArray(stored)
                ? stored.includes(String(course.id))
                : true;


        const name =
            document.createElement("span");

        name.textContent =
            course.name ||
            `Classroom ${course.id}`;


        label.appendChild(box);
        label.appendChild(name);

        classroomCourseList.appendChild(label);

    });


    classroomPicker.classList.remove("hidden");

}


function selectedClassroomCourseIds() {

    return Array.from(
        classroomCourseList.querySelectorAll(
            "input[type=checkbox]:checked"
        )
    ).map((box) => box.value);

}


classroomCourseList.addEventListener(
    "change",
    () => {

        saveClassroomCourseSelection(
            selectedClassroomCourseIds()
        );

    }
);


// =========================================================
// PAGINATION GOOGLE CLASSROOM
//  Classroom API mengirim data per halaman. Bila hasilnya
//  lebih dari satu halaman, respons berisi nextPageToken.
//  Tanpa mengikuti token itu, sisa data hilang diam-diam
//  (tanpa error), sehingga tugas tidak muncul di ledger.
//  Helper ini terus meminta halaman berikutnya sampai habis.
// =========================================================

const CLASSROOM_MAX_PAGES = 50;


async function classroomRestAll(path, listKey) {

    const items = [];

    let pageToken = "";
    let pages = 0;


    do {

        const separator =
            path.includes("?") ? "&" : "?";

        const url =
            path +
            (pageToken
                ? separator + "pageToken=" +
                  encodeURIComponent(pageToken)
                : "");


        const page = await classroomRest(url);


        (page[listKey] || []).forEach((item) => {

            items.push(item);

        });


        pageToken = page.nextPageToken || "";

        pages += 1;

    }
    while (pageToken && pages < CLASSROOM_MAX_PAGES);


    // Batas pengaman: jangan diam-diam memotong data.
    if (pageToken) {

        console.warn(
            "Classroom pagination stopped at " +
            CLASSROOM_MAX_PAGES +
            " pages; some items may be missing."
        );

    }


    return items;

}


async function tryRenderClassroomPicker() {

    try {

        const courses =
            await classroomRestAll(
                "/v1/courses?studentId=me&courseStates=ACTIVE",
                "courses"
            );


        if (courses.length > 0) {

            renderClassroomPicker(courses);

        }

    }
    catch (error) {

        console.error(error);

    }

}


// Ubah dueDate/dueDateTime milik Classroom -> YYYY-MM-DD
function classroomDeadlineText(work) {

    const due =
        work.dueDate || work.dueDateTime;


    if (!due || !due.year) {

        return "";

    }


    const pad = (n) =>
        String(n).padStart(2, "0");


    return (
        due.year +
        "-" +
        pad(due.month) +
        "-" +
        pad(due.day)
    );

}


// ---------- SYNC CLASSROOM ----------

classroomSync.addEventListener(
    "click",
    async () => {

        if (!classroomTokenValid()) {

            setClassroomLog(
                "Connect Google Classroom first.",
                "error"
            );

            return;

        }


        if (!supabaseClient) {

            setClassroomLog(
                "Database client unavailable. Reload the page.",
                "error"
            );

            return;

        }


        classroomSync.disabled = true;
        classroomSync.textContent = "SYNCING...";

        setClassroomLog("Contacting Google Classroom...");


        try {

            // 1. Daftar kelas aktif (ikut semua halaman)
            const allCourses =
                await classroomRestAll(
                    "/v1/courses?studentId=me&courseStates=ACTIVE",
                    "courses"
                );


            const courses =
                allCourses.filter(
                    (course) => course.id
                );


            if (courses.length === 0) {

                throw new Error(
                    "No active classrooms found " +
                    "on this Google account."
                );

            }


            // 2. Pemilih kelas
            renderClassroomPicker(courses);

            const selected =
                selectedClassroomCourseIds();


            if (selected.length === 0) {

                throw new Error(
                    "Select at least one classroom, " +
                    "then press SYNC again."
                );

            }

            saveClassroomCourseSelection(selected);


            const selectedSet =
                new Set(selected.map(String));

            const selectedCourses = courses.filter(
                (course) =>
                    selectedSet.has(String(course.id))
            );


            // 3. Coursework per kelas
            setClassroomLog("Loading assignments...");


            const assignments = [];


            for (const course of selectedCourses) {

                // Ikuti semua halaman coursework; tanpa ini
                // kelas dengan >100 tugas kehilangan sisanya
                // tanpa pesan error.
                const workItems =
                    await classroomRestAll(
                        `/v1/courses/${course.id}/courseWork` +
                        "?pageSize=100",
                        "courseWork"
                    );


                workItems.forEach(
                    (item) => {

                        assignments.push({
                            id: item.id,
                            title: item.title,
                            courseId: course.id,
                            courseName: course.name,
                            deadline:
                                classroomDeadlineText(item)
                        });

                    }
                );

            }


            // 4. Saring: harus ada deadline & belum lewat
            const withDue =
                assignments.filter(
                    (item) => item.deadline !== ""
                );

            const skipped =
                assignments.length - withDue.length;


            const todayText =
                unixToLocalDate(Date.now() / 1000);


            const active = withDue.filter(
                (item) =>
                    item.deadline >= todayText
            );

            const expired =
                withDue.length - active.length;


            // 5. Baris Classroom yang sudah ada — dipakai untuk
            //    menentukan mana yang usang (langkah 6b).
            const {
                data: existingRows,
                error: existingError
            } = await supabaseClient
                .from("tasks")
                .select("id, external_id, deadline")
                .eq("source", "classroom");


            if (existingError) {

                throw new Error(
                    existingError.message
                );

            }


            // 6. Upsert batch — satu request untuk semua tugas
            //    (sebelumnya satu request per tugas).
            markLocalWrite();


            const syncPayload = active.map((item) => ({
                course: item.title,
                class_name: item.courseName || "-",
                deadline: item.deadline,
                category: "Classroom",
                source: "classroom",
                external_id:
                    `gc:${item.courseId}:${item.id}`,
                synced_at:
                    new Date().toISOString()
            }));


            const {
                created,
                updated
            } = await syncRowsBatch(syncPayload);


            // 6b. Bersihkan: kelas tidak dicentang
            //     atau deadline sudah lewat
            const staleRows = (existingRows || [])
                .filter((row) => {

                    const parts =
                        String(row.external_id || "")
                            .split(":");

                    if (parts[0] !== "gc") {

                        return false;

                    }


                    if (!selectedSet.has(parts[1])) {

                        return true;

                    }


                    const deadline =
                        String(row.deadline || "")
                            .slice(0, 10);


                    return (
                        deadline !== "" &&
                        deadline < todayText
                    );

                });


            let removed = 0;


            if (staleRows.length > 0) {

                const {
                    error: deleteError
                } = await supabaseClient
                    .from("tasks")
                    .delete()
                    .eq("source", "classroom")
                    .in(
                        "id",
                        staleRows.map((row) => row.id)
                    );


                if (deleteError) {

                    throw new Error(
                        deleteError.message
                    );

                }


                removed = staleRows.length;

            }


            const summary =
                `Sync complete.\n` +
                `New: ${created} • Updated: ${updated} • ` +
                `No deadline (skipped): ${skipped}` +
                (expired > 0
                    ? ` • Expired (skipped): ${expired}`
                    : "") +
                (removed > 0
                    ? `\nRemoved (unselected/expired): ${removed}`
                    : "");


            setClassroomLog(summary);

            showToast(
                `Classroom sync: ${created} new, ` +
                `${updated} updated.`,
                "success"
            );


            showHome();

            await loadTasks();

        }
        catch (error) {

            console.error(error);

            setClassroomLog(
                error.message || "Sync failed.",
                "error"
            );

            showToast(
                "Classroom sync failed: " +
                (error.message || "unknown error"),
                "error"
            );

        }
        finally {

            classroomSync.disabled = false;
            classroomSync.textContent =
                "⟳ SYNC ASSIGNMENTS FROM CLASSROOM";

            renderClassroomStatus();

        }

    }
);


// Tangkap token redirect (jika halaman dibuka
// dengan #access_token=... di URL) & render status
captureClassroomHash();

renderClassroomStatus();





// =========================================================
// LOAD TASKS
// =========================================================

function renderLoadingState() {

    taskContainer.innerHTML = "";


    for (let i = 0; i < 3; i += 1) {

        const skeleton =
            document.createElement("div");

        skeleton.className = "skeleton-card";
        skeleton.setAttribute("aria-hidden", "true");

        skeleton.innerHTML = `

            <div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line tall" style="margin-top: 12px;"></div>
                <div class="skeleton-line" style="margin-top: 12px; width: 45%;"></div>
            </div>

            <div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line" style="margin-top: 12px; width: 70%; height: 26px;"></div>
            </div>

            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
                <div class="skeleton-line" style="width: 80px; height: 40px;"></div>
                <div class="skeleton-line" style="width: 80px; height: 40px;"></div>
            </div>

        `;

        taskContainer.appendChild(skeleton);

    }

}


// Pesan kegagalan terakhir, atau null kalau data berhasil dimuat.
// Dipakai bersama oleh halaman Tasks, direktori mata kuliah di
// Beranda, dan ringkasan kalender supaya ketiganya tidak saling
// bertentangan: dulu hanya #taskContainer yang diberi pesan,
// sehingga Beranda tetap menampilkan "Loading course list"
// selamanya saat config.js hilang (mis. di GitHub Pages yang
// belum punya secret SUPABASE_URL).
let loadFailureMessage = null;


function renderLoadError(message) {

    loadFailureMessage = message;

    taskContainer.innerHTML = `
        <div class="empty-task">
            <div class="empty-icon">!</div>
            <h3>Data retrieval failed</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;


    // Beranda dan kalender juga harus berhenti menampilkan
    // placeholder loading. Keduanya bukan halaman terpisah,
    // jadi tidak ikut tersentuh oleh renderLoadError di atas.
    updateStatistics();
    renderCourseDirectory();
    renderCalendar();

    if (calendarDayList && !calendarSelectedDate) {

        calendarDayList.innerHTML = "";

        calendarDayList.appendChild(
            buildEmptyState(
                "Data unavailable",
                message
            )
        );

    }

}


// Kolom dismissed_at baru ada setelah SUPABASE_SETUP.sql
// dijalankan. Selama belum, aplikasi tetap jalan tanpa
// filter tersebut (dan tugas sync dihapus permanen).
let dismissSupported = true;


// Penjaga agar refresh latar belakang (realtime) tidak
// bertumpuk dan tidak memunculkan skeleton berkedip.
let loadInFlight = false;
let loadPendingAgain = false;


// silent = true dipakai oleh listener realtime: data
// diperbarui di tempat tanpa mengganti daftar dengan
// skeleton, supaya tidak berkedip tiap ada perubahan.
async function loadTasks({ silent = false } = {}) {

    // Panggilan datang saat request lain masih jalan:
    // cukup catat, nanti diulang setelah yang sekarang
    // selesai (agar perubahan terakhir tidak hilang).
    if (loadInFlight) {

        loadPendingAgain = true;

        return;

    }

    loadInFlight = true;

    loadPendingAgain = false;


    if (!silent) {

        renderLoadingState();

    }


    if (!supabaseClient) {

        loadInFlight = false;

        // Bukan silent: ini kegagalan total, dan pengguna sedang
        // berada di Beranda. Tanpa ini, Beranda akan tertahan di
        // "Loading course list" tanpa penjelasan apa pun.
        renderLoadError(
            CONFIG_MISSING
                ? CONFIG_HELP
                : "The database client failed to load. Check your internet connection and reload the page."
        );

        return;

    }


    try {

        let query = () =>
            supabaseClient
                .from("tasks")
                .select("*");


        let result =
            dismissSupported
                ? await query()
                    .is("dismissed_at", null)
                    .order("deadline", {
                        ascending: true
                    })
                : await query()
                    .order("deadline", {
                        ascending: true
                    });


        // Migrasi belum dijalankan: ulangi tanpa filter.
        if (result.error?.code === "42703" &&
            dismissSupported) {

            dismissSupported = false;

            result = await query()
                .order("deadline", {
                    ascending: true
                });

        }


        const {
            data,
            error
        } = result;


        if (error) {

            console.error(error);

            // Refresh latar belakang yang gagal tidak boleh
            // merusak daftar yang sudah tampil. Tetapi kalau
            // belum ada data sama sekali (mis. boot gagal),
            // pengguna harus melihat penjelasannya.
            if (!silent || tasks.length === 0) {

                renderLoadError(error.message);

            }

            return;

        }


        tasks = data || [];

        // Data berhasil dimuat: bersihkan penanda kegagalan agar
        // pesan lama tidak tertinggal di Beranda.
        loadFailureMessage = null;


        updateStatistics();

        renderTasks();

        refreshActiveView();

    }
    catch (error) {

        // Jaringan mati / fetch gagal: jangan biarkan skeleton
        // loading berputar selamanya tanpa penjelasan.
        console.error(error);

        if (!silent || tasks.length === 0) {

            renderLoadError(
                error?.message ||
                "Could not reach the database. Check your connection and retry."
            );

        }

    }
    finally {

        loadInFlight = false;


        // Ada perubahan lain saat kita sibuk: ambil sekali lagi.
        if (loadPendingAgain) {

            loadPendingAgain = false;

            await loadTasks({ silent: true });

        }

    }

}


// =========================================================
// RENDER TASK
// =========================================================

// =========================================================
// SINKRONISASI OTOMATIS — FILTER KELAS
//
//  Sync otomatis berjalan di GitHub Actions tiap 4 jam, bukan
//  di browser ini. Jadi pilihannya tidak bisa disimpan di
//  localStorage: harus di database supaya terbaca server.
//
//  Alurnya:
//    web  -> tabel sync_settings (publishable key)
//    skrip -> baca sync_settings, saring kelas, tulis tasks
//
//  TIDAK ada token GitHub di sini. Halaman statis tidak bisa
//  menyimpan rahasia; kalau token ditaruh di browser, siapa
//  pun yang membuka situs bisa memicu workflow.
// =========================================================

const SYNC_SETTINGS_TABLE = "sync_settings";

// Dua daftar terpisah: kelas Classroom dan mata kuliah Moodle.
// Keduanya dibaca dari DATABASE, bukan dari token di browser.
let autoSyncCourses = [];
let autoSyncMoodleCourses = [];
let autoSyncSettings = null;

// Penanda ada perubahan yang belum disimpan. Satu tombol
// menyimpan kedua daftar sekaligus, jadi status ini dipakai
// bersama.
let autoSyncDirty = false;


function setAutoSyncStatus(pesan, jenis) {

    if (!autoSyncFilterStatus) {
        return;
    }

    autoSyncFilterStatus.textContent = pesan || "";

    autoSyncFilterStatus.classList.toggle(
        "success", jenis === "success"
    );

    autoSyncFilterStatus.classList.toggle(
        "error", jenis === "error"
    );

}


async function loadAutoSyncSettings() {

    if (!supabaseClient) {
        setAutoSyncStatus(
            "Database belum terhubung — pengaturan tidak bisa dibaca.",
            "error"
        );
        return null;
    }

    try {

        const { data, error } = await supabaseClient
            .from(SYNC_SETTINGS_TABLE)
            .select("classroom_exclude, classroom_only, moodle_only, moodle_exclude, updated_at")
            .eq("id", 1)
            .maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

        autoSyncSettings = data || {
            classroom_exclude: "",
            classroom_only: "",
            moodle_only: "",
            moodle_exclude: "",
            updated_at: null
        };

        return autoSyncSettings;

    }
    catch (error) {

        // Tabel belum dibuat (migrasi belum jalan) atau
        // jaringan bermasalah. Halaman tetap bisa dipakai.
        setAutoSyncStatus(
            "Pengaturan belum bisa dibaca: " + error.message,
            "error"
        );

        return null;

    }

}


// Filter disimpan sebagai teks dipisah koma, sama persis
// dengan yang dibaca scripts/sync-lms.mjs.
function pecahDaftar(teks) {

    return String(teks || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

}


function gabungDaftar(daftar) {

    return daftar.join(", ");

}


// Sebuah kelas/matkul dianggap DIPAKAI kalau:
//   - ada di <sumber>_only (bila diisi), DAN
//   - tidak ada di <sumber>_exclude.
//
// Nilai bisa berupa id persis atau potongan nama (tidak peka
// huruf besar/kecil), sama seperti yang dibaca scripts/sync-lms.mjs.
function kelasDipakai(course, pengaturan, awalan) {

    const id = String(course.id);
    const nama = String(course.name || "").toLowerCase();

    const hanya = pecahDaftar(pengaturan?.[awalan + "_only"]);
    const kecuali = pecahDaftar(pengaturan?.[awalan + "_exclude"])
        .map((s) => s.toLowerCase());

    if (hanya.length) {
        const cocok = hanya.some(
            (p) => p === id || nama.includes(p.toLowerCase())
        );
        if (!cocok) {
            return false;
        }
    }

    const dibuang = kecuali.some(
        (p) => p === id || nama.includes(p)
    );

    return !dibuang;

}


// Gambar daftar checkbox untuk satu sumber (classroom/moodle).
function renderPicker(daftar, courses, pengaturan, awalan, kosongPesan) {

    if (!daftar) {
        return;
    }

    daftar.innerHTML = "";

    if (!courses.length) {

        const kosong = document.createElement("p");
        kosong.className = "filter-empty";
        kosong.textContent = kosongPesan;
        daftar.appendChild(kosong);
        return;

    }

    for (const course of courses) {

        const label = document.createElement("label");
        label.className = "course-item";

        const box = document.createElement("input");
        box.type = "checkbox";
        box.value = String(course.id);
        box.checked = kelasDipakai(course, pengaturan, awalan);

        // Perubahan langsung ditandai supaya user tahu ada
        // yang belum disimpan.
        box.addEventListener("change", tandaiBelumDisimpan);

        const nama = document.createElement("span");
        nama.textContent = course.name || `${awalan} ${course.id}`;

        label.appendChild(box);
        label.appendChild(nama);

        daftar.appendChild(label);

    }

}


function tandaiBelumDisimpan() {

    autoSyncDirty = true;

    if (autoSyncSaveFilter) {
        autoSyncSaveFilter.disabled = false;
    }

    setAutoSyncStatus("Ada perubahan belum disimpan.");

}


function renderAutoSyncPicker() {

    renderPicker(
        autoSyncCourseList,
        autoSyncCourses,
        autoSyncSettings,
        "classroom",
        "Belum ada daftar kelas Classroom. Daftar ini terisi otomatis " +
        "oleh sync pertama, atau setelah menjalankan sync manual."
    );

    renderPicker(
        autoSyncMoodleList,
        autoSyncMoodleCourses,
        autoSyncSettings,
        "moodle",
        "Belum ada daftar mata kuliah Moodle. Daftar ini terisi otomatis " +
        "oleh sync pertama, atau setelah menjalankan sync manual."
    );

    // Tombol simpan hanya aktif kalau memang ada perubahan.
    if (autoSyncSaveFilter) {
        autoSyncSaveFilter.disabled = !autoSyncDirty;
    }

}


// Ubah centang pada SATU daftar menjadi pasangan teks
// only/exclude.
//
// Menyimpan yang TIDAK dicentang (bukan hanya yang dicentang)
// penting: kelas baru yang muncul belakangan otomatis ikut,
// tanpa perlu menyimpan ulang.
function susunFilterDariCentang(daftar, courses, awalan, pengaturan) {

    if (!daftar) {
        return {
            only: String(pengaturan?.[awalan + "_only"] || ""),
            exclude: String(pengaturan?.[awalan + "_exclude"] || ""),
            berubah: false
        };
    }

    const kotak = daftar.querySelectorAll("input[type=checkbox]");

    // Kalau daftar belum termuat (tabel kosong / belum pernah
    // sync), jangan menyimpan apa pun — kalau dipaksa, filter
    // yang sudah ada akan terhapus tanpa peringatan.
    if (!kotak.length) {
        return {
            only: String(pengaturan?.[awalan + "_only"] || ""),
            exclude: String(pengaturan?.[awalan + "_exclude"] || ""),
            berubah: false
        };
    }

    const dipilih = [];

    kotak.forEach((box) => {
        if (box.checked) {
            dipilih.push(box.value);
        }
    });

    const idDipilih = new Set(dipilih);

    const tidakDipilih = courses
        .map((c) => String(c.id))
        .filter((id) => !idDipilih.has(id));

    return {
        // Kalau semua dicentang, "hanya" dikosongkan supaya
        // kelas baru otomatis ikut.
        only: tidakDipilih.length ? gabungDaftar(dipilih) : "",
        exclude: gabungDaftar(tidakDipilih),
        berubah: true
    };

}


// Ambil daftar kelas Classroom DAN mata kuliah Moodle dari
// DATABASE, bukan dari token di browser.
//
// Dulu daftar kelas diambil dari token OAuth di browser,
// sehingga user harus menghubungkan akun manual dulu setiap
// kali token (~1 jam) kedaluwarsa — hanya untuk melihat
// daftar. Sekarang server menyimpan daftarnya tiap kali sync
// berjalan, dan halaman ini cukup membacanya.
async function muatDaftarFilter() {

    if (!autoSyncCourseList && !autoSyncMoodleList) {
        return;
    }

    if (!supabaseClient) {
        setAutoSyncStatus("Database belum terhubung.", "error");
        return;
    }

    setAutoSyncStatus("Memuat daftar kelas dan mata kuliah…");

    try {

        const [kelas, matkul] = await Promise.all([
            supabaseClient
                .from("classroom_courses")
                .select("course_id, name, section, seen_at")
                .order("name", { ascending: true }),
            supabaseClient
                .from("moodle_courses")
                .select("course_id, name, seen_at")
                .order("name", { ascending: true })
        ]);

        if (kelas.error) {
            throw new Error("Classroom: " + kelas.error.message);
        }

        if (matkul.error) {
            throw new Error("Moodle: " + matkul.error.message);
        }

        autoSyncCourses = (kelas.data || [])
            .filter((c) => c.course_id)
            .map((c) => ({
                id: c.course_id,
                name: c.name || c.section || `Classroom ${c.course_id}`
            }));

        autoSyncMoodleCourses = (matkul.data || [])
            .filter((c) => c.course_id)
            .map((c) => ({
                id: c.course_id,
                name: c.name || `Matkul ${c.course_id}`
            }));

        await loadAutoSyncSettings();

        autoSyncDirty = false;
        renderAutoSyncPicker();

        // Sebutkan kapan daftar terakhir diperbarui supaya
        // jelas umurnya.
        const waktuTerbaru = [
            ...(kelas.data || []),
            ...(matkul.data || [])
        ]
            .map((c) => c.seen_at)
            .filter(Boolean)
            .sort()
            .pop();

        const kapan = waktuTerbaru
            ? new Date(waktuTerbaru).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short"
            })
            : "tidak diketahui";

        if (!autoSyncCourses.length && !autoSyncMoodleCourses.length) {

            setAutoSyncStatus(
                "Belum ada daftar kelas maupun mata kuliah. Daftar ini " +
                "terisi otomatis oleh sync pertama (tiap 4 jam), atau " +
                "jalankan sync manual sekali dari GitHub Actions.",
                "error"
            );
            return;

        }

        setAutoSyncStatus(
            `${autoSyncCourses.length} kelas Classroom dan ` +
            `${autoSyncMoodleCourses.length} mata kuliah Moodle ` +
            `(diperbarui ${kapan}). Yang tidak dicentang tidak akan ` +
            `disinkronkan.`,
            "success"
        );

    }
    catch (error) {

        setAutoSyncStatus(
            "Gagal memuat daftar: " + error.message,
            "error"
        );

    }

}


// Apakah SEMUA pilihan pada satu daftar dilepas?
//
// Bentuknya: "hanya" kosong TAPI "kecuali" terisi — artinya
// tidak ada satu pun yang dicentang. Kalau kondisi ini
// tersimpan, sync sumber itu akan gagal setiap 4 jam karena
// semua kelas/matkul tersaring keluar.
function semuaDilepas(hasil) {

    return Boolean(
        hasil &&
        hasil.berubah &&
        !pecahDaftar(hasil.only).length &&
        pecahDaftar(hasil.exclude).length
    );

}


// Satu tombol menyimpan KEEMPAT nilai: filter Classroom dan
// filter Moodle sekaligus.
async function simpanFilterAutoSync() {

    if (!supabaseClient) {
        setAutoSyncStatus("Database belum terhubung.", "error");
        return;
    }

    const kelas = susunFilterDariCentang(
        autoSyncCourseList,
        autoSyncCourses,
        "classroom",
        autoSyncSettings
    );

    const matkul = susunFilterDariCentang(
        autoSyncMoodleList,
        autoSyncMoodleCourses,
        "moodle",
        autoSyncSettings
    );

    // Satu daftar punya checkbox (artinya memang diubah), yang
    // lain belum termuat. Jangan timpa yang belum termuat.
    if (!kelas.berubah && !matkul.berubah) {

        setAutoSyncStatus(
            "Daftar belum termuat, jadi tidak ada yang bisa disimpan.",
            "error"
        );
        autoSyncSaveFilter.disabled = true;
        return;

    }

    autoSyncSaveFilter.disabled = true;
    setAutoSyncStatus("Menyimpan…");

    try {

        const sekarang = new Date().toISOString();

        // Hanya kolom yang daftarnya termuat yang ditulis.
        // Menulis daftar kosong akan menghapus filter yang sudah
        // ada tanpa peringatan.
        const perubahan = { updated_at: sekarang };

        if (kelas.berubah) {
            perubahan.classroom_only = kelas.only;
            perubahan.classroom_exclude = kelas.exclude;
        }

        if (matkul.berubah) {
            perubahan.moodle_only = matkul.only;
            perubahan.moodle_exclude = matkul.exclude;
        }

        const { error } = await supabaseClient
            .from(SYNC_SETTINGS_TABLE)
            .update(perubahan)
            .eq("id", 1);

        if (error) {
            throw new Error(error.message);
        }

        autoSyncSettings = {
            ...(autoSyncSettings || {}),
            ...perubahan
        };

        autoSyncDirty = false;

        // Kalau SATU daftar dilepas semua centangnya, sync
        // sumber itu akan gagal setiap 4 jam ("semua tersaring").
        // Lebih baik diberitahu sekarang daripada baru ketahuan
        // dari email kegagalan GitHub Actions.
        const semuaDilepasSekarang = [
            semuaDilepas(kelas) ? "Classroom" : "",
            semuaDilepas(matkul) ? "Moodle" : ""
        ].filter(Boolean);

        if (semuaDilepasSekarang.length) {

            setAutoSyncStatus(
                "Tersimpan — tetapi SEMUA pilihan " +
                semuaDilepasSekarang.join(" dan ") +
                " dilepas. Sync sumber itu akan gagal setiap 4 jam " +
                "sampai minimal satu dicentang lagi.",
                "error"
            );
            return;

        }

        setAutoSyncStatus(
            "Tersimpan. Sync otomatis berikutnya (tiap 4 jam) akan " +
            "memakai pilihan ini. Tugas dari kelas/matkul yang tidak " +
            "dicentang dihapus pada sync itu.",
            "success"
        );

    }
    catch (error) {

        setAutoSyncStatus("Gagal menyimpan: " + error.message, "error");
        autoSyncSaveFilter.disabled = false;

    }

}


// Tampilkan kapan terakhir data benar-benar diperbarui server.
// Diambil dari synced_at terbaru di tabel tasks — itu bukti
// nyata sync berjalan, bukan perkiraan.
async function tampilkanSyncTerakhir() {

    if (!autoSyncLastRun) {
        return;
    }

    if (!supabaseClient) {
        autoSyncLastRun.textContent = "database belum terhubung";
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("tasks")
            .select("synced_at")
            .not("synced_at", "is", null)
            .order("synced_at", { ascending: false })
            .limit(1);

        if (error) {
            throw new Error(error.message);
        }

        const waktu = data?.[0]?.synced_at;

        if (!waktu) {
            autoSyncLastRun.textContent = "belum pernah";
            return;
        }

        const tanggal = new Date(waktu);

        autoSyncLastRun.textContent =
            tanggal.toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short"
            }) + " WIB";

    }
    catch (error) {

        autoSyncLastRun.textContent = "tidak terbaca";

    }

}


function initAutoSync() {

    if (autoSyncRefreshCourses) {
        autoSyncRefreshCourses.addEventListener(
            "click",
            muatDaftarFilter
        );
    }

    if (autoSyncSaveFilter) {
        autoSyncSaveFilter.addEventListener(
            "click",
            simpanFilterAutoSync
        );
    }

    // Muat pengaturan DAN kedua daftar sekaligus saat halaman
    // dibuka. Tidak perlu menghubungkan akun apa pun dulu —
    // daftarnya sudah tersimpan di database oleh sync server.
    muatDaftarFilter();

    tampilkanSyncTerakhir();

}


// =========================================================
// FILTER KELAS PER MATA KULIAH
//  Kode kelas (RA/RB/RC/RD, dst.) menempel di judul
//  tugas, mis. "Worksheet 3 (RD)" atau "… MINGGU 9 RD".
//  Karena kelas user bisa berbeda tiap matkul, filternya
//  menempel di header tiap grup — bukan global.
//  Pilihan disimpan sebagai { "Nama Matkul": "RD" }.
// =========================================================

const CLASS_FILTER_KEY =
    "ghost_matrix_class_group_filters";


function extractClassCode(title) {

    const match =
        String(title || "").match(
            /\bR[A-Z]\b/i
        );


    return match
        ? match[0].toUpperCase()
        : "";

}


function loadGroupFilters() {

    try {

        const raw =
            localStorage.getItem(CLASS_FILTER_KEY);

        const parsed = raw ? JSON.parse(raw) : null;


        return (
            parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
                ? parsed
                : {}
        );

    }
    catch (error) {

        console.error(error);

        return {};

    }

}


// Pilihan untuk satu matkul. Kode yang sudah tidak
// ada di grup dianggap ALL.

function getGroupFilter(subject, codes) {

    const stored =
        loadGroupFilters()[subject];


    return (
        stored && codes.includes(stored)
            ? stored
            : "ALL"
    );

}


function setGroupFilter(subject, code) {

    const filters =
        loadGroupFilters();


    if (code === "ALL") {

        delete filters[subject];

    }
    else {

        filters[subject] = code;

    }


    localStorage.setItem(
        CLASS_FILTER_KEY,
        JSON.stringify(filters)
    );

}


// =========================================================
// TASK GROUP DROPDOWN
//  Status buka/tutup tiap matakuliah disimpan di
//  browser supaya pilihan user bertahan setelah
//  reload.
// =========================================================

const TASK_GROUP_KEY =
    "ghost_matrix_task_groups_collapsed";


function loadCollapsedSubjects() {

    try {

        const raw =
            localStorage.getItem(TASK_GROUP_KEY);

        const list = raw ? JSON.parse(raw) : [];

        return Array.isArray(list) ? list : [];

    }
    catch (error) {

        console.error(error);

        return [];

    }

}


function toggleCollapsedSubject(subject, collapsed) {

    const list =
        new Set(loadCollapsedSubjects());


    if (collapsed) {

        list.add(subject);

    }
    else {

        list.delete(subject);

    }


    localStorage.setItem(
        TASK_GROUP_KEY,
        JSON.stringify(Array.from(list))
    );

}


function renderTasks() {

    taskContainer.innerHTML = "";


    if (tasks.length === 0) {

        taskContainer.appendChild(emptyTask);

        return;

    }


    // Kelompokkan tugas berdasarkan mata kuliah
    // (class_name) supaya daftar tidak menumpuk
    // menjadi satu urutan panjang.

    const groups = new Map();

    tasks.forEach((task) => {

        const subject =
            String(task.class_name || "").trim() ||
            "UNASSIGNED";


        if (!groups.has(subject)) {

            groups.set(subject, []);

        }


        groups.get(subject).push(task);

    });


    // tasks sudah terurut deadline naik, jadi item
    // pertama tiap grup = deadline terdekat.
    // Urutkan grup: deadline paling dekat dulu,
    // lalu nama mata kuliah (A-Z) sebagai pemecah
    // seri.

    const sortedGroups =
        Array.from(groups.entries()).sort(
            (a, b) => {

                const aNext =
                    a[1][0]?.deadline || "9999-99-99";

                const bNext =
                    b[1][0]?.deadline || "9999-99-99";


                if (aNext !== bNext) {

                    return aNext < bNext ? -1 : 1;

                }


                return a[0].localeCompare(b[0]);

            }
        );


    const collapsedSubjects =
        new Set(loadCollapsedSubjects());


    sortedGroups.forEach(([subject, items]) => {

        const collapsed =
            collapsedSubjects.has(subject);


        // Kode kelas yang ada di matkul ini

        const codeCounts = new Map();

        items.forEach((task) => {

            const code =
                extractClassCode(task.course);


            if (code) {

                codeCounts.set(
                    code,
                    (codeCounts.get(code) || 0) + 1
                );

            }

        });


        const codes =
            Array.from(codeCounts.keys()).sort();


        const active =
            getGroupFilter(subject, codes);


        // Tugas tanpa kode kelas (Laporan Praktikum,
        // pengumuman, dst.) selalu tampil

        const visible =
            active === "ALL"
                ? items
                : items.filter((task) => {

                    const code =
                        extractClassCode(
                            task.course
                        );


                    return (
                        code === "" ||
                        code === active
                    );

                });


        const group =
            document.createElement("div");

        group.className =
            "task-group" +
            (collapsed
                ? " task-group-collapsed"
                : "");


        // Header = banner berisi tombol buka/tutup
        // + chip filter kelas khusus matkul ini

        const header =
            document.createElement("div");

        header.className = "task-group-header";


        const toggle =
            document.createElement("button");

        toggle.type = "button";
        toggle.className = "task-group-toggle";
        toggle.setAttribute(
            "aria-expanded",
            String(!collapsed)
        );


        const title =
            document.createElement("span");

        title.className = "task-group-title";
        title.textContent = subject;


        const chevron =
            document.createElement("span");

        chevron.className = "task-group-chevron";
        chevron.textContent = "▾";
        chevron.setAttribute(
            "aria-hidden",
            "true"
        );


        // Baris 1: judul ................ chevron
        toggle.appendChild(title);
        toggle.appendChild(chevron);


        // Baris 2: meta (kiri) ......... chip (kanan)
        const info =
            document.createElement("div");

        info.className = "task-group-info";


        const meta =
            document.createElement("span");

        meta.className = "task-group-meta";


        const filtered =
            active !== "ALL" &&
            visible.length !== items.length;


        meta.textContent =
            filtered
                ? `${visible.length}/` +
                  `${items.length} TASKS // ` +
                  `NEXT: ${
                      formatDate(
                          visible[0].deadline
                      )
                  }`
                : `${items.length} TASK` +
                  `${items.length > 1 ? "S" : ""}` +
                  ` // NEXT: ${
                      formatDate(items[0].deadline)
                  }`;


        info.appendChild(meta);


        header.appendChild(toggle);
        header.appendChild(info);


        // Chip filter kelas — hanya bila matkul ini
        // punya kode kelas di datanya

        if (codes.length > 0) {

            const classes =
                document.createElement("div");

            classes.className =
                "task-group-classes";


            const entries = [
                ["ALL", items.length],
                ...codes.map(
                    (code) => [
                        code,
                        codeCounts.get(code)
                    ]
                )
            ];


            entries.forEach(([code, count]) => {

                const chip =
                    document.createElement("button");

                chip.type = "button";
                chip.dataset.code = code;

                chip.className =
                    "class-chip" +
                    (code === active
                        ? " active"
                        : "");

                chip.setAttribute(
                    "aria-pressed",
                    String(code === active)
                );

                chip.textContent =
                    `${code} · ${count}`;


                chip.addEventListener(
                    "click",
                    () => {

                        setGroupFilter(
                            subject,
                            code
                        );

                        renderTasks();

                    }
                );


                classes.appendChild(chip);

            });


            info.appendChild(classes);

        }


        const cardsWrap =
            document.createElement("div");

        cardsWrap.className = "task-group-cards";


        visible.forEach((task) => {

            cardsWrap.appendChild(
                createTaskCard(task)
            );

        });


        // Klik di mana pun pada banner (kecuali chip
        // filter) membuka/menutup grup

        header.addEventListener(
            "click",
            (event) => {

                if (
                    event.target.closest?.(
                        ".class-chip"
                    )
                ) {

                    return;

                }


                const nowCollapsed =
                    group.classList.toggle(
                        "task-group-collapsed"
                    );

                toggle.setAttribute(
                    "aria-expanded",
                    String(!nowCollapsed)
                );

                toggleCollapsedSubject(
                    subject,
                    nowCollapsed
                );

            }
        );


        group.appendChild(header);
        group.appendChild(cardsWrap);

        taskContainer.appendChild(group);

    });

}


// =========================================================
// BANTUAN TAMPILAN
// =========================================================

// Kartu kosong dipakai di beberapa tempat (direktori matkul,
// halaman detail, kalender). Dibuat baru tiap kali karena satu
// node DOM tidak bisa berada di dua tempat sekaligus.
function buildEmptyState(title, message) {

    const wrap =
        document.createElement("div");

    wrap.className = "empty-task";

    wrap.innerHTML = `

        <div class="empty-icon">
            _
        </div>

        <h3>
            ${escapeHtml(title)}
        </h3>

        <p>
            ${escapeHtml(message)}
        </p>

    `;

    return wrap;

}


// Kelompokkan tugas per mata kuliah (class_name).
function groupTasksBySubject() {

    const groups = new Map();


    tasks.forEach((task) => {

        const subject =
            String(task.class_name || "").trim() ||
            "UNASSIGNED";


        if (!groups.has(subject)) {

            groups.set(subject, []);

        }


        groups.get(subject).push(task);

    });


    return groups;

}


// Mata kuliah diurutkan: yang deadline terdekat lebih dulu,
// lalu A-Z sebagai pemecah seri. Sama dengan urutan grup di
// daftar tugas supaya kedua halaman konsisten.
function sortedSubjectEntries(groups) {

    return Array.from(groups.entries()).sort(
        (a, b) => {

            const aNext =
                a[1][0]?.deadline || "9999-99-99";

            const bNext =
                b[1][0]?.deadline || "9999-99-99";


            if (aNext !== bNext) {

                return aNext < bNext ? -1 : 1;

            }


            return a[0].localeCompare(b[0]);

        }
    );

}


function countOpenTasks(items) {

    return items.filter((task) => {

        return normalizeStatus(task.status) !== "Completed";

    }).length;

}


// =========================================================
// BERANDA: DIREKTORI MATA KULIAH
//  Bagian paling atas Beranda adalah dua kartu statistik
//  (diisi updateStatistics()). Di bawahnya daftar mata
//  kuliah ini; klik satu kartu membuka halaman detailnya.
// =========================================================

function renderCourseDirectory() {

    if (!courseDirectory) return;


    courseDirectory.innerHTML = "";


    // Kalau pemuatan data gagal, jangan biarkan placeholder
    // "Loading course list" dari HTML bertahan selamanya —
    // pengunjung tidak akan tahu ada yang salah.
    if (loadFailureMessage) {

        courseDirectory.appendChild(
            buildEmptyState(
                "Could not load courses",
                loadFailureMessage
            )
        );

        return;

    }


    if (tasks.length === 0) {

        courseDirectory.appendChild(
            buildEmptyState(
                "No courses yet",
                "Add a task and its course will show up here."
            )
        );

        return;

    }


    const groups =
        groupTasksBySubject();


    sortedSubjectEntries(groups).forEach(
        ([subject, items]) => {

            const open =
                countOpenTasks(items);

            const next =
                items[0]?.deadline;


            const card =
                document.createElement("button");

            card.type = "button";
            card.className = "course-card";


            // Matkul yang punya deadline ≤ 3 hari diberi
            // penanda visual, bukan hanya warna teks.
            if (items.some((task) => {

                return isWithinThreeDays(task.deadline) &&
                    normalizeStatus(task.status) !== "Completed";

            })) {

                card.classList.add("is-urgent");

            }


            card.innerHTML = `

                <div class="course-card-label">
                    // MATA KULIAH
                </div>

                <div class="course-card-title">
                    ${escapeHtml(subject)}
                </div>

                <div class="course-card-meta">

                    <span class="course-card-count">
                        ${items.length} TASK${items.length > 1 ? "S" : ""}
                    </span>

                    <span class="course-card-count">
                        ${open} OPEN
                    </span>

                </div>

                <div class="course-card-next">
                    NEXT // ${escapeHtml(formatDate(next))}
                </div>

            `;


            card.setAttribute(
                "aria-label",
                `Open ${subject}, ${items.length} tasks, ` +
                `next deadline ${formatDate(next)}`
            );


            card.addEventListener(
                "click",
                () => {

                    openCourseDetail(subject);

                }
            );


            courseDirectory.appendChild(card);

        }
    );

}


// =========================================================
// HALAMAN DETAIL MATA KULIAH
// =========================================================

function openCourseDetail(subject) {

    // activeCourse dipakai openAddTaskModal() untuk mengisi
    // otomatis nama matkul di form.
    activeCourse = subject;


    showPage(
        courseDetailSection,
        { button: null }
    );


    renderCourseDetail();

}


function renderCourseDetail() {

    if (!courseDetailContainer) return;


    const subject =
        activeCourse;


    courseDetailContainer.innerHTML = "";


    if (!subject) {

        return;

    }


    const items =
        tasks.filter((task) => {

            const name =
                String(task.class_name || "").trim() ||
                "UNASSIGNED";

            return name === subject;

        });


    if (courseDetailTitle) {

        courseDetailTitle.textContent = subject;

    }


    if (courseDetailSubtitle) {

        const open =
            countOpenTasks(items);


        courseDetailSubtitle.textContent =
            `${items.length} TASK${items.length === 1 ? "" : "S"}` +
            ` · ${open} OPEN` +
            ` · NEXT DEADLINE ${formatDate(items[0]?.deadline)}`;

    }


    if (items.length === 0) {

        courseDetailContainer.appendChild(
            buildEmptyState(
                "No tasks in this course",
                "Every task for this course was removed."
            )
        );

        return;

    }


    items.forEach((task) => {

        courseDetailContainer.appendChild(
            createTaskCard(task)
        );

    });

}


courseBackButton?.addEventListener(
    "click",
    () => {

        showHome();

    }
);


// =========================================================
// KALENDER
//  Grid bulanan; tiap tanggal yang punya deadline diberi
//  titik penanda status. Klik tanggal -> daftar tugasnya.
// =========================================================

// Bulan yang sedang ditampilkan (selalu tanggal 1).
let calendarCursor =
    new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
    );

// Tanggal yang dipilih, format "YYYY-MM-DD".
let calendarSelectedDate = null;


function toDateKey(date) {

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


// Kunci tanggal untuk penanda status. Overdue didahulukan
// supaya tanggal yang sudah lewat tidak terlihat "aman".
function statusDotClass(task) {

    const normalized =
        normalizeStatus(task.status);


    if (normalized === "Completed") {

        return "completed";

    }


    if (isOverdue(task)) {

        return "overdue";

    }


    if (normalized === "In Progress") {

        return "progress";

    }


    return "pending";

}


function renderCalendar() {

    if (!calendarGrid) return;


    const year =
        calendarCursor.getFullYear();

    const month =
        calendarCursor.getMonth();


    // Label bulan
    if (calendarMonthLabel) {

        calendarMonthLabel.textContent =
            calendarCursor
                .toLocaleDateString(
                    "en-GB",
                    {
                        month: "long",
                        year: "numeric"
                    }
                )
                .toUpperCase();

    }


    // Kelompokkan tugas per tanggal deadline
    const byDate = new Map();

    tasks.forEach((task) => {

        if (!task.deadline) return;


        if (!byDate.has(task.deadline)) {

            byDate.set(task.deadline, []);

        }


        byDate.get(task.deadline).push(task);

    });


    // Ringkasan bulan: berapa deadline yang jatuh di bulan ini.
    // Membuat kepala kalender terasa "hidup", bukan sekadar label.
    let monthTaskCount = 0;

    byDate.forEach((list, key) => {

        if (key.startsWith(
            `${year}-${String(month + 1).padStart(2, "0")}`
        )) {

            monthTaskCount += list.length;

        }

    });


    if (calendarMonthCount) {

        // Saat data gagal dimuat, "NO DEADLINES" akan menyesatkan:
        // seolah memang tidak ada tugas. Bedakan keduanya.
        if (loadFailureMessage) {

            calendarMonthCount.textContent = "DATA UNAVAILABLE";

        }
        else {

            calendarMonthCount.textContent =
                monthTaskCount === 0
                    ? "NO DEADLINES"
                    : `${monthTaskCount} DEADLINE` +
                      `${monthTaskCount > 1 ? "S" : ""} THIS MONTH`;

        }

        calendarMonthCount.classList.toggle(
            "is-empty",
            monthTaskCount === 0 || Boolean(loadFailureMessage)
        );

    }


    // Senin = kolom pertama. getDay() memakai Minggu = 0,
    // jadi digeser: (0+6)%7 = 6 (Minggu di kolom terakhir).
    const firstOfMonth =
        new Date(year, month, 1);

    const leadingBlanks =
        (firstOfMonth.getDay() + 6) % 7;

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();


    // 35 atau 42 sel supaya grid selalu penuh satu minggu.
    const totalCells =
        Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;


    const todayKey =
        toDateKey(new Date());


    calendarGrid.innerHTML = "";


    for (let index = 0; index < totalCells; index += 1) {

        const dayNumber =
            index - leadingBlanks + 1;

        const cellDate =
            new Date(year, month, dayNumber);

        const key =
            toDateKey(cellDate);

        const dayTasks =
            byDate.get(key) || [];


        const cell =
            document.createElement("button");

        cell.type = "button";
        cell.className = "calendar-day";
        cell.dataset.date = key;


        if (cellDate.getMonth() !== month) {

            cell.classList.add("is-outside");

        }


        if (key === todayKey) {

            cell.classList.add("is-today");

        }


        if (dayTasks.length > 0) {

            cell.classList.add("has-tasks");

        }


        if (key === calendarSelectedDate) {

            cell.classList.add("is-selected");

        }


        // Titik penanda: satu titik per status unik, maksimal 3
        // supaya sel tetap rapi di layar sempit.
        const dotClasses =
            Array.from(
                new Set(dayTasks.map(statusDotClass))
            ).slice(0, 3);


        const hasOverdue =
            dotClasses.includes("overdue");


        if (hasOverdue) {

            cell.classList.add("is-urgent");

        }


        // Cuplikan tugas pertama: memberi isi pada sel sehingga
        // kalender tidak lagi terasa seperti tabel angka kosong.
        // `course` di sini adalah judul tugas (mis. "Laporan
        // Praktikum 7"), jauh lebih informatif daripada kategori.
        const firstTaskLabel =
            dayTasks.length > 0
                ? (dayTasks[0].course ||
                   dayTasks[0].category ||
                   "Task")
                : "";


        cell.innerHTML = `

            <span class="calendar-day-top">

                <span class="calendar-day-number">
                    ${cellDate.getDate()}
                </span>

                ${
                    dayTasks.length > 0
                        ? `<span class="calendar-day-badge">
                               ${dayTasks.length}
                           </span>`
                        : ""
                }

            </span>

            ${
                dayTasks.length > 0
                    ? `<span class="calendar-day-preview">
                           ${escapeHtml(firstTaskLabel)}
                       </span>
                       <span class="calendar-dots">
                           ${dotClasses
                               .map((name) => {

                                   return `<span class="calendar-dot ${name}"></span>`;

                               })
                               .join("")}
                       </span>`
                    : ""
            }

        `;


        const readableDate =
            cellDate.toLocaleDateString(
                "en-GB",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );


        cell.setAttribute(
            "aria-label",
            dayTasks.length > 0
                ? `${readableDate}, ${dayTasks.length} task` +
                  `${dayTasks.length > 1 ? "s" : ""}`
                : `${readableDate}, no tasks`
        );


        cell.addEventListener(
            "click",
            () => {

                selectCalendarDay(key);

            }
        );


        calendarGrid.appendChild(cell);

    }

}


function selectCalendarDay(key) {

    calendarSelectedDate = key;


    // Tandai ulang tanpa membangun seluruh grid dari awal:
    // cukup pindahkan class .is-selected.
    calendarGrid
        .querySelectorAll(".calendar-day")
        .forEach((cell) => {

            cell.classList.toggle(
                "is-selected",
                cell.dataset.date === key
            );

        });


    renderCalendarDayList(key);

}


function renderCalendarDayList(key) {

    if (!calendarDayList) return;


    const dayTasks =
        tasks.filter((task) => {

            return task.deadline === key;

        });


    const date =
        new Date(key + "T00:00:00");


    if (calendarDayTitle) {

        calendarDayTitle.textContent =
            date.toLocaleDateString(
                "en-GB",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );

    }


    calendarDayList.innerHTML = "";


    if (dayTasks.length === 0) {

        calendarDayList.appendChild(
            buildEmptyState(
                "Nothing due",
                "No deadline on this date."
            )
        );

        return;

    }


    dayTasks.forEach((task) => {

        calendarDayList.appendChild(
            createTaskCard(task)
        );

    });

}


function shiftCalendarMonth(offset) {

    calendarCursor =
        new Date(
            calendarCursor.getFullYear(),
            calendarCursor.getMonth() + offset,
            1
        );


    // Pilihan tanggal dibuang: tanggal yang sama di bulan lain
    // belum tentu punya tugas.
    calendarSelectedDate = null;


    if (calendarDayTitle) {

        calendarDayTitle.textContent = "Pick a date";

    }


    if (calendarDayList) {

        calendarDayList.innerHTML = "";

        calendarDayList.appendChild(
            buildEmptyState(
                "No date selected",
                "Choose a highlighted date above to see its tasks."
            )
        );

    }


    renderCalendar();

}


calendarPrev?.addEventListener(
    "click",
    () => {

        shiftCalendarMonth(-1);

    }
);


calendarNext?.addEventListener(
    "click",
    () => {

        shiftCalendarMonth(1);

    }
);


// Kembali ke bulan berjalan dan langsung buka tanggal hari ini.
calendarToday?.addEventListener(
    "click",
    () => {

        const now = new Date();


        calendarCursor =
            new Date(now.getFullYear(), now.getMonth(), 1);


        renderCalendar();

        selectCalendarDay(toDateKey(now));


        // Di layar sempit, daftar tugas tanggal terpilih ada di
        // bawah grid; bawa pengguna ke sana tanpa lompat mendadak.
        document
            .getElementById("calendarDayTitle")
            ?.scrollIntoView({
                block: "center",
                behavior: "smooth"
            });

    }
);


// =========================================================
// SEGARKAN HALAMAN YANG SEDANG TERBUKA
//  loadTasks() selalu memperbarui array `tasks`, tetapi tiap
//  halaman punya render sendiri. Tanpa ini, halaman detail
//  matkul dan kalender akan menampilkan data basi setelah
//  tambah/edit/hapus.
// =========================================================

function refreshActiveView() {

    renderCourseDirectory();


    if (courseDetailSection &&
        !courseDetailSection.classList.contains("hidden")) {

        renderCourseDetail();

    }


    // Kalender menempel di Beranda, jadi selalu ikut disegarkan
    // walaupun pengguna sedang berada di halaman lain: saat dia
    // kembali ke Beranda datanya sudah benar.
    renderCalendar();


    if (calendarSelectedDate) {

        renderCalendarDayList(calendarSelectedDate);

    }

}


// =========================================================
// CREATE TASK CARD
// =========================================================

// Label status submission yang ramah dibaca.
function submissionLabel(state) {

    const s = String(state || "").toUpperCase();

    if (s === "TURNED_IN" || s === "SUBMITTED" || s === "RETURNED") {
        return "SUBMITTED";
    }

    if (s === "CREATED" || s === "NEW") {
        return "NOT SUBMITTED";
    }

    if (s === "DRAFT") {
        return "DRAFT";
    }

    if (s === "REOPENED") {
        return "REOPENED";
    }

    return s || "UNKNOWN";

}


// Hanya izinkan http/https. Tanpa ini, tautan dari data LMS
// bisa berisi javascript: dan berjalan saat diklik.
function safeHref(url) {

    try {

        const u = new URL(String(url || ""), window.location.href);

        return u.protocol === "http:" || u.protocol === "https:"
            ? u.href
            : "";

    } catch {

        return "";

    }

}


// Waktu pengumpulan dari LMS berupa ISO. Ditampilkan dalam WIB
// supaya cocok dengan deadline yang juga WIB.
function formatSubmittedAt(nilai) {

    if (!nilai) return "";

    const t = new Date(nilai);

    if (Number.isNaN(t.getTime())) return "";

    try {

        return t.toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "medium",
            timeStyle: "short"
        }) + " WIB";

    } catch {

        return t.toISOString().slice(0, 16).replace("T", " ") + " UTC";

    }

}


// Bagian "soal & submission" di dalam kartu tugas. Hanya dibuat
// bila sync sudah mengisi lms_details. Memakai <details> bawaan
// browser: bisa dibuka/tutup tanpa JS dan tetap terbaca pembaca
// layar.
function buildLmsDetailHtml(task) {

    const details = task.lms_details;

    if (!details) return "";

    const description =
        String(details.description || "").trim();

    const submission =
        details.submission || null;

    const link =
        safeHref(details.link);

    const files =
        (submission?.files || []).filter(
            (f) => f && String(f.name || "").trim()
        );

    if (!description && !submission && !link) return "";

    const badge = submission
        ? `<span class="lms-state ${
            submissionLabel(submission.state) === "SUBMITTED"
                ? "is-done"
                : "is-open"
        }">${escapeHtml(submissionLabel(submission.state))}</span>`
        : "";

    const waktu = formatSubmittedAt(submission?.submitted_at);

    const filesHtml = files.map((f) => {

        const href = safeHref(f.url);
        const nama = escapeHtml(String(f.name));

        return href
            ? `<li><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${nama}</a></li>`
            : `<li>${nama}</li>`;

    }).join("");

    return `

        <details class="lms-detail">

            <summary>
                <span>SOAL &amp; SUBMISSION</span>
                ${badge}
            </summary>

            <div class="lms-body">

                ${description
                    ? `<p class="lms-text">${escapeHtml(description)}</p>`
                    : ""}

                ${waktu
                    ? `<div class="lms-meta">DIKUMPULKAN // ${escapeHtml(waktu)}</div>`
                    : ""}

                ${filesHtml
                    ? `<ul class="lms-files">${filesHtml}</ul>`
                    : ""}

                ${link
                    ? `<a class="lms-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">BUKA DI ${escapeHtml(String(task.category || "LMS").toUpperCase())}</a>`
                    : ""}

                ${buildMoodleSubmitHtml(task)}

            </div>

        </details>

    `;

}


// =========================================================
// SUBMIT TUGAS MOODLE DARI WEB
//
// Alur (diverifikasi ke Moodle asli):
//   1. core_files_get_unused_draft_itemid
//   2. POST webservice/upload.php (multipart, filearea=draft)
//   3. mod_assign_save_submission
//   4. mod_assign_submit_for_grading (abaikan warning bila
//      tugas tidak memakai mode draft — statusnya sudah submitted)
//   5. mod_assign_get_submission_status untuk memperbarui kartu
//
// Pembatalan: mod_assign_remove_submission (assignid + userid).
// Hanya berhasil selama belum dinilai pengajar.
// =========================================================

function moodleAssignmentId(task) {

    const bagian = String(task.external_id || "").split(":");

    return bagian[0] === "assign" ? bagian[2] || "" : "";

}


function buildMoodleSubmitHtml(task) {

    const assignmentId = moodleAssignmentId(task);

    if (!assignmentId) return "";

    const sudahKirim =
        String(task.lms_details?.submission?.state || "").toLowerCase() ===
        "submitted";

    const punyaToken =
        !!loadMoodleConfig()?.token;

    return `

        <form class="lms-submit" data-assign="${escapeHtml(assignmentId)}">

            ${sudahKirim
                ? ""
                : `
                <label class="lms-field">
                    <span>BERKAS</span>
                    <input type="file" class="lms-file" multiple>
                </label>

                <label class="lms-field">
                    <span>CATATAN (OPSIONAL)</span>
                    <textarea class="lms-note" rows="2" maxlength="2000"></textarea>
                </label>
                `}

            <div class="lms-submit-actions">

                ${sudahKirim
                    ? `<button type="button" class="lms-remove-button">BATALKAN PENGUMPULAN</button>`
                    : `<button type="submit" class="lms-submit-button">KIRIM TUGAS</button>`}

            </div>

            <div class="lms-submit-status" role="status" aria-live="polite">
                <span class="lms-token-warning"${punyaToken ? " hidden" : ""}>Token Moodle belum tersimpan.</span>
                <button type="button" class="lms-token-link"${punyaToken ? " hidden" : ""}>HUBUNGKAN</button>
            </div>

        </form>

    `;

}


// Bentuk submission dari balasan Moodle, sama dengan yang
// dipakai scripts/sync-lms.mjs.
function ringkasMoodleSubmissionBrowser(status) {

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

    if (!sub.status && files.length === 0) return null;

    return {
        state: sub.status || "",
        submitted_at: sub.timemodified
            ? new Date(Number(sub.timemodified) * 1000).toISOString()
            : null,
        files
    };

}


async function simpanSubmissionLokal(task, config, assignmentId) {

    const status = await moodleRest(config, {
        wsfunction: "mod_assign_get_submission_status",
        assignid: assignmentId
    });

    task.lms_details = task.lms_details || {};

    task.lms_details.submission =
        ringkasMoodleSubmissionBrowser(status);

    // Simpan juga ke database supaya perangkat lain melihat
    // status terbaru tanpa menunggu sync berikutnya.
    if (supabaseClient) {

        const { error } = await supabaseClient
            .from("tasks")
            .update({ lms_details: task.lms_details })
            .eq("id", task.id);

        if (error) console.error(error);

    }

    renderTasks();
    refreshActiveView();

}


async function submitMoodleAssignment(task, files, catatan) {

    const config = loadMoodleConfig();

    if (!config?.token || !config.url) {

        throw new Error(
            "Token Moodle belum tersimpan. Hubungkan di halaman SYNC."
        );

    }

    const assignmentId = moodleAssignmentId(task);

    if (!assignmentId) {

        throw new Error("Tugas ini tidak terhubung ke assignment Moodle.");

    }

    // 1. Tempat penampungan sementara untuk berkas.
    const draft = await moodleRest(config, {
        wsfunction: "core_files_get_unused_draft_itemid"
    });

    let itemid = String(draft?.itemid || "0");

    // 2. Unggah berkas. multipart/form-data termasuk "simple
    // request", jadi tidak memicu preflight CORS.
    if (files.length) {

        const body = new FormData();

        body.append("token", config.token);
        body.append("filearea", "draft");
        body.append("itemid", itemid);

        files.forEach((file, index) => {
            body.append("file_" + (index + 1), file, file.name);
        });

        const res = await fetch(
            normalizeSiteUrl(config.url) + "/webservice/upload.php",
            { method: "POST", body }
        );

        const teks = await res.text();

        if (!res.ok) {

            throw new Error("Unggah berkas gagal (HTTP " + res.status + ").");

        }

        let hasil;

        try {

            hasil = JSON.parse(teks);

        } catch {

            throw new Error("Balasan unggah bukan JSON.");

        }

        if (hasil?.error) throw new Error(hasil.error);

        // Moodle mengembalikan itemid baru untuk berkas yang
        // benar-benar tersimpan.
        if (Array.isArray(hasil) && hasil[0]?.itemid) {

            itemid = String(hasil[0].itemid);

        }

    }

    // 3. Simpan submission.
    await moodleRest(config, {
        wsfunction: "mod_assign_save_submission",
        assignmentid: assignmentId,
        "plugindata[files_filemanager]": itemid,
        "plugindata[onlinetext_editor][text]": catatan,
        "plugindata[onlinetext_editor][format]": "1",
        "plugindata[onlinetext_editor][itemid]": "0"
    });

    // 4. Finalisasi. Tugas tanpa mode draft sudah berstatus
    // "submitted" setelah langkah 3; Moodle hanya mengembalikan
    // warning, bukan error, jadi aman diabaikan.
    await moodleRest(config, {
        wsfunction: "mod_assign_submit_for_grading",
        assignmentid: assignmentId,
        acceptsubmissionstatement: "1"
    }).catch(() => null);

    // 5. Perbarui kartu.
    await simpanSubmissionLokal(task, config, assignmentId);

}


async function removeMoodleSubmission(task) {

    const config = loadMoodleConfig();

    if (!config?.token || !config.url) {

        throw new Error(
            "Token Moodle belum tersimpan. Hubungkan di halaman SYNC."
        );

    }

    const assignmentId = moodleAssignmentId(task);

    const info = await moodleRest(config, {
        wsfunction: "core_webservice_get_site_info"
    });

    await moodleRest(config, {
        wsfunction: "mod_assign_remove_submission",
        assignid: assignmentId,
        userid: info.userid
    });

    await simpanSubmissionLokal(task, config, assignmentId);

}


function wireMoodleSubmit(card, task) {

    const form = card.querySelector(".lms-submit");

    if (!form) return;

    const statusEl = form.querySelector(".lms-submit-status");

    const peringatanToken = form.querySelector(".lms-token-warning");
    const tombolToken = form.querySelector(".lms-token-link");

    // Token bisa dihubungkan setelah kartu dirender (atau di tab lain),
    // jadi status token dicek ulang tiap panel dibuka.
    const cekToken = () => {

        const ada = !!loadMoodleConfig()?.token;

        if (peringatanToken) peringatanToken.hidden = ada;
        if (tombolToken) tombolToken.hidden = ada;

    };

    cekToken();

    form.closest("details")?.addEventListener("toggle", cekToken);

    tombolToken?.addEventListener("click", () => {

        showPage(syncSection, { button: syncMenu });
        moodleUsername.focus();

    });

    const setStatus = (pesan, jenis = "") => {

        statusEl.textContent = pesan;

        statusEl.className = "lms-submit-status" + (jenis ? " " + jenis : "");

    };

    const jalankan = async (kerja, pesanSukses) => {

        const tombol = form.querySelector("button");

        if (tombol) tombol.disabled = true;

        try {

            setStatus("Memproses…");

            await kerja();

            setStatus(pesanSukses, "success");

        } catch (error) {

            setStatus(error.message || "Gagal.", "error");

            if (tombol) tombol.disabled = false;

        }

    };

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const files = [
            ...form.querySelectorAll(".lms-file")
        ].flatMap((input) => [...input.files]);

        const catatan =
            form.querySelector(".lms-note")?.value.trim() || "";

        if (!files.length && !catatan) {

            setStatus("Pilih berkas atau isi catatan dulu.", "error");

            return;

        }

        const lanjut = await openConfirmModal({
            title: "KIRIM TUGAS?",
            message:
                "Pengumpulan langsung dikirim ke Moodle dan terlihat " +
                "oleh pengajar. Masih bisa dibatalkan selama belum dinilai.",
            acceptLabel: "KIRIM",
            cancelLabel: "BATAL"
        });

        if (!lanjut) return;

        jalankan(
            () => submitMoodleAssignment(task, files, catatan),
            "Terkirim ke Moodle."
        );

    });

    form.querySelector(".lms-remove-button")?.addEventListener(
        "click",
        async () => {

            const lanjut = await openConfirmModal({
                title: "BATALKAN PENGUMPULAN?",
                message:
                    "Berkas yang sudah dikirim akan dihapus dari Moodle. " +
                    "Hanya bisa selama tugas belum dinilai.",
                acceptLabel: "BATALKAN",
                cancelLabel: "TUTUP"
            });

            if (!lanjut) return;

            jalankan(
                () => removeMoodleSubmission(task),
                "Pengumpulan dibatalkan."
            );

        }
    );

}


function createTaskCard(task) {

    const card =
        document.createElement("div");

    card.className = "task-card";


    const deadlineInfo =
        getDeadlineInfo(task.deadline);

    const statusInfo =
        getStatusInfo(task.status);


    card.innerHTML = `

        <div class="task-info">

            <div class="task-label">
                TASK
            </div>

            <h3>
                ${escapeHtml(task.course)}
            </h3>

            <div class="task-class">
                CLASS // ${escapeHtml(task.class_name)}
            </div>

            <div class="task-meta-row">
                <div class="category-badge">
                    ${escapeHtml(task.category)}
                </div>

                <div class="status-badge ${statusInfo.className}">
                    ${escapeHtml(statusInfo.label)}
                </div>
            </div>

        </div>


        <div class="task-deadline">

            <div class="deadline-label">
                DEADLINE
            </div>

            <div class="deadline-date">
                ${formatDate(task.deadline)}
            </div>

            <div class="deadline-warning ${
                deadlineInfo.overdue
                    ? "overdue"
                    : ""
            }">

                ${deadlineInfo.text}

            </div>

        </div>


        <div class="task-actions">

            <button
                class="edit-button"
                type="button"
                data-id="${task.id}"
            >
                EDIT
            </button>

            <button
                class="delete-button"
                type="button"
                data-id="${task.id}"
            >
                DELETE
            </button>

        </div>


        ${buildLmsDetailHtml(task)}

    `;


    const editButton =
        card.querySelector(".edit-button");

    const deleteButton =
        card.querySelector(".delete-button");


    editButton.addEventListener(
        "click",
        () => {

            openEditModal(task);

        }
    );


    deleteButton.addEventListener(
        "click",
        () => {

            deleteTask(task);

        }
    );


    wireMoodleSubmit(card, task);


    return card;

}


// =========================================================
// EDIT TASK
// =========================================================

let lastFocusedElement = null;


function isEditModalOpen() {

    return !editModal.classList.contains("hidden");

}


function openEditModal(task) {

    lastFocusedElement =
        document.activeElement;


    editId.value =
        task.id;

    editCourse.value =
        task.course || "";

    editClassName.value =
        task.class_name || "";

    editDeadline.value =
        normalizeDateInput(task.deadline);

    editCategory.value =
        task.category || "";

    editStatus.value =
        normalizeStatus(task.status);


    editModal.classList.remove("hidden");

    editCourse.focus();

}


function normalizeDateInput(dateValue) {

    if (!dateValue) {

        return "";

    }


    return String(dateValue).slice(0, 10);

}


function closeEditModal(restoreFocus = true) {

    editModal.classList.add("hidden");

    if (restoreFocus &&
        lastFocusedElement &&
        typeof lastFocusedElement.focus === "function") {

        lastFocusedElement.focus();

    }

    lastFocusedElement = null;

}


// Karena list di-render ulang setelah simpan, elemen tombol lama sudah
// dilepas dari DOM. Cari tombol berdasarkan id task terbaru, lalu fokuskan.

// Kartu tugas sekarang muncul di tiga tempat: daftar semua tugas,
// halaman detail mata kuliah, dan daftar tugas pada kalender
// (kalender ada di Beranda). Fokus harus dikembalikan ke wadah
// yang benar-benar terlihat, bukan selalu ke #taskContainer.
function activeTaskScope() {

    if (courseDetailSection &&
        !courseDetailSection.classList.contains("hidden")) {

        return courseDetailContainer;

    }


    if (homePage &&
        !homePage.classList.contains("hidden") &&
        calendarSelectedDate &&
        calendarDayList) {

        return calendarDayList;

    }


    return taskContainer;

}


function focusTaskButton(kind, id) {

    const selector =
        kind === "edit"
            ? ".edit-button"
            : ".delete-button";


    const scope =
        activeTaskScope();


    const button =
        scope
            ? Array.from(
                scope.querySelectorAll(selector)
            ).find((item) => item.dataset.id === id)
            : null;


    if (button) {

        button.focus();

    }
    else {

        mainContent.focus();

    }

}


function focusAfterDelete() {

    const scope =
        activeTaskScope();


    const remaining =
        scope
            ? scope.querySelector(".delete-button")
            : null;

    if (remaining) {

        remaining.focus();

    }
    else {

        mainContent.focus();

    }

}


closeModal.addEventListener(
    "click",
    closeEditModal
);


editModal.addEventListener(
    "click",
    (event) => {

        if (event.target === editModal) {

            closeEditModal();

        }

    }
);


// KEYBOARD: ESC UNTUK TUTUP + FOCUS TRAP DI DALAM MODAL
//  Berlaku untuk modal edit maupun modal konfirmasi hapus.

document.addEventListener(
    "keydown",
    (event) => {

        // Modal konfirmasi diprioritaskan: ia berada di lapisan
        // teratas dan menunggu keputusan pengguna.
        const activeModal =
            isConfirmModalOpen()
                ? confirmModal
                : (isEditModalOpen()
                    ? editModal
                    : null);


        if (!activeModal) {

            return;

        }


        if (event.key === "Escape") {

            event.preventDefault();


            if (activeModal === confirmModal) {

                closeConfirmModal(false);

            }
            else {

                closeEditModal();

            }


            return;

        }


        if (event.key !== "Tab") {

            return;

        }


        const focusable =
            activeModal.querySelectorAll(
                "button, input, select, textarea, a[href]"
            );


        if (focusable.length === 0) {

            return;

        }


        const first = focusable[0];
        const last =
            focusable[focusable.length - 1];


        if (event.shiftKey &&
            document.activeElement === first) {

            event.preventDefault();
            last.focus();

        }
        else if (!event.shiftKey &&
            document.activeElement === last) {

            event.preventDefault();
            first.focus();

        }
        else if (
            !activeModal.contains(document.activeElement)
        ) {

            event.preventDefault();
            first.focus();

        }

    }
);


// =========================================================
// SIMPAN EDIT
// =========================================================

editForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const id =
            editId.value;

        const course =
            editCourse.value.trim();

        const className =
            editClassName.value.trim();

        const deadline =
            editDeadline.value;

        const category =
            editCategory.value.trim();

        const status =
            normalizeStatus(editStatus.value);


        if (
            !id ||
            !course ||
            !className ||
            !deadline ||
            !category
        ) {

            showToast("All fields are required.", "error");

            return;

        }


        if (!supabaseClient) {

            showToast(
                "Database client is unavailable. Reload the page.",
                "error"
            );

            return;

        }


        markLocalWrite();

        const {
            data: updatedRows,
            error
        } = await supabaseClient
            .from("tasks")
            .update({
                course: course,
                class_name: className,
                deadline: deadline,
                category: category,
                status: status
            })
            .eq("id", id)
            .select("id");

        if (error) {

            console.error(error);

            showToast(
                "Task update failed: " + error.message,
                "error"
            );

            return;

        }


        if (!updatedRows || updatedRows.length === 0) {

            showToast(
                "No changes detected. Check the task update policy for anon access.",
                "warning"
            );

            return;

        }


        showToast("Task updated successfully.", "success");


        closeEditModal(false);

        await loadTasks();

        focusTaskButton("edit", id);

    }
);


// =========================================================
// CONFIRM MODAL (pengganti window.confirm bawaan browser)
//  window.confirm memblokir thread dan tidak bisa di-styling,
//  sehingga tampil asing di tema Ghost Matrix. Modal ini
//  mengembalikan Promise<boolean> dan mengikuti perilaku
//  aksesibilitas modal edit (Escape, focus trap, backdrop).
// =========================================================

let confirmResolver = null;
let confirmReturnFocus = null;


function isConfirmModalOpen() {

    return !confirmModal.classList.contains("hidden");

}


function openConfirmModal({

    title = "Confirm?",
    message = "",
    acceptLabel = "DELETE",
    cancelLabel = "ABORT"

}) {

    return new Promise((resolve) => {

        // Klik DELETE dua kali cepat: abaikan permintaan kedua,
        // modal masih terbuka untuk permintaan pertama.
        if (confirmResolver) {

            resolve(false);

            return;

        }


        confirmResolver = resolve;

        confirmReturnFocus = document.activeElement;


        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmAccept.textContent = acceptLabel;
        confirmCancel.textContent = cancelLabel;


        confirmModal.classList.remove("hidden");

        confirmCancel.focus();

    });

}


function closeConfirmModal(result) {

    confirmModal.classList.add("hidden");


    if (confirmReturnFocus &&
        typeof confirmReturnFocus.focus === "function") {

        confirmReturnFocus.focus();

    }

    confirmReturnFocus = null;


    const resolver = confirmResolver;

    confirmResolver = null;


    if (resolver) {

        resolver(result);

    }

}


function askConfirmation(message, options = {}) {

    return openConfirmModal({
        ...options,
        message: message
    });

}


confirmAccept.addEventListener(
    "click",
    () => closeConfirmModal(true)
);


confirmCancel.addEventListener(
    "click",
    () => closeConfirmModal(false)
);


confirmModal.addEventListener(
    "click",
    (event) => {

        // Klik di area gelap luar = batal (sama seperti Escape)
        if (event.target === confirmModal) {

            closeConfirmModal(false);

        }

    }
);


// =========================================================
// DELETE TASK
// =========================================================

async function deleteTask(task) {

    const id = task?.id;


    const label =
        [task?.course, task?.class_name]
            .filter(Boolean)
            .join(" / ");


    const isSynced =
        task?.source === "moodle" ||
        task?.source === "classroom";


    const confirmation =
        await askConfirmation(
            label
                ? `"${label}" will be deleted from ` +
                  "the matrix. This action is permanent " +
                  "and visible to everyone sharing " +
                  "the ledger." +
                  (isSynced
                      ? " It is a synced task, so it will " +
                        "not come back on the next sync."
                      : "")
                : "Delete this task from the matrix? " +
                  "This action is permanent and visible " +
                  "to everyone sharing the ledger.",
            {
                title: label
                    ? `Purge "${label}"?`
                    : "Delete Task?"
            }
        );


    if (!confirmation) {

        return;

    }


    if (!supabaseClient) {

        showToast(
            "Database client is unavailable. Reload the page.",
            "error"
        );

        return;

    }


    // Tugas hasil sync TIDAK dihapus permanen.
    //  Sync berikutnya mencari baris berdasarkan external_id;
    //  kalau barisnya hilang, tugas akan di-insert ulang dan
    //  seolah tombol DELETE tidak berfungsi. Karena itu baris
    //  hanya ditandai dismissed_at dan disembunyikan dari daftar.
    //  Bila kolom itu belum ada (migrasi belum dijalankan),
    //  jatuh kembali ke hapus permanen.
    if (isSynced && dismissSupported) {

        markLocalWrite();

        const {
            data: dismissedRows,
            error: dismissError
        } = await supabaseClient
            .from("tasks")
            .update({
                dismissed_at: new Date().toISOString()
            })
            .eq("id", id)
            .select("id");


        if (dismissError?.code === "42703") {

            // Kolom belum ada — pakai jalur hapus biasa di bawah.
            dismissSupported = false;

        }
        else if (dismissError) {

            console.error(dismissError);

            showToast(
                "Task removal failed: " + dismissError.message,
                "error"
            );

            return;

        }
        else {

            if (!dismissedRows || dismissedRows.length === 0) {

                showToast(
                    "No task was removed. Check the update policy for anon access.",
                    "warning"
                );

                return;

            }


            showToast(
                "Synced task dismissed. It will not return on the next sync.",
                "success"
            );

            await loadTasks();

            focusAfterDelete();

            return;

        }

    }


    markLocalWrite();

    const {
        data: deletedRows,
        error
    } = await supabaseClient
        .from("tasks")
        .delete()
        .eq("id", id)
        .select("id");


    if (error) {

        console.error(error);

        showToast(
            "Task removal failed: " + error.message,
            "error"
        );

        return;

    }


    if (!deletedRows || deletedRows.length === 0) {

        showToast(
            "No task was removed. Check the delete policy for anon access.",
            "warning"
        );

        return;

    }


    showToast("Task removed from the matrix.", "success");


    await loadTasks();

    focusAfterDelete();

}


// =========================================================
// STATISTICS
//  Hanya dua kartu di Beranda: TOTAL TASKS dan PRIORITY.
//  Kartu OVERDUE dihapus sesuai permintaan.
// =========================================================

function updateStatistics() {

    // Saat data gagal dimuat, angka 0 akan menyesatkan: seolah
    // memang tidak ada tugas. Tampilkan tanda hubung.
    if (loadFailureMessage) {

        totalTasks.textContent = "—";
        upcomingTasks.textContent = "—";

        return;

    }


    totalTasks.textContent =
        tasks.length;


    const upcoming =
        tasks.filter((task) => {

            return isWithinThreeDays(
                task.deadline
            );

        });


    upcomingTasks.textContent =
        upcoming.length;

}


// =========================================================
// TERLEWAT (DEADLINE LEBIH DARI HARI INI)
// =========================================================

function isOverdue(task) {

    if (!task.deadline) {

        return false;

    }


    const status =
        normalizeStatus(task.status);

    if (status === "Completed") {

        return false;

    }


    const today =
        startOfDay(new Date());


    const target =
        startOfDay(
            new Date(task.deadline + "T00:00:00")
        );


    return target < today;

}


// =========================================================
// DEADLINE ≤ 3 HARI
// =========================================================

function isWithinThreeDays(deadline) {

    if (!deadline) {

        return false;

    }


    const today =
        startOfDay(
            new Date()
        );


    const target =
        startOfDay(
            new Date(
                deadline + "T00:00:00"
            )
        );


    const difference =
        target - today;


    const days =
        Math.round(
            difference /
            (1000 * 60 * 60 * 24)
        );


    return days >= 0 && days <= 3;

}


// =========================================================
// NORMALISASI STATUS
//  Database lama menyimpan status dalam bahasa Indonesia
//  ("Belum Dikerjakan", "Sedang Dikerjakan", "Selesai").
//  Form hanya mengenal tiga nilai baku: Pending,
//  In Progress, Completed. Tanpa pemetaan ini, <select>
//  pada modal edit menjadi kosong (tidak ada <option> yang
//  cocok) sehingga form required tidak bisa disubmit, dan
//  nilai lama ikut tertimpa.
// =========================================================

const STATUS_ALIASES = {
    "belum dikerjakan": "Pending",
    "belum": "Pending",
    "pending": "Pending",
    "todo": "Pending",
    "to do": "Pending",
    "baru": "Pending",

    "sedang dikerjakan": "In Progress",
    "dikerjakan": "In Progress",
    "in progress": "In Progress",
    "progress": "In Progress",
    "proses": "In Progress",

    "selesai": "Completed",
    "sudah selesai": "Completed",
    "completed": "Completed",
    "complete": "Completed",
    "done": "Completed"
};


// Mengembalikan salah satu nilai baku form:
// "Pending" | "In Progress" | "Completed".
// Nilai tak dikenal diperlakukan sebagai "Pending".
function normalizeStatus(statusValue) {

    const key =
        String(statusValue || "")
            .trim()
            .toLowerCase();

    return STATUS_ALIASES[key] || "Pending";

}


function getStatusInfo(statusValue) {

    const normalized =
        normalizeStatus(statusValue);

    if (normalized === "Completed") {

        return {
            label: "Completed",
            className: "status-done"
        };

    }

    if (normalized === "In Progress") {

        return {
            label: "In Progress",
            className: "status-progress"
        };

    }

    return {
        label: "Pending",
        className: "status-pending"
    };

}


function getDeadlineInfo(deadline) {

    const today =
        startOfDay(
            new Date()
        );


    const target =
        startOfDay(
            new Date(
                deadline + "T00:00:00"
            )
        );


    const difference =
        target - today;


    const days =
        Math.round(
            difference /
            (1000 * 60 * 60 * 24)
        );


    if (days < 0) {

        return {
            text:
                `LATE BY ${Math.abs(days)} DAY(S)`,
            overdue: true
        };

    }


    if (days === 0) {

        return {
            text: "DUE TODAY",
            overdue: false
        };

    }


    return {
        text:
            `${days} DAYS LEFT`,
        overdue: false
    };

}


function startOfDay(date) {

    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

}


// =========================================================
// FORMAT TANGGAL
// =========================================================

function formatDate(dateString) {

    if (!dateString) {

        return "-";

    }


    const date =
        new Date(
            dateString + "T00:00:00"
        );


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// =========================================================
// JADWAL DARI EXCEL
// =========================================================

const scheduleData = [

    {
        hari: "Senin",
        jam: "09.20–12.00",
        mataKuliah: "Kapita Selekta",
        kelas: "RD",
        sks: "3",
        dosen: "Raidah Hanifah, S.T., M.T.",
        ruang: "GK2 207"
    },

    {
        hari: "Senin",
        jam: "13.00–15.40",
        mataKuliah: "Inteligensi Buatan",
        kelas: "RA",
        sks: "3",
        dosen: "Rahman Indra Kesuma, S.Kom., M.Cs.",
        ruang: "GK2 123"
    },

    {
        hari: "Selasa",
        jam: "13.00–15.40",
        mataKuliah: "Keamanan Siber",
        kelas: "R",
        sks: "3",
        dosen: "Sarwono Sutikno, Dr.Eng., CISA, CISSP, CISM",
        ruang: "Labtek 3, Lantai 3, Lab IOT"
    },

    {
        hari: "Rabu",
        jam: "09.20-11.50",
        mataKuliah: "Karier, Etika, & Kewirausahaan",
        kelas: "R47IF",
        sks: "2",
        dosen: "Bagus Aryatama M.OR",
        ruang: "F001"
    },

    {
        hari: "Rabu",
        jam: "13.00–15.00",
        mataKuliah: "Praktikum Jaringan Komputer",
        kelas: "RC",
        sks: "1",
        dosen: "Asisten Praktikum",
        ruang: "Labtek 3, Lantai 3, Lab IOT"
    },

    {
        hari: "Rabu",
        jam: "15.00-17.30",
        mataKuliah: "Kriptografi",
        kelas: "R",
        sks: "3",
        dosen: "King Angga Wijaya",
        ruang: "GK2 318"
    },

    {
        hari: "Kamis",
        jam: "13.00–15.40",
        mataKuliah: "Metodologi Penelitian",
        kelas: "RD",
        sks: "3",
        dosen: "Alya Khairunnisa Rizkita, S.Kom., M.Kom.",
        ruang: "GK2 224"
    },

    {
        hari: "Jumat",
        jam: "09.20-11.05",
        mataKuliah: "Sistem Informasi",
        kelas: "RD",
        sks: "2",
        dosen: "Miranti Verdiana, M.Si.",
        ruang: "GK2 305"
    },

    {
        hari: "Jumat",
        jam: "13.00-15.40",
        mataKuliah: "Jaringan Komputer",
        kelas: "RC",
        sks: "3",
        dosen: "Ilham Firman Ashari, S.Kom., M.T.",
        ruang: "GK2 303"
    }

];


function renderSchedule() {

    const scheduleBody =
        document.getElementById(
            "scheduleBody"
        );


    scheduleBody.innerHTML = "";


    scheduleData.forEach(
        (item) => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${escapeHtml(item.hari)}
                </td>

                <td>
                    ${escapeHtml(item.jam)}
                </td>

                <td>
                    ${escapeHtml(item.mataKuliah)}
                </td>

                <td>
                    ${escapeHtml(item.kelas)}
                </td>

                <td>
                    ${escapeHtml(item.sks)}
                </td>

                <td>
                    ${escapeHtml(item.dosen)}
                </td>

                <td>
                    ${escapeHtml(item.ruang)}
                </td>

            `;


            scheduleBody.appendChild(row);

        }
    );

}


// =========================================================
// SECURITY
// =========================================================

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

        return "";

    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =========================================================
// BOOT
//  Dulu data baru dimuat setelah user menekan "ENTER MATRIX"
//  di halaman hero. Halaman itu dihapus, jadi aplikasi sekarang
//  langsung terbuka di Beranda dan memuat data saat start.
// =========================================================

// Beranda tampil lebih dulu; pastikan tidak ada halaman lain
// yang ikut terlihat bila HTML diubah di masa depan.
PAGES.forEach((page) => {

    if (!page) return;

    page.classList.toggle("hidden", page !== homePage);

});


setActiveNav(homeMenu);

renderRealtimeStatus();
renderMoodleStatus();

// Pengaturan sync otomatis (filter kelas). Aman dipanggil
// walau database belum siap: semua galatnya ditampilkan di
// kartu, tidak menghentikan boot.
initAutoSync();

// Kalender adalah bagian Beranda, jadi grid-nya harus sudah
// tergambar sebelum data datang (label bulan + sel kosong), lalu
// diisi ulang oleh refreshActiveView() setelah loadTasks().
renderCalendar();

// silent: skeleton loading hanya relevan untuk daftar tugas,
// sedangkan saat boot user berada di Beranda (direktori matkul
// sudah punya placeholder "Loading course list").
loadTasks({ silent: true });

startRealtime();