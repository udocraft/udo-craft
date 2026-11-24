# Stage: build (Sonnet)

Read `.github/agent/prompts/_rules.md` and `.claude/agents/eng-builder.md` first.
The approved plan is in `.agent/plan.json`. Follow it exactly.

1. Edit only `target_files`. If the plan is wrong, stop and explain in your final message;
   do not improvise a different design.
2. Run, and fix until green:
   - `npm run type-check --workspace=client`
   - `npm run lint --workspace=client`
   - `npm run test --workspace=client`
3. Do not commit or push. The workflow does that.
4. Final message: what changed per file, commands run with pass/fail, anything not verified.
