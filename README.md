# AccVault — Peta Akun Google & Kartu SIM (PWA)

Web App pribadi yang ringan, cepat, dan bisa di-install ke Home Screen HP (PWA) maupun dibuka di Laptop untuk mencatat:

- **Banyak Akun Google** (kegunaan, warna profil Chrome, akun *recovery*, kuota Google Drive, status 2FA, tags, dan *custom fields* bebas)
- **Cloud Projects** (GCP, Firebase, Vercel, Cloudflare, Supabase, AWS, dll.)
- **Website & Layanan Terhubung** (Google OAuth/SSO, Email+Password, Magic Link)
- **Subscriptions** (biaya bulanan/tahunan IDR & USD, tanggal perpanjangan, pengingat)
- **Aset Lainnya** (YouTube Channel, Google Play Console, folder Drive penting, domain, API/quota, dll.)
- **Nomor HP & Kartu SIM / eSIM** (provider, posisi slot HP, **countdown otomatis masa aktif & masa tenggang**, relasi langsung ke akun Google yang tertaut, tombol **Perpanjang Cepat**, serta unduh pengingat **Kalender `.ics`**)
- **Global Instant Search (`Ctrl + K` / 1-tap di HP)** untuk *reverse lookup* instan: ketik nama website, project cloud, atau 4 digit nomor HP → langsung ketemu akun Google pemiliknya.

> **Keamanan (Zero Secret Policy):** Jangan menyimpan password asli, kode backup 2FA, PIN, atau secret API key di aplikasi ini. Simpan password asli di Password Manager (mis. Bitwarden), dan gunakan AccVault sebagai peta aset, relasi, dan pemantau masa aktif kartu SIM.

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
npm run build
```

---

## Cara Hosting Gratis di GitHub Pages

Repository ini sudah dilengkapi workflow otomatis [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Buka tab **Settings → Pages** di repository GitHub ini.
2. Pada bagian **Build and deployment → Source**, pilih **GitHub Actions**.
3. Setiap kali ada perubahan di branch `main` (atau klik **Run workflow** di tab **Actions**), aplikasi otomatis ter-build dan aktif di:
   `https://<username-github>.github.io/<nama-repo>/`

---

## Pilihan Sinkronisasi Laptop ↔ HP

Buka menu **Sync & Setelan** di dalam aplikasi dan pilih salah satu mode:

### Opsi 1: 100% GitHub (Private Repository — Tanpa Auto-Pause)
Cocok jika kamu ingin cukup memakai 1 akun GitHub saja dan tidak perlu khawatir *auto-pause* 7 hari.
1. Buat 1 repository **Private** baru di GitHub khusus untuk menyimpan data (misal: `accvault-private-data`), centang **Add a README file**.
2. Buka GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
3. Pada **Repository access**, pilih **Only select repositories** → pilih `accvault-private-data`.
4. Pada **Repository permissions → Contents**, pilih **Read and write**, lalu buat tokennya.
5. Di aplikasi **AccVault → Sync & Setelan → 100% GitHub**, masukkan Username GitHub, nama repo data, dan token tersebut.
6. *(Opsional)* Centang **Enkripsi AES-256** dan masukkan *passphrase* agar file JSON di repo private tersimpan dalam bentuk terenkripsi.
7. Klik **Tes Koneksi Repo**, lalu klik **Simpan ke GitHub (Push)** di Laptop dan **Tarik Data (Pull)** di HP.

### Opsi 2: Supabase Cloud (Login Email/Password + PostgreSQL RLS)
Cocok jika kamu ingin login biasa di HP/Laptop tanpa token dan database relasional PostgreSQL.
1. Buat project gratis di [Supabase](https://supabase.com).
2. Buka **SQL Editor → New Query**, tempel dan jalankan seluruh isi file [`supabase/schema.sql`](supabase/schema.sql).
3. Buka **Authentication → Users → Add user** untuk membuat 1 akun login milikmu.
4. Buka **Authentication → Providers → Email** (atau Sign Up settings) lalu **matikan Allow new users to sign up** agar tidak ada orang lain yang bisa mendaftar.
5. Salin **Project URL** dan **Publishable / Anon Key** dari **Settings → API**, lalu masukkan ke **AccVault → Sync & Setelan → Supabase Cloud** dan login.
   *(Catatan: paket gratis Supabase akan otomatis pause jika tidak ada aktivitas selama 7 hari berturut-turut; data tetap aman dan bisa diaktifkan lagi 1-klik dari dashboard Supabase.)*

---

## Cara Install ke Home Screen HP (PWA)

- **Android (Chrome):** Buka URL GitHub Pages → ketuk menu titik tiga (`⋮`) → **Tambahkan ke layar utama / Install app**.
- **iOS (Safari):** Buka URL GitHub Pages → ketuk tombol **Share** → **Add to Home Screen**.
