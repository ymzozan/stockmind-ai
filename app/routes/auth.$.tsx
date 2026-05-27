import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, boundary } from "../shopify.server";

function exitIframeHtml(url: string) {
  return new Response(
    `<!DOCTYPE html>
<html><head><title>Redirecting…</title></head>
<body>
<script>
(function(){
  var url=${JSON.stringify(url)};
  try{window.parent.postMessage(
    JSON.stringify({message:"Shopify.API.App.redirect",data:{location:url}}),
    "https://admin.shopify.com"
  );}catch(e){}
  try{window.top.location.href=url;}catch(e){}
})();
</script>
</body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Content-Security-Policy":
          "frame-ancestors https://admin.shopify.com https://*.myshopify.com https://*.spin.dev;",
      },
    }
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
    return null;
  } catch (err) {
    if (err instanceof Response && err.status === 302) {
      const location = err.headers.get("Location") ?? "";
      const appUrl = process.env.SHOPIFY_APP_URL || "";
      // Intercept any redirect to an external domain (admin.shopify.com,
      // accounts.shopify.com, etc.). Redirects back to our own domain
      // (token-exchange bounces) are re-thrown so Remix follows them normally.
      if (location.startsWith("https://") && !location.startsWith(appUrl)) {
        return exitIframeHtml(location);
      }
    }
    throw err;
  }
};

export const headers = boundary.headers;
