#!/usr/bin/env node
/**
 * Transform Ralph audit markdown reports (ralph-audit/audit/*.md) to JSON.
 * Output: ralph-fix/findings/<audit-id>.json per file (e.g. 01-api-routes.json).
 *
 * Usage: node scripts/md-to-json.js [--audit-dir path] [--out-dir path]
 * Defaults: audit-dir = ../../ralph-audit/audit, out-dir = ../findings
 */

const fs = require("fs");
const path = require("path");

const SCRIPT_DIR = path.dirname(__dirname);
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_AUDIT_DIR = path.join(REPO_ROOT, "ralph-audit", "audit");
const DEFAULT_OUT_DIR = path.join(SCRIPT_DIR, "findings");

function parseArgs() {
  const args = process.argv.slice(2);
  let auditDir = DEFAULT_AUDIT_DIR;
  let outDir = DEFAULT_OUT_DIR;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--audit-dir" && args[i + 1]) {
      auditDir = path.resolve(args[++i]);
    } else if (args[i] === "--out-dir" && args[i + 1]) {
      outDir = path.resolve(args[++i]);
    }
  }
  return { auditDir, outDir };
}

function stripMarkdownFence(content) {
  const trimmed = content.trim();
  if (trimmed.startsWith("```markdown")) {
    const end = trimmed.indexOf("```", 11);
    if (end !== -1) return trimmed.slice(11, end).trim();
    return trimmed.slice(11).trim();
  }
  return trimmed;
}

function parseSummary(lines) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const line of lines) {
    const m = line.match(/^-\s*(Critical|High|Medium|Low):\s*(\d+)/i);
    if (m) summary[m[1].toLowerCase()] = parseInt(m[2], 10);
  }
  return summary;
}

function extractSection(text, startMarker, endMarkers) {
  const start = text.indexOf(startMarker);
  if (start === -1) return "";
  let from = start + startMarker.length;
  let end = text.length;
  for (const em of endMarkers) {
    const i = text.indexOf(em, from);
    if (i !== -1 && i < end) end = i;
  }
  return text.slice(from, end).trim();
}

function parseFindings(content) {
  const findings = [];
  const findingRegex = /^###\s*\[([^\]]+)\]\s*Finding\s*#(\d+):\s*(.+)$/gm;
  let m;
  const blocks = [];
  let lastEnd = 0;
  while ((m = findingRegex.exec(content)) !== null) {
    if (m.index > lastEnd) {
      const blockContent = content.slice(lastEnd, m.index);
      const prev = blocks[blocks.length - 1];
      if (prev) prev.raw = (prev.raw || "") + blockContent;
    }
    blocks.push({
      severity: m[1].trim(),
      number: parseInt(m[2], 10),
      title: m[3].trim(),
      start: m.index,
      end: content.length,
    });
    lastEnd = m.index;
  }
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const raw = content.slice(
      block.start,
      blocks[i + 1] ? blocks[i + 1].start : content.length
    );
    const fileMatch = raw.match(/\*\*File:\*\*\s*`([^`]+)`/);
    const linesMatch = raw.match(/\*\*Lines:\*\*\s*([^\n]+)/);
    const categoryMatch = raw.match(/\*\*Category:\*\*\s*([^\n]+)/);
    const descStart = raw.indexOf("**Description:**");
    let description = "";
    if (descStart !== -1) {
      const afterDesc = raw.slice(descStart + 16);
      const codeStart = afterDesc.indexOf("**Code:**");
      const whyStart = afterDesc.indexOf("**Why this matters:**");
      const end = [codeStart, whyStart].filter((x) => x !== -1)[0] ?? afterDesc.length;
      description = afterDesc.slice(0, end).trim();
    }
    let code = "";
    const codeBlock = raw.match(/\*\*Code:\*\*\s*```[\w]*\n([\s\S]*?)```/);
    if (codeBlock) code = codeBlock[1].trim();
    let whyThisMatters = "";
    const whyStart = raw.indexOf("**Why this matters:**");
    if (whyStart !== -1) {
      whyThisMatters = raw.slice(whyStart + 21).split(/\n---|\n###/)[0].trim();
    }
    findings.push({
      severity: block.severity,
      number: block.number,
      title: block.title,
      file: fileMatch ? fileMatch[1].trim() : "",
      lines: linesMatch ? linesMatch[1].trim() : "",
      category: categoryMatch ? categoryMatch[1].trim() : "",
      description,
      code: code || null,
      whyThisMatters,
    });
  }
  return findings;
}

function parseAuditFile(filePath) {
  const content = stripMarkdownFence(fs.readFileSync(filePath, "utf8"));
  const lines = content.split(/\r?\n/);
  let title = "";
  let auditDate = "";
  let filesExamined = 0;
  let totalFindings = 0;
  const headerEnd = content.indexOf("## Summary by Severity");
  if (headerEnd !== -1) {
    const header = content.slice(0, headerEnd);
    const titleM = header.match(/#\s+(.+)/);
    if (titleM) title = titleM[1].replace(/\s*Findings?\s*$/, "").trim();
    const dateM = header.match(/Audit Date:\s*(.+)/);
    if (dateM) auditDate = dateM[1].trim();
    const filesM = header.match(/Files Examined:\s*(\d+)/);
    if (filesM) filesExamined = parseInt(filesM[1], 10);
    const totalM = header.match(/Total Findings:\s*(\d+)/);
    if (totalM) totalFindings = parseInt(totalM[1], 10);
  }
  const summarySection = content.slice(
    content.indexOf("## Summary by Severity"),
    content.indexOf("---", content.indexOf("## Findings")) || content.length
  );
  const summary = parseSummary(summarySection.split("\n"));
  const findingsSection =
    content.indexOf("## Findings") !== -1
      ? content.slice(content.indexOf("## Findings"))
      : content;
  const findings = parseFindings(findingsSection);
  return {
    auditTitle: title,
    auditDate,
    filesExamined,
    totalFindings,
    summary,
    findings,
  };
}

function main() {
  const { auditDir, outDir } = parseArgs();
  if (!fs.existsSync(auditDir)) {
    console.error("Audit dir not found:", auditDir);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const allFiles = fs.readdirSync(auditDir);
  const files = allFiles.filter((f) => /^\d{2}-.+\.md$/.test(f) && f !== "00-INDEX.md");
  files.sort();
  const manifest = { generatedAt: new Date().toISOString(), audits: [] };
  for (const file of files) {
    const base = path.basename(file, ".md");
    const auditId = base;
    const filePath = path.join(auditDir, file);
    const data = parseAuditFile(filePath);
    data.auditId = auditId;
    data.sourceFile = file;
    manifest.audits.push({ auditId, sourceFile: file, findingsCount: data.findings.length });
    const outPath = path.join(outDir, `${auditId}.json`);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
    console.log("Wrote", outPath, "(" + data.findings.length + " findings)");
  }
  const manifestPath = path.join(outDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log("Wrote", manifestPath);
}

main();
