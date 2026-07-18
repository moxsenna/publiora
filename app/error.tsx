"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-full grid place-items-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold text-[var(--color-publiora-black)]">
          Terjadi kesalahan
        </h1>
        <p className="mt-2 text-sm text-[var(--color-medium-gray)]">
          {error.message || "Coba lagi sebentar."}
        </p>
        <Button className="mt-6" onClick={reset}>
          Coba lagi
        </Button>
      </div>
    </div>
  );
}
