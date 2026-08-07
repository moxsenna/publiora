#!/usr/bin/env node
/**
 * Export consented audience segments from internal_user_audience_v1.
 *
 * Server/local-only, requires the service role:
 *   node scripts/export-audience.mjs \
 *     --segment claim_reader_only \
 *     --format csv \
 *     --output .local/audience/claim-reader-only.csv
 *
 * Options:
 *   --segment  <segment>       one of AUDIENCE_SEGMENTS (required)
 *   --format   csv|json      default csv
 *   --output   <path>        default stdout
 *   --count-only              print a count instead of rows; includes all
 *                             users in the segment (no consent filter) and
 *                             never outputs email
 *
 * Safety:
 *   - requires SUPABASE_SERVICE_ROLE_KEY (service role only);
 *   - default export filters marketing_email_consent = true;
 *   - the key is never logged or echoed in errors;
 *   - output directory (.local/) is git-ignored.
 *
 * @see docs/superpowers/plans/...-implementation-plan.md §19.3
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const AUDIENCE_SEGMENTS = Object.freeze([
  "landing_creator_prospect",
  "landing_creator_active",
  "claim_reader_only",
  "claim_reader_became_creator",
  "claim_reader_became_paid_creator",
  "direct_creator",
  "legacy_unclassified",
]);

/** Columns of public.internal_user_audience_v1 (see types/audience.ts). */
export const EXPORT_COLUMNS = Object.freeze([
  "user_id",
  "email",
  "name",
  "signup_origin",
  "initial_intent",
  "first_claim_link_id",
  "first_claim_ebook_id",
  "first_claim_creator_id",
  "first_claim_label",
  "first_claim_ebook_title",
  "reader_activated_at",
  "creator_activated_at",
  "creator_subscribed_at",
  "entitlement_count",
  "project_count",
  "publication_count",
  "current_plan_id",
  "current_subscription_status",
  "marketing_email_consent",
  "marketing_email_consent_at",
  "created_at",
  "last_known_activity_at",
  "derived_segment",
]);

// ---------------------------------------------------------------------------
// argument parsing (exported for tests)
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const opts = {
    segment: null,
    format: "csv",
    output: null,
    countOnly: false,
  };
  const raw = argv ?? process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    const next = () => {
      const v = raw[i + 1];
      if (v === undefined) throw new Error(`missing value for ${arg}`);
      i += 1;
      return v;
    };
    switch (arg) {
      case "--segment":
        opts.segment = next();
        break;
      case "--format": {
        const fmt = next();
        if (fmt !== "csv" && fmt !== "json") {
          throw new Error(`invalid format "${fmt}" (expected csv|json)`);
        }
        opts.format = fmt;
        break;
      }
      case "--output":
        opts.output = next();
        break;
      case "--count-only":
        opts.countOnly = true;
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        throw new Error(`unknown option "${arg}"`);
    }
  }

  if (!opts.help) {
    if (!opts.segment) throw new Error("--segment is required");
    if (!AUDIENCE_SEGMENTS.includes(opts.segment)) {
      throw new Error(
        `invalid segment "${opts.segment}" (expected one of: ${AUDIENCE_SEGMENTS.join(", ")})`,
      );
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// serialization (exported for tests)
// ---------------------------------------------------------------------------

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows) {
  const header = EXPORT_COLUMNS.map(csvCell).join(",");
  const lines = rows.map((row) =>
    EXPORT_COLUMNS.map((col) => csvCell(row[col])).join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// env + client
// ---------------------------------------------------------------------------

function loadEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        const k = l.slice(0, i).trim();
        const v = l
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        return [k, v];
      }),
  );
}

function client() {
  const env = { ...loadEnv(".env.local"), ...loadEnv(".env.e2e.local") };
  for (const k of Object.keys(env)) {
    if (process.env[k] === undefined) process.env[k] = env[k];
  }
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing (see .env.example); " +
        "this script refuses to run without the service role",
    );
  }
  // The key is never logged anywhere in this script.
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------------
// query + main (run when executed directly; importable for tests)
// ---------------------------------------------------------------------------

export async function runExport(opts) {
  const supabase = client();
  let query = supabase
    .from("internal_user_audience_v1")
    .select(EXPORT_COLUMNS.join(","))
    .eq("derived_segment", opts.segment);

  if (opts.countOnly) {
    // Count-only may include all users (no consent filter) but never
    // outputs email — the report is just a number.
    const { count, error } = await query.head().count("exact");
    if (error) throw error;
    return { count: count ?? 0, rows: [], countOnly: true, filename: null };
  }

  // Default export: consent-only — non-consent users are never included.
  const { data, error } = await query.eq("marketing_email_consent", true);
  if (error) throw error;
  const rows = (data ?? []).map((row) => row);

  let payload;
  if (opts.format === "json") payload = JSON.stringify(rows, null, 2) + "\n";
  else payload = toCsv(rows);

  let filename = null;
  if (opts.output) {
    mkdirSync(dirname(opts.output), { recursive: true });
    writeFileSync(opts.output, payload, "utf8");
    filename = opts.output;
  }
  return { count: rows.length, rows, countOnly: false, filename, payload };
}

const USAGE = `Usage:
  node scripts/export-audience.mjs --segment <segment> [--format csv|json] [--output <path>] [--count-only]

Segments: ${AUDIENCE_SEGMENTS.join(", ")}`;

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(USAGE);
    return;
  }
  const result = await runExport(opts);
  if (result.countOnly) {
    console.log(
      opts.format === "json"
        ? JSON.stringify({ segment: opts.segment, count: result.count })
        : `${csvCell(opts.segment)},${result.count}`,
    );
    return;
  }
  if (result.filename) {
    console.log(`Wrote ${result.count} consented ${opts.segment} rows to ${result.filename}`);
  } else {
    process.stdout.write(result.payload);
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    if (message.startsWith("--") || message.includes("required")) {
      console.error(`Error: ${message}\n\n${USAGE}`);
      process.exit(2);
    }
    console.error(`Error: ${message}`);
    process.exit(1);
  });
}