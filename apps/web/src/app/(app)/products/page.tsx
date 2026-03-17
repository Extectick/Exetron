import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function ProductsPage() {
  return (
    <ResourceWorkspace
      title="Products"
      description="Create tenant products with modifier links and availability windows."
      endpoint="/products"
      fields={[
        { name: "tenantId", label: "Tenant ID" },
        { name: "categoryId", label: "Category ID" },
        { name: "brandId", label: "Brand ID" },
        { name: "code", label: "Code" },
        { name: "name", label: "Name" },
        { name: "description", label: "Description", kind: "textarea" },
        { name: "basePrice", label: "Base Price" },
        { name: "isVisible", label: "Visible", kind: "boolean" },
        { name: "isAvailable", label: "Available", kind: "boolean" },
        { name: "isOutOfStock", label: "Out Of Stock", kind: "boolean" },
        { name: "modifierGroupIds", label: "Modifier Group IDs", kind: "list" },
        { name: "availabilityWindows", label: "Availability Windows", kind: "json" }
      ]}
      columns={["id", "code", "name", "basePrice", "categoryId"]}
      initialDraft={{
        tenantId: "",
        categoryId: "",
        brandId: "",
        code: "",
        name: "",
        description: "",
        basePrice: "",
        isVisible: "true",
        isAvailable: "true",
        isOutOfStock: "false",
        modifierGroupIds: "",
        availabilityWindows: "[]"
      }}
    />
  );
}
