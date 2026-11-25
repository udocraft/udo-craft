# Stage: triage (Haiku, read-only)

Read `.github/agent/prompts/_rules.md` first.

Goal: decide whether the ticket in `.agent/ticket.md` is still real work, and size it.

1. Verify the claim against the code on this branch. Many Plan.md items were already done
   in later commits. Use `git log -S`, `git grep`, Read. Quote the evidence.
2. List the files a fix would touch (best estimate, max 15).
3. Size: S (one file, < 30 lines), M (a few files), L (cross-cutting or needs design).
4. `gated` is true if the change alters user-visible UI or copy, a public API route, the DB
   schema, auth, payments, or SEO metadata. Internal refactors and test-only changes are not gated.
5. `verdict`: `done` (already fixed, cite evidence), `actionable`, `unclear` (needs a human
   answer: put the question in `question`), or `out_of_scope` (not apps/client storefront work).

Return only the structured output.
