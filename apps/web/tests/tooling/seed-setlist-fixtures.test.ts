import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seedDemoSetlists } from '../../../../scripts/seed-demo-setlist-fixtures';

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function responseOk(body: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  } as Response;
}

function responseFailure(status: number, body: string): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  } as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('seedDemoSetlists', () => {
  it('fails without overwriting an existing fixture when every fetch fails', async () => {
    const fixturesDir = makeTempDir('seed-fixtures-');
    const outPath = join(fixturesDir, 'demo-setlists.json');
    writeFileSync(outPath, '{"existing":true}', 'utf-8');
    const fetchImpl = vi.fn().mockResolvedValue(responseFailure(500, 'upstream unavailable'));

    await expect(
      seedDemoSetlists({ apiKey: 'test-key', ids: ['a', 'b'], fixturesDir, fetchImpl })
    ).rejects.toThrow('No demo setlists fetched');

    expect(readFileSync(outPath, 'utf-8')).toBe('{"existing":true}');
  });

  it('writes only fetched setlists when some upstream requests fail', async () => {
    const fixturesDir = makeTempDir('seed-fixtures-');
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(responseOk({ id: 'a' }))
      .mockResolvedValueOnce(responseFailure(404, 'not found'));

    const result = await seedDemoSetlists({
      apiKey: 'test-key',
      ids: ['a', 'b'],
      fixturesDir,
      fetchImpl,
    });

    expect(result.count).toBe(1);
    expect(JSON.parse(readFileSync(result.outPath, 'utf-8'))).toEqual({ a: { id: 'a' } });
  });

  it('writes fetched setlists to the requested fixture directory', async () => {
    const fixturesDir = makeTempDir('seed-fixtures-');
    const fetchImpl = vi.fn().mockResolvedValue(responseOk({ id: 'demo' }));

    const result = await seedDemoSetlists({
      apiKey: 'test-key',
      ids: ['demo'],
      fixturesDir,
      fetchImpl,
    });

    expect(result.count).toBe(1);
    expect(JSON.parse(readFileSync(result.outPath, 'utf-8'))).toEqual({ demo: { id: 'demo' } });
  });

  it('creates the requested fixture directory when it does not exist', async () => {
    const fixturesDir = join(makeTempDir('seed-root-'), 'fixtures', 'nested');
    const fetchImpl = vi.fn().mockResolvedValue(responseOk({ id: 'demo' }));

    const result = await seedDemoSetlists({
      apiKey: 'test-key',
      ids: ['demo'],
      fixturesDir,
      fetchImpl,
    });

    expect(JSON.parse(readFileSync(result.outPath, 'utf-8'))).toEqual({ demo: { id: 'demo' } });
  });
});
