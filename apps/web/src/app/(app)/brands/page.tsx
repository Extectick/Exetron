import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function BrandsPage() {
  return (
    <ResourceWorkspace
      title="Brands"
      description="Manage brand identity inside a tenant."
      endpoint="/brands"
      fields={[
        { name: "tenantId", label: "Tenant ID" },
        { name: "code", label: "Code" },
        { name: "name", label: "Name" },
        { name: "status", label: "Status" }
      ]}
      columns={["id", "tenantId", "code", "name", "status"]}
      initialDraft={{ tenantId: "", code: "", name: "", status: "ACTIVE" }}
    />
  );
}
