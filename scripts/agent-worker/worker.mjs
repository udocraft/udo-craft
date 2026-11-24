#!/usr/bin/env node
// Local agent worker. Runs on the operator's Mac, not on Vercel.
// It polls the agent_jobs queue, runs the Claude CLI in READ-ONLY mode in this repo,
// and writes the result back. It has no shell, write or network tools.
//
// Env (set in your shell, never commit):
//   SUPABASE_URL                 e.g. https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    service role key (server-side only)
//   AGENT_WORKER_REPO            optional, defaults to the repo root
//   AGENT_WORKER_POLL_MS         optional, default 10000
//   AGENT_JOB_TIMEOUT_MS         optional, default 600000

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPO = process.env.AGENT_WORKER_REPO ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const POLL_MS = Number(process.env.AGENT_WORKER_POLL_MS ?? 10000);
const JOB_TIMEOUT_MS = Number(process.env.AGENT_JOB_TIMEOUT_MS ?? 600000);

// Hard deny list: applied even if a definition asks for these tools.
// Secret files are denied even for Read/Grep/Glob, so results cannot leak keys into the queue.
const DENIED_TOOLS = [
  "Bash", "Edit", "Write", "NotebookEdit", "WebFetch", "WebSearch", "Task",
  "Read(./.env*)", "Read(**/.env*)", "Read(**/*.pem)", "Read(**/*secret*)",
  "Grep(./.env*)", "Grep(**/.env*)",
];
const ALLOWED_TOOL_NAMES = new Set(["Read", "Grep", "Glob"]);
const MODEL_IDS = { opus: "opus", sonnet: "sonnet", haiku: "haiku" };

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function rest(pathAndQuery, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`REST ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.status === 204 ? null : res.json();
}

// Claim one queued job atomically: only succeeds if it is still 'queued'.
async function claimNextJob() {
  const [candidate] = await rest(
    "agent_jobs?status=eq.queued&order=created_at.asc&limit=1&select=id",
  );
  if (!candidate) return null;
  const claimed = await rest(`agent_jobs?id=eq.${candidate.id}&status=eq.queued&select=*`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "running", started_at: new Date().toISOString() }),
  });
  return claimed?.[0] ?? null;
}

async function finishJob(id, patch) {
  await rest(`agent_jobs?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...patch, finished_at: new Date().toISOString() }),
  });
}

async function loadDefinition(id) {
  if (!id) return null;
  const [def] = await rest(`agent_definitions?id=eq.${id}&select=*`);
  return def ?? null;
}

function safeTools(requested) {
  const tools = (requested ?? []).filter((t) => ALLOWED_TOOL_NAMES.has(t));
  return tools.length ? tools : ["Read", "Grep", "Glob"];
}

function runClaude({ model, systemPrompt, tools, prompt }) {
  return new Promise((resolve, reject) => {
    const args = [
      "-p",
      prompt,
      "--model",
      MODEL_IDS[model] ?? "sonnet",
      "--allowedTools",
      tools.join(","),
      "--disallowedTools",
      DENIED_TOOLS.join(","),
      "--output-format",
      "text",
    ];
    if (systemPrompt) args.push("--append-system-prompt", systemPrompt);

    // No shell: arguments are passed as an array.
    const child = spawn("claude", args, { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), JOB_TIMEOUT_MS);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out.trim());
      else reject(new Error(`claude exited ${code}: ${err.slice(0, 500)}`));
    });
  });
}

async function processJob(job) {
  const def = await loadDefinition(job.definition_id);
  if (job.definition_id && !def) {
    await finishJob(job.id, { status: "failed", error: "definition not found" });
    return;
  }
  const model = def?.model ?? "sonnet";
  const tools = safeTools(def?.allowed_tools);
  console.log(`[job ${job.id}] running model=${model} tools=${tools.join(",")}`);
  try {
    const result = await runClaude({
      model,
      systemPrompt: def?.system_prompt ?? "",
      tools,
      prompt: job.prompt,
    });
    await finishJob(job.id, { status: "done", result: result.slice(0, 200000) });
    console.log(`[job ${job.id}] done`);
  } catch (e) {
    await finishJob(job.id, { status: "failed", error: String(e.message ?? e).slice(0, 2000) });
    console.log(`[job ${job.id}] failed: ${e.message}`);
  }
}

async function loop() {
  console.log(`agent-worker started (read-only). repo=${REPO} poll=${POLL_MS}ms`);
  for (;;) {
    try {
      const job = await claimNextJob();
      if (job) await processJob(job);
      else await new Promise((r) => setTimeout(r, POLL_MS));
    } catch (e) {
      console.error("worker error:", e.message);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

loop();
