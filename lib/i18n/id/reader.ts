export const readerId = {
  reader: "Pembaca Publiora",
  library: "Pustaka",
  tableOfContents: "Daftar isi",
  openTableOfContents: "Buka daftar isi",
  closeTableOfContents: "Tutup daftar isi",
  previousSection: "Bagian sebelumnya",
  nextSection: "Bagian berikutnya",
  by: "oleh",
  section: "bagian",
  addToLibrary: "Tambahkan ke Pustaka",
  signIn: "Masuk",
  signInAndAdd: "Masuk dan tambahkan ke Pustaka",
  password: "Kata sandi",
  backToLibrary: "Kembali ke Pustaka",
  emptySections: "Ebook ini belum memiliki bagian yang dapat dibaca.",
  keyboardHint: "Keyboard: J/K atau ←/→ pindah bagian · T daftar isi · Esc tutup",
  savePrompt: "Selesai membaca? Simpan ebook di Pustaka dan lanjutkan kapan saja.",
  previewModeTitle: "Pratinjau sebagai pembaca",
  previewModeBody:
    "Ini tampilan pembaca untuk draf saat ini. Belum ada yang diterbitkan atau dibagikan.",
  previewBackToProject: "Kembali ke proyek",
  previewSectionNotComplete: "Belum selesai",
  previewEditSection: "Edit bagian",
} as const;

type SafeCopy = Readonly<{ title: string; description: string }>;

const claimResultCopy = {
  claimed: { title: "Ditambahkan ke pustaka", description: "Ebook siap dibaca dari pustaka Anda." },
  already_owned: { title: "Ebook sudah ada di pustaka", description: "Anda dapat melanjutkan membaca ebook ini." },
  expired: { title: "Tautan akses kedaluwarsa", description: "Minta tautan akses baru kepada pembuat ebook." },
  revoked: { title: "Tautan akses tidak aktif", description: "Minta tautan akses baru kepada pembuat ebook." },
  limit_reached: { title: "Kuota klaim sudah habis", description: "Minta tautan akses lain kepada pembuat ebook." },
  not_found: { title: "Tautan akses tidak ditemukan", description: "Periksa kembali tautan yang Anda buka." },
} as const satisfies Record<string, SafeCopy>;

const unknownClaimResult: SafeCopy = { title: "Klaim belum berhasil", description: "Coba lagi beberapa saat lagi." };
export function getClaimResultCopy(status: unknown): SafeCopy {
  return typeof status === "string" && Object.prototype.hasOwnProperty.call(claimResultCopy, status)
    ? claimResultCopy[status as keyof typeof claimResultCopy]
    : unknownClaimResult;
}

const claimPreviewCopy = {
  not_found: claimResultCopy.not_found,
  expired: claimResultCopy.expired,
  revoked: claimResultCopy.revoked,
  limit_reached: claimResultCopy.limit_reached,
} as const satisfies Record<string, SafeCopy>;

const unknownClaimPreview: SafeCopy = { title: "Tautan akses tidak dapat digunakan", description: "Periksa tautan atau coba lagi beberapa saat lagi." };
export function getClaimPreviewCopy(status: unknown): SafeCopy {
  return typeof status === "string" && Object.prototype.hasOwnProperty.call(claimPreviewCopy, status)
    ? claimPreviewCopy[status as keyof typeof claimPreviewCopy]
    : unknownClaimPreview;
}
