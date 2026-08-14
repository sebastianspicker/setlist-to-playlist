import { access, cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, '..');
const sourceDirectory = path.join(rootDirectory, 'apps/web/demo');
const publishedOutputDirectory = path.join(rootDirectory, 'dist/pages');
const argumentsAfterScript = process.argv.slice(2);
const check = argumentsAfterScript.length === 1 && argumentsAfterScript[0] === '--check';

if (argumentsAfterScript.length > 0 && !check) {
  throw new Error('Usage: node scripts/build-pages-demo.mjs [--check]');
}

const temporaryDirectory = check
  ? await mkdtemp(path.join(tmpdir(), 'showtape-pages-demo-'))
  : null;
const outputDirectory = check ? path.join(temporaryDirectory, 'pages') : publishedOutputDirectory;

try {
  if (!check) await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await cp(sourceDirectory, outputDirectory, { recursive: true });
  await cp(
    path.join(rootDirectory, 'apps/web/src/styles/globals.css'),
    path.join(outputDirectory, 'globals.css')
  );
  await cp(
    path.join(rootDirectory, 'apps/web/public/icons/showtape-mark.svg'),
    path.join(outputDirectory, 'showtape-mark.svg')
  );
  await writeFile(path.join(outputDirectory, '.nojekyll'), '');

  if (check) {
    const requiredFiles = [
      '.nojekyll',
      'index.html',
      'demo.css',
      'demo.js',
      'globals.css',
      'showtape-mark.svg',
    ];
    await Promise.all(requiredFiles.map((file) => access(path.join(outputDirectory, file))));

    const [html, script, copiedGlobals, sourceGlobals] = await Promise.all([
      readFile(path.join(outputDirectory, 'index.html'), 'utf8'),
      readFile(path.join(outputDirectory, 'demo.js'), 'utf8'),
      readFile(path.join(outputDirectory, 'globals.css'), 'utf8'),
      readFile(path.join(rootDirectory, 'apps/web/src/styles/globals.css'), 'utf8'),
    ]);
    const requiredContent = [
      ['static notice', 'Static demo: all actions are simulated locally.'],
      ['import state', 'data-state="import"'],
      ['preview state', 'data-state="preview"'],
      ['match state', 'data-state="match"'],
      ['export state', 'data-state="export"'],
      ['success message', 'No Apple Music playlist was created.'],
      ['simulated labels', 'Simulated'],
    ];
    for (const [name, content] of requiredContent) {
      if (!html.includes(content) && !script.includes(content)) {
        throw new Error(`Demo check failed: missing ${name}.`);
      }
    }
    if (copiedGlobals !== sourceGlobals) {
      throw new Error(
        'Demo check failed: globals.css is not an exact copy of the production visual system.'
      );
    }

    const buttons = html.match(/<button\b[\s\S]*?<\/button>/g) ?? [];
    if (buttons.length === 0 || buttons.some((button) => !button.includes('(Simulated)'))) {
      throw new Error('Demo check failed: every button must have its own visible simulated label.');
    }
    if (/\b(fetch|XMLHttpRequest|MusicKit)\b/.test(script) || /<form\b/.test(html)) {
      throw new Error(
        'Demo check failed: the static flow must not contain command or network code.'
      );
    }
  }

  console.log(
    `Built static demo in ${path.relative(rootDirectory, outputDirectory)}${check ? ' and checked it' : ''}.`
  );
} finally {
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
}
