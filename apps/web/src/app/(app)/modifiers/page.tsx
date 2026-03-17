import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function ModifiersPage() {
  return (
    <ResourceWorkspace
      title="Modifier Groups"
      description="Define tenant modifier groups before attaching options."
      endpoint="/modifier-groups"
      fields={[
        { name: "tenantId", label: "Tenant ID" },
        { name: "code", label: "Code" },
        { name: "name", label: "Name" },
        { name: "description", label: "Description", kind: "textarea" },
        { name: "selectionMode", label: "Selection Mode" },
        { name: "minSelection", label: "Min Selection", kind: "number" },
        { name: "maxSelection", label: "Max Selection", kind: "number" },
        { name: "required", label: "Required", kind: "boolean" }
      ]}
      columns={["id", "code", "name", "selectionMode", "required"]}
      initialDraft={{
        tenantId: "",
        code: "",
        name: "",
        description: "",
        selectionMode: "SINGLE",
        minSelection: "0",
        maxSelection: "",
        required: "false"
      }}
    />
  );
}
