/* =========================================================
   GHOST TASK MATRIX — LATAR 3D KINETIK (Three.js)
   ---------------------------------------------------------
   Bentuk geometris mengapung & berputar pelan di latar
   aplikasi, sebagai terjemahan 3D dari bahasa visual
   Dark Neobrutalism: isi warna solid, garis tepi tebal,
   dan hard shadow tanpa blur.

   CATATAN PENEMPATAN
   Canvas ini MENETAP sebagai anak <body>. Versi sebelumnya
   memindahkannya ke <section class="page"> yang sedang aktif,
   karena latar .home-page dan .dashboard-page memakai foto
   opaque (BackGround.webp) sehingga canvas di belakangnya tidak
   akan pernah terlihat. Sekarang latar foto dipasang sekali di
   <body>, jadi satu canvas dengan position: fixed terlihat di
   semua halaman. syncActivePage() hanya mengatur peredupan
   lewat class .is-dim — bukan memindahkan node.

   Urutan lapisan: body (foto) -> canvas (z-index 1) ->
   .page-decor (z-index 0, fixed) -> .main-content (z-index 3)
   -> navbar (z-index 100).

   GUARD YANG DIPASANG
   (tidak ada satupun di situs referensi)
     1. THREE tidak tersedia / WebGL gagal  -> canvas disembunyikan
     2. prefers-reduced-motion             -> satu frame statis saja
     3. tab tidak aktif / canvas off-screen-> animasi dijeda
     4. layar < 700px                      -> objek lebih sedikit,
                                              pixelRatio & FPS dibatasi
========================================================= */

(function () {

    "use strict";

    const canvas = document.getElementById("bg3dStage");

    // ---------- Guard 1a: elemen ada ----------
    if (!canvas) return;

    // ---------- Guard 1b: pustaka gagal dimuat ----------
    // Offline, CDN diblokir, atau SRI tidak cocok. Aplikasi tetap
    // berjalan normal tanpa dekorasi.
    if (typeof THREE === "undefined") {
        canvas.style.display = "none";
        return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const narrow = window.matchMedia("(max-width: 700px)");


    /* =====================================================
       PALET
       Nilai hex harus sejalan dengan token :root di
       style.css. Outline memakai --border-bright dan
       shadow memakai --shadow-hard-color; hitam murni
       tidak dipakai karena kontrasnya hanya ~1.05:1
       terhadap latar gelap sehingga bayangan menghilang.
    ===================================================== */

    const PALETTE = {
        green: 0x4dffb2,      // --green
        greenDark: 0x19d991,  // --green-dark
        cyan: 0x4fe6ff,       // --cyan
        danger: 0xff5d73,     // --danger
        edge: 0x7dffc9,       // --border-bright  (garis tepi)
        shadow: 0x0f7a55      // --shadow-hard-color (hard shadow)
    };


    /* =====================================================
       1. RENDERER
    ===================================================== */

    let renderer;

    try {

        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            powerPreference: "low-power"
        });

    } catch (error) {

        // ---------- Guard 1c: WebGL tidak tersedia ----------
        canvas.style.display = "none";
        return;

    }

    if (!renderer) {
        canvas.style.display = "none";
        return;
    }

    renderer.setClearAlpha(0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;


    /* =====================================================
       2. SCENE, KAMERA, CAHAYA
    ===================================================== */

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    // three >= r155 memakai satuan cahaya fisik, jadi intensitas
    // perlu lebih besar daripada tutorial lama.
    scene.add(new THREE.AmbientLight(0xffffff, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(4, 6, 7);
    scene.add(keyLight);

    // Rim light cyan dari belakang supaya siluet tidak menempel
    // rata dengan latar gelap.
    const rimLight = new THREE.DirectionalLight(PALETTE.cyan, 1.2);
    rimLight.position.set(-6, -3, -4);
    scene.add(rimLight);


    /* =====================================================
       3. GEOMETRI
    ===================================================== */

    // Kotak bersudut tumpul, dibuat dengan ExtrudeGeometry —
    // BoxGeometry biasa tidak punya bevel sehingga terlihat
    // seperti kotak wireframe, bukan "stiker 3D".
    function createRoundedBoxGeometry(size, radius, depth) {

        const half = size / 2;
        const r = Math.min(radius, half * 0.45);
        const shape = new THREE.Shape();

        shape.moveTo(-half + r, -half);
        shape.lineTo(half - r, -half);
        shape.quadraticCurveTo(half, -half, half, -half + r);
        shape.lineTo(half, half - r);
        shape.quadraticCurveTo(half, half, half - r, half);
        shape.lineTo(-half + r, half);
        shape.quadraticCurveTo(-half, half, -half, half - r);
        shape.lineTo(-half, -half + r);
        shape.quadraticCurveTo(-half, -half, -half + r, -half);

        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: depth,
            bevelEnabled: true,
            bevelThickness: 0.06,
            bevelSize: 0.06,
            bevelSegments: 2,
            curveSegments: 6
        });

        geometry.center();

        return geometry;

    }

    const GEOMETRY_BUILDERS = {
        torus: () => new THREE.TorusGeometry(0.68, 0.26, 18, 42),
        ico: () => new THREE.IcosahedronGeometry(0.72, 0),
        octa: () => new THREE.OctahedronGeometry(0.78, 0),
        box: () => createRoundedBoxGeometry(1.05, 0.22, 0.72)
    };


    /* =====================================================
       4. KONFIGURASI BENTUK
       fx / fy adalah posisi relatif terhadap setengah
       lebar & tinggi area pandang, sehingga tata letak
       tetap proporsional di layar apa pun.
    ===================================================== */

    const SHAPE_SPECS = [
        {
            type: "torus",
            color: PALETTE.green,
            fx: -0.86, fy: 0.58, z: -0.4,
            scale: 1.00,
            floatAmp: 0.20, floatSpeed: 0.72, floatPhase: 0.0,
            rotX: 0.20, rotY: 0.26, rotZ: 0.05
        },
        {
            type: "ico",
            color: PALETTE.cyan,
            fx: 0.88, fy: -0.52, z: 0.2,
            scale: 0.86,
            floatAmp: 0.26, floatSpeed: 0.54, floatPhase: 1.7,
            rotX: -0.16, rotY: 0.22, rotZ: 0.0
        },
        {
            type: "box",
            color: PALETTE.danger,
            fx: 0.80, fy: 0.62, z: -1.2,
            scale: 0.72,
            floatAmp: 0.16, floatSpeed: 0.66, floatPhase: 3.1,
            rotX: 0.14, rotY: -0.20, rotZ: 0.09
        },
        {
            type: "octa",
            color: PALETTE.greenDark,
            fx: -0.82, fy: -0.62, z: 0.6,
            scale: 0.80,
            floatAmp: 0.24, floatSpeed: 0.48, floatPhase: 4.4,
            rotX: 0.18, rotY: 0.30, rotZ: 0.0
        },
        {
            type: "ico",
            color: PALETTE.greenDark,
            fx: -0.94, fy: 0.02, z: -1.8,
            scale: 0.46,
            floatAmp: 0.30, floatSpeed: 0.82, floatPhase: 2.2,
            rotX: -0.24, rotY: 0.18, rotZ: 0.0
        },
        {
            type: "box",
            color: PALETTE.green,
            fx: 0.94, fy: 0.04, z: -1.6,
            scale: 0.44,
            floatAmp: 0.22, floatSpeed: 0.60, floatPhase: 5.6,
            rotX: 0.10, rotY: 0.24, rotZ: -0.07
        }
    ];


    /* =====================================================
       5. PEMBUAT OBJEK
       Tiap objek terdiri dari 4 lapisan, sama seperti
       referensi: hard shadow, isi solid, outline tebal
       (mesh duplikat BackSide), dan garis lipatan.
    ===================================================== */

    const shapes = [];

    function createShape(spec) {

        const geometry = GEOMETRY_BUILDERS[spec.type]();
        const group = new THREE.Group();

        // Lapisan 1 — hard shadow, digeser tanpa blur.
        const shadow = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({ color: PALETTE.shadow })
        );
        shadow.position.set(0.22, -0.22, -0.20);
        shadow.renderOrder = -2;
        group.add(shadow);

        // Lapisan 2 — isi warna solid.
        const body = new THREE.Mesh(
            geometry,
            new THREE.MeshLambertMaterial({ color: spec.color })
        );
        group.add(body);

        // Lapisan 3 — outline tebal. Mesh duplikat yang sedikit
        // diperbesar dan dirender dari sisi belakang (BackSide),
        // sehingga hanya "kulit luar"-nya yang tampak.
        const outline = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({
                color: PALETTE.edge,
                side: THREE.BackSide
            })
        );
        outline.scale.setScalar(1.12);
        group.add(outline);

        // Lapisan 4 — garis lipatan agar bentuk tetap terbaca
        // walau sedang menghadap cahaya redup.
        group.add(new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry, 24),
            new THREE.LineBasicMaterial({
                color: PALETTE.shadow,
                transparent: true,
                opacity: 0.85
            })
        ));

        group.rotation.set(spec.floatPhase, spec.floatPhase * 0.6, 0);

        scene.add(group);

        shapes.push({
            spec: spec,
            group: group,
            baseX: 0,
            baseY: 0
        });

    }

    SHAPE_SPECS.forEach(createShape);


    /* =====================================================
       5b. LAPISAN BINER
       -----------------------------------------------------
       Teks biner "0"/"1" yang tersebar di seluruh layar untuk
       mengisi ruang kosong antar bentuk 3D. Tanpa lapisan ini
       latar terasa sepi karena hanya ada 6 objek besar.

       Memakai THREE.Sprite, bukan mesh bidang, karena:
         - sprite selalu tegak menghadap kamera, jadi tidak
           perlu dirotasi manual tiap frame;
         - satu tekstur 64x64 dipakai bersama puluhan sprite,
           sehingga hemat memori GPU.

       Posisi memakai koordinat ternormalisasi (fx/fy) supaya
       tata letaknya tetap proporsional di layar apa pun.
    ===================================================== */

    // PRNG sederhana & deterministik: sebaran acak yang sama
    // setiap kali halaman dimuat, sehingga tata letak tidak
    // "berkedip" berubah antar reload.
    function makeRng(seed) {

        let state = seed;

        return function () {

            state = (state * 1664525 + 1013904223) % 4294967296;

            return state / 4294967296;

        };

    }


    function createGlyphTexture(char, cssColor) {

        const size = 64;
        const glyphCanvas = document.createElement("canvas");

        glyphCanvas.width = size;
        glyphCanvas.height = size;

        const ctx = glyphCanvas.getContext("2d");

        if (!ctx) return null;

        ctx.font = "700 46px 'Space Mono', 'Courier New', monospace";
        ctx.fillStyle = cssColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(char, size / 2, size / 2 + 2);

        const texture = new THREE.CanvasTexture(glyphCanvas);

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        return texture;

    }


    const GLYPH_TEXTURES = [];

    [
        ["0", "#4dffb2"],   // --green
        ["1", "#4dffb2"],
        ["0", "#4fe6ff"],   // --cyan
        ["1", "#19d991"]    // --green-dark
    ].forEach(([char, color]) => {

        const texture = createGlyphTexture(char, color);

        if (texture) GLYPH_TEXTURES.push(texture);

    });


    const GLYPH_COUNT = 126;
    const GLYPH_COLUMNS = 14;

    const glyphSpecs = [];
    const glyphRng = makeRng(20261112);

    const glyphRows = Math.ceil(GLYPH_COUNT / GLYPH_COLUMNS);

    for (let index = 0; index < GLYPH_COUNT; index += 1) {

        const column = index % GLYPH_COLUMNS;
        const row = Math.floor(index / GLYPH_COLUMNS);

        // Sebaran dasar = grid, lalu digeser acak secukupnya
        // supaya tidak terbaca sebagai tabel.
        const gridX = ((column + 0.5) / GLYPH_COLUMNS) * 2 - 1;
        const gridY = ((row + 0.5) / glyphRows) * 2 - 1;

        glyphSpecs.push({

            fx: gridX + (glyphRng() - 0.5) * (2 / GLYPH_COLUMNS) * 0.85,
            fy: gridY + (glyphRng() - 0.5) * (2 / glyphRows) * 0.85,

            // Sebaran kedalaman: sebagian di depan bentuk 3D,
            // sebagian di belakang, agar terasa berlapis.
            z: -4.2 + glyphRng() * 4.4,

            scale: 0.26 + glyphRng() * 0.36,
            opacity: 0.16 + glyphRng() * 0.40,

            floatAmp: 0.06 + glyphRng() * 0.16,
            floatSpeed: 0.24 + glyphRng() * 0.52,
            floatPhase: glyphRng() * Math.PI * 2,

            // Pengali pergeseran saat kursor bergerak. Semakin
            // besar, semakin "dekat" sprite terasa.
            depth: 0.35 + glyphRng() * 1.5,

            textureIndex: Math.floor(glyphRng() * GLYPH_TEXTURES.length)

        });

    }


    const glyphs = [];

    function createGlyphs() {

        if (GLYPH_TEXTURES.length === 0) return;

        glyphSpecs.forEach((spec) => {

            const material = new THREE.SpriteMaterial({
                map: GLYPH_TEXTURES[spec.textureIndex],
                transparent: true,
                opacity: spec.opacity,

                // depthWrite dimatikan agar sprite transparan tidak
                // menutupi sprite lain di belakangnya, tetapi
                // depthTest tetap aktif supaya bentuk 3D opaque
                // benar-benar menghalangi glyph di belakangnya.
                depthWrite: false
            });

            const sprite = new THREE.Sprite(material);

            sprite.scale.setScalar(spec.scale);
            sprite.position.z = spec.z;

            scene.add(sprite);

            glyphs.push({
                spec: spec,
                sprite: sprite,
                baseX: 0,
                baseY: 0
            });

        });

    }


    createGlyphs();


    /* =====================================================
       6. TATA LETAK & RESIZE
    ===================================================== */

    function layout() {

        const halfHeight =
            Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        const halfWidth = halfHeight * camera.aspect;
        const densityScale = narrow.matches ? 0.74 : 1;

        shapes.forEach((item) => {

            item.baseX = item.spec.fx * halfWidth;
            item.baseY = item.spec.fy * halfHeight;

            item.group.position.set(item.baseX, item.baseY, item.spec.z);
            item.group.scale.setScalar(item.spec.scale * densityScale);

        });


        // Glyph memakai area lebih lebar dari frustum (1.15x)
        // supaya tetap memenuhi tepi layar saat kamera bergeser
        // mengikuti kursor.
        glyphs.forEach((item) => {

            item.baseX = item.spec.fx * halfWidth * 1.15;
            item.baseY = item.spec.fy * halfHeight * 1.15;

            item.sprite.position.set(
                item.baseX,
                item.baseY,
                item.spec.z
            );

            item.sprite.scale.setScalar(
                item.spec.scale * (narrow.matches ? 0.85 : 1)
            );

        });

    }


    function applyDensity() {

        // Di layar sempit hanya 3 objek pertama yang dipakai:
        // sisanya akan berdesakan dan menutupi konten.
        const limit = narrow.matches ? 3 : SHAPE_SPECS.length;

        shapes.forEach((item, index) => {
            item.group.visible = index < limit;
        });


        // Glyph dikurangi di layar sempit: 126 sprite terlalu
        // padat di 390px dan mengganggu keterbacaan teks.
        const glyphLimit = narrow.matches
            ? Math.round(GLYPH_COUNT * 0.42)
            : GLYPH_COUNT;

        glyphs.forEach((item, index) => {
            item.sprite.visible = index < glyphLimit;
        });

    }


    function resize() {

        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, narrow.matches ? 1.25 : 1.75)
        );

        // false = jangan ubah style CSS canvas (sudah diatur style.css)
        renderer.setSize(width, height, false);

        applyDensity();
        layout();

        if (!running) requestStaticFrame();

    }


    /* =====================================================
       7. ANIMASI
    ===================================================== */

    let running = false;
    let rafId = 0;
    let lastPaint = 0;
    let elapsed = 0;
    let inViewport = true;

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };


    function update(delta) {

        elapsed += delta;

        // Parallax kamera mengikuti kursor — halus, bukan mengikuti
        // persis, supaya tidak terasa gelisah.
        pointer.x += (pointer.targetX - pointer.x) * 0.05;
        pointer.y += (pointer.targetY - pointer.y) * 0.05;

        camera.position.x = pointer.x;
        camera.position.y = pointer.y;
        camera.lookAt(0, 0, 0);

        shapes.forEach((item) => {

            const spec = item.spec;
            const phase = elapsed * spec.floatSpeed + spec.floatPhase;

            item.group.position.y =
                item.baseY + Math.sin(phase) * spec.floatAmp;

            item.group.rotation.x += spec.rotX * delta;
            item.group.rotation.y += spec.rotY * delta;
            item.group.rotation.z += spec.rotZ * delta;

        });


        // Glyph: mengapung pelan (naik-turun + geser mendatar
        // kecil) DAN ikut bergeser saat kursor bergerak. Nilai
        // `depth` membuat lapisan depan bergerak lebih jauh
        // daripada lapisan belakang, sehingga muncul kesan
        // kedalaman (parallax).
        glyphs.forEach((item) => {

            const spec = item.spec;
            const phase = elapsed * spec.floatSpeed + spec.floatPhase;

            item.sprite.position.x =
                item.baseX +
                Math.cos(phase * 0.7) * spec.floatAmp * 0.6 +
                pointer.x * spec.depth;

            item.sprite.position.y =
                item.baseY +
                Math.sin(phase) * spec.floatAmp +
                pointer.y * spec.depth;

        });

    }


    function frame(now) {

        if (!running) return;

        rafId = window.requestAnimationFrame(frame);

        if (!lastPaint) lastPaint = now;

        const deltaMs = now - lastPaint;

        // Batasi ke ~30 fps di layar sempit; dekorasi tidak butuh
        // lebih, dan ini menghemat baterai.
        if (narrow.matches && deltaMs < 1000 / 30) return;

        lastPaint = now;

        // delta di-clamp supaya objek tidak "melompat" setelah
        // tab lama tidak aktif.
        update(Math.min(deltaMs, 100) / 1000);

        renderer.render(scene, camera);

    }


    function renderStatic() {

        shapes.forEach((item) => {
            item.group.position.y = item.baseY;
        });

        glyphs.forEach((item) => {
            item.sprite.position.x = item.baseX;
            item.sprite.position.y = item.baseY;
        });

        renderer.render(scene, camera);

    }


    // Buffer WebGL tidak dipertahankan (preserveDrawingBuffer: false),
    // jadi satu frame statis bisa hilang saat browser menggambar ulang
    // area itu — misalnya ketika halaman digulir atau setelah tab
    // kembali aktif. Fungsi ini menggambar ulang SATU frame, hanya
    // bila animasi memang sedang tidak berjalan.
    let staticFramePending = false;

    function requestStaticFrame() {

        if (running || staticFramePending) return;

        staticFramePending = true;

        window.requestAnimationFrame(() => {

            staticFramePending = false;

            if (!running) renderStatic();

        });

    }


    function start() {

        if (running || reduceMotion.matches) return;

        running = true;
        lastPaint = 0;
        rafId = window.requestAnimationFrame(frame);

    }


    function stop() {

        running = false;

        if (rafId) window.cancelAnimationFrame(rafId);

        rafId = 0;

    }


    /* =====================================================
       8. GUARD: REDUCED MOTION, VISIBILITAS, OFF-SCREEN
    ===================================================== */

    function syncPlayback() {

        if (reduceMotion.matches) {
            stop();
            requestStaticFrame();
            return;
        }

        if (document.hidden || !inViewport) {
            stop();
            return;
        }

        start();

    }


    // Guard 2 — preferensi sistem "kurangi gerak": tampilkan
    // bentuknya, tetapi diam.
    reduceMotion.addEventListener("change", syncPlayback);


    // Guard 3a — tab tidak aktif.
    document.addEventListener("visibilitychange", syncPlayback);


    // Guard 3b — canvas di luar area pandang (mis. halaman
    // sedang disembunyikan lewat .hidden).
    if ("IntersectionObserver" in window) {

        new IntersectionObserver(
            (entries) => {
                inViewport = entries[0].isIntersecting;
                syncPlayback();
            },
            { threshold: 0 }
        ).observe(canvas);

    }


    // Guard 4 — kepadatan objek mengikuti lebar layar.
    // resize() dipanggil (bukan hanya applyDensity) supaya
    // pixelRatio dan ukuran buffer ikut disesuaikan ketika
    // jendela melewati breakpoint 700px.
    narrow.addEventListener("change", resize);


    // Parallax hanya untuk perangkat berpenunjuk presisi.
    if (finePointer.matches) {

        window.addEventListener("pointermove", (event) => {

            pointer.targetX = (event.clientX / window.innerWidth - 0.5) * 1.1;
            pointer.targetY = -(event.clientY / window.innerHeight - 0.5) * 0.7;

        }, { passive: true });

    }


    window.addEventListener("resize", resize, { passive: true });

    // Saat animasi dijeda (reduced motion / off-screen), gambar ulang
    // satu frame ketika halaman digulir. Beberapa browser mengosongkan
    // buffer WebGL setelah komposisi ulang, sehingga tanpa ini bentuk
    // 3D bisa hilang dan menyisakan area kosong.
    window.addEventListener("scroll", requestStaticFrame, { passive: true });


    /* =====================================================
       9. LAPISAN AKTIF
       Canvas TIDAK dipindah-pindah ke dalam halaman.

       Versi sebelumnya memindahkannya ke <section> yang sedang
       tampil, karena tiap halaman punya latar foto opaque
       (BackGround.webp) yang menutupi canvas di belakangnya.
       Akibatnya dekorasi 3D hanya terlihat di halaman awal dan
       hilang begitu masuk dashboard.

       Sekarang latar foto dipindah ke <body> (satu lapisan,
       dipakai semua halaman), sehingga canvas bisa menetap
       sebagai anak <body> dengan position: fixed. Hasilnya
       dekorasi tampil di SEMUA halaman tanpa dipindah-pindah.

       Yang perlu disesuaikan hanyalah tingkat peredupannya:
       halaman yang dipakai membaca data dibuat lebih redup.
    ===================================================== */

    const pageViews = Array.from(
        document.querySelectorAll(".page-view")
    );

    const homePage = document.getElementById("homePage");


    function syncActivePage() {

        // Halaman yang sedang tampil = satu-satunya .page-view
        // yang tidak ber-class .hidden.
        const activePage = pageViews.find(
            (page) => !page.classList.contains("hidden")
        );

        canvas.classList.toggle(
            "is-dim",
            Boolean(activePage) && activePage !== homePage
        );

    }


    // Halaman hanya di-toggle lewat class .hidden saat navigasi,
    // jadi MutationObserver cukup memantau atribut class. Dengan
    // cara ini three-bg.js tidak perlu diikat ke script.js.
    if (pageViews.length > 0) {

        const observer = new MutationObserver(syncActivePage);

        pageViews.forEach((page) => {
            observer.observe(page, {
                attributes: true,
                attributeFilter: ["class"]
            });
        });

    }


    /* =====================================================
       10. INISIALISASI
    ===================================================== */

    syncActivePage();
    applyDensity();
    resize();

    // Tandai siap supaya CSS memudarkannya masuk (opacity 0 -> 1).
    // Kalau inisialisasi gagal di atas, class ini tidak pernah
    // ditambahkan dan canvas tetap tak terlihat.
    canvas.classList.add("is-ready");

    syncPlayback();

})();
