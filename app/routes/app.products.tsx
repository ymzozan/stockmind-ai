import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Modal,
  Form,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  EmptyState,
  Thumbnail,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Fetch products from Shopify
  const response = await admin.graphql(`
    query {
      products(first: 20) {
        nodes {
          id
          title
          status
          totalInventory
          images(first: 1) {
            nodes { url altText }
          }
          variants(first: 1) {
            nodes { id price inventoryQuantity }
          }
        }
      }
    }
  `);

  const { data } = await response.json();
  const products = data?.products?.nodes || [];

  const settings = await prisma.preOrderSetting.findMany({ where: { shop } });
  const settingsMap = Object.fromEntries(
    settings.map((s) => [s.productId, s])
  );

  return json({ products, settingsMap });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "toggle") {
    const productId = formData.get("productId") as string;
    const existing = await prisma.preOrderSetting.findFirst({
      where: { shop, productId },
    });

    if (existing) {
      await prisma.preOrderSetting.update({
        where: { id: existing.id },
        data: { enabled: !existing.enabled },
      });
    } else {
      await prisma.preOrderSetting.create({
        data: { shop, productId, enabled: true },
      });
    }
  }

  if (intent === "save") {
    const productId = formData.get("productId") as string;
    const data = {
      shop,
      productId,
      enabled: formData.get("enabled") === "true",
      buttonText: formData.get("buttonText") as string || "Pre-Order Now",
      badgeText: formData.get("badgeText") as string || "Pre-Order",
      message: formData.get("message") as string || "",
      discountPercent: parseInt(formData.get("discountPercent") as string || "0"),
      limitQuantity: formData.get("limitQuantity") === "true",
      maxQuantity: parseInt(formData.get("maxQuantity") as string || "0"),
    };

    await prisma.preOrderSetting.upsert({
      where: { shop_productId_variantId: { shop, productId, variantId: null as any } },
      create: data,
      update: data,
    });
  }

  return json({ ok: true });
};

export default function ProductsPage() {
  const { products, settingsMap } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleToggle = useCallback((productId: string) => {
    const formData = new FormData();
    formData.append("intent", "toggle");
    formData.append("productId", productId);
    submit(formData, { method: "post" });
  }, [submit]);

  return (
    <Page
      title="Products"
      subtitle="Configure pre-order settings per product"
    >
      {products.length === 0 ? (
        <Card>
          <EmptyState
            heading="No products found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Add products to your store to configure pre-orders.</p>
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <ResourceList
            resourceName={{ singular: "product", plural: "products" }}
            items={products}
            renderItem={(product: any) => {
              const gid = product.id;
              const numericId = gid.split("/").pop();
              const setting = settingsMap[gid];
              const isEnabled = setting?.enabled ?? false;
              const isOutOfStock = (product.totalInventory ?? 0) <= 0;
              const image = product.images?.nodes?.[0];
              const price = product.variants?.nodes?.[0]?.price;

              return (
                <ResourceItem
                  id={gid}
                  media={
                    image ? (
                      <Thumbnail source={image.url} alt={image.altText || product.title} />
                    ) : (
                      <Thumbnail source="" alt="" />
                    )
                  }
                  onClick={() => setSelectedProduct(product)}
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold" as="p">{product.title}</Text>
                      <InlineStack gap="200">
                        {price && <Text variant="bodySm" tone="subdued" as="p">${price}</Text>}
                        {isOutOfStock && <Badge tone="attention">Out of Stock</Badge>}
                        {isEnabled && <Badge tone="success">Pre-Order Active</Badge>}
                      </InlineStack>
                    </BlockStack>
                    <Button
                      onClick={(e) => { e?.stopPropagation(); handleToggle(gid); }}
                      variant={isEnabled ? "secondary" : "primary"}
                      size="slim"
                      loading={navigation.state === "submitting"}
                    >
                      {isEnabled ? "Disable" : "Enable Pre-Order"}
                    </Button>
                  </InlineStack>
                </ResourceItem>
              );
            }}
          />
        </Card>
      )}

      {selectedProduct && (
        <Modal
          open
          onClose={() => setSelectedProduct(null)}
          title={`Configure: ${selectedProduct.title}`}
          primaryAction={{
            content: "Save Settings",
            onAction: () => {
              const form = document.getElementById("settings-form") as HTMLFormElement;
              submit(form, { method: "post" });
              setSelectedProduct(null);
            },
          }}
          secondaryActions={[{ content: "Cancel", onAction: () => setSelectedProduct(null) }]}
        >
          <Modal.Section>
            <Form id="settings-form" onSubmit={() => {}}>
              <input type="hidden" name="intent" value="save" />
              <input type="hidden" name="productId" value={selectedProduct.id} />
              <FormLayout>
                <TextField
                  label="Button Text"
                  name="buttonText"
                  defaultValue={settingsMap[selectedProduct.id]?.buttonText || "Pre-Order Now"}
                  autoComplete="off"
                />
                <TextField
                  label="Badge Text"
                  name="badgeText"
                  defaultValue={settingsMap[selectedProduct.id]?.badgeText || "Pre-Order"}
                  autoComplete="off"
                />
                <TextField
                  label="Customer Message"
                  name="message"
                  multiline={3}
                  defaultValue={settingsMap[selectedProduct.id]?.message || "This item is available for pre-order. Ships in 2-3 weeks."}
                  autoComplete="off"
                />
                <TextField
                  label="Discount % (optional)"
                  name="discountPercent"
                  type="number"
                  defaultValue={String(settingsMap[selectedProduct.id]?.discountPercent || 0)}
                  autoComplete="off"
                />
              </FormLayout>
            </Form>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
