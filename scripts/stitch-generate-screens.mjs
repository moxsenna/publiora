#!/usr/bin/env node
/**
 * Batch screen generator for Stitch.
 * Reads prompt files from docs/stitch/prompts/ and generates screens sequentially.
 *
 * Usage:
 *   STITCH_API_KEY=... node scripts/stitch-generate-screens.mjs [--start <index>]
 *
 * --start N: Skip to screen index N (0-based, for resuming after interruption)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const STITCH_CLI = resolve(ROOT, "scripts", "stitch-mcp.mjs");
const PROJECT_JSON = resolve(ROOT, "docs", "stitch", "project.json");
const PROMPTS_DIR = resolve(ROOT, "docs", "stitch", "prompts");
const EXPORTS_DIR = resolve(ROOT, "docs", "stitch", "exports");

const PROJECT_ID = "2847802891368404139";
const DESIGN_SYSTEM = "assets/c9d7b3741d144200b30a8db2ee0ededa";
const DEVICE_TYPE = "DESKTOP";
const MODEL_ID = "GEMINI_3_1_PRO";

// Retry config for polling get_screen
const POLL_INTERVAL_MS = 30000;
const MAX_POLLS = 10;

// How long to wait for generate_screen_from_text before treating as timeout (ms)
const GENERATE_TIMEOUT_MS = 300000; // 5 minutes

const SCREENS = [
  { key: "landing",        file: "01-landing.md" },
  { key: "login",           file: "02-login.md" },
  { key: "register",        file: "03-register.md" },
  { key: "forgotPassword",  file: "04-forgot-password.md" },
  { key: "dashboard",       file: "05-dashboard.md" },
  { key: "projects",        file: "06-projects.md" },
  { key: "workspace",       file: "07-workspace.md" },
  { key: "library",         file: "08-library.md" },
  { key: "published",       file: "09-published.md" },
  { key: "reader",          file: "10-reader.md" },
  { key: "billing",         file: "11-billing.md" },
];

function loadKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  if (existsSync(resolve(ROOT, ".dev.vars"))) {
    const txt = readFileSync(resolve(ROOT, ".dev.vars"), "utf8");
    const m = txt.match(/STITCH_API_KEY=(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("Set STITCH_API_KEY env var or create .dev.vars");
}

function loadProjectJson() {
  return JSON.parse(readFileSync(PROJECT_JSON, "utf8"));
}

function saveProjectJson(data) {
  writeFileSync(PROJECT_JSON, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`  [project.json] Updated.`);
}

function readPrompt(filename) {
  const path = resolve(PROMPTS_DIR, filename);
  if (!existsSync(path)) throw new Error(`Prompt file not found: ${path}`);
  return readFileSync(path, "utf8").trim();
}

function parseJsonOutput(stdout) {
  // The stitch-mcp.mjs outputs multi-line JSON on stdout.
  // First try parsing the entire stdout.
  try {
    return JSON.parse(stdout.trim());
  } catch {}

  // If that fails, try to find a JSON block (from first { to last })
  const firstBrace = stdout.indexOf("{");
  const lastBrace = stdout.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(stdout.slice(firstBrace, lastBrace + 1));
    } catch {}
  }
  return null;
}

function callStitchCli(name, args) {
  const argsJson = JSON.stringify(args);
  const result = spawnSync("node", [STITCH_CLI, "tools/call", name, argsJson], {
    cwd: ROOT,
    env: { ...process.env, STITCH_API_KEY: loadKey() },
    timeout: GENERATE_TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024,
    encoding: "utf8",
  });

  if (result.error) {
    const err = result.error;
    if (err.code === "ETIMEDOUT" || err.killed || result.signal === "SIGTERM") {
      return { timedOut: true, error: result.stderr || result.error?.message || "timeout" };
    }
    return { error: result.stderr || result.error?.message || String(result.error), timedOut: false };
  }

  // Parse stdout as multi-line JSON
  const output = parseJsonOutput(result.stdout);

  if (!output) {
    if (result.status !== 0) {
      return { error: (result.stderr || "Non-zero exit code").slice(0, 500), timedOut: false };
    }
    return { error: "Could not parse JSON from output", timedOut: false };
  }

  if (output.error) {
    return { error: JSON.stringify(output.error), timedOut: false };
  }

  return { result: output };
}

function extractScreenId(wrapper) {
  // callStitchCli returns { result: parsedMCPResponse }
  // parsedMCPResponse = { id, jsonrpc, result: { content: [{type:"text", text:"..."}], structuredContent: {...} } }
  const mcpResult = wrapper?.result?.result || wrapper?.result;
  if (!mcpResult) return null;

  // Method 1: Parse the text JSON string in content[0].text
  const contentItems = mcpResult.content;
  if (Array.isArray(contentItems)) {
    for (const item of contentItems) {
      if (item.type === "text" && item.text) {
        try {
          const inner = JSON.parse(item.text);
          // The inner object has outputComponents[0].design.screens[0].name
          if (inner.outputComponents) {
            for (const comp of inner.outputComponents) {
              if (comp?.design?.screens) {
                for (const s of comp.design.screens) {
                  if (s.name) {
                    const m = s.name.match(/screens\/([a-zA-Z0-9]+)/);
                    if (m) return m[1];
                  }
                }
              }
            }
          }
          // Also check for screen directly
          if (inner.screen?.name) {
            const m = inner.screen.name.match(/screens\/([a-zA-Z0-9]+)/);
            if (m) return m[1];
          }
          if (inner.screenId) return inner.screenId;
        } catch {}
        // Regex fallback
        const m = item.text.match(/screens\/([a-zA-Z0-9]+)/);
        if (m) return m[1];
      }
    }
  }

  // Method 2: Check structuredContent
  const sc = mcpResult.structuredContent;
  if (sc?.outputComponents) {
    for (const comp of sc.outputComponents) {
      if (comp?.design?.screens) {
        for (const s of comp.design.screens) {
          if (s.name) {
            const m = s.name.match(/screens\/([a-zA-Z0-9]+)/);
            if (m) return m[1];
          }
        }
      }
    }
  }

  // Method 3: Deep search regex on JSON string
  try {
    const str = JSON.stringify(wrapper);
    const m = str.match(/"name":"projects\/\d+\/screens\/([a-zA-Z0-9]+)"/);
    if (m) return m[1];
  } catch {}

  return null;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function callGetScreen(screenId) {
  return callStitchCli("get_screen", {
    name: `projects/${PROJECT_ID}/screens/${screenId}`,
  });
}

async function pollForScreen(screenKey, timeoutReason) {
  console.log(`  [poll] ${timeoutReason}. Will poll get_screen after generation started...`);
  console.log(`  [poll] Listing screens to find the generated one...`);

  for (let i = 0; i < MAX_POLLS; i++) {
    console.log(`  [poll] Attempt ${i + 1}/${MAX_POLLS} - waiting ${POLL_INTERVAL_MS / 1000}s...`);
    await sleep(POLL_INTERVAL_MS);

    const listResult = callStitchCli("list_screens", { projectId: PROJECT_ID });
    if (listResult.error) {
      console.log(`  [poll] list_screens error: ${listResult.error}`);
      continue;
    }
    if (listResult.result) {
      const parsed = listResult.result;
      // Try to find a new screen
      const screens = parsed?.result?.content || [];
      if (Array.isArray(parsed?.screens)) {
        console.log(`  [poll] Found ${parsed.screens.length} screens`);
        // We need to check project.json to see which ones are new
        const proj = loadProjectJson();
        for (const screen of parsed.screens) {
          if (typeof screen === "object" && screen.name) {
            const m = screen.name.match(/screens\/(\d+)/);
            if (m) {
              const sid = m[1];
              const known = Object.values(proj.screens || {});
              if (!known.includes(sid)) {
                console.log(`  [poll] Found new screen: ${sid}`);
                return sid;
              }
            }
          }
        }
      } else {
        // Try content array
        const content = parsed?.result?.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === "text" && item.text) {
              try {
                const p = JSON.parse(item.text);
                const sid = extractScreenIdFromParsed(p);
                if (sid) return sid;
              } catch {}
            }
          }
        }
      }
    }
    console.log(`  [poll] No new screen found yet.`);
  }
  return null;
}

async function generateScreen(screenKey, promptFile) {
  console.log(`\n=== Generating screen: ${screenKey} (${promptFile}) ===`);
  const prompt = readPrompt(promptFile);
  console.log(`  Prompt length: ${prompt.length} chars`);

  const args = {
    projectId: PROJECT_ID,
    prompt,
    deviceType: DEVICE_TYPE,
    designSystem: DESIGN_SYSTEM,
    modelId: MODEL_ID,
  };

  console.log(`  Calling generate_screen_from_text...`);
  const result = callStitchCli("generate_screen_from_text", args);

  if (result.timedOut) {
    console.log(`  [timeout] Generation timed out. Polling...`);
    const screenId = await pollForScreen(screenKey, "generate_screen_from_text timed out");
    if (screenId) {
      console.log(`  [poll] Resolved screen ID: ${screenId}`);
      return screenId;
    }
    console.log(`  [poll] Failed to resolve screen after polling.`);
    return null;
  }

  if (result.error) {
    console.log(`  [error] ${result.error}`);
    // Even on error, the generation might have started. Try polling.
    const screenId = await pollForScreen(screenKey, `generate_screen_from_text returned error: ${result.error}`);
    if (screenId) {
      console.log(`  [poll] Resolved screen ID despite error: ${screenId}`);
      return screenId;
    }
    return null;
  }

  // Try to extract screen ID from result
  const sid = extractScreenId(result);
  if (sid) {
    console.log(`  [ok] Generated screen ID: ${sid}`);
    return sid;
  }

  // If no ID found in result, but generation might have succeeded asynchronously
  console.log(`  [warn] No screen ID in response. Checking for output_components suggestions...`);

  // Check for suggestions
  const text = result?.result?.content?.find(c => c.type === "text")?.text;
  if (text) {
    try {
      const p = JSON.parse(text);
      if (p.output_components) {
        console.log(`  [suggestions] ${JSON.stringify(p.output_components).slice(0, 200)}`);
      }
    } catch {}
  }

  // Try polling anyway
  const polledId = await pollForScreen(screenKey, "no screen ID in response");
  if (polledId) {
    console.log(`  [poll] Resolved screen ID: ${polledId}`);
    return polledId;
  }

  return null;
}

async function writeExport(screenKey, screenId) {
  console.log(`  Writing export note...`);
  const screenName = `projects/${PROJECT_ID}/screens/${screenId}`;
  const getResult = callStitchCli("get_screen", { name: screenName });

  let title = screenKey;
  let resourceName = screenName;
  let extraNotes = "";

  if (getResult.result && !getResult.error) {
    try {
      const content = getResult.result?.result?.content;
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.type === "text" && item.text) {
            try {
              const p = JSON.parse(item.text);
              if (p.title) title = p.title;
              if (p.name) resourceName = p.name;
              // Capture any useful metadata
              if (p.deviceType) extraNotes += `deviceType: ${p.deviceType}\n`;
              if (p.htmlDownloadUrl) extraNotes += `htmlDownloadUrl: ${p.htmlDownloadUrl}\n`;
              if (p.imageDownloadUrl) extraNotes += `imageDownloadUrl: ${p.imageDownloadUrl}\n`;
            } catch {}
          }
        }
      }
    } catch (e) {
      extraNotes += `(error parsing get_screen response: ${e.message})\n`;
    }
  } else {
    extraNotes += `(get_screen failed: ${getResult.error || "unknown"})\n`;
  }

  const exportMd = `# ${title}

- **Screen key:** ${screenKey}
- **Resource:** ${resourceName}
- **Screen ID:** ${screenId}
- **Project:** projects/${PROJECT_ID}
${extraNotes}
`;

  if (!existsSync(EXPORTS_DIR)) mkdirSync(EXPORTS_DIR, { recursive: true });
  writeFileSync(resolve(EXPORTS_DIR, `${screenKey}.md`), exportMd, "utf8");
  console.log(`  [export] Written to docs/stitch/exports/${screenKey}.md`);
}

async function cleanupExportDuplicates() {
  // Ensure exports directory contains only the screens we care about
  const validKeys = new Set(SCREENS.map(s => s.key));
  if (existsSync(EXPORTS_DIR)) {
    // We don't delete anything, just noting
  }
}

async function main() {
  const startIndex = parseInt(process.argv[process.argv.indexOf("--start") + 1]) || 0;

  console.log(`Stitch Screen Generator`);
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Design System: ${DESIGN_SYSTEM}`);
  console.log(`Model: ${MODEL_ID}`);
  console.log(`Starting from index: ${startIndex}`);
  console.log(`Total screens: ${SCREENS.length}`);

  let proj = loadProjectJson();
  if (!proj.screens) proj.screens = {};

  let successCount = 0;
  let failCount = 0;
  const failures = [];

  for (let i = startIndex; i < SCREENS.length; i++) {
    const { key, file } = SCREENS[i];
    console.log(`\n[${i + 1}/${SCREENS.length}] ${key}`);

    const screenId = await generateScreen(key, file);

    if (screenId) {
      proj = loadProjectJson();
      proj.screens[key] = screenId;
      saveProjectJson(proj);
      successCount++;

      try {
        await writeExport(key, screenId);
      } catch (e) {
        console.log(`  [export] Warning: ${e.message}`);
      }
    } else {
      failCount++;
      failures.push(key);
      console.log(`  [FAIL] Could not generate or resolve screen for ${key}`);

      // Record failure in project.json notes
      proj = loadProjectJson();
      if (!proj.notes) proj.notes = {};
      if (!proj.notes.failures) proj.notes.failures = {};
      proj.notes.failures[key] = "Generation failed or screen not found after polling";
      saveProjectJson(proj);
    }
  }

  console.log(`\n===== SUMMARY =====`);
  console.log(`Success: ${successCount}/${SCREENS.length}`);
  console.log(`Failed: ${failCount}/${SCREENS.length}`);
  if (failures.length > 0) {
    console.log(`Failed screens: ${failures.join(", ")}`);
  }

  // Write checkpoint
  const checkpointMd = `# Stitch Screen Generation Checkpoint

Generated: ${new Date().toISOString()}

## Results
- **Success:** ${successCount}/${SCREENS.length}
- **Failed:** ${failCount}/${SCREENS.length}

## Screen IDs
| Key | Screen ID | Status |
|-----|-----------|--------|
${SCREENS.map(s => {
  const sid = loadProjectJson().screens?.[s.key] || "N/A";
  const status = sid !== "N/A" ? "OK" : (failures.includes(s.key) ? "FAILED" : "PENDING");
  return `| ${s.key} | ${sid} | ${status} |`;
}).join("\n")}

## Failures
${failures.length > 0 ? failures.map(k => `- **${k}**: Generation failed or screen not found after polling`).join("\n") : "None"}

## Notes
- Design system: ${DESIGN_SYSTEM}
- Project: ${PROJECT_ID}
- Model: ${MODEL_ID}
- Device: ${DEVICE_TYPE}
`;

  if (!existsSync(EXPORTS_DIR)) mkdirSync(EXPORTS_DIR, { recursive: true });
  writeFileSync(resolve(EXPORTS_DIR, "CHECKPOINT.md"), checkpointMd, "utf8");
  console.log(`\nCheckpoint written to docs/stitch/exports/CHECKPOINT.md`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
