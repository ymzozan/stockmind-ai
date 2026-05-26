import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");

  if (shop && host) {
    return redirect(`/app?shop=${shop}&host=${host}`);
  }

  if (shop) {
    return redirect(`/auth/login?shop=${shop}`);
  }

  return redirect("/auth/login");
};
