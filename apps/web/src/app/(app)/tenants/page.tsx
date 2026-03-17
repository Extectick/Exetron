import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function TenantsPage() {
  return (
    <ResourceWorkspace
      title="Tenants"
      description="Create and update SaaS tenants."
      endpoint="/tenants"
      fields={[
        { name: "slug", label: "Slug" },
        { name: "name", label: "Name" },
        { name: "status", label: "Status" }
      ]}
      columns={["id", "slug", "name", "status"]}
      initialDraft={{ slug: "", name: "", status: "ACTIVE" }}
    />
  );
}
