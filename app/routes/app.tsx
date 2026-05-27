import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// Returns raw HTML that navigates the TOP FRAME (not the iframe) to the
// OAuth install page. boundary.error does window.location which loads
// admin.shopify.com inside the iframe — this bypasses that entirely.
function exitIframeResponse(installUrl: string): Response {
  const html = `<!DOCTYPE html>
<html><head><title>Redirecting…</title></head>
<body>
<script>
(function(){
  var url=${JSON.stringify(installUrl)};
  // App Bridge v3 postMessage — parent performs the navigation
  try{window.parent.postMessage(
    JSON.stringify({message:"Shopify.API.App.redirect",data:{location:url}}),
    "https://admin.shopify.com"
  );}catch(e){}
  // Direct top-frame navigation fallback
  try{window.top.location.href=url;}catch(e){}
})();
</script>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "Content-Security-Policy":
        "frame-ancestors https://admin.shopify.com https://*.myshopify.com https://*.spin.dev;",
    },
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
    return { apiKey: process.env.SHOPIFY_API_KEY || "" };
  } catch (error) {
    if (error instanceof Response && error.status < 400) throw error;

    const reqUrl = new URL(request.url);
    const shop = reqUrl.searchParams.get("shop");
    const apiKey = process.env.SHOPIFY_API_KEY || "";

    // Any 4xx from authenticate.admin means auth failed — clear session and
    // redirect to install rather than letting boundary.error navigate the iframe.
    if (error instanceof Response && error.status >= 400) {
      if (shop && !reqUrl.searchParams.get("cleared")) {
        await prisma.session.deleteMany({ where: { shop } }).catch(() => {});
        reqUrl.searchParams.set("cleared", "1");
        throw redirect(reqUrl.toString());
      }
      if (shop && apiKey) {
        const slug = shop.replace(".myshopify.com", "");
        const installUrl = `https://admin.shopify.com/store/${slug}/oauth/install?client_id=${apiKey}`;
        return exitIframeResponse(installUrl);
      }
    }

    throw error;
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <a href="/app" rel="home">Dashboard</a>
        <a href="/app/products">Products</a>
        <a href="/app/orders">Pre-Orders</a>
        <a href="/app/settings">Settings</a>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
