import { mkdtempSync, realpathSync, symlinkSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveOutPath } from '../../../../scripts/support-diagnostics';

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return realpathSync(dir);
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('resolveOutPath', () => {
  it('accepts a normal file under cwd', () => {
    const cwd = makeTempDir('diag-cwd-');
    expect(resolveOutPath('report.json', cwd)).toBe(join(cwd, 'report.json'));
  });

  it('rejects paths outside cwd', () => {
    const cwd = makeTempDir('diag-cwd-');
    expect(resolveOutPath('../report.json', cwd)).toBeNull();
  });

  it('rejects symlinked parent directories that escape cwd', () => {
    const cwd = makeTempDir('diag-cwd-');
    const outside = makeTempDir('diag-outside-');
    symlinkSync(outside, join(cwd, 'link'));

    expect(resolveOutPath('link/report.json', cwd)).toBeNull();
    expect(existsSync(join(outside, 'report.json'))).toBe(false);
  });

  it('rejects a dangling symlink as the output file', () => {
    const cwd = makeTempDir('diag-cwd-');
    const outside = makeTempDir('diag-outside-');
    symlinkSync(join(outside, 'report.json'), join(cwd, 'report.json'));

    expect(resolveOutPath('report.json', cwd)).toBeNull();
  });
});
