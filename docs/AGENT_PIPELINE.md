# Agent pipeline runbook

An autonomous ticket pipeline on GitHub Actions. Agents triage, plan, build, test and review.
You approve plans for user-facing changes and you merge. Nothing merges or deploys without you.

## How a ticket moves

| Kanban column (label) | Who | What happens | Leaves when |
|---|---|---|---|
| Backlog `status:backlog` | you | You add the label to queue an issue | Feeder picks it (every 20 min, WIP limit) |
| Triaging `status:triage` | Haiku | Checks the claim against the code, sizes it, decides if it needs approval | `done` / `unclear` → you; `actionable` → plan |
| Planning `status:planning` | Opus | Files, before → after, edge cases, acceptance criteria | Gated → you; otherwise → build |
| Needs plan approval `status:needs-plan-approval` | you | `/approve` or `/reject <what to change>` | Your comment |
| In progress `status:building` | Sonnet | Branch `agent/issue-N`, edits plan files only, runs type-check, lint, unit tests, opens a draft PR | Push |
| E2E & review `status:e2e-review` | CI + Opus | CI and E2E run on the PR. If green, Opus reviews the diff against the plan | Approve → ready; changes/red → fix (max 3) |
| Needs human `status:needs-human` | you | Blocked: question, too big, 3 failed fixes, protected-path edit | `/replan`, `/fix <guidance>` |
| Ready to merge `status:ready-to-merge` | you | PR marked ready, with review summary and run link | You merge |

"Gated" means the change touches visible UI or copy, a public API route, the DB schema, auth,
payments or SEO metadata. Internal refactors and test-only changes go straight to build.

## Commands (comments by logins in `AGENT_APPROVERS` only; anyone else is ignored)

| Where | Command | Effect |
|---|---|---|
| Issue | `/approve` | Build the plan that's waiting for approval |
| Issue | `/reject <feedback>` or `/replan <guidance>` | Re-plan with your feedback |
| Agent PR | `/fix <what to change>` | Sonnet fixes on the same branch (counts as a retry) |
| Any | label `hitl:paused` | Pipeline ignores the ticket until you remove it |
| Repo | variable `AGENT_ENABLED` ≠ `true` | Kill switch for everything |

## Guard rails (enforced by the workflow, not by prompts)

- **Stage decisions are code.** Models return JSON (`.github/agent/schemas/`). The workflow
  reads it and sets labels. A model can't approve its own plan or skip a gate.
- **Approver-only triggers.** Commands need a human account listed in the repo variable
  `AGENT_APPROVERS` (for this org repo: `andriihukco`).
  Bot-made comments and labels don't trigger anything. `workflow_run` ignores branches
  from forks.
- **Protected paths.** If a build or fix touches `.github/`, `.claude/`, `scripts/agent/`,
  `apps/client/e2e/`, snapshots or `.env*`, the change is thrown away and the ticket goes to
  you. That stops an agent from "fixing" a red test by editing the test. CODEOWNERS adds a
  review requirement on the same paths.
- **Tool allowlists.** Triage, plan and review are read-only. Build and fix can edit files and
  run `npm run type-check|lint|test` only. No `git push`, `gh`, `curl` or web access: the
  workflow commits and pushes.
- **Untrusted ticket text.** The agent reads the issue body and the owner's comments from a
  file, never through `${{ }}` interpolation. Other people's comments are left out.
- **E2E uses staging.** `e2e.yml` builds against the staging Supabase project. Fork PRs get
  no secrets, so the job skips itself for them.
- **Retries.** At most 3 fix attempts per ticket, then it goes to you.

## One-time setup (you)

1. **Land your work first.** Commit `design/system-pass` and merge it to `main` (about 40
   files are uncommitted, and the branch is 37 commits behind `main`). Agent branches start
   from `main`.
2. **Staging Supabase.** Create a new project, apply `supabase/migrations`, and seed demo
   products (no production data). Add repo secrets `STAGING_SUPABASE_URL` and
   `STAGING_SUPABASE_ANON_KEY`.
3. **GitHub App for the bot** (gives it a separate identity from you, and its pushes trigger CI).
   Settings → Developer settings → GitHub Apps → New. Permissions: Contents RW, Issues RW,
   Pull requests RW, Metadata R. No webhook. Install it on this repo only. Add repo variable
   `AGENT_APP_ID` and secret `AGENT_APP_PRIVATE_KEY`.
4. **Anthropic key with a hard cap.** Create a separate Console workspace for the pipeline, set
   a monthly spend limit there, and add `ANTHROPIC_API_KEY` from that workspace. The spend limit
   is the real budget cap. Per-stage cost is posted on each ticket.
5. **Labels.** Run `scripts/agent/setup-labels.sh`.
6. **Branch protection on `main`.** Require PR review from code owners, plus the checks
   `Type Check & Lint`, `Tests`, `Build admin & client` and `Playwright E2E`. No bypass.
7. **Board.** Create a GitHub Project, add this repo's issues, and save views filtered by
   each `status:*` label (one view per column). Native drag-and-drop columns need a Status
   field synced from labels: that's Phase 2 work, only if the label views aren't enough.
8. **Backlog.** Run `node scripts/agent/plan-to-issues.mjs` to review the 16 drafts in
   `.agent/issue-drafts/`, then run it with `--create`. Expect triage to mark several as
   `done-already`: the Plan.md checkboxes weren't kept up to date.
9. **Start small.** Set repo variables `AGENT_APPROVERS=andriihukco`, `AGENT_MAX_ACTIVE=1` and `AGENT_ENABLED=true`, then queue 2–3 tickets.
   Read every plan and review for the first week before raising the WIP limit.

## Telemetry

| What | Where |
|---|---|
| Stage, retries, size | Labels on the issue |
| Plan, review, cost per stage | Bot comments on the issue (data in a collapsed JSON block) |
| Tool calls and full transcript | Actions run → Claude step log, and the execution file |
| E2E report, server log | `e2e-results` artifact on the E2E run |

Live streaming of tool calls to a custom dashboard is Phase 2 work. It isn't built.

## Not verified yet

- Whether the action's `structured_output` and `--json-schema` work as documented, and the
  exact execution-file format behind the cost figure. Cost shows as blank if the format differs.
- The whole flow end to end. It needs the secrets above. First run: queue one small ticket
  and watch each stage.
