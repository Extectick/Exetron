import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function ProductVariantsPage() {
  return (
    <ResourceWorkspace
      title="Product Variants"
      description="Manage variants for a selected product. Fill in Product ID before refresh."
      endpointTemplate="/products/:productId/variants"
      fields={[
        { name: "productId", label: "Product ID" },
        { name: "code", label: "Code" },
        { name: "name", label: "Name" },
        { name: "sku", label: "SKU" },
        { name: "barcode", label: "Barcode" },
        { name: "basePrice", label: "Base Price" },
        { name: "isVisible", label: "Visible", kind: "boolean" },
        { name: "isAvailable", label: "Available", kind: "boolean" },
        { name: "isOutOfStock", label: "Out Of Stock", kind: "boolean" },
        { name: "availabilityWindows", label: "Availability Windows", kind: "json" }
      ]}
      columns={["id", "productId", "code", "name", "sku", "basePrice"]}
      initialDraft={{
        productId: "",
        code: "",
        name: "",
        sku: "",
        barcode: "",
        basePrice: "",
        isVisible: "true",
        isAvailable: "true",
        isOutOfStock: "false",
        availabilityWindows: "[]"
      }}
    />
  );
}
