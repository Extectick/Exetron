"use client";

import type { ModifierGroupDto } from "@exetron/contracts";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type ModifierGroupRow = ModifierGroupDto & Record<string, unknown>;

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toBooleanText(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(toText(value, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
}

const selectionModes = [
  { label: "Single", value: "SINGLE" },
  { label: "Multiple", value: "MULTIPLE" }
] as const;

const modifierStatuses = [
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" }
] as const;

export default function ModifiersPage() {
  const { session } = useAuth();
  const sessionTenantId = session?.me?.claims.tenantId ?? "";

  const columns = useMemo<ColumnsType<ModifierGroupRow>>(
    () => [
      { title: "Code", dataIndex: "code" },
      { title: "Name", dataIndex: "name" },
      { title: "Selection mode", dataIndex: "selectionMode" },
      {
        title: "Required",
        dataIndex: "required",
        render: (value: boolean) => <Tag color={value ? "green" : "default"}>{String(value)}</Tag>
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (value: ModifierGroupDto["status"]) => (
          <Tag color={value === "ACTIVE" ? "green" : "default"}>{value}</Tag>
        )
      }
    ],
    []
  );

  return (
    <CrudPage<ModifierGroupRow>
      eyebrow="Catalog / Modifier Groups"
      title="Modifier Groups"
      description="Define modifier groups and attach them to products through multi-select references."
      columns={columns}
      fields={[
        ...(!sessionTenantId
          ? [
              {
                name: "tenantId",
                label: "Tenant ID",
                required: true as const
              }
            ]
          : []),
        { name: "code", label: "Code", required: true as const },
        { name: "name", label: "Name", required: true as const },
        { name: "description", label: "Description", type: "textarea" },
        {
          name: "selectionMode",
          label: "Selection mode",
          type: "select",
          options: selectionModes.map((mode) => ({
            label: mode.label,
            value: mode.value
          })),
          required: true as const
        },
        { name: "minSelection", label: "Min selection", type: "number", required: true as const },
        { name: "maxSelection", label: "Max selection", type: "number" },
        {
          name: "required",
          label: "Required",
          type: "select",
          options: [
            { label: "True", value: "true" },
            { label: "False", value: "false" }
          ],
          required: true as const
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          createHidden: true,
          options: modifierStatuses.map((status) => ({
            label: status.label,
            value: status.value
          })),
          required: true as const
        }
      ]}
      listItems={async () => {
        const response = await listResource<ModifierGroupDto>("/modifier-groups", session!.accessToken);
        return response.items as ModifierGroupRow[];
      }}
      createItem={(payload) =>
        createResource<ModifierGroupDto>("/modifier-groups", payload, session!.accessToken)
      }
      updateItem={(id, payload) =>
        patchResource<ModifierGroupDto>("/modifier-groups", id, payload, session!.accessToken)
      }
      getItemId={(item) => item.id}
      mapItemToFormValues={(item) => ({
        tenantId: item.tenantId,
        code: item.code,
        name: item.name,
        description: item.description ?? "",
        selectionMode: item.selectionMode,
        minSelection: item.minSelection,
        maxSelection: item.maxSelection ?? "",
        required: String(item.required),
        status: item.status
      })}
      normalizeCreateValues={(values) => ({
        tenantId: sessionTenantId || toText(values.tenantId).trim(),
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        description: toText(values.description).trim() || null,
        selectionMode: toText(values.selectionMode, "SINGLE"),
        minSelection: toNumber(values.minSelection),
        maxSelection:
          values.maxSelection === "" || values.maxSelection === null || values.maxSelection === undefined
            ? null
            : toNumber(values.maxSelection),
        required: toBooleanText(values.required, false)
      })}
      normalizeUpdateValues={(values) => ({
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        description: toText(values.description).trim() || null,
        selectionMode: toText(values.selectionMode, "SINGLE"),
        minSelection: toNumber(values.minSelection),
        maxSelection:
          values.maxSelection === "" || values.maxSelection === null || values.maxSelection === undefined
            ? null
            : toNumber(values.maxSelection),
        required: toBooleanText(values.required, false),
        status: toText(values.status, "ACTIVE")
      })}
    />
  );
}
