import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineGrid,
  Badge,
  DataTable,
  EmptyState,
  Button,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [totalSettings, activeSettings, recentOrders, pendingCount, shippedCount] =
    await Promise.all([
      prisma.preOrderSetting.count({ where: { shop } }),
      prisma.preOrderSetting.count({ where: { shop, enabled: true } }),
      prisma.preOrder.findMany({
        where: { shop },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.preOrder.count({ where: { shop, status: "PENDING" } }),
      prisma.preOrder.count({ where: { shop, status: "SHIPPED" } }),
    ]);

  return json({
    stats: { totalSettings, activeSettings, pendingCount, shippedCount },
    recentOrders,
  });
};

export default function Dashboard() {
  const { stats, recentOrders } = useLoaderData<typeof loader>();

  return (
    <Page title="Pre-Order Dashboard">
      <BlockStack gap="500">
        <Banner title="Pre-Order App is active" tone="success">
          <p>Your pre-order settings are live on your storefront.</p>
        </Banner>

        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          {[
            { label: "Configured Products", value: stats.totalSettings, badge: undefined },
            { label: "Active Pre-Orders", value: stats.activeSettings, badge: "success" as const },
            { label: "Pending Orders", value: stats.pendingCount, badge: "attention" as const },
            { label: "Shipped", value: stats.shippedCount, badge: "info" as const },
          ].map((stat) => (
            <Card key={stat.label}>
              <BlockStack gap="200">
                <Text variant="headingXl" as="p">{stat.value}</Text>
                <Text variant="bodyMd" tone="subdued" as="p">{stat.label}</Text>
                {stat.badge && <Badge tone={stat.badge}>Active</Badge>}
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">Recent Pre-Orders</Text>
            {recentOrders.length === 0 ? (
              <EmptyState
                heading="No pre-orders yet"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Enable pre-orders on your products to start collecting orders.</p>
                <Button url="/app/products" variant="primary">Configure Products</Button>
              </EmptyState>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric", "text"]}
                headings={["Order", "Customer", "Product", "Qty", "Status"]}
                rows={recentOrders.map((o) => [
                  `#${o.orderNumber}`,
                  o.customerName,
                  o.productTitle,
                  o.quantity,
                  o.status,
                ])}
              />
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
