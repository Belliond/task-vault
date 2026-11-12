/* =========================================================
   GHOST TASK MATRIX — POINTER TILT
   ---------------------------------------------------------
   Kartu dan navbar sedikit "menoleh" mengikuti posisi kursor
   saat diarahkan ke elemen tersebut. Efeknya 3D ringan:
   rotateX/rotateY kecil (maks 6 derajat) dengan perspective,
   jadi terasa seperti papan yang terangkat, bukan animasi
   yang mengganggu.

   KENAPA EVENT DELEGATION
   Kartu tugas dan kartu mata kuliah dibuat ulang oleh
   script.js setiap kali data berubah (render ulang setelah
   tambah/edit/hapus). Kalau listener dipasang per elemen,
   kartu baru tidak akan punya efek ini. Satu listener di
   document + closest() otomatis mencakup elemen baru.

   GUARD
     1. prefers-reduced-motion -> tidak aktif sama sekali
     2. perangkat sentuh         -> tidak aktif (tidak ada hover)
     3. pointerdown              -> tilt dilepas agar efek
                                    :active (tombol tertekan)
                                    tetap terlihat
========================================================= */

(function () {

    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    // Elemen yang diberi efek. Navbar memakai sudut lebih kecil
    // karena permukaannya lebar dan menempel di tepi layar.
    const TARGETS = [
        { selector: ".navbar", max: 1.6, lift: 0 },
        { selector: ".nav-link", max: 5, lift: 0 },
        { selector: ".course-card", max: 6, lift: 4 },
        { selector: ".task-card", max: 4, lift: 4 },
        { selector: ".stat-card", max: 5, lift: 4 },
        { selector: ".calendar-card", max: 2.5, lift: 0 },
        { selector: ".task-group-header", max: 4, lift: 3 },
        { selector: ".sync-card", max: 5, lift: 4 },
        { selector: ".schedule-table", max: 2, lift: 0 }
    ];

    let activeElement = null;
    let activeRule = null;
    let framePending = false;
    let pendingEvent = null;


    function ruleFor(element) {

        for (const rule of TARGETS) {

            if (element.matches(rule.selector)) {
                return rule;
            }

        }

        return null;

    }


    function reset(element) {

        if (!element) return;

        element.style.transform = "";
        element.style.willChange = "";

    }


    function apply() {

        framePending = false;

        if (!pendingEvent || !activeElement) return;

        const event = pendingEvent;
        pendingEvent = null;

        const rect = activeElement.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) return;

        // Posisi kursor relatif terhadap pusat elemen, -1..1.
        const relX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const relY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

        const max = activeRule.max;
        const lift = activeRule.lift;

        const rotateY = Math.max(-1, Math.min(1, relX)) * max;
        const rotateX = Math.max(-1, Math.min(1, relY)) * -max;

        // translate dipertahankan agar cocok dengan gaya hover
        // neobrutalism (kartu terangkat ke kiri-atas).
        activeElement.style.transform =
            `perspective(900px) ` +
            `rotateX(${rotateX.toFixed(2)}deg) ` +
            `rotateY(${rotateY.toFixed(2)}deg) ` +
            (lift ? `translate(${-lift}px, ${-lift}px)` : "");

    }


    function schedule(event) {

        pendingEvent = event;

        if (framePending) return;

        framePending = true;

        window.requestAnimationFrame(apply);

    }


    function handlePointerMove(event) {

        if (reduceMotion.matches || !finePointer.matches) return;

        if (event.pointerType && event.pointerType !== "mouse") return;

        const target = event.target instanceof Element
            ? event.target.closest(TARGETS.map((rule) => rule.selector).join(","))
            : null;

        const rule = target ? ruleFor(target) : null;

        if (!rule) {

            reset(activeElement);

            activeElement = null;
            activeRule = null;

            return;

        }

        if (target !== activeElement) {

            reset(activeElement);

            activeElement = target;
            activeRule = rule;

            target.style.willChange = "transform";

        }

        schedule(event);

    }


    function clearAll() {

        reset(activeElement);

        activeElement = null;
        activeRule = null;

    }


    document.addEventListener("pointermove", handlePointerMove, { passive: true });

    document.addEventListener("pointerdown", clearAll, { passive: true });

    window.addEventListener("blur", clearAll);

    document.addEventListener("pointerleave", clearAll, { passive: true });

    // Elemen yang tiba-tiba hilang (kartu dihapus saat tilt aktif)
    // tidak boleh menyisakan referensi basi.
    reduceMotion.addEventListener("change", clearAll);

    finePointer.addEventListener("change", clearAll);

})();
