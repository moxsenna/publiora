import { describe, expect, it } from "vitest";
import { metadataId } from "./metadata";

describe("metadataId", () => {
  it("menyediakan metadata utama Bahasa Indonesia", () => {
    expect(metadataId.root.title).toContain("Publiora");
    expect(metadataId.root.description).toMatch(/ebook|terbit|publikasi/i);
    expect(metadataId.root.titleTemplate).toBe("%s | Publiora");
    expect(metadataId.root.openGraphLocale).toBe("id_ID");
  });

  it("menyediakan judul Indonesia untuk semua route statis", () => {
    expect(metadataId.routes).toEqual({
      login: { title: "Masuk", description: "Masuk ke akun Publiora Anda." },
      register: { title: "Buat Akun", description: "Buat akun Publiora untuk mulai menerbitkan ebook." },
      forgotPassword: { title: "Lupa Kata Sandi", description: "Atur ulang kata sandi akun Publiora Anda." },
      dashboard: { title: "Dasbor", description: "Pantau proyek dan aktivitas penerbitan Anda di Publiora." },
      projects: { title: "Proyek", description: "Kelola proyek ebook Anda di Publiora." },
      newProject: { title: "Proyek Baru", description: "Mulai proyek ebook baru di Publiora." },
      offers: { title: "Produk & Penawaran", description: "Kelola produk dan penawaran untuk ebook Anda." },
      library: { title: "Pustaka", description: "Baca dan kelola koleksi ebook Anda di Publiora." },
      published: { title: "Publikasi", description: "Kelola publikasi ebook Anda di Publiora." },
      billing: { title: "Tagihan & Kredit", description: "Kelola langganan, kredit, dan tagihan Publiora Anda." },
      payment: { title: "Status Pembayaran", description: "Periksa status pembayaran Publiora Anda." },
      claim: { title: "Klaim Ebook", description: "Klaim ebook Anda melalui Publiora." },
      reader: { title: "Baca Ebook", description: "Baca ebook yang diterbitkan melalui Publiora." },
    });
  });
});
