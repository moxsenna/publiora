import { GlobalLoading } from "@/components/ui/GlobalLoading";

export default function Loading() {
  return (
    <div className="min-h-full grid place-items-center">
      <GlobalLoading label="Memuat Publiora…" />
    </div>
  );
}
