import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
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
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const STATUS_COLORS: Record<string, "info" | "success" | "attention" | "warning"> = {
  PENDING: "attention",
  CONFIRMED: "info",
  SHIPPED: "success",
  CANCELLED: "warning",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "ALL";

  const orders = await prisma.preOrder.findMany({
    where: {
      shop: session.shop,
      ...(status !== "ALL" ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return json({ orders, status });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
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
  const { orders, status } = useLoaderData<typeof loader>();
  const submit = useSubmit();

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
