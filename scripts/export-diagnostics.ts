/**
 * Export diagnostics for support or debugging.
 * Collects non-sensitive config (env var names present, API base URL) and outputs JSON.
 * No secret values are included.
 *
 * Usage:
 *   npx tsx scripts/export-diagnostics.ts
 *   npx tsx scripts/export-diagnostics.ts --out report.json
 */

import { writeFileSync } from "fs";
import { dirname, resolve, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENV_PREFIXES = ["NEXT_PUBLIC_", "APPLE_", "SETLISTFM_", "ALLOWED_", "API_"];

function envVarNamesPresent(): string[] {
  const names: string[] = [];
  for (const key of Object.keys(process.env)) {
    if (ENV_PREFIXES.some((p) => key.startsWith(p))) names.push(key);
  }
  return names.sort();
}

/** Resolve --out path and ensure it is under cwd to avoid path traversal (DCI-009). */
function resolveOutPath(raw: string): string | null {
  const cwd = process.cwd();
  const normalized = resolve(cwd, raw);
  const rel = relative(cwd, normalized);
  return rel && !rel.startsWith("..") ? normalized : null;
}

function main() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.trim() || "same-origin (unset)";

  const report = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    envVarNames: envVarNamesPresent(),
    apiBaseUrl: apiBase,
  };

  const json = JSON.stringify(report, null, 2);
  const outArg = process.argv.indexOf("--out");
  if (outArg !== -1 && process.argv[outArg + 1]) {
    const outPath = resolveOutPath(process.argv[outArg + 1]);
    if (outPath) {
      writeFileSync(outPath, json, "utf-8");
      console.log(`Diagnostics written to ${outPath}`);
    } else {
      console.error("Refused: --out path must resolve under current directory.");
      process.exitCode = 1;
    }
  } else {
    console.log(json);
  }
}

main();
