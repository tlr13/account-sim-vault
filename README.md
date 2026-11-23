# AccVault — Peta Akun Google & Kartu SIM (PWA)

Web App pribadi yang ringan, cepat, dan bisa di-install ke Home Screen HP (PWA) maupun dibuka di Laptop untuk mengelola puluhan akun email dan kartu SIM dalam jangka panjang:

- **Tampilan Tabel Ringkas & Kartu (1-Klik Switch):** nyaman untuk memindai 40+ akun sekaligus (seperti spreadsheet), lalu klik baris manapun untuk membuka detail lengkap.
- **Banyak Akun Google / Email:** status terstruktur (`Aktif Pribadi`, `Cadangan`, `Dipakai Orang`, `Sold`, `Bermasalah`), pemakai/pembeli + batas waktu, kode/hint password aman, langganan ringkas + penanda **`Belum Cancel`** (dengan filter & alert khusus), auto-lengkapi `@gmail.com`, warna profil Chrome, akun *recovery*, kuota Drive, serta *custom fields*.
- **Detail Lapis 2 (Opsional per Akun):** **Cloud Projects** (GCP, Firebase, Vercel, Cloudflare, Supabase, AWS), **Website & SSO Terhubung**, **Subscriptions** (estimasi biaya IDR & USD), serta **Aset Lainnya**.
- **Nomor HP & Kartu SIM / eSIM Ringkas:** tabel ringkas `Provider`, `Nomor HP` (angka `0` di depan otomatis terjaga), countdown otomatis **Masa Tenggang** & **Tanggal Mati** (bebas bug `-46349`, mendukung kartu pascabayar seperti **XL Prio** / **by.U**), relasi otomatis ke akun email tertaut, tombol **Perpanjang**, dan unduh pengingat **Kalender (`.ics`)**.
- **Import Excel (`.xlsx`) / CSV Otomatis:** pindahkan data dari Google Sheets / Excel yang memiliki tab `email` dan `nomor` dalam sekali klik — dilengkapi **Zero Secret Guard** yang otomatis menyensor teks panjang yang tampak seperti password mentah.
- **Global Instant Search (`Ctrl + K` / 1-tap di HP):** cari website, project cloud, pemakai, `"belum cancel"`, atau 4 digit nomor HP → langsung ketemu pemiliknya.

> **Keamanan (Zero Secret Policy):** Jangan menyimpan password asli, kode backup 2FA, PIN, atau secret API key di aplikasi ini. Simpan password asli di Password Manager (mis. Bitwarden), dan di AccVault cukup gunakan kode/hint pola atau penunjuk lokasi penyimpanannya.

---

## Menjalankan Lokal (Development)

```bash
npm install
npm run dev
```

Pengujian & build:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

---

## Hosting Gratis di GitHub Pages

Repository ini sudah dilengkapi workflow otomatis [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Setiap `git push` ke `main` otomatis menjalankan typecheck, unit test, build produksi, dan deploy ke GitHub Pages.

---

## Pilihan Sinkronisasi Laptop ↔ HP

Buka menu **Sync & Setelan** di dalam aplikasi dan pilih salah satu mode:

### Opsi 1: 100% GitHub (Private Repository — Tanpa Auto-Pause)
1. Buat 1 repository **Private** baru di GitHub khusus data (mis. `accvault-private-data`), centang **Add a README file**.
2. Buat *Fine-grained Personal Access Token* dengan izin `Contents: Read and write` khusus untuk 1 repo data tersebut saja.
3. Masukkan Username, nama repo, dan token di **AccVault → Sync & Setelan → 100% GitHub**, aktifkan **Enkripsi AES-256** (opsional), lalu klik **Tes Koneksi Repo** & **Push**.

### Opsi 2: Supabase Cloud (Login Email/Password + PostgreSQL RLS)
1. Buat project gratis di [Supabase](https://supabase.com).
2. Jalankan seluruh isi [`supabase/schema.sql`](supabase/schema.sql) di **SQL Editor** (aman dijalankan ulang untuk migrasi kolom baru).
3. Buat 1 user di **Authentication → Users** lalu matikan publik **Allow new users to sign up**.
4. Masukkan **Project URL** & **Publishable/Anon Key** di **AccVault → Sync & Setelan → Supabase Cloud**, lalu login.

---

## Cara Install ke Home Screen HP (PWA)

- **Android (Chrome):** Buka URL GitHub Pages → menu titik tiga (`⋮`) → **Tambahkan ke layar utama / Install app**.
- **iOS (Safari):** Buka URL GitHub Pages → tombol **Share** → **Add to Home Screen**.
