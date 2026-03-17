import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function StoresPage() {
  return (
    <ResourceWorkspace
      title="Stores"
      description="Define store topology, brand linkage and timezone."
      endpoint="/stores"
      fields={[
        { name: "tenantId", label: "Tenant ID" },
        { name: "brandId", label: "Brand ID" },
        { name: "code", label: "Code" },
        { name: "name", label: "Name" },
        { name: "timezone", label: "Timezone" },
        { name: "status", label: "Status" }
      ]}
      columns={["id", "tenantId", "code", "name", "timezone", "status"]}
      initialDraft={{
        tenantId: "",
        brandId: "",
        code: "",
        name: "",
        timezone: "Asia/Novosibirsk",
        status: "ACTIVE"
      }}
    />
  );
}
