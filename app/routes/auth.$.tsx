import type { LoaderFunctionArgs } from "react-router";
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
      // Intercept any redirect to Shopify's OAuth domains.
      // Redirects back to our own app domain (token-exchange bounces) are
      // re-thrown so Remix follows them normally inside the iframe.
      if (
        location.includes("admin.shopify.com") ||
        location.includes("accounts.shopify.com")
      ) {
        return exitIframeHtml(location);
      }
    }
    throw err;
  }
};

export const headers = boundary.headers;
