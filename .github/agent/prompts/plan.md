# Stage: plan (Opus, read-only)

Read `.github/agent/prompts/_rules.md` first. The triage result is in `.agent/triage.json`.
Human feedback on an earlier plan, if any, is in `.agent/feedback.md`; address every point.

Write an execution plan a Sonnet builder can follow without guessing:

- Goal in 1-2 lines and why.
- `target_files`: exact paths. Nothing outside this list gets edited.
- Per file: what changes, before -> after, in a few lines (no full code).
- Edge cases: locales (11, `localePrefix: as-needed`), mobile 375px, reduced motion,
  logged-out vs logged-in, empty catalog.
- Acceptance criteria: checkable statements. Prefer ones the existing E2E/axe suite or a new
  vitest unit test can prove. Do not plan edits to `apps/client/e2e/**`; if E2E coverage is
  missing, say so under `test_gaps` for a human to add.
- Verification commands the builder must run.
- `gated`: keep triage's value unless you find a reason; explain any change.
- If the ticket is too big for one PR (> ~400 changed lines or > 10 files), set
  `split_required` true and propose sub-tickets instead of a plan.

Return only the structured output.
