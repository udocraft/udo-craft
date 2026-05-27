# Contributing Guide

Welcome to U:DO Craft! This guide explains our development workflow and standards.

## 🌿 Branching Strategy

- `main` — Production-ready code. Deploys to `*.u-do-craft.store`.
- `develop` — Integration branch for new features.
- `feature/*` — New features or improvements.
- `fix/*` — Bug fixes.

## 💬 Commit Messages

We use **Semantic Commits**. This helps in generating changelogs and understanding history.

**Format:** `type(area): description`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semi-colons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Maintenance tasks (build, dependencies)

**Areas:**
`customizer`, `orders`, `erp`, `cms`, `analytics`, `shared`, `ui`, `infra`

**Examples:**
- `feat(customizer): add text curve controls`
- `fix(orders): resolve kanban drag-and-drop glitch`
- `docs(shared): update lead schema definitions`

## 🛠 Development Workflow

1.  **Branch:** Create a new branch from `develop`.
2.  **Code:** Implement your changes following our coding standards.
3.  **Test:** Ensure your changes don't break existing functionality.
4.  **Lint:** Run `npm run lint` before committing.
5.  **PR:** Open a Pull Request to `develop`.
6.  **Review:** Wait for a review and address any feedback.

## 📋 Coding Standards

- **TypeScript:** Everything must be typed. Avoid `any` at all costs.
- **Zod:** Use Zod schemas in `packages/shared` for all data crossing the API boundary.
- **Hooks:** Prefer functional components and hooks over class components.
- **Surgical Edits:** Keep PRs focused. Avoid unrelated refactoring.
- **Documentation:** Update `ARCHITECTURE.md` if you change the system design.

## 🚀 Deployment

We use **Vercel** for automatic deployments:
- Pushing to `main` deploys to production.
- Pushing to other branches creates a Preview deployment.
