# Deployment Guide

## TL;DR — How to deploy

```bash
git push origin main     # → production (both apps)
git push origin develop  # → staging preview (both apps)
```

That's it. Vercel's GitHub integration handles everything automatically.

---

## How it works

Both `udo-craft-admin` and `udo-craft-client` are connected to the `andriihukco/udo-craft` GitHub repo on Vercel. Every push to `main` triggers a production build for both. Every push to `develop` triggers a preview build.

### Vercel project settings (already configured — don't change)

Both projects are configured identically:

| Setting | Value |
|---|---|
| Root Directory | `apps/admin` or `apps/client` |
| Include files outside root | ON (required for monorepo) |
| Install command | `cd ../.. && npm install --legacy-peer-deps` |
| Build command | `cd ../.. && npm run build:admin` (or `:client`) |
| Output directory | `.next` |
| Framework | Next.js |

---

## Branch workflow

```
feature/my-thing  ──PR──►  develop  ──PR──►  main
   (local)                (staging)         (production)
```

### Starting a new feature or fix

```bash
# Always branch from develop, not main
git checkout develop
git pull origin develop
git checkout -b feature/my-feature   # or fix/my-fix
```

### Working and committing

```bash
git add .
git commit --no-verify -m "feat: describe what you did"
# --no-verify is safe here — the pre-commit hook only blocks .env files,
# which are already gitignored. Use it to avoid husky shell env issues.
git push origin feature/my-feature
```

### Getting to staging (via gh CLI)

```bash
# Write PR body to a temp file to avoid shell quoting issues with special chars
cat > pr-body.md << 'EOF'
Brief description of what changed and why.
EOF

gh pr create \
  --base develop \
  --head feature/my-feature \
  --title "feat: describe what you did" \
  --body-file pr-body.md

rm pr-body.md

# Merge when CI is green
gh pr merge <PR_NUMBER> --merge --delete-branch
```

CI runs automatically on PR open: type-check + lint. Merging triggers Vercel staging preview deploy.

### Getting to production (via gh CLI)

```bash
cat > pr-body.md << 'EOF'
Staging verified. Promoting to production.
EOF

gh pr create \
  --base main \
  --head develop \
  --title "feat: describe what you did" \
  --body-file pr-body.md

rm pr-body.md

# After reviewing staging preview
gh pr merge <PR_NUMBER> --merge
```

Merging to `main` triggers Vercel production deploy for both apps automatically.

**Never push directly to `main`.**

---

## Environments

| Environment | Branch | Admin URL | Client URL | Supabase |
|---|---|---|---|---|
| Production | `main` | `admin.u-do-craft.store` | `u-do-craft.store` | Production project |
| Staging | `develop` | Vercel preview URL | Vercel preview URL | `udocraft-dev` project |
| Local | — | `localhost:3001` | `localhost:3000` | Either project |

---

## Environment Variables

Set in Vercel dashboard → Project → Settings → Environment Variables.

Use "Production" environment for `main` branch values, "Preview" for staging (`udocraft-dev` credentials).

### Admin (`udo-craft-admin`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, never expose) |
| `NEXT_PUBLIC_APP_URL` | `https://admin.u-do-craft.store` |
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Any random string |
| `RESEND_WEBHOOK_SECRET` | Required in production. Svix signing secret from Resend; inbound email is rejected without it |
| `OTP_PEPPER` | Required. Random 32+ byte secret used to hash password-reset codes |
| `ADMIN_BOOTSTRAP_EMAILS` | Optional. Comma-separated emails granted admin once verified |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional — from sentry.io |

### Client (`udo-craft-client`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | `https://u-do-craft.store` |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional — from sentry.io |

---

## After deploying admin for the first time

Register the Telegram webhook:

```bash
curl https://admin.u-do-craft.store/api/telegram/setup
```

Only needs to be done once (or after changing the domain).

---

## Vercel project reference

| App | Project | Project ID | Domain |
|---|---|---|---|
| Admin | `udo-craft-admin` | `prj_UKfsyyoJDIIhJ67xXqSnBy2c7zmk` | `admin.u-do-craft.store` |
| Client | `udo-craft-client` | `prj_GTScm9WnDiwD837rrOKHsXiFRsFS` | `u-do-craft.store` |
| Org | `udo-craft` | `team_XX3rqg5IE2XdK6oxIVibJTt6` | — |

---

## Troubleshooting

**Build fails: "Cannot find module '@udo-craft/shared'"**
The build must run from the repo root. The `vercel.json` `buildCommand` handles this with `cd ../..`. Don't run `vercel deploy` from inside an app directory.

**Build fails: "No Next.js version detected"**
The Vercel project's Root Directory setting is wrong. It must be `apps/admin` or `apps/client` (not empty, not the repo root).

**Build fails: "Missing required Supabase environment variable"**
Add the env vars in Vercel dashboard → Project Settings → Environment Variables.

**Domain shows old code after deployment**
Go to Vercel dashboard → project → Deployments → find the latest Ready deployment → promote to production.

**Type errors in CI**
Run `npm run type-check` locally and fix before pushing.
