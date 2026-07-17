import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-full grid place-items-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-[var(--color-publiora-black)]">404</div>
        <h1 className="mt-3 text-xl font-semibold text-[var(--color-publiora-black)]">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-sm text-[var(--color-medium-gray)]">
          URL mungkin salah, atau resource sudah dihapus.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="outline">Beranda</Button>
          </Link>
          <Link href="/dashboard">
            <Button>Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
