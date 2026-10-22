# Rollback runbook

Applies to both `udo-craft-admin` and `udo-craft-client` on Vercel.

## 1. Application rollback (fastest, about 1 minute)

1. Vercel dashboard → project → **Deployments**.
2. Find the last good production deployment (before the change).
3. Open its menu → **Promote to Production** (or **Instant Rollback**).
4. Confirm the production URL serves the earlier build.

Do this for each affected app. The two apps deploy independently.

## 2. Code rollback (git)

The audit work is on stacked branches, each built on the one before:
`audit/phase-a-security` → `audit/phase-b-stability` → `audit/phase-c-ui` → `audit/phase-e-launch`.
Nothing is merged to `main` yet. Each change is a separate commit, so any one can be reverted alone:

```bash
git revert <commit>      # one change
git revert --no-commit <oldest>^..<newest>   # a range, then one commit
```

Commits with no database or secret impact are safe to revert at any time.

## 3. Changes that need extra steps to roll back

| Change | Rollback step |
|---|---|
| Admin permissions from memberships only (`0eeeef1`) | Admins who relied on `user_metadata.role` lose access. Re-grant memberships first, or revert the commit. |
| Reset-code hashing (`1d6abae`, client `f288c0d`) | Codes issued before the change are invalid after revert. Users request a new code. |
| Webhook fail-closed (`08603f4`) | Reverting re-opens unauthenticated webhooks. Prefer fixing the missing secret instead. |
| Telegram attachments (`722928d`) | Old attachment URLs still contain the bot token. Rotating the token is a separate step. |
| Consent gating (`0338b4b`) | Analytics and Clarity start for every visitor again after revert. |
| Telegram bot removal (`33577d7`) | Restore from git history if the bot is needed again. |

## 4. Environment variables

Adding a required variable is not reverted by a code rollback. Variables
added in this audit: `OTP_PEPPER` (admin and client), `IMAGE_PROXY_ALLOWED_HOSTS`
(admin), `RESEND_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_SECRET`. Removing them
does not roll anything back; it makes the matching feature fail closed.

## 5. Database

No migrations have been applied in this audit. If a migration is added later,
record its reverse SQL in the same pull request before merging.

## 6. Verification after rollback

- `/api/health` returns OK on both apps.
- Client: home page loads, cookie banner appears, checkout reaches the confirmation step.
- Admin: sign-in works for an account with a membership, and an account without one is refused.
