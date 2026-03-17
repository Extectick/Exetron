import { ResourceWorkspace } from "../../../components/resource-workspace";

export default function ModifierOptionsPage() {
  return (
    <ResourceWorkspace
      title="Modifier Options"
      description="Manage options for a selected modifier group. Fill in Group ID before refresh."
      endpointTemplate="/modifier-groups/:groupId/options"
      fields={[
        { name: "groupId", label: "Group ID" },
        { name: "code", label: "Code" },
        { name: "name", label: "Name" },
        { name: "priceDelta", label: "Price Delta" }
      ]}
      columns={["id", "groupId", "code", "name", "priceDelta"]}
      initialDraft={{
        groupId: "",
        code: "",
        name: "",
        priceDelta: "0.00"
      }}
    />
  );
}
