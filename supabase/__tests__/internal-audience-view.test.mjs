/**
 * Contract test for public.internal_user_audience_v1 (§19 of the
 * implementation plan). Guards, against drift:
 * - view name & service-role-only grants (normal users cannot query);
 * - derived_segment CASE follows the §19.2 priority order;
 * - segment literals stay in sync with scripts/export-audience.mjs;
 * - the view never selects private content.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AUDIENCE_SEGMENTS } from "../../scripts/export-audience.mjs";

const sql = readFileSync(
  new URL("../migrations/20260807000004_internal_user_audience_v1.sql", import.meta.url),
  "utf8",
);

/** §19.2 priority order — highest first, evaluated top-down. */
const PRIORITY = [
  "claim_reader_became_paid_creator",
  "claim_reader_became_creator",
  "claim_reader_only",
  "landing_creator_active",
  "landing_creator_prospect",
  "direct_creator",
  "legacy_unclassified",
];

const branchOrder = () => {
  const caseMatch = sql.match(/case\s*\n([\s\S]*?)end\s*as\s*derived_segment/);
  expect(caseMatch, "derived_segment CASE exists").not.toBeNull();
  const branches = [...caseMatch[1].matchAll(/(?:then|else)\s+'([a-z_]+)'/g)].map(
    (m) => m[1],
  );
  // 'else' branch is the legacy fallback.
  expect(branches).toHaveLength(PRIORITY.length);
  return branches;
};

describe("public.internal_user_audience_v1", () => {
  it("membatasi akses ke service_role saja", () => {
    expect(sql).toMatch(/revoke all on table public\.internal_user_audience_v1 from anon, authenticated, public/);
    expect(sql).toMatch(/grant select on public\.internal_user_audience_v1 to service_role/);
    // Tidak ada grant untuk role normal di file ini.
    expect(sql).not.toMatch(/grant .* to authenticated/);
    expect(sql).not.toMatch(/grant .* to anon/);
  });

  it("menurunkan segmen sesuai prioritas §19.2 (satu segmen per pengguna)", () => {
    expect(branchOrder()).toEqual(PRIORITY);
    // Setiap pengguna tepat satu segmen: CASE tunggal pada derived_segment
    // (hanya di badan view — komentar header menyebut nama kolom).
    const body = sql.slice(sql.indexOf("create or replace view"));
    expect(body.match(/derived_segment/g)?.length).toBe(1);
    expect(body.match(/as\s*\nselect/g)).toHaveLength(1);
  });

  it("literala segmen sinkron dengan script ekspor", () => {
    const branches = branchOrder();
    expect([...branches].sort()).toEqual([...AUDIENCE_SEGMENTS].sort());
    expect(AUDIENCE_SEGMENTS).toHaveLength(7);
  });

  it("mengagregasi tanpa konten privat", () => {
    const selectPart = sql.match(/as\s*\nselect([\s\S]*?)from public\.profiles/)?.[1] ?? "";
    expect(selectPart).toContain("user_id");
    // Tidak ada kolom konten, brief, percakapan AI, teks bacaan, atau
    // kredensial pembayaran di proyeksi view.
    for (const forbidden of ["sections", "brief", "chat", "conversation", "content_html", "payment"]) {
      expect(selectPart).not.toContain(forbidden);
    }
  });

  it("berdasar pada profiles (bukan rantai content) — satu baris per user", () => {
    const from = sql.slice(sql.indexOf("from public.profiles"));
    expect(from).not.toContain("union");
    expect(from).toContain("left join public.claim_links");
    expect(from).toContain("left join public.published_ebooks");
    expect(from).toContain("left join public.subscriptions");
  });
});