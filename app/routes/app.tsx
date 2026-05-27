import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useEffect } from "react";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// App Bridge v4 uses web components — declare for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "ui-nav-menu": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

function exitIframeResponse(installUrl: string): Response {
  const html = `<!DOCTYPE html>
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
    // Re-throw 3xx — Remix handles redirects natively (token-exchange bounces etc.)
    if (error instanceof Response && error.status < 400) throw error;

    const reqUrl = new URL(request.url);
    const shop = reqUrl.searchParams.get("shop");
    const apiKey = process.env.SHOPIFY_API_KEY || "";

    // Any non-redirect error when we have shop context: clear session once,
    // then serve exit-iframe HTML so the PARENT frame navigates to OAuth install.
    // Never let boundary.error reach the client — it uses window.location (iframe).
    if (shop && apiKey) {
      if (!reqUrl.searchParams.get("cleared")) {
        await prisma.session.deleteMany({ where: { shop } }).catch(() => {});
        reqUrl.searchParams.set("cleared", "1");
        throw redirect(reqUrl.toString());
      }
      const slug = shop.replace(".myshopify.com", "");
      const installUrl = `https://admin.shopify.com/store/${slug}/oauth/install?client_id=${apiKey}`;
      return exitIframeResponse(installUrl);
    }

    throw error;
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      {/* Expose apiKey to the client so ErrorBoundary can build the install URL */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__SHOPIFY_API_KEY__=${JSON.stringify(apiKey)};`,
        }}
      />
      {/* App Bridge v4: ui-nav-menu web component (injected/managed by Shopify admin) */}
      <ui-nav-menu>
        <a href="/app" rel="home">Dashboard</a>
        <a href="/app/products">Products</a>
        <a href="/app/orders">Pre-Orders</a>
        <a href="/app/settings">Settings</a>
      </ui-nav-menu>
      <Outlet />
    </AppProvider>
  );
}

// Custom ErrorBoundary that exits the iframe via window.top instead of
// window.location (which boundary.error uses, causing X-Frame-Options errors).
export function ErrorBoundary() {
  useRouteError(); // must call to satisfy Remix's hook rules

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shop = new URLSearchParams(window.location.search).get("shop");
    const apiKey = (window as Record<string, unknown>).__SHOPIFY_API_KEY__ as
      | string
      | undefined;
    if (!shop || !apiKey) return;
    const slug = shop.replace(".myshopify.com", "");
    const installUrl = `https://admin.shopify.com/store/${slug}/oauth/install?client_id=${apiKey}`;
    try {
      window.parent.postMessage(
        JSON.stringify({
          message: "Shopify.API.App.redirect",
          data: { location: installUrl },
        }),
        "https://admin.shopify.com"
      );
    } catch (_) {}
    try {
      window.top!.location.href = installUrl;
    } catch (_) {}
  }, []);

  return null;
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
