import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];
const boundaryScript = fileURLToPath(
  new URL('../../../../scripts/check-public-boundary.mjs', import.meta.url)
);
const rootManifest = fileURLToPath(new URL('../../../../package.json', import.meta.url));

function makeRepository(files: Record<string, string>): string {
  const directory = mkdtempSync(join(tmpdir(), 'showtape-public-boundary-'));
  tempDirs.push(directory);
  execFileSync('git', ['init', '--quiet'], { cwd: directory });

  for (const [file, content] of Object.entries(files)) {
    const outputPath = join(directory, file);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, 'utf8');
  }
  execFileSync('git', ['add', '--all'], { cwd: directory });
  return directory;
}

function runBoundaryCheck(directory: string): string {
  try {
    execFileSync(process.execPath, [boundaryScript], { cwd: directory, encoding: 'utf8' });
    return '';
  } catch (error) {
    const result = error as { stdout?: string; stderr?: string };
    return `${result.stdout ?? ''}${result.stderr ?? ''}`;
  }
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('check-public-boundary', () => {
  it.each([
    ['.repowise/config.yaml', 'state: local', '.repowise/config.yaml: forbidden public path'],
    ['.mcp.json', '{"mcpServers":{}}', '.mcp.json: forbidden public path'],
    ['.codacy.yaml', 'exclude_paths: []', '.codacy.yaml: forbidden public path'],
  ])('rejects publishable %s', (file, content, expectedFinding) => {
    const output = runBoundaryCheck(makeRepository({ [file]: content }));

    expect(output).toContain(expectedFinding);
  });

  it('rejects a stale repository slug in publishable text', () => {
    const staleSlug = ['sebastianspicker', 'setlist-to-playlist'].join('/');
    const output = runBoundaryCheck(
      makeRepository({ 'README.md': `https://github.com/${staleSlug}` })
    );

    expect(output).toContain('README.md: stale repository identity');
  });

  it('accepts a publishable file with the current repository identity', () => {
    const directory = makeRepository({ 'README.md': readFileSync(rootManifest, 'utf8') });

    expect(runBoundaryCheck(directory)).toBe('');
  });

  it('rejects a mutable third-party GitHub Action reference', () => {
    const output = runBoundaryCheck(
      makeRepository({
        '.github/workflows/ci.yml': 'steps:\n  - uses: actions/checkout@v6\n',
      })
    );

    expect(output).toContain(
      '.github/workflows/ci.yml: mutable GitHub Action reference actions/checkout@v6'
    );
  });

  it('accepts an immutable third-party GitHub Action reference', () => {
    const directory = makeRepository({
      '.github/workflows/ci.yml':
        'steps:\n  - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd\n',
    });

    expect(runBoundaryCheck(directory)).toBe('');
  });
});
