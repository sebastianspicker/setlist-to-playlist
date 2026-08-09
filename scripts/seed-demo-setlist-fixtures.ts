import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SETLIST_FM_BASE_URL = 'https://api.setlist.fm/rest/1.0';
const DEMO_SETLIST_IDS = ['63de4613'];

interface SeedFileAccess {
  exists: typeof existsSync;
  mkdir: typeof mkdirSync;
  writeFile: typeof writeFileSync;
}

const NODE_FILE_ACCESS: SeedFileAccess = {
  exists: existsSync,
  mkdir: mkdirSync,
  writeFile: writeFileSync,
};

interface SeedDemoSetlistsOptions {
  apiKey: string;
  ids?: readonly string[];
  fixturesDir?: string;
  fetchImpl?: typeof fetch;
}

interface SeedDemoSetlistsResult {
  count: number;
  outPath: string;
}

export async function fetchSetlist(
  setlistId: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<unknown> {
  const url = `${SETLIST_FM_BASE_URL}/setlist/${encodeURIComponent(setlistId)}`;
  const response = await fetchImpl(url, {
    headers: { 'x-api-key': apiKey, Accept: 'application/json' },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`setlist.fm ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json() as Promise<unknown>;
}

async function fetchFixtures(
  ids: readonly string[],
  apiKey: string,
  fetchImpl: typeof fetch
): Promise<{ fixtures: Map<string, unknown>; failures: string[] }> {
  const fixtures = new Map<string, unknown>();
  const failures: string[] = [];

  for (const id of ids) {
    try {
      fixtures.set(id, await fetchSetlist(id, apiKey, fetchImpl));
      console.log(`Fetched setlist ${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${id}: ${message}`);
      console.warn(`Skip setlist ${id}:`, message);
    }
  }

  return { fixtures, failures };
}

function writeFixtures(fixturesDir: string, fixtures: Map<string, unknown>): string {
  if (!NODE_FILE_ACCESS.exists(fixturesDir)) {
    NODE_FILE_ACCESS.mkdir(fixturesDir, { recursive: true });
  }

  const outPath = join(fixturesDir, 'demo-setlists.json');
  NODE_FILE_ACCESS.writeFile(
    outPath,
    JSON.stringify(Object.fromEntries(fixtures), null, 2),
    'utf-8'
  );
  return outPath;
}

export async function seedDemoSetlists({
  apiKey,
  ids = DEMO_SETLIST_IDS,
  fixturesDir = join(SCRIPT_DIR, 'fixtures'),
  fetchImpl = fetch,
}: SeedDemoSetlistsOptions): Promise<SeedDemoSetlistsResult> {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error('Set SETLISTFM_API_KEY to run this script.');
  }

  const { fixtures, failures } = await fetchFixtures(ids, trimmedApiKey, fetchImpl);
  const outPath = join(fixturesDir, 'demo-setlists.json');
  if (fixtures.size === 0) {
    throw new Error(
      `No demo setlists fetched; refusing to write ${outPath}. Last errors: ${failures.join('; ')}`
    );
  }

  writeFixtures(fixturesDir, fixtures);
  console.log(`Wrote ${fixtures.size} setlist(s) to ${outPath}`);
  return { count: fixtures.size, outPath };
}

export async function runSeedDemoSetlists(): Promise<void> {
  const apiKey = process.env.SETLISTFM_API_KEY ?? '';
  if (!apiKey) {
    console.error('Set SETLISTFM_API_KEY to run this script.');
    process.exitCode = 1;
    return;
  }

  await seedDemoSetlists({ apiKey });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeedDemoSetlists().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
