/**
 * Unit tests for scripts/export-audience.mjs (§19.3 of the implementation
 * plan). Cover: segment required, consent-only default, count-only without
 * email output, invalid segment rejected, and CSV serialization.
 */
import { describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  AUDIENCE_SEGMENTS,
  EXPORT_COLUMNS,
  parseArgs,
  toCsv,
  runExport,
} from "./export-audience.mjs";

/** Fake supabase client recording eq() calls; supports both paths. */
function makeClient({ rows = [], count = 0, error = undefined } = {}) {
  const eqCalls = [];
  const countFn = vi.fn().mockResolvedValue({ count, error });
  const eq = vi.fn((col, value) => {
    eqCalls.push([col, value]);
    return {
      data: rows,
      error,
      eq,
      head: vi.fn().mockReturnThis(),
      count: countFn,
    };
  });
  return {
    client: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq }),
      }),
    },
    eqCalls,
    countFn,
  };
}

describe("parseArgs", () => {
  it("mewajibkan --segment", () => {
    expect(() => parseArgs([])).toThrow("--segment");
    expect(() => parseArgs(["--format", "csv"])).toThrow("--segment");
  });

  it("menolak segmen di luar daftar kanonik", () => {
    for (const bad of ["nope", "claim_reader", "ADMIN"]) {
      expect(() => parseArgs(["--segment", bad])).toThrow("invalid segment");
    }
    // Nilai kosong dianggap tidak diberikan (wajib).
    expect(() => parseArgs(["--segment", ""])).toThrow("--segment");
  });

  it("menerima setiap segmen kanonik", () => {
    for (const segment of AUDIENCE_SEGMENTS) {
      expect(parseArgs(["--segment", segment]).segment).toBe(segment);
    }
  });

  it("menolak format selain csv|json", () => {
    expect(() => parseArgs(["--segment", "direct_creator", "--format", "xml"])).toThrow(
      "invalid format",
    );
  });

  it("menolak opsi tak dikenal", () => {
    expect(() => parseArgs(["--segment", "direct_creator", "--nope"])).toThrow(
      "unknown option",
    );
  });
});

describe("toCsv", () => {
  it("menulis header sesuai kolom view", () => {
    const lines = toCsv([]).trim().split("\n");
    expect(lines[0].split(",")).toEqual([...EXPORT_COLUMNS]);
  });

  it("mengutip sel yang mengandung koma, kutip, atau newline", () => {
    const csv = toCsv([
      {
        user_id: "u-1",
        email: 'reader"x@example.com',
        name: "Nama, Pertama",
        derived_segment: "claim_reader_only",
      },
    ]);
    expect(csv).toContain('"reader""x@example.com"');
    expect(csv).toContain('"Nama, Pertama"');
  });

  it("null menjadi sel kosong", () => {
    const csv = toCsv([{ user_id: "u-1", email: null, derived_segment: null }]);
    expect(csv).not.toContain("null");
    expect(csv).toContain("u-1,,");
  });
});

describe("runExport — consent & privasi", () => {
  const row = {
    user_id: "u-1",
    email: "reader@example.com",
    name: "Rini",
    derived_segment: "claim_reader_only",
  };

  it("default ekspor hanya menyertakan marketing_email_consent = true", async () => {
    const { client, eqCalls } = makeClient({ rows: [row] });
    const result = await runExport(
      { segment: "claim_reader_only", format: "csv" },
      client,
    );
    expect(eqCalls).toEqual([
      ["derived_segment", "claim_reader_only"],
      ["marketing_email_consent", true],
    ]);
    expect(result.count).toBe(1);
    expect(result.rows).toEqual([row]);
  });

  it("count-only tidak memfilter consent tetapi TIDAK pernah mengeluarkan email", async () => {
    const { client, eqCalls, countFn } = makeClient({ count: 7 });
    const result = await runExport(
      { segment: "claim_reader_only", format: "json", countOnly: true },
      client,
    );
    // Hanya filter segmen — tanpa filter consent — dan hasilnya cuma angka.
    expect(eqCalls).toEqual([["derived_segment", "claim_reader_only"]]);
    expect(countFn).toHaveBeenCalledWith("exact");
    expect(result.countOnly).toBe(true);
    expect(result.count).toBe(7);
    expect(result.rows).toEqual([]);
    // Tidak ada payload/email yang dapat dicetak.
    expect(result.payload).toBeUndefined();
  });

  it("menulis file ke --output dan hanya melaporkan jumlah", async () => {
    const dir = mkdtempSync(join(tmpdir(), "publiora-aud-"));
    const out = join(dir, "seg.csv");
    const { client } = makeClient({ rows: [row] });
    try {
      const result = await runExport(
        { segment: "claim_reader_only", format: "csv", output: out },
        client,
      );
      expect(result.filename).toBe(out);
      expect(existsSync(out)).toBe(true);
      expect(readFileSync(out, "utf8")).toContain("reader@example.com");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("meneruskan error kueri sebagai penolakan (tanpa mencetak key)", async () => {
    const { client } = makeClient({ error: new Error("db down") });
    await expect(
      runExport({ segment: "direct_creator", format: "csv" }, client),
    ).rejects.toThrow("db down");
    expect(JSON.stringify(client)).not.toContain("key");
  });
});