import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { boundary } from "@shopify/shopify-app-remix/server";
import { login } from "../shopify.server";

// OAuth redirects inside Shopify admin iframe fail because admin.shopify.com
// sets X-Frame-Options: deny. Instead of a 302, serve HTML that navigates
// the top-level window (the Shopify admin tab) to the OAuth URL.
function topFrameRedirect(url: string) {
  return new Response(
    `<!DOCTYPE html>
<html>
<head><title>Redirecting...</title></head>
<body>
<script type="text/javascript">
  var target = ${JSON.stringify(url)};
  try { window.top.location.href = target; } catch(e) { window.location.href = target; }
</script>
</body>
</html>`,
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

async function handleLogin(request: Request) {
  const response = await login(request);
  if (response instanceof Response && response.status === 302) {
    const location = response.headers.get("Location");
    if (location) return topFrameRedirect(location);
  }
  return response;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return handleLogin(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleLogin(request);
};

export const headers = boundary.headers;
