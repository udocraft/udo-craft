// Shared helpers for .github/workflows/agent-pipeline.yml (used via actions/github-script).
// Labels are the state machine and the Kanban columns. Exactly one `status:*` label per issue.
const fs = require("fs");

const STATUS = {
  backlog: "status:backlog", // Backlog (a human adds this to enqueue)
  triage: "status:triage", // Triaging (Haiku)
  planning: "status:planning", // Planning (Opus)
  planApproval: "status:needs-plan-approval", // Awaiting Human: plan
  building: "status:building", // In Progress (Sonnet)
  review: "status:e2e-review", // E2E & Review
  needsHuman: "status:needs-human", // Awaiting Human: blocked / question
  readyToMerge: "status:ready-to-merge", // Ready to Merge
  doneAlready: "status:done-already", // Triage found it already fixed
};
const ACTIVE = [STATUS.triage, STATUS.planning, STATUS.building, STATUS.review];
const PAUSED = "hitl:paused";
const MAX_RETRIES = 3;
const MARK = (kind) => `<!-- agent:${kind} -->`;

const repo = (context) => ({ owner: context.repo.owner, repo: context.repo.repo });

async function labels(github, context, issue) {
  const { data } = await github.rest.issues.listLabelsOnIssue({ ...repo(context), issue_number: issue });
  return data.map((l) => l.name);
}

async function setStatus(github, context, issue, status) {
  for (const name of await labels(github, context, issue)) {
    if (name.startsWith("status:") && name !== status) {
      await github.rest.issues.removeLabel({ ...repo(context), issue_number: issue, name }).catch(() => {});
    }
  }
  await github.rest.issues.addLabels({ ...repo(context), issue_number: issue, labels: [status] });
}

async function comment(github, context, issue, kind, body, data) {
  const payload = data ? `\n\n<details><summary>data</summary>\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n</details>` : "";
  await github.rest.issues.createComment({ ...repo(context), issue_number: issue, body: `${MARK(kind)}\n${body}${payload}` });
}

/** Latest structured payload the pipeline bot posted with this marker. Ignores comments by anyone else. */
async function latestData(github, context, issue, kind, botLogin) {
  const all = await github.paginate(github.rest.issues.listComments, { ...repo(context), issue_number: issue, per_page: 100 });
  const mine = all.filter((c) => c.user.login === botLogin && c.body.startsWith(MARK(kind)));
  const last = mine[mine.length - 1];
  if (!last) return null;
  const m = last.body.match(/```json\n([\s\S]*?)\n```/);
  return m ? JSON.parse(m[1]) : null;
}

/** Ticket text for the agent: title, body and comments by the repo owner only. */
async function writeTicket(github, context, issue) {
  const { data: i } = await github.rest.issues.get({ ...repo(context), issue_number: issue });
  const all = await github.paginate(github.rest.issues.listComments, { ...repo(context), issue_number: issue, per_page: 100 });
  const owner = context.repo.owner;
  const notes = all.filter((c) => c.user.login === owner && c.user.type === "User").map((c) => `### Owner note\n${c.body}`);
  fs.mkdirSync(".agent", { recursive: true });
  fs.writeFileSync(".agent/ticket.md", `# #${issue}: ${i.title}\n\n${i.body ?? ""}\n\n${notes.join("\n\n")}\n`);
  return i;
}

async function dispatch(github, context, payload) {
  await github.rest.repos.createDispatchEvent({ ...repo(context), event_type: "agent-stage", client_payload: payload });
}

async function retries(github, context, issue) {
  const r = (await labels(github, context, issue)).find((n) => n.startsWith("retry:"));
  return r ? Number(r.split(":")[1]) : 0;
}

async function bumpRetries(github, context, issue) {
  const n = await retries(github, context, issue);
  if (n) await github.rest.issues.removeLabel({ ...repo(context), issue_number: issue, name: `retry:${n}` }).catch(() => {});
  await github.rest.issues.addLabels({ ...repo(context), issue_number: issue, labels: [`retry:${n + 1}`] });
  return n + 1;
}

/** Cost of one Claude run from the action's execution file. Returns null if the format differs. */
function runCost(executionFile) {
  try {
    const log = JSON.parse(fs.readFileSync(executionFile, "utf8"));
    const result = [...log].reverse().find((m) => m.type === "result");
    return result && typeof result.total_cost_usd === "number" ? result.total_cost_usd : null;
  } catch {
    return null;
  }
}

module.exports = { STATUS, ACTIVE, PAUSED, MAX_RETRIES, MARK, labels, setStatus, comment, latestData, writeTicket, dispatch, retries, bumpRetries, runCost };
