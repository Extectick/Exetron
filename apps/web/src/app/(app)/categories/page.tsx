import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function CategoriesPage() {
  return (
    <ResourceWorkspace
      title="Categories"
      description="Manage tenant catalog categories."
      endpoint="/categories"
      fields={[
        { name: "tenantId", label: "Tenant ID" },
        { name: "parentId", label: "Parent ID" },
        { name: "code", label: "Code" },
        { name: "name", label: "Name" },
        { name: "description", label: "Description", kind: "textarea" },
        { name: "sortOrder", label: "Sort Order", kind: "number" }
      ]}
      columns={["id", "tenantId", "code", "name", "sortOrder"]}
      initialDraft={{
        tenantId: "",
        parentId: "",
        code: "",
        name: "",
        description: "",
        sortOrder: "0"
      }}
    />
  );
}
