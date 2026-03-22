"use client";

import type { StoreCatalogOverrideDto } from "@exetron/contracts";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type StoreCatalogOverrideRow = StoreCatalogOverrideDto & Record<string, unknown>;

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toTriState(value: unknown) {
  if (value === null || value === undefined || value === "inherit") {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return null;
}

const targetTypes = [
  { label: "Product", value: "PRODUCT" },
  { label: "Variant", value: "VARIANT" },
  { label: "Modifier option", value: "MODIFIER_OPTION" }
] as const;

const triStateOptions = [
  { label: "Inherit", value: "inherit" },
  { label: "True", value: "true" },
  { label: "False", value: "false" }
] as const;

export default function CatalogOverridesPage() {
  const { session } = useAuth();
  const sessionTenantId = session?.me?.claims.tenantId ?? "";

  const columns = useMemo<ColumnsType<StoreCatalogOverrideRow>>(
    () => [
      { title: "Store", dataIndex: "storeId" },
      { title: "Target type", dataIndex: "targetType" },
      { title: "Target ID", dataIndex: "targetId" },
      {
        title: "Visible",
        dataIndex: "isVisible",
        render: (value: boolean | null) => <Tag>{value === null ? "inherit" : String(value)}</Tag>
      },
      {
        title: "Available",
        dataIndex: "isAvailable",
        render: (value: boolean | null) => <Tag>{value === null ? "inherit" : String(value)}</Tag>
      },
      {
        title: "Out of stock",
        dataIndex: "isOutOfStock",
        render: (value: boolean | null) => <Tag>{value === null ? "inherit" : String(value)}</Tag>
      }
    ],
    []
  );

  return (
    <CrudPage<StoreCatalogOverrideRow>
      eyebrow="Catalog / Store Overrides"
      title="Catalog Overrides"
      description="Override availability, visibility, stock state, and price at store scope."
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
        { name: "storeId", label: "Store ID", required: true as const },
        {
          name: "targetType",
          label: "Target type",
          type: "select",
          options: targetTypes.map((targetType) => ({
            label: targetType.label,
            value: targetType.value
          })),
          required: true as const
        },
        { name: "targetId", label: "Target ID", required: true as const },
        {
          name: "isVisible",
          label: "Visible",
          type: "select",
          options: triStateOptions.map((option) => ({
            label: option.label,
            value: option.value
          }))
        },
        {
          name: "isAvailable",
          label: "Available",
          type: "select",
          options: triStateOptions.map((option) => ({
            label: option.label,
            value: option.value
          }))
        },
        {
          name: "isOutOfStock",
          label: "Out of stock",
          type: "select",
          options: triStateOptions.map((option) => ({
            label: option.label,
            value: option.value
          }))
        },
        { name: "priceOverride", label: "Price override" }
      ]}
      listItems={async () => {
        const response = await listResource<StoreCatalogOverrideDto>(
          "/store-catalog-overrides",
          session!.accessToken
        );
        return response.items as StoreCatalogOverrideRow[];
      }}
      createItem={(payload) =>
        createResource<StoreCatalogOverrideDto>(
          "/store-catalog-overrides",
          payload,
          session!.accessToken
        )
      }
      updateItem={(id, payload) =>
        patchResource<StoreCatalogOverrideDto>(
          "/store-catalog-overrides",
          id,
          payload,
          session!.accessToken
        )
      }
      getItemId={(item) => item.id}
      mapItemToFormValues={(item) => ({
        tenantId: item.tenantId,
        storeId: item.storeId,
        targetType: item.targetType,
        targetId: item.targetId,
        isVisible: item.isVisible === null ? "inherit" : String(item.isVisible),
        isAvailable: item.isAvailable === null ? "inherit" : String(item.isAvailable),
        isOutOfStock: item.isOutOfStock === null ? "inherit" : String(item.isOutOfStock),
        priceOverride: item.priceOverride ?? ""
      })}
      normalizeValues={(values) => ({
        tenantId: sessionTenantId || toText(values.tenantId).trim(),
        storeId: toText(values.storeId).trim(),
        targetType: toText(values.targetType, "PRODUCT"),
        targetId: toText(values.targetId).trim(),
        isVisible: toTriState(values.isVisible),
        isAvailable: toTriState(values.isAvailable),
        isOutOfStock: toTriState(values.isOutOfStock),
        priceOverride: toText(values.priceOverride).trim() || null
      })}
    />
  );
}
