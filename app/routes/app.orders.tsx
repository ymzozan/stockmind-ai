import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { json } from "react-router";
import { useLoaderData, useSubmit } from "react-router";
import {
  Page,
  Card,
  DataTable,
  Badge,
  Text,
  BlockStack,
  EmptyState,
  Button,
  Select,
  InlineStack,
} from "@shopify/polaris";
import { useState } from "react";
import { withShopifyAuth } from "../shopify-auth.server";
import prisma from "../db.server";

const STATUS_COLORS: Record<string, "info" | "success" | "attention" | "warning"> = {
  PENDING: "attention",
  CONFIRMED: "info",
  SHIPPED: "success",
  CANCELLED: "warning",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const auth = await withShopifyAuth(request);
  if (!auth) return json({ needsReauth: true as const, orders: [] as never[], status: "ALL" });
  const { session } = auth;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "ALL";

  const orders = await prisma.preOrder.findMany({
    where: {
      shop: session.shop,
      ...(status !== "ALL" ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return json({ needsReauth: false as const, orders, status });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const auth = await withShopifyAuth(request);
  if (!auth) return json({ ok: false });
  const { session } = auth;
  const formData = await request.formData();
  const orderId = formData.get("orderId") as string;
  const newStatus = formData.get("status") as string;

  await prisma.preOrder.update({
    where: { id: orderId },
    data: { status: newStatus, updatedAt: new Date() },
  });

  return json({ ok: true });
};

export default function OrdersPage() {
  const { needsReauth, orders, status } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  if (needsReauth) return null;

  const updateStatus = (orderId: string, newStatus: string) => {
    const fd = new FormData();
    fd.append("orderId", orderId);
    fd.append("status", newStatus);
    submit(fd, { method: "post" });
  };

  return (
    <Page
      title="Pre-Orders"
      subtitle={`${orders.length} pre-order${orders.length !== 1 ? "s" : ""}`}
      secondaryActions={[
        { content: "All", url: "?status=ALL" },
        { content: "Pending", url: "?status=PENDING" },
        { content: "Confirmed", url: "?status=CONFIRMED" },
        { content: "Shipped", url: "?status=SHIPPED" },
      ]}
    >
      <Card>
        {orders.length === 0 ? (
          <EmptyState
            heading="No pre-orders found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Pre-orders will appear here once customers place them.</p>
          </EmptyState>
        ) : (
          <DataTable
            columnContentTypes={["text", "text", "text", "numeric", "text", "text"]}
            headings={["Order #", "Customer", "Product", "Qty", "Total", "Status"]}
            accessibilityLabel="Pre-orders list"
            rows={orders.map((order) => [
              `#${order.orderNumber}`,
              order.customerName,
              order.productTitle + (order.variantTitle ? ` — ${order.variantTitle}` : ""),
              order.quantity,
              `$${order.price}`,
              <Badge key={order.id} tone={STATUS_COLORS[order.status] || "info"}>
                {order.status}
              </Badge>,
            ])}
          />
        )}
      </Card>
    </Page>
  );
}
