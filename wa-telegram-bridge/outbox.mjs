// =========================================================
//  ANTREAN PESAN WHATSAPP
//
//  GitHub Actions tidak punya alamat yang bisa dihubungi HP,
//  jadi notifikasi tugas dititipkan ke tabel wa_outbox di
//  Supabase. Modul ini yang mengambil titipan itu dari HP
//  lalu menyerahkannya ke WhatsApp.
//
//  Kenapa dipisah dari bridge.mjs?
//  Supaya aturannya (kapan mengirim, kapan menyerah, kapan
//  menganggap kedaluwarsa) bisa diuji tanpa jaringan dan
//  tanpa login WhatsApp.
// =========================================================

// Pesan yang lebih tua dari ini dianggap tidak berguna lagi.
// Notifikasi tugas berumur sehari: mengirim "besok deadline"
// dua hari kemudian justru menyesatkan.
const UMUR_MAKS_JAM = 24;

// Setelah 3 kali gagal, berhenti mencoba. Kalau tidak, satu
// baris bermasalah akan dicoba terus setiap 30 detik dan
// membanjiri log.
const BATAS_PERCOBAAN = 3;


// ---------------------------------------------------------
//  Fungsi murni (diuji test-antrean.mjs)
// ---------------------------------------------------------

export function masihBerlaku(baris, sekarang = Date.now(), umurJam = UMUR_MAKS_JAM) {

    const waktu = Date.parse(baris?.dibuat_at || "");

    if (Number.isNaN(waktu)) return false;

    return sekarang - waktu <= umurJam * 3600000;

}


// Apa yang harus dilakukan pada satu baris antrean.
//   "kirim"       -> masih baru, kirim sekarang
//   "kedaluwarsa" -> terlalu tua, jangan dikirim
//   "lewat"       -> bukan urusan kita (sudah terkirim, dll)
export function putuskan(baris, sekarang = Date.now(), umurJam = UMUR_MAKS_JAM) {

    if (!baris || baris.status !== "menunggu") return "lewat";

    if (!String(baris.pesan || "").trim()) return "lewat";

    if (!masihBerlaku(baris, sekarang, umurJam)) return "kedaluwarsa";

    return "kirim";

}


// Pesan galat dari library bisa sangat panjang dan berisi
// objek. Ambil intinya saja supaya kolom galat tetap terbaca.
export function ringkasGalat(galat, maks = 300) {

    const teks = typeof galat === "string"
        ? galat
        : String(galat?.message || galat || "");

    const satuBaris = teks.replace(/\s+/g, " ").trim();

    return satuBaris.length > maks
        ? satuBaris.slice(0, maks - 1) + "…"
        : satuBaris;

}


// Nomor tujuan TIDAK pernah diambil dari tabel antrean.
// Kalau diambil, siapa pun yang bisa menulis ke tabel (kunci
// publishable ada di halaman web) bisa memakai nomor dummy
// untuk mengirim ke orang lain.
export function tujuanAman(env) {

    const nomor = String(env?.WA_BRIDGE_TUJUAN || "").trim();

    return nomor || "";

}


// ---------------------------------------------------------
//  Bagian jaringan
// ---------------------------------------------------------

function rapikan(url) {

    return String(url || "").replace(/\/+$/, "");

}


export function buatAntrean(env, log = () => {}) {

    const url = rapikan(env?.SUPABASE_URL);
    const key = String(env?.SUPABASE_KEY || "").trim();

    const aktif = Boolean(url && key);

    if (!aktif) return null;


    async function minta(metode, jalur, init = {}) {

        const res = await fetch(`${url}/rest/v1/${jalur}`, {
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
                `Supabase ${metode} gagal (HTTP ${res.status}): ` +
                (await res.text()).slice(0, 200)
            );

        }

        return res;

    }


    return {

        aktif: true,

        // Baris yang masih menunggu, terlama dulu.
        async ambil(batas = 5) {

            const res = await minta(
                "GET",
                "wa_outbox?select=id,pesan,status,dibuat_at,percobaan" +
                "&status=eq.menunggu&order=id.asc&limit=" + batas
            );

            return res.json();

        },

        async terkirim(id) {

            await minta(
                "PATCH",
                "wa_outbox?id=eq." + id,
                {
                    headers: { Prefer: "return=minimal" },
                    body: JSON.stringify({
                        status: "terkirim",
                        terkirim_at: new Date().toISOString(),
                        galat: null
                    })
                }
            );

        },

        async kedaluwarsa(id, alasan) {

            await minta(
                "PATCH",
                "wa_outbox?id=eq." + id,
                {
                    headers: { Prefer: "return=minimal" },
                    body: JSON.stringify({
                        status: "kedaluwarsa",
                        galat: ringkasGalat(alasan)
                    })
                }
            );

        },

        // percobaan dihitung di sisi HP, bukan di database,
        // supaya dua kali gagal beruntun tidak saling
        // menimpa angka.
        async gagal(id, percobaan, alasan) {

            const sudah = Number(percobaan || 0) + 1;

            const menyerah = sudah >= BATAS_PERCOBAAN;

            await minta(
                "PATCH",
                "wa_outbox?id=eq." + id,
                {
                    headers: { Prefer: "return=minimal" },
                    body: JSON.stringify({
                        status: menyerah ? "gagal" : "menunggu",
                        percobaan: sudah,
                        galat: ringkasGalat(alasan)
                    })
                }
            );

            return menyerah;

        }

    };

}
