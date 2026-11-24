#!/usr/bin/env node
// Turns unchecked "- [ ]" items in Plan.md into issue drafts.
//   node scripts/agent/plan-to-issues.mjs            -> writes .agent/issue-drafts/*.md (local only)
//   node scripts/agent/plan-to-issues.mjs --create   -> creates GitHub issues labelled status:backlog
// Triage verifies each item against the code first, so stale items close themselves as done-already.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const lines = readFileSync("Plan.md", "utf8").split("\n");
const items = [];
let section = "";
lines.forEach((line, i) => {
  const h = line.match(/^#{2,4}\s+(.*)/);
  if (h) section = h[1].trim();
  const m = line.match(/^- \[ \]\s+(.*)/);
  if (m) items.push({ text: m[1].trim(), section, line: i + 1 });
});

const create = process.argv.includes("--create");
mkdirSync(".agent/issue-drafts", { recursive: true });
for (const [idx, it] of items.entries()) {
  const plain = it.text.replace(/\*\*|`/g, "");
  const title = plain.length > 90 ? `${plain.slice(0, 87)}...` : plain;
  const body = [
    `From \`Plan.md\` line ${it.line}, section "${it.section}".`,
    "",
    `> ${it.text}`,
    "",
    "Triage: check whether this is already done on `main` before planning (the Plan.md checkboxes were not kept up to date).",
  ].join("\n");
  const file = `.agent/issue-drafts/${String(idx + 1).padStart(2, "0")}.md`;
  writeFileSync(file, `# ${title}\n\n${body}\n`);
  if (create) {
    const url = execFileSync("gh", ["issue", "create", "--title", title, "--body", body, "--label", "status:backlog"], { encoding: "utf8" }).trim();
    console.log(`created ${url}`);
  } else {
    console.log(`draft ${file}: ${title}`);
  }
}
console.log(`${items.length} items${create ? " created" : " drafted (run with --create to open issues)"}`);
