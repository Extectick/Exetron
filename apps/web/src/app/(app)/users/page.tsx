import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function UsersPage() {
  return (
    <ResourceWorkspace
      title="Users"
      description="Provision staff identities, passwords, store access and role bindings."
      endpoint="/users"
      fields={[
        { name: "tenantId", label: "Tenant ID" },
        { name: "email", label: "Email" },
        { name: "firstName", label: "First Name" },
        { name: "lastName", label: "Last Name" },
        { name: "password", label: "Password" },
        { name: "status", label: "Status" },
        { name: "isPlatformAdmin", label: "Platform Admin", kind: "boolean" },
        { name: "roleIds", label: "Role IDs", kind: "list" },
        { name: "storeIds", label: "Store IDs", kind: "list" }
      ]}
      columns={["id", "email", "tenantId", "status", "roleIds", "storeIds"]}
      initialDraft={{
        tenantId: "",
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        status: "ACTIVE",
        isPlatformAdmin: "false",
        roleIds: "",
        storeIds: ""
      }}
    />
  );
}
