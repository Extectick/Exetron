import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function CatalogOverridesPage() {
  return (
    <ResourceWorkspace
      title="Catalog Overrides"
      description="Override visibility, availability, stock and price at store level."
      endpoint="/store-catalog-overrides"
      fields={[
        { name: "tenantId", label: "Tenant ID" },
        { name: "storeId", label: "Store ID" },
        { name: "targetType", label: "Target Type" },
        { name: "targetId", label: "Target ID" },
        { name: "isVisible", label: "Visible", kind: "boolean" },
        { name: "isAvailable", label: "Available", kind: "boolean" },
        { name: "isOutOfStock", label: "Out Of Stock", kind: "boolean" },
        { name: "priceOverride", label: "Price Override" }
      ]}
      columns={["id", "storeId", "targetType", "targetId", "priceOverride"]}
      initialDraft={{
        tenantId: "",
        storeId: "",
        targetType: "PRODUCT",
        targetId: "",
        isVisible: "true",
        isAvailable: "true",
        isOutOfStock: "false",
        priceOverride: ""
      }}
    />
  );
}
