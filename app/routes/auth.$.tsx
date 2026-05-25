import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, boundary } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const headers = boundary.headers;
