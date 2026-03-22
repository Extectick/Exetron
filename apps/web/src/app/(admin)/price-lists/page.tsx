"use client";

import type { PriceListDto } from "@exetron/contracts";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type PriceListRow = PriceListDto & Record<string, unknown>;

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function parseJsonArray(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return JSON.parse(value) as Array<Record<string, unknown>>;
}

const priceListStatuses = [
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" }
] as const;

export default function PriceListsPage() {
  const { session } = useAuth();
  const sessionTenantId = session?.me?.claims.tenantId ?? "";

  const columns = useMemo<ColumnsType<PriceListRow>>(
    () => [
      { title: "Code", dataIndex: "code" },
      { title: "Name", dataIndex: "name" },
      { title: "Currency", dataIndex: "currency" },
      {
        title: "Items",
        dataIndex: "items",
        render: (value: PriceListDto["items"]) => <Tag>{value.length}</Tag>
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (value: PriceListDto["status"]) => (
          <Tag color={value === "ACTIVE" ? "green" : "default"}>{value}</Tag>
        )
      }
    ],
    []
  );

  return (
    <CrudPage<PriceListRow>
      eyebrow="Catalog / Price Lists"
      title="Price Lists"
      description="Maintain tenant price lists and the raw item assignment payload used by pricing flows."
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
        { name: "currency", label: "Currency", required: true as const, placeholder: "RUB" },
        {
          name: "status",
          label: "Status",
          type: "select",
          createHidden: true,
          options: priceListStatuses.map((status) => ({
            label: status.label,
            value: status.value
          })),
          required: true as const
        },
        {
          name: "items",
          label: "Items JSON",
          type: "json",
          placeholder: "[\n  {\n    \"targetType\": \"PRODUCT\",\n    \"targetId\": \"...\",\n    \"price\": \"199.00\"\n  }\n]"
        }
      ]}
      listItems={async () => {
        const response = await listResource<PriceListDto>("/price-lists", session!.accessToken);
        return response.items as PriceListRow[];
      }}
      createItem={(payload) =>
        createResource<PriceListDto>("/price-lists", payload, session!.accessToken)
      }
      updateItem={(id, payload) =>
        patchResource<PriceListDto>("/price-lists", id, payload, session!.accessToken)
      }
      getItemId={(item) => item.id}
      mapItemToFormValues={(item) => ({
        tenantId: item.tenantId,
        code: item.code,
        name: item.name,
        currency: item.currency,
        status: item.status,
        items: JSON.stringify(item.items ?? [], null, 2)
      })}
      normalizeCreateValues={(values) => ({
        tenantId: sessionTenantId || toText(values.tenantId).trim(),
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        currency: toText(values.currency, "RUB").trim(),
        items: parseJsonArray(values.items)
      })}
      normalizeUpdateValues={(values) => ({
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        currency: toText(values.currency, "RUB").trim(),
        status: toText(values.status, "ACTIVE"),
        items: parseJsonArray(values.items)
      })}
    />
  );
}
