/**
 * Seed demo setlists for local development and tests.
 * Fetches a few known setlist IDs from setlist.fm and saves them as JSON fixtures.
 *
 * Usage:
 *   SETLISTFM_API_KEY=your_key npx tsx scripts/seed-demo-setlists.ts
 *
 * Writes to scripts/fixtures/demo-setlists.json (create fixtures dir if needed).
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SETLIST_FM_BASE_URL = "https://api.setlist.fm/rest/1.0";

/** Known setlist IDs used in docs and tests (e.g. 63de4613). */
const DEMO_SETLIST_IDS = ["63de4613"];

async function fetchSetlist(setlistId: string, apiKey: string): Promise<unknown> {
  const url = `${SETLIST_FM_BASE_URL}/setlist/${encodeURIComponent(setlistId)}`;
  const res = await fetch(url, {
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`setlist.fm ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<unknown>;
}

async function main() {
  const apiKey = process.env.SETLISTFM_API_KEY?.trim();
  if (!apiKey) {
    console.error("Set SETLISTFM_API_KEY to run this script.");
    process.exit(1);
  }

  const fixturesDir = join(__dirname, "fixtures");
  if (!existsSync(fixturesDir)) {
    mkdirSync(fixturesDir, { recursive: true });
  }

  const out: Record<string, unknown> = {};
  for (const id of DEMO_SETLIST_IDS) {
    try {
      const body = await fetchSetlist(id, apiKey);
      out[id] = body;
      console.log(`Fetched setlist ${id}`);
    } catch (err) {
      console.warn(`Skip setlist ${id}:`, err instanceof Error ? err.message : err);
    }
  }

  const outPath = join(fixturesDir, "demo-setlists.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
  console.log(`Wrote ${Object.keys(out).length} setlist(s) to ${outPath}`);
}

main();
