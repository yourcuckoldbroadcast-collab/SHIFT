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

## 🧠 Model engine (ringkas)

**Dua kelas petugas:**

| Kelas | Siapa | Pola |
|---|---|---|
| Rotator | Didit, Humaidi, Aldi, Luthfi | Siklus 8 hari: **P P · S S · M M · L L**, masing-masing digeser fase 2 hari → tiap hari selalu ada 1 Pagi, 1 Sore, 1 Malam, 1 Libur |
| Cadangan | dr. Dina, Anisa, Muhraini, Ano | **Pagi** di hari kerja, **Libur** tiap Minggu + tanggal merah |

**Jadwal = pola dasar (deterministik) + penyesuaian (menyusul).** Pola dasar diproyeksikan dari satu titik jangkar (1 Mei 2026), jadi "tanggal X tahun Y aku shift apa" cukup dihitung, bukan ditebak.

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
index.html      kerangka halaman + pemuatan font/gaya
styles.css      tema terang-fungsional + sistem warna shift
app.js          ENGINE (pola dasar) + render Beranda & Kalender
manifest.json   metadata PWA
sw.js           service worker (cache untuk offline)
icon.svg        ikon aplikasi
```

## ⚙️ Menyesuaikan data

Semua di `app.js`, bagian atas:
- **`STAFF`** — daftar petugas. Untuk rotator, `phase` = indeks dalam siklus pada 1 Mei 2026 (Didit 0, Aldi 2, Luthfi 4, Humaidi 6).
- **`HOLIDAYS`** — tanggal merah nasional (memengaruhi libur petugas cadangan). Tambah/sinkronkan di sini.
- **`SHIFT`** — label & jam tiap shift.

---

## 🛣️ Roadmap berikutnya

- **Penyesuaian jadwal** — cuti, petugas pengganti (Muhraini), double shift, dengan **arsip hutang dinas**.
- **Deteksi konflik berwarna** — hijau (direkomendasikan) / oranye (maraton, istirahat minim) / merah (tidak bisa, mis. Malam → langsung Pagi), termasuk pertimbangan beban Muhraini.
- **Simulasi** — tampilan tanggal / minggu / bulan ke masa depan.
- **Ekspor hibrida** — **Excel** (format daftar jaga, untuk salin-tempel) + **JPG** (matriks tim dengan baris Aldi disorot, dan kalender pribadi).
- **Statistik dinas** & catatan.

---

*Proyek pribadi. Tahap awal: single-admin, tanpa backend.*
