# StockMind AI

**Back in Stock Alerts · Waitlist · Preorders · AI Demand Forecasting**

A Shopify embedded app that turns out-of-stock products into revenue opportunities. Collect waitlists, send automatic restock alerts, enable preorders, and use AI to predict demand and recommend smart restocking actions.

Built for Shopify. React Router v7 · Polaris · TypeScript · Prisma · PostgreSQL.

---

## What it does

When a product goes out of stock, StockMind AI:

1. Shows a "Notify me" widget on the product page
2. Collects customer emails (and optional phone numbers)
3. Automatically sends alerts when stock is restored
4. Optionally enables preorders with configurable messaging
5. Calculates AI demand scores and restock recommendations based on waitlist velocity

## Features

| Feature | Free | Starter | Growth | Pro |
|---------|------|---------|--------|-----|
| Waitlist collection | ✓ | ✓ | ✓ | ✓ |
| Back in stock alerts | 30/mo | 1,000/mo | 5,000/mo | Unlimited |
| Preorders | — | — | ✓ | ✓ |
| AI demand score | — | — | ✓ | ✓ |
| AI restock recommendations | — | — | — | ✓ |
| AI message generator | — | — | ✓ | ✓ |
| Remove branding | — | — | — | ✓ |

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React Router v7 (Shopify app template) |
| Shopify | @shopify/shopify-app-react-router, App Bridge, Polaris |
| API | Shopify GraphQL Admin API |
| Database | PostgreSQL via Prisma |
| Email | Resend |
| AI | OpenAI GPT-4o (demand scoring + message generation) |
| Storefront | Theme App Extension |

## Status

Active development. MVP targeting Shopify App Store submission.

---

*StockMind AI is a product by [codeimo](https://codeimo.com)*
