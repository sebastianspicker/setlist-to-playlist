import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
  .filter((file) => {
    try {
      return statSync(file).isFile();
    } catch {
      return false;
    }
  });

const forbiddenPaths = [
  /(^|\/)\.DS_Store$/,
  /(^|\/)Thumbs\.db$/i,
  /(^|\/)\.env(?!\.example$)/,
  /\.(?:pem|key|p8|p12|pfx|cer|crt|der|mobileprovision|jks|keystore)$/i,
  /(^|\/)(?:credentials|secrets|private)(?:\/|$)/i,
  /(^|\/)(?:node_modules|coverage|test-results|playwright-report|blob-report)(?:\/|$)/,
  /(^|\/)(?:\.next|dist|build|out)(?:\/|$)/,
  /^(?:\.codacy\.yaml|\.mcp\.json)$/,
  /(^|\/)\.repowise(?:\/|$)/,
  /(^|\/)(?:\.agents|\.claude|\.codacy|\.codex|\.codegraph|\.cursor|\.impeccable|\.kilo|\.prompts|\.serena)(?:\/|$)/,
  /(^|\/)AGENTS?[^/]*\.md$/i,
  /^RELEASE_STATUS\.md$/,
  /(^|\/)docs\/(?:audit|fixes|archive|local|private|internal|status)(?:\/|$)/,
  /(^|\/)(?:diagnostics|support-report)[^/]*\.json$/i,
];

const pathFindings = files.filter((file) => forbiddenPaths.some((pattern) => pattern.test(file)));
const contentFindings = [];
const privateKeyMarker = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
const absoluteHomePath = /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]+\//;
const staleRepositorySlug = /sebastianspicker\/setlist-to-playlist/i;
const actionReference = /^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/gm;
const immutableActionVersion = /^[0-9a-f]{40}$/i;

for (const file of files) {
  if (file === '.env.example') continue;

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  if (privateKeyMarker.test(content)) contentFindings.push(`${file}: private-key marker`);
  if (absoluteHomePath.test(content)) contentFindings.push(`${file}: absolute home path`);
  if (staleRepositorySlug.test(content)) {
    contentFindings.push(`${file}: stale repository identity`);
  }

  if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(file)) {
    for (const match of content.matchAll(actionReference)) {
      const reference = match[1];
      const separator = reference.lastIndexOf('@');
      if (separator <= 0) continue;

      const action = reference.slice(0, separator);
      const version = reference.slice(separator + 1);
      if (action.includes('/') && !immutableActionVersion.test(version)) {
        contentFindings.push(`${file}: mutable GitHub Action reference ${reference}`);
      }
    }
  }
}

const findings = [
  ...pathFindings.map((file) => `${file}: forbidden public path`),
  ...contentFindings,
];

if (findings.length > 0) {
  console.error('Public-boundary check failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Public-boundary check passed for ${files.length} publishable files.`);
