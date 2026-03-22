"use client";

import type { ColumnsType } from "antd/es/table";
import type { StoreDto } from "@exetron/contracts";
import { Tag, Typography } from "antd";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type StoreRow = StoreDto & Record<string, unknown>;

function readInputText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return "";
}

const storeStatusColor: Record<StoreDto["status"], string> = {
  ACTIVE: "green",
  INACTIVE: "gold",
  ARCHIVED: "default"
};

export default function StoresPage() {
  const { session } = useAuth();

  if (!session?.accessToken) {
    return null;
  }

  const columns: ColumnsType<StoreRow> = [
    {
      title: "Tenant",
      dataIndex: "tenantId",
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>
    },
    {
      title: "Brand",
      dataIndex: "brandId",
      render: (value: string | null) => (value ? <Typography.Text code>{value}</Typography.Text> : "n/a")
    },
    {
      title: "Code",
      dataIndex: "code",
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>
    },
    { title: "Name", dataIndex: "name" },
    { title: "Timezone", dataIndex: "timezone" },
    {
      title: "Status",
      dataIndex: "status",
      render: (value: StoreDto["status"]) => <Tag color={storeStatusColor[value]}>{value}</Tag>
    }
  ];

  return (
    <CrudPage<StoreRow>
      title="Stores"
      description="Manage store topology, timezones and brand links under each tenant."
      eyebrow="Platform"
      columns={columns}
      fields={[
        { name: "tenantId", label: "Tenant ID", required: true, placeholder: "tenant-id" },
        { name: "brandId", label: "Brand ID", placeholder: "Optional brand id" },
        { name: "code", label: "Code", required: true, placeholder: "main-store" },
        { name: "name", label: "Name", required: true, placeholder: "Main Store" },
        {
          name: "timezone",
          label: "Timezone",
          required: true,
          placeholder: "Asia/Novosibirsk"
        }
      ]}
      listItems={async () =>
        (await listResource<StoreDto>("/stores", session.accessToken)).items as StoreRow[]
      }
      createItem={(payload) => createResource<StoreDto>("/stores", payload, session.accessToken)}
      updateItem={(id, payload) => patchResource<StoreDto>("/stores", id, payload, session.accessToken)}
      getItemId={(item) => item.id}
      normalizeValues={(values) => ({
        tenantId: readInputText(values.tenantId),
        brandId: readInputText(values.brandId) ? readInputText(values.brandId) : null,
        code: readInputText(values.code),
        name: readInputText(values.name),
        timezone: readInputText(values.timezone)
      })}
    />
  );
}
