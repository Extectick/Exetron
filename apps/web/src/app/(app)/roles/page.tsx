import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function RolesPage() {
  return (
    <ResourceWorkspace
      title="Roles"
      description="Create tenant roles and bind permission keys."
      endpoint="/roles"
      fields={[
        { name: "tenantId", label: "Tenant ID" },
        { name: "key", label: "Role Key" },
        { name: "name", label: "Name" },
        { name: "description", label: "Description" },
        { name: "permissionKeys", label: "Permission Keys", kind: "list" }
      ]}
      columns={["id", "tenantId", "key", "name", "permissionKeys"]}
      initialDraft={{
        tenantId: "",
        key: "",
        name: "",
        description: "",
        permissionKeys: ""
      }}
    />
  );
}
