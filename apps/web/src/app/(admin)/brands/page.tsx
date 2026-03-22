"use client";

import type { BrandDto } from "@exetron/contracts";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { CrudPage, JsonTag } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type BrandRow = BrandDto & Record<string, unknown>;

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

const brandStatuses = [
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" }
] as const;

export default function BrandsPage() {
  const { session } = useAuth();
  const sessionTenantId = session?.me?.claims.tenantId ?? "";

  const columns = useMemo<ColumnsType<BrandRow>>(
    () => [
      { title: "Code", dataIndex: "code" },
      { title: "Name", dataIndex: "name" },
      {
        title: "Tenant",
        dataIndex: "tenantId",
        render: (value: string) => <JsonTag value={value} />
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (value: BrandDto["status"]) => (
          <Tag color={value === "ACTIVE" ? "green" : "default"}>{value}</Tag>
        )
      }
    ],
    []
  );

  return (
    <CrudPage<BrandRow>
      eyebrow="Catalog / Brands"
      title="Brands"
      description="Maintain tenant brand records used across catalog, stores, and pricing workspaces."
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
        {
          name: "status",
          label: "Status",
          type: "select",
          createHidden: true,
          options: brandStatuses.map((status) => ({
            label: status.label,
            value: status.value
          })),
          required: true as const
        }
      ]}
      listItems={async () => {
        const response = await listResource<BrandDto>("/brands", session!.accessToken);
        return response.items as BrandRow[];
      }}
      createItem={(payload) =>
        createResource<BrandDto>("/brands", payload, session!.accessToken)
      }
      updateItem={(id, payload) =>
        patchResource<BrandDto>("/brands", id, payload, session!.accessToken)
      }
      getItemId={(item) => item.id}
      mapItemToFormValues={(item) => ({
        tenantId: item.tenantId,
        code: item.code,
        name: item.name,
        status: item.status
      })}
      normalizeCreateValues={(values) => ({
        tenantId: sessionTenantId || toText(values.tenantId).trim(),
        code: toText(values.code).trim(),
        name: toText(values.name).trim()
      })}
      normalizeUpdateValues={(values) => ({
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        status: toText(values.status, "ACTIVE")
      })}
    />
  );
}
