"use client";

import type { ColumnsType } from "antd/es/table";
import type { RoleDto } from "@exetron/contracts";
import { Tag, Typography } from "antd";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type RoleRow = RoleDto & Record<string, unknown>;

function readInputText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return "";
}

function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item));
  }

  if (typeof raw !== "string" || !raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
}

export default function RolesPage() {
  const { session } = useAuth();

  if (!session?.accessToken) {
    return null;
  }

  const columns: ColumnsType<RoleRow> = [
    {
      title: "Key",
      dataIndex: "key",
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>
    },
    { title: "Name", dataIndex: "name" },
    {
      title: "Tenant",
      dataIndex: "tenantId",
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>
    },
    {
      title: "Permissions",
      dataIndex: "permissionKeys",
      render: (values: string[]) => values.slice(0, 4).map((value) => <Tag key={value}>{value}</Tag>)
    }
  ];

  return (
    <CrudPage<RoleRow>
      title="Roles"
      description="Create tenant roles and bind them to permission keys."
      eyebrow="Platform"
      columns={columns}
      fields={[
        { name: "tenantId", label: "Tenant ID", required: true, placeholder: "tenant-id" },
        { name: "key", label: "Role key", required: true, placeholder: "store-manager" },
        { name: "name", label: "Name", required: true, placeholder: "Store Manager" },
        { name: "description", label: "Description", type: "textarea" },
        {
          name: "permissionKeys",
          label: "Permission keys (JSON array)",
          type: "json",
          required: true,
          placeholder: '["catalog.product.read","catalog.product.write"]'
        }
      ]}
      listItems={async () =>
        (await listResource<RoleDto>("/roles", session.accessToken)).items as RoleRow[]
      }
      createItem={(payload) => createResource<RoleDto>("/roles", payload, session.accessToken)}
      updateItem={(id, payload) => patchResource<RoleDto>("/roles", id, payload, session.accessToken)}
      getItemId={(item) => item.id}
      normalizeValues={(values) => ({
        tenantId: readInputText(values.tenantId),
        key: readInputText(values.key),
        name: readInputText(values.name),
        description: readInputText(values.description) || null,
        permissionKeys: parseJsonArray(values.permissionKeys)
      })}
      mapItemToFormValues={(item) => ({
        ...item,
        permissionKeys: JSON.stringify(item.permissionKeys ?? [], null, 2)
      })}
    />
  );
}
