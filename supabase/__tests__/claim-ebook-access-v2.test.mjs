/**
 * Contract test for public.claim_ebook_access_v2 (§15 / Task 14 of the
 * implementation plan). Guards against drift:
 * - the RPC is secured (authenticated-only execute, no anon/public);
 * - every helper the body calls is actually defined in the file — PL/pgSQL
 *   bodies are lazy-bound, so a typo'd helper only explodes at runtime
 *   (this caught `claim_result` vs `claim_result_json` in the
 *   already_owned branch);
 * - the already-owned path never consumes a slot or bumps reader counters;
 * - the unique(reader_id, ebook_id) guard stays in place so concurrent
 *   duplicates resolve to already_owned instead of double-delivery.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../migrations/20260807000003_claim_ebook_access_v2.sql", import.meta.url),
  "utf8",
);

const rpcBody = () => {
  const match = sql.match(
    /create or replace function public\.claim_ebook_access_v2\([\s\S]*?\$;\s*\n/,
  );
  expect(match, "claim_ebook_access_v2 body exists").not.toBeNull();
  return match[0];
};

describe("public.claim_ebook_access_v2", () => {
  it("hanya dapat dieksekusi oleh authenticated (tidak anon/public)", () => {
    expect(sql).toMatch(/revoke all on function public\.claim_ebook_access_v2\(text\) from public, anon/);
    expect(sql).toMatch(/grant execute on function public\.claim_ebook_access_v2\(text\) to authenticated/);
    expect(sql).not.toMatch(/grant execute on function public\.claim_ebook_access_v2\(text\) to anon/);
  });

  it("semua helper yang dipanggil benar-benar didefinisikan (pengikat malas)", () => {
    const calls = [
      ...rpcBody().matchAll(/\bclaim_result\w*\(/g),
    ]
      .map((m) => m[0].replace("(", ""))
      .filter((name) => name !== "");
    // Setiap panggilan helper harus punya definisi create or replace di file.
    for (const name of calls) {
      expect(
        sql.includes(`create or replace function public.${name}(`),
        `${name} must be defined in the migration`,
      ).toBe(true);
    }
    // Tidak ada helper lama yang dinamai tanpa akhiran json.
    expect(sql).not.toMatch(/create or replace function public\.claim_result\(/);
    expect(calls.length).toBeGreaterThan(0);
  });

  it("cabang already_owned tidak mengonsumsi slot atau menaikkan counter", () => {
    const alreadyOwned = rpcBody().match(
      /-- Already owned: event only[\s\S]*?if v_ent\.id is not null then([\s\S]*?)end if;/,
    )?.[1];
    expect(alreadyOwned, "already_owned branch exists").toBeDefined();
    expect(alreadyOwned).toContain("'already_owned'");
    // Tidak boleh ada kenaikan counter di cabang ini.
    expect(alreadyOwned).not.toContain("used_count = used_count + 1");
    expect(alreadyOwned).not.toContain("total_readers = total_readers + 1");
    // Hanya jalan kalau kunci unik mencegah entri ganda untuk reader yang sama.
    expect(rpcBody()).toMatch(/on conflict \(reader_id, ebook_id\) do nothing/);
  });

  it("klaim segar mengucurkan slot & reader dalam transaksi yang sama", () => {
    const fresh = rpcBody().match(
      /-- Fresh claim[\s\S]*?end;/,
    )?.[0];
    expect(fresh).toBeDefined();
    expect(fresh).toContain("v_status := 'claimed'");
    expect(fresh).toContain("update public.claim_links");
    expect(fresh).toContain("used_count = used_count + 1");
    expect(fresh).toContain("total_readers = total_readers + 1");
  });
});