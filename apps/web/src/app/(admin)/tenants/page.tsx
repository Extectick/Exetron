"use client";

import type { ColumnsType } from "antd/es/table";
import type { TenantDto } from "@exetron/contracts";
import { Tag, Typography } from "antd";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type TenantRow = TenantDto & Record<string, unknown>;

function readInputText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return "";
}

const tenantStatusColor: Record<TenantDto["status"], string> = {
  ACTIVE: "green",
  SUSPENDED: "gold",
  ARCHIVED: "default"
};

export default function TenantsPage() {
  const { session } = useAuth();

  if (!session?.accessToken) {
    return null;
  }

  const columns: ColumnsType<TenantRow> = [
    {
      title: "Slug",
      dataIndex: "slug",
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>
    },
    { title: "Name", dataIndex: "name" },
    {
      title: "Status",
      dataIndex: "status",
      render: (value: TenantDto["status"]) => <Tag color={tenantStatusColor[value]}>{value}</Tag>
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      render: (value: string) => new Date(value).toLocaleString()
    }
  ];

  return (
    <CrudPage<TenantRow>
      title="Tenants"
      description="Create and update platform tenants that own stores, users, roles and devices."
      eyebrow="Platform"
      columns={columns}
      fields={[
        { name: "slug", label: "Slug", required: true, placeholder: "acme" },
        { name: "name", label: "Name", required: true, placeholder: "Acme Group" }
      ]}
      listItems={async () =>
        (await listResource<TenantDto>("/tenants", session.accessToken)).items as TenantRow[]
      }
      createItem={(payload) => createResource<TenantDto>("/tenants", payload, session.accessToken)}
      updateItem={(id, payload) => patchResource<TenantDto>("/tenants", id, payload, session.accessToken)}
      getItemId={(item) => item.id}
      normalizeValues={(values) => ({
        slug: readInputText(values.slug),
        name: readInputText(values.name)
      })}
    />
  );
}
