// =========================================================
//  SERVICE WORKER — SHELL OFFLINE
//
//  Tujuan: aplikasi tetap terbuka saat internet mati.
//  Data tugas TIDAK di-cache di sini; script.js menyimpannya
//  di localStorage supaya bisa dirender tanpa jaringan.
//
//  Strategi:
//    - navigasi  : jaringan dulu, lalu shell dari cache
//    - same-origin: cache dulu, diperbarui di belakang
//    - CDN/font  : cache dulu
//    - supabase  : tidak pernah di-cache
// =========================================================

const CACHE = "task-vault-2026-11-14";

const SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./three-bg.js",
    "./pointer-tilt.js",
    "./favicon.svg",
    "./icon-192.png",
    "./icon-512.png",
    "./manifest.json",
    "./privacy.html",
    // config.js ikut disimpan supaya saat offline halaman masih
    // punya URL/key Supabase dan bisa menyambung lagi begitu
    // internet hidup. Isinya hanya publishable key (terlihat
    // publik lewat DevTools), jadi aman berada di cache.
    "./config.js"
];


// Simpan satu per satu: satu berkas hilang tidak boleh
// membatalkan seluruh instalasi (cache.addAll bersifat
// all-or-nothing).
async function simpanShell() {

    const cache = await caches.open(CACHE);

    await Promise.all(
        SHELL.map((url) =>
            cache.add(url).catch(() => {})
        )
    );

}


self.addEventListener("install", (event) => {

    event.waitUntil(
        simpanShell().then(() => self.skipWaiting())
    );

});


self.addEventListener("activate", (event) => {

    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );

});


self.addEventListener("fetch", (event) => {

    const request = event.request;

    if (request.method !== "GET") return;


    const url = new URL(request.url);


    // Supabase tidak pernah di-cache: data basi lebih
    // berbahaya daripada pesan offline.
    if (url.hostname.endsWith("supabase.co")) return;


    // config.js di-generate ulang tiap deploy dari secrets.
    // Jaringan dulu supaya kunci baru langsung terpakai, tetapi
    // tetap disimpan sebagai cadangan: tanpa berkas ini halaman
    // yang dibuka saat offline kehilangan URL/key Supabase dan
    // tidak bisa menyambung lagi saat internet hidup.
    if (url.pathname.endsWith("/config.js")) {

        event.respondWith(
            fetch(request)
                .then((response) => {

                    if (response.ok) {

                        const copy = response.clone();

                        caches.open(CACHE)
                            .then((cache) => cache.put(request, copy));

                    }

                    return response;

                })
                .catch(() => caches.match(request))
        );

        return;

    }


    // Navigasi: coba jaringan dulu supaya deploy baru langsung
    // terlihat, lalu jatuh ke shell saat offline.
    if (request.mode === "navigate") {

        event.respondWith(
            fetch(request)
                .then((response) => {

                    const copy = response.clone();

                    caches.open(CACHE)
                        .then((cache) => cache.put("./index.html", copy));

                    return response;

                })
                .catch(() =>
                    caches.match("./index.html")
                        .then((cached) => cached || caches.match("./"))
                )
        );

        return;

    }


    const sameOrigin = url.origin === self.location.origin;


    // Aset milik sendiri: tampilkan cache dulu, perbarui di
    // belakang. Deploy baru tetap sampai tanpa perlu menaikkan
    // versi CACHE setiap kali.
    if (sameOrigin) {

        event.respondWith(
            caches.match(request).then((cached) => {

                const network = fetch(request)
                    .then((response) => {

                        if (response.ok) {

                            const copy = response.clone();

                            caches.open(CACHE)
                                .then((cache) => cache.put(request, copy));

                        }

                        return response;

                    })
                    .catch(() => cached);


                return cached || network;

            })
        );

        return;

    }


    // Font & CDN: cache dulu, lalu simpan untuk offline.
    event.respondWith(
        caches.match(request).then((cached) => {

            if (cached) return cached;

            return fetch(request).then((response) => {

                if (response.ok) {

                    const copy = response.clone();

                    caches.open(CACHE)
                        .then((cache) => cache.put(request, copy));

                }

                return response;

            });

        })
    );

});
