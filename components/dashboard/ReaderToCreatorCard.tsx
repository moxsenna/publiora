import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { dashboardId } from "@/lib/i18n/id/dashboard";

/**
 * Contextual invite shown on the dashboard for reader-first users:
 * signup_origin === "claim_link" AND zero projects yet. It only reads the
 * profile — it never writes or changes the immutable signup origin.
 */
export function ReaderToCreatorCard() {
  return (
    <Card className="border-[var(--color-gold)]/40">
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="h-9 w-9 shrink-0 rounded-lg bg-[var(--color-gold)]/15 text-[var(--color-gold)] grid place-items-center"
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-sm sm:text-base font-semibold text-[var(--color-publiora-black)]">
              {dashboardId.readerToCreatorTitle}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-medium-gray)]">
              {dashboardId.readerToCreatorBody1}{" "}
              {dashboardId.readerToCreatorBody2}
            </p>
          </div>
        </div>
        <Link
          href="/projects/new"
          className="ml-auto inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-publiora-blue)] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)]"
        >
          {dashboardId.readerToCreatorCta}
        </Link>
      </CardBody>
    </Card>
  );
}