import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useEffect } from "react";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

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

function buildInstallUrl(shop: string, apiKey: string) {
  const slug = shop.replace(".myshopify.com", "");
  return `https://admin.shopify.com/store/${slug}/oauth/install?client_id=${apiKey}`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const reqUrl = new URL(request.url);
  const shop = reqUrl.searchParams.get("shop") ?? "";
  const apiKey = process.env.SHOPIFY_API_KEY ?? "";

  try {
    await authenticate.admin(request);
    return { apiKey, exitIframeUrl: null as string | null };
  } catch (error) {
    // 3xx redirect — check destination before re-throwing
    if (error instanceof Response && error.status < 400) {
      const location = error.headers.get("Location") ?? "";
      // Bounces back to our own domain (token-exchange): let React Router follow
      if (!location.includes("admin.shopify.com") && !location.includes("accounts.shopify.com")) {
        throw error;
      }
      // Shopify OAuth redirect: navigate PARENT frame, not the iframe
      if (shop && apiKey) return { apiKey, exitIframeUrl: location };
    }

    // 4xx / any other error: clear session once, then navigate parent to install
    if (shop && apiKey) {
      if (!reqUrl.searchParams.get("cleared")) {
        await prisma.session.deleteMany({ where: { shop } }).catch(() => {});
        reqUrl.searchParams.set("cleared", "1");
        throw redirect(reqUrl.toString());
      }
      return { apiKey, exitIframeUrl: buildInstallUrl(shop, apiKey) };
    }

    throw error;
  }
};

function ExitIframe({ url }: { url: string }) {
  useEffect(() => {
    try {
      window.parent.postMessage(
        JSON.stringify({ message: "Shopify.API.App.redirect", data: { location: url } }),
        "https://admin.shopify.com"
      );
    } catch (_) {}
    try { window.top!.location.href = url; } catch (_) {}
  }, [url]);
  return null;
}

export default function App() {
  const { apiKey, exitIframeUrl } = useLoaderData<typeof loader>();

  // Set apiKey globally so ErrorBoundary can use it if a child route errors
  if (typeof window !== "undefined") {
    (window as Record<string, unknown>).__SHOPIFY_API_KEY__ = apiKey;
  }

  if (exitIframeUrl) return <ExitIframe url={exitIframeUrl} />;

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <script
        dangerouslySetInnerHTML={{ __html: `window.__SHOPIFY_API_KEY__=${JSON.stringify(apiKey)};` }}
      />
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

export function ErrorBoundary() {
  useRouteError();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shop = new URLSearchParams(window.location.search).get("shop");
    const apiKey = (window as Record<string, unknown>).__SHOPIFY_API_KEY__ as string | undefined;
    if (!shop || !apiKey) return;
    const installUrl = buildInstallUrl(shop, apiKey);
    try {
      window.parent.postMessage(
        JSON.stringify({ message: "Shopify.API.App.redirect", data: { location: installUrl } }),
        "https://admin.shopify.com"
      );
    } catch (_) {}
    try { window.top!.location.href = installUrl; } catch (_) {}
  }, []);

  return null;
}

export const headers: HeadersFunction = (headersArgs) => boundary.headers(headersArgs);
