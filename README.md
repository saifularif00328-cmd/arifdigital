# Arif Digital

Website portofolio Arif Digital beserta dua produk webapp: **Generator Perangkat Ajar** (`/generator/`) dan **E-Rapor** (`/e-rapor/`). Situs statis, cocok untuk GitHub Pages. Backend memakai Supabase.

## Isi folder
- `index.html` : portofolio
- `admin/` : panel admin (login Supabase Auth)
- `generator/` : Generator Perangkat Ajar
- `e-rapor/` : E-Rapor
- `shared/` : kode bersama (core.js, kurikulum.js, app.css)
- `supabase/` : file SQL dan Edge Function
- `config.js` : alamat dan kunci publik Supabase, kontak

## Langkah pasang (urut)
1. **Database.** Buka Supabase, project `fjanarkvsfylcghstzob`, menu SQL Editor. Jalankan `supabase/02_fungsi_rpc.sql`, lalu `supabase/03_ai_jobs.sql`. (File 01 sudah terpasang.)
2. **Akun admin.** Buka `/admin/`, daftar dengan email `saifularif00328@gmail.com`. Email ini sudah terdaftar sebagai admin di tabel `admins`.
3. **AI dari server (opsional).** Di Supabase: Edge Functions, buat fungsi `ai-generate` dari `supabase/functions/ai-generate/index.ts`. Matikan "Verify JWT". Tambahkan secret `GEMINI_API_KEY`. Tanpa ini, guru memakai kunci Gemini sendiri (diisi di menu Profil Sekolah).
4. **GitHub Pages.** Repo `saifularif00328-cmd/arifdigital`. Di Settings, Pages, pilih Source: GitHub Actions. Setiap push ke `main` otomatis tayang lewat `.github/workflows/deploy.yml`.
5. **Buat pengguna produk.** Dari panel admin, tambah pengguna dan beri akses produk. Tamu mendapat 3 kali pakai gratis, setelahnya wajib login.

## Catatan penting
- Batas uji coba tamu memakai ID perangkat di browser. Pengguna yang menghapus data browser bisa mendapat jatah baru. Untuk kontrol ketat, wajibkan login.
- Bunyi CP, TP, dan KD hasil AI perlu dicek guru terhadap dokumen resmi (Kepka BSKAP 046/H/KR/2025 dan buku guru) sebelum dipakai.
- Font Times New Roman pada PDF diambil dari CDN saat dipakai (Tinos). Bila gagal, otomatis pakai Roboto.
