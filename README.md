# SHIFT-RAD 2.0 Beta

> **Baseline Beta baru — Kalibrasi Jadwal.** 2.0 Beta menambahkan checkpoint posisi rotasi bertanggal tanpa memecah mesin jadwal menjadi engine terpisah.

## Kontrak arsitektur 2.0 Beta

- **Satu resolver, bukan multi-engine.** Pola dasar (`SCHED`) tetap sumber struktur siklus. Kalibrasi hanya menentukan posisi efektif pegawai pada tanggal tertentu sebelum resolver lama berjalan.
- Urutan logika: **Pola dasar → checkpoint Kalibrasi → base shift → Penyesuaian (cuti/tukar/double/hutang) → `resolveDay()` → UI**.
- Kalibrasi **tidak mengubah histori** sebelum tanggal efektif dan **tidak menulis ulang `SCHED.offsets`**.
- Record Kalibrasi terikat pada fingerprint pola yang aktif saat dibuat. Jika struktur pola kemudian berubah, record lama otomatis **dinonaktifkan**, bukan dipaksakan ke pola baru.
- Preview menampilkan **7 hari**, sedangkan integrity guard memeriksa minimal **1 siklus penuh** (`max(7, cycle.length)`). Peringatan tidak menjadi hard block: user dapat memilih tetap melanjutkan.
- UI utama, navigasi, kalender, simulasi, serta sistem cuti/tukar/double tetap menggunakan alur yang sama; Kalibrasi berada di tab **Atur** sebagai fungsi khusus.

## Fitur baru: Kalibrasi Jadwal

1. Pilih tanggal mulai kalibrasi.
2. Centang satu atau lebih rotator terdampak.
3. Tentukan posisi awal tiap rotator (mis. Sore Pertama, Malam Kedua).
4. Tinjau preview 7 hari.
5. Integrity guard memberi peringatan bila ada shift kosong/ganda; user masih dapat memaksa simpan setelah konfirmasi.
6. Riwayat kalibrasi dapat dihapus untuk mengembalikan perhitungan ke checkpoint sebelumnya/pola dasar.

---


Aplikasi jadwal shift **Instalasi Radiologi** — ringan, visual, dan **offline-first** (PWA). Berdiri sendiri, terpisah dari sistem absensi institusi.

Pengguna saat ini: **Fakhrul Aldia Nugraha, A.Md.Rad (Aldi)**.

---

## ✅ Yang sudah ada (v0.1)

- **Engine pola dasar** yang deterministik — bisa menghitung shift siapa pun, di tanggal mana pun, maju/mundur tanpa batas.
- **Foto profil (header)** — ketuk lingkaran di kanan header untuk memilih foto dari galeri/berkas; otomatis dikecilkan (256px) & disimpan permanen di perangkat (localStorage). Ketuk **✕** untuk menghapus.
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
- **Double shift** mencatat **hutang dinas**. Di tab **Atur**, tekan **Konfirmasi** untuk menjadwalkan kapan si penghutang mengganti — pilih salah satu **dinas pemberi pinjaman** (bulan ini / depan; pilihan sadar-istirahat). Status otomatis **Dalam proses**, lalu **Lunas** begitu tanggalnya lewat. Tanggal pelunasan ikut tampil di Kalender.
- **Absen** (SI-PASTI / SI-PALUI) berdampingan di atas Beranda untuk akses cepat.
- Semua penyesuaian **tersimpan permanen** dan **tercermin** di Beranda, Kalender, dan detail tanggal.
- **Hari libur instansi (manual)** — di **Atur** bisa menambah tanggal libur di luar libur nasional, dengan pilihan cakupan: **Semua petugas** (rotator & cadangan ikut libur — instansi tutup) atau **Hanya dinas pagi** (rotator tetap menjalankan shift, hanya petugas pagi/cadangan libur). Otomatis tercermin sebagai tanggal merah di Kalender, detail tanggal, & Simulasi.
- Pilihan **"Biarkan kosong dulu"** untuk menunda penggantian — akan muncul sebagai konflik agar tak terlupa.

- **Cuti rentang tanggal**: pilih Dari–Sampai; pengganti tiap hari dipilih otomatis (Muhraini diutamakan), bisa diubah per hari di layar review sebelum diterapkan.
- **Tukar shift** (dua orang bertukar) & **Double manual** (ambil shift tambahan) bisa diinput langsung lewat **Tambah penyesuaian → Jenis**.

---

## 🔮 Simulasi (v0.7)

Tab **Simulasi** memproyeksikan jadwal ke masa depan (engine deterministik, jadi akurat sejauh apa pun):

- **Ritme 2 minggu** — strip 14 hari ke depan untuk Aldi sekilas (warna sif, hari ini bercincin, titik merah = tanggal merah).
- **Cek tanggal** — pilih tanggal bebas → langsung lihat sif Aldi, jam, teman satu sif, dan status tanggal merah. Menjawab "1 Januari nanti dinas atau libur?".
- **Hari besar mendatang** — daftar hari raya dengan sif Aldi tampil langsung. Menjawab "Lebaran tahun depan saya sif apa?". Ketuk untuk detail.
- Data libur: **2026 resmi** (SKB 3 Menteri / Setneg); **2027 perkiraan** (Idul Fitri ±10 Mar 2027, Idul Adha ±16 Mei 2027) — ditandai "perkiraan", menunggu SKB resmi.

---

## 🧠 Model engine (ringkas)

**Dua kelas petugas:**

| Kelas | Siapa | Pola |
|---|---|---|
| Rotator | Didit, Humaidi, Aldi, Luthfi | Siklus 8 hari: **P P · S S · M M · L L**, masing-masing digeser fase 2 hari → tiap hari selalu ada 1 Pagi, 1 Sore, 1 Malam, 1 Libur |
| Cadangan | dr. Dina, Anisa, Muhraini, Ano | **Pagi** di hari kerja, **Libur** tiap Minggu + tanggal merah |

**Jadwal 2.0 Beta = pola dasar deterministik + checkpoint Kalibrasi bertanggal + penyesuaian.** Tanggal acuan awal (1 Mei 2026) tetap menjadi fallback dasar, tetapi seorang rotator dapat memiliki checkpoint posisi baru mulai tanggal tertentu. Resolver selalu mengambil checkpoint terbaru yang valid untuk tanggal yang ditanyakan, lalu meneruskan hasilnya ke sistem penyesuaian lama.

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
styles.css           tema terang putih–hijau healthcare (mint + gradasi watermark) + sistem warna shift
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

Kartu **Shift hari ini** tampil premium (gradasi putih→biru pastel) dengan susunan: label besar shift, chip fase (**KE-1/KE-2** atau penanda penyesuaian seperti **GANTI/DOUBLE/TUKAR/PELUNASAN**), tanggal, jam dinas, dan **blok quote informatif**:
- **Hari default** → quote diambil dari acuan fase (mis. Pagi ke-2: "Hari kedua shift Pagi. Setelah menyelesaikan tugas hari ini, besok Anda beralih ke shift Sore.").
- **Saat ada penyesuaian** → quote menjelaskan alasannya (menggantikan / double / tukar / pelunasan / dibayar), lengkap dengan jam bila relevan.

---

## 🛣️ Roadmap berikutnya

- **Ekspor hibrida** — **Excel** (format daftar jaga, untuk salin-tempel) + **JPG** (matriks tim dengan baris Aldi disorot, dan kalender pribadi).
- **Statistik dinas** & catatan.

---

*Proyek pribadi. Tahap awal: single-admin, tanpa backend.*
