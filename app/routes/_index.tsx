import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");

  if (shop && host) {
    try {
      await authenticate.admin(request);
    } catch (error) {
      if (error instanceof Response && error.status < 400) throw error;
      // Invalid token — clear and restart OAuth
      const { default: prisma } = await import("../db.server");
      await prisma.session.deleteMany({ where: { shop } }).catch(() => {});
      return redirect(`/auth?shop=${shop}`);
    }
    return redirect(`/app?shop=${shop}&host=${host}`);
  }

  if (shop) {
    return redirect(`/auth/login?shop=${shop}`);
  }

  return redirect("/auth/login");
};
