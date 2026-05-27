# StockMind AI

Back-in-stock alerts, waitlists, pre-orders, and AI-powered demand forecasting for Shopify merchants.

## Features

- **Back-in-stock alerts** — customers join a waitlist when a product is out of stock, get notified automatically when inventory is replenished
- **Pre-orders** — sell products before they're in stock with configurable messaging, badges, and expected ship dates
- **Waitlist management** — merchant dashboard showing subscribers per product/variant, notification history
- **Checkout UI extension** — "Notify Me" widget renders directly in checkout / product page
- **Global settings** — configure email sender name, subject lines, low-stock threshold per shop
- **AI demand forecasting** — predict restocking needs based on waitlist size and sales velocity (roadmap)

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Remix](https://remix.run) |
| Shopify Integration | [@shopify/shopify-app-remix](https://github.com/Shopify/shopify-app-js) |
| UI | [Polaris](https://polaris.shopify.com) + App Bridge |
| Database | PostgreSQL via [Prisma](https://prisma.io) |
| Extensions | Shopify Checkout UI Extensions |

## Webhooks handled

| Topic | Purpose |
|-------|---------|
| `orders/create` | Capture pre-orders from new orders |
| `orders/fulfilled` | Mark pre-orders as shipped |
| `orders/cancelled` | Mark pre-orders as cancelled |
| `products/update` | Disable settings when product is archived |
| `inventory_levels/update` | Trigger back-in-stock notifications |
| `app/uninstalled` | Clean up all shop data |

## Local development

```bash
cp .env.example .env
# fill in SHOPIFY_API_KEY, SHOPIFY_API_SECRET, DATABASE_URL

npm install
npx prisma migrate dev
shopify app dev
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `SHOPIFY_API_KEY` | App API key from Partner Dashboard |
| `SHOPIFY_API_SECRET` | App API secret |
| `SHOPIFY_APP_URL` | Public URL (ngrok in dev) |
| `DATABASE_URL` | PostgreSQL connection string |

## Deployment

Deployed on [Vercel](https://vercel.com). Set the required environment variables in the Vercel dashboard, run `npx prisma migrate deploy` against your production database, then run `shopify app deploy` to sync the app config with the Shopify Partner Dashboard.

---

Built by [codeimo](https://codeimo.com)
