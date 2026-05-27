import { authenticate } from "./shopify.server";

/**
 * Wraps authenticate.admin so that Shopify OAuth redirects (302 to
 * admin.shopify.com / accounts.shopify.com) do NOT propagate as thrown
 * Responses.  React Router v7 runs all matched-route loaders in parallel;
 * if a child-route loader re-throws a cross-origin redirect, React Router
 * follows it inside the iframe, triggering the X-Frame-Options error.
 *
 * Returns null when re-auth is needed — callers should return empty loader
 * data so the layout's ExitIframe component can handle the navigation.
 */
export async function withShopifyAuth(request: Request) {
  try {
    return await authenticate.admin(request);
  } catch (err) {
    if (err instanceof Response && err.status >= 300 && err.status < 400) {
      const loc = err.headers.get("Location") ?? "";
      if (
        loc.includes("admin.shopify.com") ||
        loc.includes("accounts.shopify.com")
      ) {
        return null;
      }
    }
    throw err;
  }
}
