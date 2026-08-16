import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const CLIENT_MANIFEST_PREFIX =
  /^\s*globalThis\.__RSC_MANIFEST\s*=\s*\(globalThis\.__RSC_MANIFEST\s*\|\|\s*\{\}\)\s*;\s*globalThis\.__RSC_MANIFEST\["\/page"\]\s*=\s*/;

function parseClientManifest(source) {
  const prefix = CLIENT_MANIFEST_PREFIX.exec(source);
  if (!prefix) {
    throw new Error('Unexpected production client manifest format for /. Run pnpm build again.');
  }

  const payload = source.slice(prefix[0].length).replace(/;\s*$/, '').trim();
  const routeManifest = JSON.parse(payload);
  if (!routeManifest || typeof routeManifest !== 'object' || Array.isArray(routeManifest)) {
    throw new Error('Invalid production client manifest for /.');
  }
  return routeManifest;
}

function manifestArray(value, label) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${label} in production manifest.`);
  }
  return value;
}

function stringFiles(value, label) {
  return manifestArray(value, label).map((file) => {
    if (typeof file !== 'string' || file.length === 0 || file.includes('\0')) {
      throw new Error(`Invalid ${label} asset path in production manifest.`);
    }
    return file;
  });
}

function containedAsset(nextDir, file) {
  if (isAbsolute(file)) {
    throw new Error(`Production manifest asset escapes .next: ${file}`);
  }
  const candidate = resolve(nextDir, file);
  const lexicalRelative = relative(nextDir, candidate);
  if (
    lexicalRelative === '..' ||
    lexicalRelative.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(lexicalRelative)
  ) {
    throw new Error(`Production manifest asset escapes .next: ${file}`);
  }

  const canonical = realpathSync(candidate);
  const canonicalRelative = relative(nextDir, canonical);
  if (
    canonicalRelative === '..' ||
    canonicalRelative.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(canonicalRelative)
  ) {
    throw new Error(`Production manifest asset escapes .next through a symlink: ${file}`);
  }
  return canonical;
}

function measure(nextDir, files) {
  const assets = [...files].sort().map((file) => {
    const absolute = containedAsset(nextDir, file);
    const contents = readFileSync(absolute);
    return {
      file,
      rawBytes: contents.byteLength,
      gzipBytes: gzipSync(contents).length,
    };
  });

  return {
    files: assets,
    rawBytes: assets.reduce((total, asset) => total + asset.rawBytes, 0),
    gzipBytes: assets.reduce((total, asset) => total + asset.gzipBytes, 0),
  };
}

export function createWebBundleReport(root = process.cwd()) {
  const nextDir = realpathSync(resolve(root, 'apps/web/.next'));
  const buildManifest = JSON.parse(readFileSync(resolve(nextDir, 'build-manifest.json'), 'utf8'));
  const clientManifestSource = readFileSync(
    resolve(nextDir, 'server/app/page_client-reference-manifest.js'),
    'utf8'
  );
  const routeManifest = parseClientManifest(clientManifestSource);

  const entryJs = routeManifest.entryJSFiles;
  const entryCss = routeManifest.entryCSSFiles;
  if (!entryJs || typeof entryJs !== 'object' || Array.isArray(entryJs)) {
    throw new Error('Missing production client JavaScript manifest for /. Run pnpm build first.');
  }
  if (!entryCss || typeof entryCss !== 'object' || Array.isArray(entryCss)) {
    throw new Error('Missing production client CSS manifest for /. Run pnpm build first.');
  }
  const jsFiles = new Set([
    ...stringFiles(buildManifest.polyfillFiles, 'polyfillFiles'),
    ...stringFiles(buildManifest.rootMainFiles, 'rootMainFiles'),
    ...stringFiles(entryJs['[project]/apps/web/src/app/layout'], 'layout entryJSFiles'),
    ...stringFiles(entryJs['[project]/apps/web/src/app/page'], 'page entryJSFiles'),
  ]);
  const cssFiles = new Set(
    [
      ...manifestArray(entryCss['[project]/apps/web/src/app/layout'], 'layout entryCSSFiles'),
      ...manifestArray(entryCss['[project]/apps/web/src/app/page'], 'page entryCSSFiles'),
    ].map((entry) => {
      if (!entry || typeof entry !== 'object' || typeof entry.path !== 'string') {
        throw new Error('Invalid CSS asset in production manifest.');
      }
      return stringFiles([entry.path], 'CSS')[0];
    })
  );

  return {
    route: '/',
    source: 'Next.js production manifests after pnpm build',
    note: 'Transfer totals are gzip estimates for initial route assets and exclude HTML, RSC payloads, and network protocol overhead.',
    javascript: measure(nextDir, jsFiles),
    css: measure(nextDir, cssFiles),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${JSON.stringify(createWebBundleReport(), null, 2)}\n`);
}
