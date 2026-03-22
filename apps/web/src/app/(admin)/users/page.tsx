"use client";

import type { ColumnsType } from "antd/es/table";
import type { UserDto } from "@exetron/contracts";
import { Tag, Typography } from "antd";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type UserRow = UserDto & Record<string, unknown>;

function readInputText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return "";
}

const userStatusColor: Record<UserDto["status"], string> = {
  ACTIVE: "green",
  INVITED: "blue",
  DISABLED: "default"
};

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

export default function UsersPage() {
  const { session } = useAuth();

  if (!session?.accessToken) {
    return null;
  }

  const columns: ColumnsType<UserRow> = [
    {
      title: "Email",
      dataIndex: "email",
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>
    },
    { title: "Name", render: (_, record) => `${record.firstName} ${record.lastName}` },
    {
      title: "Tenant",
      dataIndex: "tenantId",
      render: (value: string | null) => (value ? <Typography.Text code>{value}</Typography.Text> : "n/a")
    },
    {
      title: "Platform",
      dataIndex: "isPlatformAdmin",
      render: (value: boolean) => <Tag color={value ? "green" : "default"}>{value ? "yes" : "no"}</Tag>
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (value: UserDto["status"]) => <Tag color={userStatusColor[value]}>{value}</Tag>
    },
    {
      title: "Roles",
      dataIndex: "roleIds",
      render: (values: string[]) => values.map((value) => <Tag key={value}>{value}</Tag>)
    }
  ];

  return (
    <CrudPage<UserRow>
      title="Users"
      description="Provision staff identities, platform admins and scoped store access."
      eyebrow="Platform"
      columns={columns}
      fields={[
        { name: "tenantId", label: "Tenant ID", placeholder: "Optional for platform admin" },
        { name: "email", label: "Email", required: true, placeholder: "operator@exetron.io" },
        { name: "firstName", label: "First name", required: true },
        { name: "lastName", label: "Last name", required: true },
        { name: "password", label: "Password", type: "password", placeholder: "Use a strong password" },
        { name: "isPlatformAdmin", label: "Platform admin", type: "boolean" },
        {
          name: "roleIds",
          label: "Role IDs (JSON array)",
          type: "json",
          placeholder: '["role-id-1","role-id-2"]'
        },
        {
          name: "storeIds",
          label: "Store IDs (JSON array)",
          type: "json",
          placeholder: '["store-id-1","store-id-2"]'
        }
      ]}
      listItems={async () =>
        (await listResource<UserDto>("/users", session.accessToken)).items as UserRow[]
      }
      createItem={(payload) => createResource<UserDto>("/users", payload, session.accessToken)}
      updateItem={(id, payload) => patchResource<UserDto>("/users", id, payload, session.accessToken)}
      getItemId={(item) => item.id}
      mapItemToFormValues={(item) => ({
        ...item,
        tenantId: item.tenantId ?? "",
        password: "",
        roleIds: JSON.stringify(item.roleIds ?? [], null, 2),
        storeIds: JSON.stringify(item.storeIds ?? [], null, 2)
      })}
      normalizeValues={(values) => {
        const password = readInputText(values.password);

        return {
          tenantId: readInputText(values.tenantId) || null,
          email: readInputText(values.email),
          firstName: readInputText(values.firstName),
          lastName: readInputText(values.lastName),
          ...(password ? { password } : {}),
          isPlatformAdmin: Boolean(values.isPlatformAdmin),
          roleIds: parseJsonArray(values.roleIds),
          storeIds: parseJsonArray(values.storeIds)
        };
      }}
    />
  );
}
