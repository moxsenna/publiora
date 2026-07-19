import fs from "node:fs";
import path from "node:path";

/** Load KEY=VALUE files into process.env without overriding existing values. */
export function loadEnvFiles(files: string[]): void {
  for (const file of files) {
    const full = path.resolve(file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const key = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim();
      if (!key) continue;
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
