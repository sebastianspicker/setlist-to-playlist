import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createWebBundleReport } from './web-bundle-report.mjs';

const tempDirs = [];

function write(root, path, contents) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function fixture({ jsFile = 'static/app.js', cssFile = 'static/app.css', clientSuffix = '' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'showtape-bundle-report-'));
  tempDirs.push(root);
  const nextDir = join(root, 'apps/web/.next');
  const routeManifest = {
    entryJSFiles: {
      '[project]/apps/web/src/app/layout': [jsFile],
      '[project]/apps/web/src/app/page': [],
    },
    entryCSSFiles: {
      '[project]/apps/web/src/app/layout': [{ path: cssFile }],
      '[project]/apps/web/src/app/page': [],
    },
  };
  write(root, 'apps/web/.next/build-manifest.json', JSON.stringify({}));
  write(
    root,
    'apps/web/.next/server/app/page_client-reference-manifest.js',
    `globalThis.__RSC_MANIFEST=(globalThis.__RSC_MANIFEST||{});globalThis.__RSC_MANIFEST["/page"]=${JSON.stringify(routeManifest)}${clientSuffix}`
  );
  return { root, nextDir, jsFile, cssFile };
}

test.afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
  delete globalThis.__showtapeManifestExecuted;
});

test('reports assets from a strict data-only client manifest', () => {
  const { root, jsFile, cssFile } = fixture();
  write(root, `apps/web/.next/${jsFile}`, 'const app = true;');
  write(root, `apps/web/.next/${cssFile}`, 'body{}');

  const report = createWebBundleReport(root);

  assert.deepEqual(report.javascript.files.map(({ file }) => file), [jsFile]);
  assert.deepEqual(report.css.files.map(({ file }) => file), [cssFile]);
  assert.equal(report.javascript.rawBytes, Buffer.byteLength('const app = true;'));
});

test('rejects traversal and absolute asset paths', () => {
  for (const jsFile of ['../../outside.js', join(tmpdir(), 'outside.js')]) {
    const { root, cssFile } = fixture({ jsFile });
    write(root, `apps/web/.next/${cssFile}`, 'body{}');

    assert.throws(() => createWebBundleReport(root), /asset escapes \.next/);
  }
});

test('rejects an asset symlink that escapes the build directory', () => {
  const { root, nextDir, jsFile, cssFile } = fixture();
  const outside = join(root, 'outside.js');
  writeFileSync(outside, 'malicious');
  mkdirSync(dirname(join(nextDir, jsFile)), { recursive: true });
  symlinkSync(outside, join(nextDir, jsFile));
  write(root, `apps/web/.next/${cssFile}`, 'body{}');

  assert.throws(() => createWebBundleReport(root), /escapes \.next through a symlink/);
});

test('rejects executable client-manifest suffixes without evaluating them', () => {
  const { root, jsFile, cssFile } = fixture({
    clientSuffix: ';globalThis.__showtapeManifestExecuted=true',
  });
  write(root, `apps/web/.next/${jsFile}`, 'const app = true;');
  write(root, `apps/web/.next/${cssFile}`, 'body{}');

  assert.throws(() => createWebBundleReport(root), SyntaxError);
  assert.equal(globalThis.__showtapeManifestExecuted, undefined);
});
