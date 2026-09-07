export const marketingId = {
  hero: {
    eyebrow: "Platform penerbitan ebook berbasis AI",
    title: "Dari gagasan menjadi ebook yang siap dibagikan.",
    description: "Susun strategi, tulis setiap bagian, terbitkan, dan jangkau pembaca dalam satu alur editorial yang terarah.",
    primaryCta: "Mulai gratis",
    secondaryCta: "Lihat contoh ebook",
  },
  features: {
    eyebrow: "Manfaat utama",
    title: "Semua yang dibutuhkan untuk menerbitkan ebook bernilai.",
    description: "AI membantu pekerjaan berulang. Anda tetap memegang arah, mutu, dan keputusan akhir.",
  },
  workflow: { eyebrow: "Cara kerja", title: "Enam langkah jelas dari brief hingga pembaca." },
  pricing: {
    eyebrow: "Harga",
    title: "Pilih kapasitas yang sesuai dengan ritme penerbitan Anda.",
    description: "Setiap paket mencakup kuota kredit bulanan untuk bantuan AI. Kredit tambahan tersedia saat kebutuhan meningkat.",
    creditCosts: [
      "Outline menggunakan 5 kredit.",
      "Setiap bagian menggunakan 10 kredit.",
      "Judul atau CTA menggunakan 2 kredit.",
    ],
    topUp: "Perlu kapasitas tambahan? Tambah kredit kapan saja melalui Tagihan.",
    monthly: "/bulan",
  },
  finalCta: { title: "Terbitkan ebook pertama Anda dengan arah yang lebih jelas.", description: "Mulai gratis dengan 50 kredit bulanan. Tingkatkan paket saat kebutuhan penerbitan bertambah.", action: "Buat akun gratis" },
} as const;

export const marketingFeatures = [
  ["Brief yang terarah", "Percakapan terpandu membantu merumuskan sudut pandang, audiens, dan tujuan ebook."],
  ["Kerangka yang mudah ditinjau", "Susun ulang bagian dan setujui struktur sebelum penulisan dimulai."],
  ["Penulisan per bagian", "Kembangkan naskah bertahap agar suara, detail, dan mutu tetap terkendali."],
  ["Distribusi praktis", "Bagikan tautan klaim agar audiens dapat menyimpan dan membaca ebook Anda."],
  ["Kapasitas yang fleksibel", "Pilih kuota bulanan sesuai ritme produksi dan tambah kredit saat diperlukan."],
  ["Ekspor PDF dan EPUB", "Siapkan karya untuk dibagikan dalam format yang lazim digunakan pembaca."],
] as const;

export const marketingSteps = [
  ["01", "Rumuskan brief", "Jelaskan ide, audiens, dan hasil yang ingin dicapai."],
  ["02", "Susun kerangka", "Tinjau alur bagian, ubah urutan, lalu setujui struktur."],
  ["03", "Tulis bertahap", "Kembangkan setiap bagian dan sunting langsung dalam ruang kerja."],
  ["04", "Perkuat judul dan CTA", "Bandingkan pilihan judul serta CTA yang sesuai dengan tujuan ebook."],
  ["05", "Terbitkan dan bagikan", "Jadikan ebook siap dibaca, lalu sebarkan tautan klaim."],
  ["06", "Pahami pembaca", "Pantau klaim dan bantu pembaca melanjutkan bacaan mereka."],
] as const;
