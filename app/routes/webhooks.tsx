import { authenticate } from "../shopify.server";
import type { ActionFunctionArgs } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  // GDPR mandatory webhooks — no admin session, must return 200
  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      // In production: look up and email customer data to shop owner
      return new Response(null, { status: 200 });

    case "CUSTOMERS_REDACT": {
      const body = payload as any;
      const email = body?.customer?.email;
      if (email && shop) {
        await prisma.waitlistSubscriber.deleteMany({ where: { shop, email } });
      }
      return new Response(null, { status: 200 });
    }

    case "SHOP_REDACT": {
      await Promise.all([
        prisma.waitlistSubscriber.deleteMany({ where: { shop } }),
        prisma.preOrderSetting.deleteMany({ where: { shop } }),
        prisma.preOrder.deleteMany({ where: { shop } }),
        prisma.shopSettings.deleteMany({ where: { shop } }),
        prisma.session.deleteMany({ where: { shop } }),
      ]);
      return new Response(null, { status: 200 });
    }
  }

  if (!admin) {
    throw new Response("Unauthorized", { status: 401 });
  }

  switch (topic) {
    case "ORDERS_CREATE": {
      const order = payload as any;
      const lineItems: any[] = order.line_items || [];

      for (const item of lineItems) {
        const productGid = `gid://shopify/Product/${item.product_id}`;
        const variantGid = `gid://shopify/ProductVariant/${item.variant_id}`;

        const setting = await prisma.preOrderSetting.findFirst({
          where: { shop, productId: productGid, enabled: true },
        });

        if (setting) {
          await prisma.preOrder.upsert({
            where: { shop_orderId: { shop, orderId: String(order.id) } },
            create: {
              shop,
              orderId: String(order.id),
              orderNumber: order.order_number,
              productId: productGid,
              variantId: variantGid,
              productTitle: item.title,
              variantTitle: item.variant_title,
              quantity: item.quantity,
              price: item.price,
              customerEmail: order.email || "",
              customerName: `${order.billing_address?.first_name || ""} ${order.billing_address?.last_name || ""}`.trim(),
              status: "PENDING",
            },
            update: {},
          });
        }
      }
      break;
    }

    case "ORDERS_FULFILLED": {
      const order = payload as any;
      await prisma.preOrder.updateMany({
        where: { shop, orderId: String(order.id) },
        data: { status: "SHIPPED", updatedAt: new Date() },
      });
      break;
    }

    case "ORDERS_CANCELLED": {
      const order = payload as any;
      await prisma.preOrder.updateMany({
        where: { shop, orderId: String(order.id) },
        data: { status: "CANCELLED", updatedAt: new Date() },
      });
      break;
    }

    case "PRODUCTS_UPDATE": {
      const product = payload as any;
      const productGid = `gid://shopify/Product/${product.id}`;
      if (product.status === "archived") {
        await prisma.preOrderSetting.updateMany({
          where: { shop, productId: productGid },
          data: { enabled: false },
        });
      }
      break;
    }

    case "INVENTORY_LEVELS_UPDATE": {
      const inv = payload as any;
      const available = inv.available ?? 0;
      if (available <= 0) break;

      const variantGid = `gid://shopify/ProductVariant/${inv.inventory_item_id}`;
      await prisma.waitlistSubscriber.updateMany({
        where: { shop, variantId: variantGid, notified: false },
        data: { notified: true, notifiedAt: new Date() },
      });
      break;
    }

    case "APP_UNINSTALLED": {
      if (session) {
        await Promise.all([
          prisma.session.deleteMany({ where: { shop } }),
          prisma.waitlistSubscriber.deleteMany({ where: { shop } }),
          prisma.preOrderSetting.deleteMany({ where: { shop } }),
          prisma.shopSettings.deleteMany({ where: { shop } }),
        ]);
      }
      break;
    }

    default:
      // Return 200 for any unknown topics to avoid Shopify retries
      return new Response(null, { status: 200 });
  }

  return new Response(null, { status: 200 });
};
