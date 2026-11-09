import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
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
  var target = ${JSON.stringify(url).replace(/</g, "\\u003c")};
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
  try {
    return await login(request);
  } catch (error) {
    if (error instanceof Response && error.status === 302) {
      const location = error.headers.get("Location");
      if (location) return topFrameRedirect(location);
    }
    throw error;
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return handleLogin(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return handleLogin(request);
};

export const headers = boundary.headers;
