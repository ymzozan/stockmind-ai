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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.admin(request);
    return { apiKey: process.env.SHOPIFY_API_KEY || "" };
  } catch (error) {
    // Pass through 3xx redirects from the auth library
    if (error instanceof Response && error.status < 400) throw error;

    // 410 = stale/incompatible session. Clear it so the library serves the
    // fresh token-exchange bootstrap page on the next request.
    if (error instanceof Response && error.status === 410) {
      const shop = new URL(request.url).searchParams.get("shop");
      if (shop) {
        await prisma.session.deleteMany({ where: { shop } }).catch(() => {});
        // Add a marker so we don't clear again if bootstrap also fails
        const url = new URL(request.url);
        if (!url.searchParams.get("cleared")) {
          url.searchParams.set("cleared", "1");
          throw redirect(url.toString());
        }
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
