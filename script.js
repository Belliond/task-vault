// =========================================================
// TASK VAULT
// SCRIPT.JS
// =========================================================


// =========================================================
// SUPABASE CONFIGURATION
// =========================================================

const SUPABASE_URL =
    "https://ixdwiazefaaajydcohgc.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_NowNDOlf5_ysmjIvbUSZXw_esLgw4Eg";


// Jika CDN Supabase gagal dimuat, jangan sampai seluruh script crash.
const supabaseClient =
    typeof window.supabase !== "undefined" &&
    typeof window.supabase.createClient === "function"
        ? window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        )
        : null;


// =========================================================
// DOM ELEMENT
// =========================================================

const homePage =
    document.getElementById("homePage");

const dashboardPage =
    document.getElementById("dashboardPage");

const enterDashboard =
    document.getElementById("enterDashboard");


const listMenu =
    document.getElementById("listMenu");

const scheduleMenu =
    document.getElementById("scheduleMenu");

const addMenu =
    document.getElementById("addMenu");


const taskListSection =
    document.getElementById("taskListSection");

const scheduleSection =
    document.getElementById("scheduleSection");

const addTaskSection =
    document.getElementById("addTaskSection");


const addTaskFromList =
    document.getElementById("addTaskFromList");


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

const overdueTasks =
    document.getElementById("overdueTasks");


const mainContent =
    document.getElementById("mainContent");


// =========================================================
// SYNC ELEMENT
// =========================================================

const syncMenu =
    document.getElementById("syncMenu");

const syncSection =
    document.getElementById("syncSection");

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
// =========================================================

function openDashboard() {

    homePage.classList.add("hidden");
    dashboardPage.classList.remove("hidden");

    loadTasks();

    mainContent.focus();

}


enterDashboard.addEventListener(
    "click",
    () => {

        openDashboard();

    }
);


function activateMenu(button) {

    document
        .querySelectorAll(".menu-button")
        .forEach((item) => {

            item.classList.remove("active");

        });

    button.classList.add("active");

}


// Tampilkan hanya SATU section di area konten utama
function showOnly(section) {

    [
        taskListSection,
        scheduleSection,
        addTaskSection,
        syncSection
    ].forEach((item) => {

        item.classList.toggle(
            "hidden",
            item !== section
        );

    });

}


// LIST TUGAS

listMenu.addEventListener(
    "click",
    () => {

        activateMenu(listMenu);

        showOnly(taskListSection);

        loadTasks();

    }
);


// JADWAL

scheduleMenu.addEventListener(
    "click",
    () => {

        activateMenu(scheduleMenu);

        showOnly(scheduleSection);

        renderSchedule();

    }
);


// ADD / DELETE

addMenu.addEventListener(
    "click",
    () => {

        activateMenu(addMenu);

        showOnly(addTaskSection);

    }
);


// SYNC LMS

syncMenu.addEventListener(
    "click",
    () => {

        activateMenu(syncMenu);

        showOnly(syncSection);

        renderMoodleStatus();


        // Muat daftar kelas (untuk picker) kalau sudah connect
        const config = loadMoodleConfig();


        if (config?.token) {

            tryRenderCoursePicker(config);

        }

    }
);


// TOMBOL TAMBAH DARI LIST

addTaskFromList.addEventListener(
    "click",
    () => {

        activateMenu(addMenu);

        showOnly(addTaskSection);

        document
            .getElementById("course")
            .focus();

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
            document
                .getElementById("status")
                .value
                .trim() || "Pending";


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


        activateMenu(listMenu);

        showOnly(taskListSection);

        await loadTasks();

    }
);


// =========================================================
// MOODLE SYNC (FASE 1)
// =========================================================

const MOODLE_STORAGE_KEY =
    "ghost_matrix_moodle_auth";


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
            "https://kuliah2.itera.ac.id";


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
            "https://kuliah2.itera.ac.id";


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


            // 5. Peta existing tugas Moodle (anti dobel)
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


            const existingIdByExternalId = new Map();

            (existingRows || []).forEach((row) => {

                existingIdByExternalId.set(
                    row.external_id,
                    row.id
                );

            });


            // 6. Insert / update per assignment
            let created = 0;
            let updated = 0;


            for (const item of active) {

                const externalId =
                    `assign:${item.courseId}:${item.id}`;

                const payload = {
                    course: item.name,
                    class_name:
                        courseNameById[item.courseId] || "-",
                    deadline:
                        unixToLocalDate(item.duedate),
                    category: "Moodle",
                    source: "moodle",
                    external_id: externalId,
                    synced_at:
                        new Date().toISOString()
                };


                const knownId =
                    existingIdByExternalId.get(externalId);


                if (knownId) {

                    // Update data dasar SAJA — status pilihan user
                    // (Pending/In Progress/Completed) tidak ditimpa.
                    const {
                        error: updateError
                    } = await supabaseClient
                        .from("tasks")
                        .update({
                            course: payload.course,
                            class_name: payload.class_name,
                            deadline: payload.deadline,
                            category: payload.category,
                            synced_at: payload.synced_at
                        })
                        .eq("id", knownId)
                        .select("id");


                    if (updateError) {

                        throw new Error(updateError.message);

                    }


                    updated += 1;

                }
                else {

                    let insertResult =
                        await supabaseClient
                            .from("tasks")
                            .insert([payload])
                            .select("id");


                    // Fallback bila kolom migrasi belum ada
                    if (insertResult.error &&
                        insertResult.error.code === "42703") {

                        throw new Error(
                            "Missing sync columns. Run SUPABASE_SETUP.sql first."
                        );

                    }


                    if (insertResult.error) {

                        throw new Error(
                            insertResult.error.message
                        );

                    }


                    created += 1;

                }

            }


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
            activateMenu(listMenu);

            showOnly(taskListSection);

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
const CLASSROOM_REDIRECT =
    "https://virst132109-glitch.github.io/task-vault/";


function loadClassroomClient() {

    return localStorage.getItem(
        CLASSROOM_CLIENT_KEY
    ) || "";

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


classroomIdForm.addEventListener(
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


async function tryRenderClassroomPicker() {

    try {

        const result =
            await classroomRest(
                "/v1/courses?studentId=me&courseStates=ACTIVE"
            );


        if (Array.isArray(result.courses) &&
            result.courses.length > 0) {

            renderClassroomPicker(result.courses);

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

            // 1. Daftar kelas aktif
            const result =
                await classroomRest(
                    "/v1/courses?studentId=me&courseStates=ACTIVE"
                );


            const courses =
                (result.courses || []).filter(
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

                const work =
                    await classroomRest(
                        `/v1/courses/${course.id}/courseWork` +
                        "?pageSize=100"
                    );


                (work.courseWork || []).forEach(
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


            // 5. Existing tugas Classroom (anti dobel)
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


            const existingIdByExternalId = new Map();

            (existingRows || []).forEach((row) => {

                existingIdByExternalId.set(
                    row.external_id,
                    row.id
                );

            });


            // 6. Insert / update
            let created = 0;
            let updated = 0;


            for (const item of active) {

                const externalId =
                    `gc:${item.courseId}:${item.id}`;


                const payload = {
                    course: item.title,
                    class_name:
                        item.courseName || "-",
                    deadline: item.deadline,
                    category: "Classroom",
                    source: "classroom",
                    external_id: externalId,
                    synced_at:
                        new Date().toISOString()
                };


                const knownId =
                    existingIdByExternalId.get(
                        externalId
                    );


                if (knownId) {

                    const {
                        error: updateError
                    } = await supabaseClient
                        .from("tasks")
                        .update({
                            course: payload.course,
                            class_name:
                                payload.class_name,
                            deadline: payload.deadline,
                            category: payload.category,
                            synced_at: payload.synced_at
                        })
                        .eq("id", knownId)
                        .select("id");


                    if (updateError) {

                        throw new Error(
                            updateError.message
                        );

                    }


                    updated += 1;

                }
                else {

                    const insertResult =
                        await supabaseClient
                            .from("tasks")
                            .insert([payload])
                            .select("id");


                    if (insertResult.error) {

                        throw new Error(
                            insertResult.error.message
                        );

                    }


                    created += 1;

                }

            }


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


            activateMenu(listMenu);

            showOnly(taskListSection);

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


function renderLoadError(message) {

    taskContainer.innerHTML = `
        <div class="empty-task">
            <div class="empty-icon">!</div>
            <h3>Data retrieval failed</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;

}


async function loadTasks() {

    renderLoadingState();


    if (!supabaseClient) {

        renderLoadError(
            "The database client failed to load. Check your internet connection and reload the page."
        );

        return;

    }


    const {
        data,
        error
    } = await supabaseClient
        .from("tasks")
        .select("*")
        .order("deadline", {
            ascending: true
        });


    if (error) {

        console.error(error);

        renderLoadError(error.message);

        return;

    }


    tasks = data || [];


    updateStatistics();

    renderTasks();

}


// =========================================================
// RENDER TASK
// =========================================================

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


        const chevron =
            document.createElement("span");

        chevron.className = "task-group-chevron";
        chevron.textContent = "▾";
        chevron.setAttribute(
            "aria-hidden",
            "true"
        );


        toggle.appendChild(title);
        toggle.appendChild(meta);
        toggle.appendChild(chevron);

        header.appendChild(toggle);


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


            header.appendChild(classes);

        }


        const cardsWrap =
            document.createElement("div");

        cardsWrap.className = "task-group-cards";


        visible.forEach((task) => {

            cardsWrap.appendChild(
                createTaskCard(task)
            );

        });


        toggle.addEventListener(
            "click",
            () => {

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
// CREATE TASK CARD
// =========================================================

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
        task.status || "Pending";


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
function focusTaskButton(kind, id) {

    const selector =
        kind === "edit"
            ? ".edit-button"
            : ".delete-button";


    const button =
        Array.from(
            taskContainer.querySelectorAll(selector)
        ).find((item) => item.dataset.id === id);


    if (button) {

        button.focus();

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
            editStatus.value.trim() || "Pending";


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


    const confirmation =
        await askConfirmation(
            label
                ? `"${label}" will be deleted from ` +
                  "the matrix. This action is permanent " +
                  "and visible to everyone sharing " +
                  "the ledger."
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

    const remaining =
        taskContainer.querySelector(".delete-button");

    if (remaining) {

        remaining.focus();

    }
    else {

        mainContent.focus();

    }

}


// =========================================================
// STATISTICS
// =========================================================

function updateStatistics() {

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


    const overdue =
        tasks.filter((task) => {

            return isOverdue(task);

        });


    overdueTasks.textContent =
        overdue.length;

}


// =========================================================
// TERLEWAT (DEADLINE LEBIH DARI HARI INI)
// =========================================================

function isOverdue(task) {

    if (!task.deadline) {

        return false;

    }


    const status =
        String(task.status || "").trim();

    if (status === "Completed" || status === "Selesai") {

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


function getStatusInfo(statusValue) {

    const normalized = String(statusValue || "Pending").trim();

    if (normalized === "Completed" || normalized === "Selesai") {

        return {
            label: "Completed",
            className: "status-done"
        };

    }

    if (normalized === "In Progress" || normalized === "Sedang Dikerjakan") {

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