import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function DevicesPage() {
  return (
    <ResourceWorkspace
      title="Devices"
      description="Register POS, kiosk, kitchen and board devices against stores."
      endpoint="/devices"
      fields={[
        { name: "tenantId", label: "Tenant ID" },
        { name: "storeId", label: "Store ID" },
        { name: "code", label: "Device Code" },
        { name: "name", label: "Name" },
        { name: "type", label: "Type" },
        { name: "status", label: "Status" }
      ]}
      columns={["id", "tenantId", "storeId", "code", "type", "status"]}
      initialDraft={{
        tenantId: "",
        storeId: "",
        code: "",
        name: "",
        type: "POS",
        status: "ACTIVE"
      }}
    />
  );
}
