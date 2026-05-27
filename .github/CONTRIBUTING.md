# Contributing to StockMind AI

## Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<scope>` | `feat/waitlist-email` |
| Bug fix | `fix/<scope>` | `fix/webhook-idempotency` |
| Chore / deps | `chore/<scope>` | `chore/prisma-upgrade` |
| Docs | `docs/<scope>` | `docs/deployment` |

`main` is the production branch. All changes go through a PR — direct pushes to `main` are blocked except for hotfixes approved by the lead.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short imperative summary>

[optional body — explain WHY, not WHAT]
```

**Types:** `feat` · `fix` · `chore` · `docs` · `refactor` · `test` · `perf`

Examples:
```
feat(webhooks): add idempotency check for orders/create
fix(auth): intercept OAuth redirects to prevent X-Frame-Options error
chore(deps): upgrade shopify-app-remix to 3.8.5
```

## Code Quality Standards

- **TypeScript strict mode** — no `any`, no `as unknown as X` without a comment explaining why.
- **No silent errors** — never swallow exceptions with empty `catch` blocks; log or re-throw.
- **Webhook handlers must be idempotent** — duplicate deliveries are expected; writes must be safe to repeat.
- **No secrets in code** — all credentials via environment variables; `.env` is gitignored.
- **Prisma migrations are forward-only** — no destructive schema changes without a data migration plan.

## Testing Mandates

- All webhook handlers must have an integration test with a real DB (no mocks).
- Auth flows must be tested end-to-end in the Shopify development store before merging.
- Run `npx tsc --noEmit` locally before opening a PR — CI will reject type errors.

## Linting & Formatting

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

Both run in CI. PRs with lint errors will not be merged.

## Pull Request Process

1. Open a PR against `main` using the PR template.
2. Assign at least one reviewer.
3. All CI checks must pass.
4. Squash-merge is preferred to keep history clean.

## Questions

Open a [GitHub Discussion](../../discussions) or reach out in the team Slack.
