# Shift Radiologi

Aplikasi jadwal shift **Instalasi Radiologi** — ringan, visual, dan **offline-first** (PWA). Berdiri sendiri, terpisah dari sistem absensi institusi.

Pengguna saat ini: **Fakhrul Aldia Nugraha, A.Md.Rad (Aldi)**.

---

## ✅ Yang sudah ada (v0.1)

- **Engine pola dasar** yang deterministik — bisa menghitung shift siapa pun, di tanggal mana pun, maju/mundur tanpa batas.
- **Beranda** — shift Aldi hari ini dengan tanda besar (Pagi / Sore / Malam / Libur), daftar rekan yang bertugas (urutan Pagi → Sore → Malam → Libur), dan dua tombol **Lanjut Absen** (SI-PASTI & SI-PALUI).
- **Kalender** — tampilan bulan yang bisa **dinavigasi** (‹ bulan sebelumnya / Hari ini / bulan berikutnya ›). Ketuk tanggal mana pun untuk melihat seluruh tim hari itu. Dilengkapi rekap jumlah shift bulan tersebut.
- **PWA** — bisa "Install/Add to Home Screen" dan tetap jalan tanpa internet setelah dibuka sekali.

> Pola Aldi sudah diverifikasi cocok dengan jadwal Mei 2026 yang dijadikan acuan, dan rotasinya berlanjut mulus ke bulan-bulan berikutnya.

---

## ✅ Penyesuaian jadwal (v0.3)

- **Tab "Atur"** baru: daftar penyesuaian aktif, **arsip hutang dinas**, dan panel **konflik** (shift kosong).
- **Input cuti**: ketuk tanggal di Kalender → **Tambah penyesuaian** → pilih petugas.
- **Pemilih pengganti berwarna** untuk rotator yang cuti, mengikuti aturan kita:
  - **Hijau** = ada celah istirahat (mis. Pagi+Malam) · **Oranye** = maraton, istirahat minim · **Merah** = tak bisa (Malam → langsung Pagi), otomatis dinonaktifkan.
  - Urutan: **Muhraini** (pengganti, tanpa hutang) → rekan **dari libur** → **double shift** → Muhraini sebagai **upaya terakhir** (jika sudah menutup yang lain).
- **Double shift** mencatat **hutang dinas** (siapa berutang 1 shift ke siapa), bisa ditandai **lunas**.
- Semua penyesuaian **tersimpan permanen** dan **tercermin** di Beranda, Kalender, dan detail tanggal.
- Pilihan **"Biarkan kosong dulu"** untuk menunda penggantian — akan muncul sebagai konflik agar tak terlupa.

> Cakupan slice ini: **cuti satu tanggal**. Rentang tanggal & input tukar/double manual menyusul.

---

## 🧠 Model engine (ringkas)

**Dua kelas petugas:**

| Kelas | Siapa | Pola |
|---|---|---|
| Rotator | Didit, Humaidi, Aldi, Luthfi | Siklus 8 hari: **P P · S S · M M · L L**, masing-masing digeser fase 2 hari → tiap hari selalu ada 1 Pagi, 1 Sore, 1 Malam, 1 Libur |
| Cadangan | dr. Dina, Anisa, Muhraini, Ano | **Pagi** di hari kerja, **Libur** tiap Minggu + tanggal merah |

**Jadwal = pola dasar (deterministik) + penyesuaian.** Pola dasar diproyeksikan dari satu titik jangkar (1 Mei 2026), jadi "tanggal X tahun Y aku shift apa" cukup dihitung, bukan ditebak.

---

## 🚀 Menjalankan & deploy

**GitHub Pages (paling mudah):**
1. Push semua file ini ke sebuah repo.
2. Settings → Pages → Source: branch `main`, folder `/root`.
3. Buka URL yang diberikan. Semua path sudah relatif, jadi aman di subfolder.

**Coba lokal:** PWA butuh `http(s)` (service worker tidak jalan dari `file://`). Jalankan server statis sederhana di folder ini, mis.:
```bash
python3 -m http.server 8080
# lalu buka http://localhost:8080
```

---

## 🗂️ Struktur

```
index.html           kerangka halaman + pemuatan font/gaya
styles.css           tema terang putih–biru pastel (gaya office) + sistem warna shift
app.js               ENGINE + mesin pengganti + render Beranda / Kalender / Atur
manifest.webmanifest metadata PWA
sw.js                service worker (cache untuk offline)
favicon.svg          lambang trefoil (digambar di kode) — favicon & dasar lambang header
icon-192/512.png     ikon launcher (dari logo)   ·   icon-maskable.png (adaptif Android)
apple-touch-icon.png ikon iOS   ·   favicon-64.png (fallback tab)
logo-source.png      logo SHIFT (arsip)
```

## ⚙️ Menyesuaikan data

Semua di `app.js`, bagian atas:
- **`STAFF`** — daftar petugas. Untuk rotator, `phase` = indeks dalam siklus pada 1 Mei 2026 (Didit 0, Aldi 2, Luthfi 4, Humaidi 6).
- **`HOLIDAYS`** — tanggal merah nasional (memengaruhi libur petugas cadangan). Tambah/sinkronkan di sini.
- **`SHIFT`** — label & jam tiap shift.

---

## 🛣️ Roadmap berikutnya

- **Penyesuaian — lanjutan**: cuti rentang tanggal & input tukar/double shift manual.
- **Simulasi** — tampilan tanggal / minggu / bulan ke masa depan.
- **Ekspor hibrida** — **Excel** (format daftar jaga, untuk salin-tempel) + **JPG** (matriks tim dengan baris Aldi disorot, dan kalender pribadi).
- **Statistik dinas** & catatan.

---

*Proyek pribadi. Tahap awal: single-admin, tanpa backend.*
