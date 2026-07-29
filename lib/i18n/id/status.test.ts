import { describe, expect, it } from "vitest";
import {
  claimEventStatusCopyId,
  claimLinkStatusCopyId,
  creditTransactionTypeCopyId,
  exportStatusCopyId,
  getClaimEventStatusCopy,
  getClaimLinkStatusCopy,
  getExportStatusCopy,
  getPaymentOrderStatusCopy,
  getProjectStatusCopy,
  offerStatusCopyId,
  paymentOrderStatusCopyId,
  projectStatusCopyId,
  subscriptionStatusCopyId,
} from "@/lib/i18n/id";

describe("Indonesian status copy", () => {
  it("exhaustively maps internal domain unions", () => {
    expect(Object.keys(projectStatusCopyId).sort()).toEqual(
      ["approved", "draft", "failed", "generated", "generating", "outline_draft", "published", "publishing"].sort(),
    );
    expect(Object.keys(claimLinkStatusCopyId).sort()).toEqual(["active", "expired", "revoked"]);
    expect(Object.keys(claimEventStatusCopyId).sort()).toEqual(
      ["already_owned", "claimed", "expired", "limit_reached", "revoked"].sort(),
    );
    expect(Object.keys(exportStatusCopyId).sort()).toEqual(["complete", "failed", "processing", "queued"]);
    expect(Object.keys(subscriptionStatusCopyId).sort()).toEqual(["active", "canceled", "past_due", "trialing"]);
    expect(Object.keys(creditTransactionTypeCopyId).sort()).toEqual(["adjust", "grant", "purchase", "refund", "spend"]);
    expect(Object.keys(offerStatusCopyId).sort()).toEqual(["active", "archived"]);
    expect(Object.keys(paymentOrderStatusCopyId).sort()).toEqual(["canceled", "expired", "failed", "paid", "pending"]);
  });

  it("uses supported StatusPill tones", () => {
    const supported = ["default", "success", "warning", "danger", "info", "gold", "outline"];
    for (const catalog of [
      projectStatusCopyId,
      claimLinkStatusCopyId,
      claimEventStatusCopyId,
      exportStatusCopyId,
      subscriptionStatusCopyId,
      creditTransactionTypeCopyId,
      offerStatusCopyId,
      paymentOrderStatusCopyId,
    ]) {
      for (const copy of Object.values(catalog)) expect(supported).toContain(copy.tone);
    }
  });

  it("returns safe Indonesian fallback for unknown boundary statuses", () => {
    const fallback = { label: "Status tidak diketahui", tone: "default" };
    expect(getProjectStatusCopy("future_status")).toEqual(fallback);
    expect(getClaimLinkStatusCopy(undefined)).toEqual(fallback);
    expect(getClaimEventStatusCopy(null)).toEqual(fallback);
    expect(getExportStatusCopy({})).toEqual(fallback);
    expect(getPaymentOrderStatusCopy("provider_internal_state")).toEqual(fallback);
  });
});
