# U:DO CRAFT agent teams and routing

Project agents live in `.claude/agents/`. Orchestration runs on Opus, execution on Sonnet and Haiku.

## Teams

| Team | Lead (Sonnet unless noted) | Executors | Skills base |
|---|---|---|---|
| Orchestration | `orchestrator` (Opus) | all | `engineering:architecture`, `engineering:system-design` |
| Engineering | `eng-builder` (Sonnet) | `eng-fixer` (Haiku), `eng-scout` (Haiku), `eng-reviewer` (Sonnet, read-only) | `engineering:code-review`, `engineering:debug`, `engineering:tech-debt`, `engineering:testing-strategy`, `security-review`, `simplify` |
| Design | `design-lead` (Sonnet) | `design-tuner` (Haiku) | `design:design-system`, `design:design-critique`, `design:accessibility-review`, `design-council:design-council`, `design:ux-copy` |
| Marketing | `marketing-lead` (Sonnet) | `marketing-copy` (Haiku) | `marketing:campaign-plan`, `marketing:seo-audit`, `marketing:brand-review`, `marketing:competitive-brief`, `marketing:draft-content` |

## Expert consultants (Sonnet, advise only)

| Expert | Covers | Skills base |
|---|---|---|
| `finance-expert` | unit economics, pricing, cash flow, close | `finance:financial-statements`, `finance:variance-analysis`, `small-business:cash-flow-snapshot` |
| `fashion-expert` | garments, print methods, sizing, palettes, collections | design and marketing skills |
| `sales-expert` | lead qualification, outreach, proposals, objections | `small-business:lead-triage`, `small-business:proposal-builder`, `small-business:outreach-composer` |
| `nlp-expert` | LLM features, prompts, evals, locale quality | `claude-api` |
| `cicd-expert` | GitHub Actions, Vercel, Supabase migrations, hooks, rollback | `engineering:deploy-checklist`, `engineering:incident-response` |

Experts answer with recommendations and drafts. Their output goes to the orchestrator or the relevant lead before any edit.

## Routing

- **Opus**: decomposition, trade-offs, security judgement, conflict resolution, final synthesis.
- **Sonnet**: feature code, design direction, campaign strategy, code review, critique.
- **Haiku**: search and counting, easy fixes, token tunings from a brief, short copy variants.

## Workflow

1. Orchestrator (Opus) reads `Plan.md`, verifies the claims, and writes a wave plan with file ownership.
2. Read-only wave runs in parallel: scout, reviewer, lead briefs.
3. Edit wave runs only with disjoint file sets. Builders and fixers before tuners.
4. Opus synthesises. The user approves commit, push or deploy.

## Rules

- No commits, pushes or deploys by agents.
- Agents never touch the user's uncommitted files without listing them first.
- Marketing agents draft; nothing is published or sent.
- Figma-based design work needs the Figma plugin; without it, design agents work from code and briefs.
- Analytics, Amplitude, Clarity and Ahrefs need authorisation via `/mcp` before marketing agents can use them.
