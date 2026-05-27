import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, boundary } from "../shopify.server";

function exitIframeHtml(installUrl: string) {
  return new Response(
    `<!DOCTYPE html>
<html><head><title>Redirecting…</title></head>
<body>
<script>
(function(){
  var url=${JSON.stringify(installUrl)};
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
    if (err instanceof Response) {
      const location = err.headers.get("Location") ?? "";
      // Intercept any redirect targeting admin.shopify.com — navigating the
      // iframe there causes X-Frame-Options: deny. Serve exit-iframe HTML so
      // the parent frame navigates instead.
      if (
        err.status === 302 &&
        location.includes("admin.shopify.com")
      ) {
        return exitIframeHtml(location);
      }
      // Pass all other Response throws (token-exchange bounces, etc.) through
      throw err;
    }
    throw err;
  }
};

export const headers = boundary.headers;
