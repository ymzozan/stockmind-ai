import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  Text,
  Divider,
  Banner,
  ContextualSaveBar,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({
    defaultButtonText: "Pre-Order Now",
    defaultBadgeText: "Pre-Order",
    defaultMessage: "This item is available for pre-order. Ships in 2-3 weeks.",
    emailNotifications: true,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  // Save global settings logic here
  return json({ ok: true, saved: true });
};

export default function SettingsPage() {
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    defaultButtonText: data.defaultButtonText,
    defaultBadgeText: data.defaultBadgeText,
    defaultMessage: data.defaultMessage,
  });

  const handleChange = useCallback((field: string) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSaved(false);
  }, []);

  const handleSave = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    submit(fd, { method: "post" });
    setIsDirty(false);
    setSaved(true);
  };

  return (
    <Page title="App Settings">
      {isDirty && (
        <ContextualSaveBar
          message="Unsaved changes"
          saveAction={{ onAction: handleSave, loading: navigation.state === "submitting" }}
          discardAction={{ onAction: () => { setForm({ ...data }); setIsDirty(false); } }}
        />
      )}

      <BlockStack gap="500">
        {saved && (
          <Banner title="Settings saved" tone="success" onDismiss={() => setSaved(false)} />
        )}

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">Default Pre-Order Settings</Text>
            <Text variant="bodyMd" tone="subdued" as="p">
              These defaults apply to all products unless overridden per product.
            </Text>
            <FormLayout>
              <TextField
                label="Default Button Text"
                value={form.defaultButtonText}
                onChange={handleChange("defaultButtonText")}
                autoComplete="off"
                helpText="Shown on the add-to-cart button for pre-order products"
              />
              <TextField
                label="Default Badge Text"
                value={form.defaultBadgeText}
                onChange={handleChange("defaultBadgeText")}
                autoComplete="off"
                helpText="Badge shown on product images"
              />
              <TextField
                label="Default Customer Message"
                value={form.defaultMessage}
                onChange={handleChange("defaultMessage")}
                multiline={3}
                autoComplete="off"
                helpText="Shown below the pre-order button on product pages"
              />
            </FormLayout>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">Webhook Events</Text>
            <Text variant="bodyMd" tone="subdued" as="p">
              The app listens to these Shopify events automatically:
            </Text>
            {[
              "orders/create — captures new pre-orders",
              "orders/fulfilled — marks pre-orders as shipped",
              "orders/cancelled — cancels pending pre-orders",
              "products/update — syncs inventory changes",
            ].map((event) => (
              <Text key={event} variant="bodySm" as="p">✓ {event}</Text>
            ))}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
