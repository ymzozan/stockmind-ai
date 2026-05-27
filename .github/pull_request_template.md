## Summary

<!-- What does this PR do? 2-3 bullet points max. -->

-
-

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / performance improvement
- [ ] Dependency update
- [ ] Documentation

## Production Checklist

### Code
- [ ] TypeScript compiles with no errors (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No `console.log` left in production paths
- [ ] No secrets or API keys committed

### Database
- [ ] No destructive schema changes without a migration plan
- [ ] New Prisma migration tested locally (`npx prisma migrate dev`)
- [ ] Migration is backward-compatible with the previous deploy (zero-downtime)

### Shopify / Webhooks
- [ ] Webhook handlers remain idempotent (safe for duplicate delivery)
- [ ] HMAC verification untouched or explicitly reviewed
- [ ] GDPR webhook handlers unaffected (or updated intentionally)
- [ ] Tested in Shopify development store

### Auth & Security
- [ ] No new OAuth redirect paths that could navigate the embedded iframe
- [ ] Session data properly scoped per shop
- [ ] No sensitive data exposed in client-side responses

## Performance Impact

<!-- Any expected change in latency, DB query count, or bundle size? -->

N/A

## Test Plan

<!-- How did you verify this works? Steps to reproduce the test. -->

1.
2.

## Screenshots / Recordings

<!-- For UI changes, include before/after. -->
