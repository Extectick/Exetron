"use client";

import type { ModifierGroupDto, ModifierOptionDto } from "@exetron/contracts";
import { Alert, Select, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type ModifierOptionRow = ModifierOptionDto & Record<string, unknown>;

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

const optionStatuses = [
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" }
] as const;

export default function ModifierOptionsPage() {
  const { session } = useAuth();
  const [groupOptions, setGroupOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroupDto | null>(null);

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken) {
      return;
    }

    void listResource<ModifierGroupDto>("/modifier-groups", accessToken).then((response) => {
      const options = response.items.map((group) => ({
        label: `${group.code} · ${group.name}`,
        value: group.id
      }));
      setGroupOptions(options);
      setSelectedGroupId((current) => current || options[0]?.value || "");
    });
  }, [session?.accessToken]);

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken || !selectedGroupId) {
      setSelectedGroup(null);
      return;
    }

    void listResource<ModifierGroupDto>("/modifier-groups", accessToken).then((response) => {
      setSelectedGroup(response.items.find((group) => group.id === selectedGroupId) ?? null);
    });
  }, [selectedGroupId, session?.accessToken]);

  const columns = useMemo<ColumnsType<ModifierOptionRow>>(
    () => [
      { title: "Code", dataIndex: "code" },
      { title: "Name", dataIndex: "name" },
      {
        title: "Price delta",
        dataIndex: "priceDelta",
        render: (value: string) => value
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (value: ModifierOptionDto["status"]) => (
          <Tag color={value === "ACTIVE" ? "green" : "default"}>{value}</Tag>
        )
      }
    ],
    []
  );

  return (
    <CrudPage<ModifierOptionRow>
      key={selectedGroupId || "options-empty"}
      eyebrow="Catalog / Modifier Options"
      title="Modifier Options"
      description="Manage modifier options inside a selected modifier group context."
      columns={columns}
      toolbar={
        <Space direction="vertical" size={12} className="w-full">
          <Alert
            type="info"
            showIcon
            message="Pick a modifier group first. Option lists and edits are scoped to that parent."
          />
          <Space wrap>
            <Typography.Text strong>Modifier group</Typography.Text>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select group"
              value={selectedGroupId || undefined}
              options={groupOptions}
              style={{ minWidth: 360 }}
              onChange={(value) => setSelectedGroupId(value)}
            />
            <Typography.Text type="secondary">
              {selectedGroup ? `${selectedGroup.code} · ${selectedGroup.name}` : "No group selected"}
            </Typography.Text>
          </Space>
        </Space>
      }
      fields={[
        {
          name: "groupId",
          label: "Modifier group",
          type: "select",
          hidden: true,
          options: groupOptions,
          required: true as const,
          placeholder: "Choose modifier group"
        },
        { name: "code", label: "Code", required: true as const },
        { name: "name", label: "Name", required: true as const },
        { name: "priceDelta", label: "Price delta" },
        {
          name: "status",
          label: "Status",
          type: "select",
          createHidden: true,
          options: optionStatuses.map((status) => ({
            label: status.label,
            value: status.value
          })),
          required: true as const
        }
      ]}
      listItems={async () => {
        if (!session?.accessToken || !selectedGroupId) {
          return [];
        }

        const response = await listResource<ModifierOptionDto>(
          `/modifier-groups/${selectedGroupId}/options`,
          session.accessToken
        );
        return response.items as ModifierOptionRow[];
      }}
      createItem={(payload) =>
        createResource<ModifierOptionDto>(
          `/modifier-groups/${selectedGroupId}/options`,
          payload,
          session!.accessToken
        )
      }
      updateItem={(id, payload) =>
        patchResource<ModifierOptionDto>(
          `/modifier-groups/${selectedGroupId}/options`,
          id,
          payload,
          session!.accessToken
        )
      }
      getItemId={(item) => item.id}
      mapItemToFormValues={(item) => ({
        groupId: item.groupId,
        code: item.code,
        name: item.name,
        priceDelta: item.priceDelta,
        status: item.status
      })}
      normalizeCreateValues={(values) => ({
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        priceDelta: toText(values.priceDelta, "0").trim() || "0"
      })}
      normalizeUpdateValues={(values) => ({
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        priceDelta: toText(values.priceDelta, "0").trim() || "0",
        status: toText(values.status, "ACTIVE")
      })}
      extraHeaderActions={
        <Typography.Text type="secondary">
          Group context keeps modifier options attached to the selected parent group.
        </Typography.Text>
      }
    />
  );
}
