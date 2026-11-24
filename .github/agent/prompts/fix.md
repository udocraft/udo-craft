# Stage: fix (Sonnet)

Read `.github/agent/prompts/_rules.md` first. Plan: `.agent/plan.json`.
What failed is in `.agent/failure.md` (CI logs or reviewer findings).

1. Find the root cause in the product code. Fix it there.
2. Never edit tests, E2E specs, snapshots, lint config or CI to make a check pass.
   If you believe a test is wrong, stop and say so in your final message.
3. Re-run type-check, lint and unit tests for the client workspace.
4. Do not commit or push. Final message: cause, fix, commands run, what is still unverified.
