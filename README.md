# StockMind AI

> Production Shopify app — pre-orders, back-in-stock alerts, and AI-powered demand forecasting.  
> Built for the Shopify App Store with [Built for Shopify](https://shopify.dev/docs/apps/launch/built-for-shopify) (BFS) compliance.

[![Deploy Status](https://img.shields.io/github/deployments/codeimo-team/stockmind-ai/production?label=vercel&logo=vercel)](https://stockmind-ai-jade.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Shopify](https://img.shields.io/badge/Shopify-App-96BF48?logo=shopify)](https://apps.shopify.com)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Shopify Admin (iframe)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  StockMind AI  ·  Polaris UI  ·  App Bridge v4           │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTPS + Session Token (JWT)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Vercel (Fluid Compute)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │  Remix SSR  │  │  Webhooks    │  │  Auth (Token Exch.) │    │
│  │  /app/*     │  │  /webhooks   │  │  /auth/*            │    │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘    │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Prisma ORM)                        │
│  sessions · shops · preorders · waitlist_subscribers            │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────┐
│  Shopify Admin API   │  GraphQL — products, orders, inventory
│  (OAuth 2.0 offline) │
└──────────────────────┘
```

---

## Features

| Feature | Status |
|---------|--------|
| Back-in-stock alerts — waitlist + automatic email notification | ✅ |
| Pre-orders — sell before in stock, configurable messaging & badges | ✅ |
| Waitlist dashboard — per-product subscriber counts + history | ✅ |
| Webhook processing — orders, inventory, app lifecycle | ✅ |
| GDPR compliance — customer data request / redact webhooks | ✅ |
| AI demand forecasting — predict restocking from waitlist velocity | 🔜 |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | [Remix](https://remix.run) | 2.x |
| Shopify SDK | [@shopify/shopify-app-remix](https://github.com/Shopify/shopify-app-js) | 3.8.x |
| Auth Strategy | Token Exchange (`unstable_newEmbeddedAuthStrategy`) | — |
| UI | [Polaris](https://polaris.shopify.com) + App Bridge v4 | 13.x / 4.x |
| ORM | [Prisma](https://prisma.io) | 5.x |
| Database | PostgreSQL | 15+ |
| Runtime | Node.js 20 LTS | — |
| Deploy | [Vercel](https://vercel.com) Fluid Compute | — |
| Language | TypeScript (strict) | 5.x |

---

## Security

- **OAuth 2.0 + Token Exchange** — no third-party cookies; session tokens are short-lived JWTs signed by Shopify, exchanged server-side for offline access tokens.
- **Webhook HMAC verification** — every inbound webhook is validated against `SHOPIFY_API_SECRET` before processing.
- **GDPR mandatory webhooks** — `customers/data_request`, `customers/redact`, `shop/redact` are handled and acknowledged within Shopify's SLA.
- **Session isolation** — each shop has an isolated Prisma session record; cross-shop data access is structurally impossible.
- **Environment secrets** — all credentials live in Vercel environment variables, never committed to source control.

---

## High-concurrency Webhook Strategy

Shopify delivers webhooks with at-least-once semantics. Our handler:

1. **HMAC check first** — rejects invalid signatures before any DB I/O.
2. **Idempotent writes** — all mutations use `upsert` or check-then-write to handle duplicate deliveries safely.
3. **Async fan-out** — heavy operations (notification dispatch, inventory scans) are decoupled from the HTTP response; we acknowledge Shopify within 5 s and process asynchronously.
4. **Structured logging** — every webhook logs `{ topic, shop, id }` for traceability.

---

## Local Development

```bash
# 1. Clone and install
git clone https://github.com/codeimo-team/stockmind-ai.git
cd stockmind-ai
npm install

# 2. Environment
cp .env.example .env
# Set: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL, DATABASE_URL, SCOPES

# 3. Database
npx prisma migrate dev

# 4. Start (tunnels via Cloudflare automatically)
shopify app dev
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SHOPIFY_API_KEY` | App API key from Partner Dashboard |
| `SHOPIFY_API_SECRET` | App API secret (used for HMAC verification) |
| `SHOPIFY_APP_URL` | Public app URL (Vercel production or ngrok in dev) |
| `SCOPES` | Comma-separated OAuth scopes |
| `DATABASE_URL` | PostgreSQL connection string |

---

## Deployment

```bash
# 1. Deploy app config to Shopify Partner Dashboard
shopify app deploy

# 2. Run production migrations
npx prisma migrate deploy

# 3. Push to main — Vercel deploys automatically via GitHub integration
git push origin main
```

Vercel environment variables are managed via the Vercel dashboard or `vercel env pull`.

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for branch naming, commit conventions, and the pull request checklist.

---

Built by [Codeimo](https://codeimo.com)
