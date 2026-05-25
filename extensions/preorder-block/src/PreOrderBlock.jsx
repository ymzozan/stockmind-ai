import {
  reactExtension,
  useSettings,
  Banner,
  Text,
  BlockStack,
} from "@shopify/ui-extensions-react/checkout";

export default reactExtension(
  "purchase.product-details.render-before",
  () => <PreOrderBlock />
);

function PreOrderBlock() {
  const { badge_text, message, show_badge } = useSettings();

  if (!message) return null;

  return (
    <BlockStack spacing="base">
      <Banner status="info">
        <Text>{message || "This item is available for pre-order. Ships in 2-3 weeks."}</Text>
      </Banner>
    </BlockStack>
  );
}
