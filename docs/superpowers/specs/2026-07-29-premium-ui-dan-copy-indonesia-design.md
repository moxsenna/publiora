# Desain Audit dan Pemolesan UI Premium serta Copy Bahasa Indonesia

**Tanggal:** 2026-07-29  
**Status:** Disetujui  
**Cakupan:** Seluruh permukaan produk Publiora

## 1. Tujuan

Menyelaraskan seluruh pengalaman Publiora menjadi produk editorial SaaS yang lebih premium, konsisten, responsif, dan mudah diakses. Semua copy antarmuka memakai Bahasa Indonesia yang alami. Istilah industri tertentu tetap dipakai bila lebih lazim bagi pengguna sasaran.

Pekerjaan mencakup audit dan pemolesan sebelas permukaan utama, fondasi visual bersama, state antarmuka, aksesibilitas, metadata, serta sumber copy statis dan dinamis.

## 2. Keputusan Desain

Pendekatan yang dipilih ialah perbaikan sistematis menyeluruh:

1. menetapkan aturan bahasa dan glosarium;
2. menyelaraskan token dan primitive UI;
3. memoles shell bersama;
4. memoles setiap permukaan dengan aturan yang sama;
5. memusatkan copy berulang dan pemetaan nilai dinamis;
6. menambahkan pemeriksaan regresi bahasa dan visual.

Pendekatan ini dipilih karena perbaikan per halaman tanpa fondasi bersama berisiko menghasilkan ketidakkonsistenan dan mengembalikan campuran bahasa pada perubahan berikutnya.

## 3. Arah Visual

Karakter dasar Publiora tetap berupa editorial publishing, modern SaaS, content-first, dan AI sebagai kolaborator yang tenang. Kesan premium ditingkatkan tanpa desain ulang total.

Prinsip visual:

- kanvas cream lembut dengan permukaan putih berlapis;
- ruang vertikal lebih lega pada halaman pemasaran, auth, dasbor, modal, dan area keputusan;
- kepadatan lebih tinggi hanya pada editor, tabel, dan panel kerja;
- hierarki judul lebih tegas dengan lebar baca terkendali;
- radius kartu, input, modal, tombol, dan menu konsisten;
- border lembut dan bayangan tipis untuk membedakan kedalaman;
- aksen biru dan emas dipakai terbatas untuk fokus, status, atau momen bernilai;
- state kosong, memuat, error, sukses, disabled, dan destruktif mengikuti pola seragam;
- tindakan primer memiliki bobot yang sama pada desktop dan mobile;
- dekorasi tidak boleh mengalahkan konten atau memperlambat alur kerja.

Token yang digunakan aplikasi menjadi sumber kebenaran implementasi. Dokumen Stitch dan desain lama diperbarui agar tidak lagi bertentangan dengan implementasi mengenai radius, kepadatan, atau kebijakan bahasa.

## 4. Sistem Bahasa

### 4.1 Aturan utama

Bahasa antarmuka utama ialah Bahasa Indonesia. Dokumen HTML memakai `lang="id"`; metadata halaman, Open Graph, label aksesibilitas, pesan state, dan notifikasi mengikuti aturan yang sama.

Istilah navigasi baku:

| Inggris lama | Bahasa Indonesia |
| --- | --- |
| Dashboard | Dasbor |
| Projects | Proyek |
| Library | Pustaka |
| Billing | Tagihan |
| New Project | Proyek Baru |
| Workspace | Ruang Kerja |
| Published | Terbit |
| Sign out | Keluar |
| Password | Kata sandi |
| Section | Bagian |
| Publish | Terbitkan |
| Reader | Pembaca |

### 4.2 Istilah industri yang diizinkan

Istilah berikut boleh dipertahankan karena lazim bagi pengguna sasaran atau merupakan format/nama teknis:

- `lead magnet`;
- `CTA`;
- `template`;
- `brief`;
- `niche`;
- `tone`;
- AI, PDF, EPUB, URL, dan email;
- nama merek, metode pembayaran, judul contoh, nama paket resmi, dan payload teknis yang hanya terlihat pada area internal pengembang.

Kalimat yang memakai istilah tersebut tetap harus berstruktur Bahasa Indonesia. Istilah di luar daftar harus diterjemahkan atau ditambahkan melalui keputusan eksplisit, bukan dibiarkan secara kebetulan.

### 4.3 Area yang wajib berbahasa Indonesia

Bahasa Inggris tidak boleh muncul pada:

- navigasi dan breadcrumb;
- judul halaman dan metadata;
- label tombol dan tindakan;
- status dan badge;
- label form, bantuan, validasi, dan placeholder;
- toast, dialog, error, sukses, dan empty state;
- loading state dan alasan disabled;
- `aria-label`, `title`, teks pembaca layar, serta nama kontrol;
- pesan domain atau backend yang diteruskan kepada pengguna.

## 5. Arsitektur Copy

Copy disusun per domain di `lib/i18n/id/*`. Katalog sederhana dan typed diprioritaskan; framework i18n baru tidak ditambahkan karena produk hanya membutuhkan satu bahasa pada cakupan ini.

Unit katalog yang dibutuhkan:

- umum dan navigasi;
- pemasaran;
- auth;
- dasbor;
- proyek dan pembuatan proyek;
- penawaran;
- ruang kerja;
- pustaka dan pembaca;
- publikasi dan klaim;
- tagihan dan pembayaran;
- status, error, dan notifikasi.

Alur copy:

1. komponen mengambil label statis dari katalog domain;
2. nilai dinamis seperti status langganan, transaksi, proyek, publikasi, dan klaim melewati fungsi pemetaan;
3. API memakai kode error stabil bila memungkinkan;
4. UI memetakan kode tersebut menjadi pesan Bahasa Indonesia yang jelas dan dapat ditindaklanjuti;
5. pesan mentah dari penyedia atau backend hanya masuk log internal;
6. pemeriksaan statis memindai literal Inggris dengan allowlist istilah industri.

Literal yang khusus dan hanya muncul sekali boleh tetap dekat dengan komponen jika tidak akan dipakai ulang. Label bersama, status, pesan error, dan istilah domain harus terpusat.

## 6. Fondasi Komponen

Komponen berikut diaudit dan diselaraskan:

- `Button`;
- `Card`;
- `Input`;
- `Modal`;
- `Tabs`;
- `Badge`;
- `StatusPill`;
- `EmptyState`;
- `Toaster`.

Setiap primitive harus memiliki:

- ukuran dan jarak ikon konsisten;
- state hover, active, focus, disabled, loading, error, dan success yang jelas;
- target sentuh minimum 44×44 px pada mobile;
- fokus keyboard yang terlihat;
- kontras yang cukup;
- perilaku responsif yang tidak memotong label;
- API yang tetap sesuai pola kode saat ini.

Shell pemasaran, auth, aplikasi, dan pembaca ikut diselaraskan. Sidebar dan TopBar memakai istilah navigasi baku, hierarki tindakan yang jelas, serta kontrol mobile yang mudah dijangkau.

## 7. Cakupan Permukaan

### 7.1 Beranda

- mempertajam proposisi nilai;
- merapikan demo produk dan bukti manfaat;
- menyelaraskan CTA, paket, dan harga;
- mengganti campuran bahasa pada fitur dan cara kerja;
- mempertahankan judul ebook contoh sebagai konten, bukan label UI.

### 7.2 Auth

Mencakup masuk, daftar, dan lupa kata sandi:

- form lebih tenang dan fokus;
- label, bantuan, validasi, loading, error, dan sukses berbahasa Indonesia;
- panel editorial tetap mendukung positioning premium;
- alur keyboard dan pembaca layar diperbaiki.

### 7.3 Dasbor

- memperjelas hierarki kredit, proyek, publikasi, pembaca, dan klaim;
- menempatkan tindakan utama tanpa memenuhi layar;
- menyeragamkan statistik, proyek terbaru, state kosong, dan tautan ke tagihan;
- menghapus campuran bahasa dalam satu viewport.

### 7.4 Daftar Proyek

- menyelaraskan pencarian, filter, kartu, status, empty state, dan tindakan;
- memperjelas perbedaan proyek aktif, draf, selesai, dan terbit;
- menjaga responsif untuk kartu dan kontrol pada mobile.

### 7.5 Pembuatan Proyek

- membuat progres langkah mudah dipindai;
- memberi jarak lebih baik pada pertanyaan, rekomendasi, dan tindakan;
- memakai istilah industri hanya sesuai glosarium;
- menjaga validasi dan pemulihan state tetap jelas.

### 7.6 Ruang Kerja

- menyelaraskan navigasi tahap, editor, outline, bagian, tinjauan, dan publikasi;
- membuat footer tindakan menjelaskan syarat menuju tahap berikutnya;
- menjaga panel kerja efisien, sementara dialog dan area keputusan lebih lega;
- menerjemahkan blocker, warning, tindakan simpan, review, preview, dan publikasi;
- memetakan pesan workflow agar tidak menampilkan teks Inggris mentah;
- mempertahankan alur AI dan workflow publikasi tanpa perubahan perilaku.

### 7.7 Penawaran

- menyatukan pencarian, pilihan, rekomendasi, dan integrasi proyek;
- memperjelas state terpilih, kosong, dan error;
- menyelaraskan copy dengan pembuatan proyek.

### 7.8 Pustaka

- memoles koleksi, progres membaca, pencarian, dan empty state;
- memperjelas perbedaan ebook diklaim, belum dibaca, sedang dibaca, dan selesai;
- menjaga kartu mudah dipindai pada desktop dan mobile.

### 7.9 Manajemen Terbit dan Klaim

- mengelompokkan status, pembuatan tautan, ekspor, pembaca, dan unduhan;
- menerjemahkan label format, status, tanggal, dan tindakan;
- memberi konfirmasi jelas untuk tindakan destruktif atau pembatalan tautan.

### 7.10 Pembaca dan Halaman Klaim

- meminimalkan chrome agar fokus pada bacaan;
- meningkatkan tipografi, lebar baca, progres, CTA, dan kontrol mobile;
- menerjemahkan form klaim serta tautan kembali;
- memastikan CTA tetap terlihat tanpa mengganggu bacaan.

### 7.11 Tagihan

- menyusun ulang ringkasan saldo, paket, langganan, top-up, metode pembayaran, transaksi, dan status return;
- memakai bahasa konsumen untuk status pembayaran;
- tidak menampilkan istilah internal seperti webhook, nama event, atau mekanisme return sebagai instruksi pengguna;
- memetakan nama status dan label transaksi dinamis;
- menjaga perubahan PayCore yang sudah ada di working tree dan tidak menimpanya.

## 8. State dan Penanganan Error

Semua permukaan mengikuti pola berikut:

- **Memuat:** skeleton menyerupai bentuk konten; spinner dipakai hanya untuk tindakan lokal singkat.
- **Kosong:** menjelaskan kondisi dan menyediakan satu tindakan utama yang relevan.
- **Error:** menjelaskan dampak dan langkah pemulihan; detail teknis disimpan untuk log.
- **Sukses:** toast singkat, sementara hasil penting juga terlihat pada konten.
- **Disabled:** alasan tersedia ketika tindakan bergantung pada kredit, data, izin, atau tahap kerja.
- **Destruktif:** konfirmasi menyebut nama objek dan dampaknya.
- **Pembayaran:** membedakan menunggu, berhasil, gagal, kedaluwarsa, dan dibatalkan.
- **AI:** kegagalan generasi tidak memakai fallback template; pesan menjelaskan tindakan ulang atau kebutuhan kredit sesuai arsitektur AI langsung.

## 9. Aksesibilitas

- seluruh label aksesibilitas memakai Bahasa Indonesia;
- fokus keyboard terlihat pada semua kontrol interaktif;
- modal mengunci fokus dan mengembalikannya kepada pemicu;
- target sentuh minimum 44×44 px pada mobile;
- status tidak hanya dibedakan melalui warna;
- kontras teks, status, border, dan tombol memenuhi kebutuhan keterbacaan;
- struktur heading dan landmark semantik konsisten;
- label form terhubung dengan input dan pesan error;
- urutan tab mengikuti urutan visual dan alur tugas;
- animasi menghormati `prefers-reduced-motion`;
- perubahan state penting diumumkan secara tepat tanpa menghasilkan notifikasi berulang.

## 10. Responsif dan Detail Premium

Audit dilakukan minimal pada lebar mobile dan desktop yang mewakili pemakaian nyata. Tablet dinilai pada breakpoint yang sudah tersedia.

Kriteria responsif:

- tidak ada overflow horizontal tak disengaja;
- sidebar dan navigasi mobile tidak menutup tindakan penting;
- tabel menyediakan strategi scroll atau tampilan alternatif yang jelas;
- dialog tidak melewati viewport;
- footer tindakan ruang kerja tetap dapat digunakan saat keyboard mobile terbuka;
- judul panjang, email, URL, dan nama proyek tidak merusak layout;
- skeleton tidak menyebabkan layout shift besar.

Kesan premium dihasilkan melalui proporsi, tipografi, ruang, alignment, dan state halus. Tidak ditambahkan animasi berat, gradient berlebihan, atau dekorasi yang mengurangi performa dan fokus.

## 11. Verifikasi

### 11.1 Pemeriksaan kode

- lint;
- typecheck;
- unit dan integration test relevan;
- production build;
- pemeriksaan literal Inggris dengan allowlist;
- pencarian pesan backend atau domain yang mengalir langsung ke UI.

### 11.2 Pemeriksaan alur

Alur yang harus diverifikasi:

- beranda menuju auth;
- masuk, daftar, lupa kata sandi, dan pemulihan sesi;
- membuat proyek;
- memilih atau membuat penawaran;
- menjalankan ruang kerja sampai tinjauan dan publikasi;
- membuat serta memakai tautan klaim;
- membuka ebook di pembaca dan menyimpan progres;
- melihat tagihan, memilih paket, membuka pembayaran, dan menerima status return.

### 11.3 Pemeriksaan visual

- audit sebelas permukaan pada desktop dan mobile;
- bandingkan dengan screenshot baseline yang tersedia;
- periksa console dan request gagal;
- periksa overflow, layout shift, kontras, fokus keyboard, dan target sentuh;
- pastikan file billing yang sedang berubah tetap terjaga;
- perbarui baseline hanya setelah perubahan dinilai benar.

## 12. Batas Perubahan

Pekerjaan ini tidak:

- mengubah model bisnis;
- mengubah alur AI atau memperkenalkan mock/fallback template;
- mengubah aturan workflow publikasi;
- mengganti integrasi PayCore;
- membuat desain ulang total;
- menambah framework i18n tanpa kebutuhan baru;
- melakukan refactor yang tidak mendukung konsistensi UI, bahasa, aksesibilitas, atau pengujian;
- menimpa perubahan lokal yang belum committed.

## 13. Kriteria Selesai

Pekerjaan dinyatakan selesai ketika:

1. tidak ada campuran Inggris pada copy antarmuka, selain glosarium yang disetujui;
2. metadata dan `lang` memakai Bahasa Indonesia;
3. sebelas permukaan terasa sebagai satu produk editorial SaaS yang premium;
4. primitive, shell, state, dan tindakan utama konsisten;
5. nilai dinamis serta pesan error dipetakan ke Bahasa Indonesia;
6. desktop dan mobile lolos audit visual dan aksesibilitas dasar;
7. alur utama tidak mengalami regresi;
8. lint, typecheck, test relevan, dan production build lulus;
9. pemeriksaan regresi bahasa memiliki allowlist yang eksplisit;
10. dokumen desain lama yang bertentangan diperbarui agar sesuai kebijakan baru.
