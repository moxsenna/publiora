#!/usr/bin/env node
/**
 * Minimal Google Stitch MCP JSON-RPC helper.
 * Handles MCP streamable HTTP protocol (initialize + tools/list + tools/call).
 *
 * Usage:
 *   STITCH_API_KEY=... node scripts/stitch-mcp.mjs tools/list
 *   STITCH_API_KEY=... node scripts/stitch-mcp.mjs tools/call create_project '{"title":"Publiora UI Polish"}'
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

// ── API key ──────────────────────────────────────────────────────────────────

function loadKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  if (existsSync(".dev.vars")) {
    const txt = readFileSync(".dev.vars", "utf8");
    const m = txt.match(/STITCH_API_KEY=(.+)/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("Set STITCH_API_KEY env var or create .dev.vars with STITCH_API_KEY=...");
}

const key = loadKey();
const url = "https://stitch.googleapis.com/mcp";

// ── CLI args ─────────────────────────────────────────────────────────────────

const [mode, name, argsJson] = process.argv.slice(2);

if (!mode) {
  console.error("Usage: node scripts/stitch-mcp.mjs tools/list");
  console.error("       node scripts/stitch-mcp.mjs tools/call <name> '<json args>'");
  process.exit(1);
}

// ── Session state ────────────────────────────────────────────────────────────

let sessionId = null;

// ── SSE / text parser ────────────────────────────────────────────────────────

/**
 * Parse a response body that may be:
 * 1. Plain JSON
 * 2. SSE stream with data: lines
 * 3. Multi-part with event: headers
 */
function parseResponse(text) {
  // Try plain JSON first
  try {
    return { type: "json", data: JSON.parse(text) };
  } catch {
    // not plain JSON
  }

  // Try SSE format
  const lines = text.split(/\r?\n/);
  const events = [];
  let currentEvent = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      // empty line = end of event
      if (currentEvent && currentEvent.data !== undefined) {
        events.push(currentEvent);
      }
      currentEvent = null;
      continue;
    }

    if (line.startsWith("event:")) {
      if (!currentEvent) currentEvent = {};
      currentEvent.event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      if (!currentEvent) currentEvent = {};
      const dataStr = line.slice(5).trim();
      if (dataStr === "[DONE]") {
        currentEvent.done = true;
      } else {
        try {
          currentEvent.data = JSON.parse(dataStr);
        } catch {
          currentEvent.data = dataStr;
        }
      }
    } else if (line.startsWith("id:")) {
      if (!currentEvent) currentEvent = {};
      currentEvent.id = line.slice(3).trim();
    }
  }

  // Handle last event without trailing newline
  if (currentEvent && currentEvent.data !== undefined) {
    events.push(currentEvent);
  }

  // Return the first meaningful event data
  for (const ev of events) {
    if (ev.data) {
      return { type: "sse", data: ev.data };
    }
  }

  return { type: "raw", data: text };
}

// ── JSON-RPC call ────────────────────────────────────────────────────────────

async function rpc(method, params) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "X-Goog-Api-Key": key,
  };

  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params: params || {},
    }),
  });

  // Capture session ID from response headers (MCP streamable HTTP)
  const respSessionId = res.headers.get("mcp-session-id");
  if (respSessionId) {
    sessionId = respSessionId;
  }

  const text = await res.text();

  if (!res.ok) {
    return { error: { code: res.status, message: text.slice(0, 500) } };
  }

  const parsed = parseResponse(text);
  if (parsed.type === "json" || parsed.type === "sse") {
    return parsed.data;
  }
  return { raw: parsed.data, status: res.status };
}

// ── Main ─────────────────────────────────────────────────────────────────────

try {
  if (mode === "tools/list") {
    // MCP requires initialize first
    console.error("Initializing MCP session...");
    const initResult = await rpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "stitch-mcp-cli", version: "1.0.0" },
    });
    console.error("Initialize result:", JSON.stringify(initResult).slice(0, 200));

    // Some servers need notifications/initialized acknowledged
    await rpc("notifications/initialized", {});

    const result = await rpc("tools/list", {});
    console.log(JSON.stringify(result, null, 2));
  } else if (mode === "tools/call") {
    const parsedArgs = argsJson ? JSON.parse(argsJson) : {};

    // Initialize session
    console.error("Initializing MCP session...");
    const initResult = await rpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "stitch-mcp-cli", version: "1.0.0" },
    });
    console.error("Initialize: OK");

    await rpc("notifications/initialized", {});

    const result = await rpc("tools/call", { name, arguments: parsedArgs });
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error("Unknown mode:", mode);
    console.error("Usage: tools/list | tools/call <name> '<json args>'");
    process.exit(1);
  }
} catch (err) {
  console.error("FATAL:", err.message);
  process.exit(1);
}
