import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function PriceListsPage() {
  return (
    <ResourceWorkspace
      title="Price Lists"
      description="Maintain catalog price lists and bulk item assignments."
      endpoint="/price-lists"
      fields={[
        { name: "tenantId", label: "Tenant ID" },
        { name: "code", label: "Code" },
        { name: "name", label: "Name" },
        { name: "currency", label: "Currency" },
        { name: "items", label: "Items JSON", kind: "json" }
      ]}
      columns={["id", "tenantId", "code", "name", "currency"]}
      initialDraft={{
        tenantId: "",
        code: "",
        name: "",
        currency: "RUB",
        items: "[]"
      }}
    />
  );
}
