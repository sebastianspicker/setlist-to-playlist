import { lstatSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ENV_PREFIXES = ['NEXT_PUBLIC_', 'APPLE_', 'SETLISTFM_', 'ALLOWED_', 'API_'];

interface DiagnosticsFileAccess {
  lstat: typeof lstatSync;
  realpath: typeof realpathSync;
  writeFile: typeof writeFileSync;
}

const NODE_FILE_ACCESS: DiagnosticsFileAccess = {
  lstat: lstatSync,
  realpath: realpathSync,
  writeFile: writeFileSync,
};

function envVarNamesPresent(): string[] {
  return Object.keys(process.env)
    .filter((key) => ENV_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .sort();
}

/** Resolve --out path and ensure its real parent stays under cwd. */
export function resolveOutPath(raw: string, cwd = process.cwd()): string | null {
  const normalized = resolve(cwd, raw);
  const rel = relative(cwd, normalized);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;

  try {
    const outputEntry = NODE_FILE_ACCESS.lstat(normalized, { throwIfNoEntry: false });
    if (outputEntry?.isSymbolicLink()) return null;

    const realCwd = NODE_FILE_ACCESS.realpath(cwd);
    const realParent = NODE_FILE_ACCESS.realpath(dirname(normalized));
    const parentRel = relative(realCwd, realParent);
    if (parentRel.startsWith('..') || isAbsolute(parentRel)) return null;
    return resolve(realParent, basename(normalized));
  } catch {
    return null;
  }
}

function diagnosticsReport() {
  return {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    envVarNames: envVarNamesPresent(),
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL?.trim() || 'same-origin (unset)',
  };
}

export function runSupportDiagnostics(args: readonly string[] = process.argv): void {
  const json = JSON.stringify(diagnosticsReport(), null, 2);
  const outArg = args.indexOf('--out');
  const outValue = outArg === -1 ? undefined : args[outArg + 1];
  if (!outValue) {
    console.log(json);
    return;
  }

  const outPath = resolveOutPath(outValue);
  if (!outPath) {
    console.error('Refused: --out path must resolve under current directory.');
    process.exitCode = 1;
    return;
  }

  NODE_FILE_ACCESS.writeFile(outPath, json, 'utf-8');
  console.log(`Diagnostics written to ${outPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSupportDiagnostics();
}
