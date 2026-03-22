"use client";

import type { BrandDto, CategoryDto, ModifierGroupDto, ProductDto } from "@exetron/contracts";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type ProductRow = ProductDto & Record<string, unknown>;

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

function parseJsonArray(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return JSON.parse(value) as Array<Record<string, unknown>>;
}

const productStatuses = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Archived", value: "ARCHIVED" }
] as const;

const booleanOptions = [
  { label: "True", value: "true" },
  { label: "False", value: "false" }
] as const;

export default function ProductsPage() {
  const { session } = useAuth();
  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const [categoryOptions, setCategoryOptions] = useState<Array<{ label: string; value: string }>>(
    []
  );
  const [brandOptions, setBrandOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [modifierGroupOptions, setModifierGroupOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken) {
      return;
    }

    void Promise.all([
      listResource<CategoryDto>("/categories", accessToken),
      listResource<BrandDto>("/brands", accessToken),
      listResource<ModifierGroupDto>("/modifier-groups", accessToken)
    ]).then(([categories, brands, modifierGroups]) => {
      setCategoryOptions(
        categories.items.map((category) => ({
          label: `${category.code} · ${category.name}`,
          value: category.id
        }))
      );
      setBrandOptions(
        brands.items.map((brand) => ({
          label: `${brand.code} · ${brand.name}`,
          value: brand.id
        }))
      );
      setModifierGroupOptions(
        modifierGroups.items.map((group) => ({
          label: `${group.code} · ${group.name}`,
          value: group.id
        }))
      );
    });
  }, [session?.accessToken]);

  const columns = useMemo<ColumnsType<ProductRow>>(
    () => [
      { title: "Code", dataIndex: "code" },
      { title: "Name", dataIndex: "name" },
      {
        title: "Category",
        dataIndex: "categoryId",
        render: (value: string | null) => value ?? "Unassigned"
      },
      {
        title: "Brand",
        dataIndex: "brandId",
        render: (value: string | null) => value ?? "Unassigned"
      },
      {
        title: "Base price",
        dataIndex: "basePrice",
        render: (value: string | null) => value ?? "n/a"
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (value: ProductDto["status"]) => (
          <Tag color={value === "ACTIVE" ? "green" : value === "INACTIVE" ? "gold" : "default"}>
            {value}
          </Tag>
        )
      }
    ],
    []
  );

  return (
    <CrudPage<ProductRow>
      eyebrow="Catalog / Products"
      title="Products"
      description="Manage catalog products with category, brand, modifier and availability context."
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
        {
          name: "categoryId",
          label: "Category",
          type: "select",
          options: [{ label: "Unassigned", value: "" }, ...categoryOptions],
          placeholder: "Choose a category"
        },
        {
          name: "brandId",
          label: "Brand",
          type: "select",
          options: [{ label: "Unassigned", value: "" }, ...brandOptions],
          placeholder: "Choose a brand"
        },
        { name: "code", label: "Code", required: true as const },
        { name: "name", label: "Name", required: true as const },
        { name: "description", label: "Description", type: "textarea" },
        { name: "basePrice", label: "Base price" },
        {
          name: "status",
          label: "Status",
          type: "select",
          createHidden: true,
          options: productStatuses.map((status) => ({
            label: status.label,
            value: status.value
          })),
          required: true as const
        },
        {
          name: "isVisible",
          label: "Visible",
          type: "select",
          options: booleanOptions.map((option) => ({
            label: option.label,
            value: option.value
          })),
          required: true as const
        },
        {
          name: "isAvailable",
          label: "Available",
          type: "select",
          options: booleanOptions.map((option) => ({
            label: option.label,
            value: option.value
          })),
          required: true as const
        },
        {
          name: "isOutOfStock",
          label: "Out of stock",
          type: "select",
          options: booleanOptions.map((option) => ({
            label: option.label,
            value: option.value
          })),
          required: true as const
        },
        {
          name: "modifierGroupIds",
          label: "Modifier groups",
          type: "multiselect",
          options: modifierGroupOptions,
          placeholder: "Attach modifier groups"
        },
        {
          name: "availabilityWindows",
          label: "Availability windows",
          type: "json",
          placeholder: "[\n  {\n    \"weekday\": 1,\n    \"startTime\": \"08:00\",\n    \"endTime\": \"22:00\"\n  }\n]"
        }
      ]}
      listItems={async () => {
        const response = await listResource<ProductDto>("/products", session!.accessToken);
        return response.items as ProductRow[];
      }}
      createItem={(payload) =>
        createResource<ProductDto>("/products", payload, session!.accessToken)
      }
      updateItem={(id, payload) =>
        patchResource<ProductDto>("/products", id, payload, session!.accessToken)
      }
      getItemId={(item) => item.id}
      mapItemToFormValues={(item) => ({
        tenantId: item.tenantId,
        categoryId: item.categoryId ?? "",
        brandId: item.brandId ?? "",
        code: item.code,
        name: item.name,
        description: item.description ?? "",
        basePrice: item.basePrice ?? "",
        status: item.status,
        isVisible: String(item.isVisible),
        isAvailable: String(item.isAvailable),
        isOutOfStock: String(item.isOutOfStock),
        modifierGroupIds: item.modifierGroupIds,
        availabilityWindows: JSON.stringify(item.availabilityWindows ?? [], null, 2)
      })}
      normalizeCreateValues={(values) => ({
        tenantId: sessionTenantId || toText(values.tenantId).trim(),
        categoryId: toText(values.categoryId).trim() || null,
        brandId: toText(values.brandId).trim() || null,
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        description: toText(values.description).trim() || null,
        basePrice: toText(values.basePrice).trim() || null,
        isVisible: toBooleanText(values.isVisible, true),
        isAvailable: toBooleanText(values.isAvailable, true),
        isOutOfStock: toBooleanText(values.isOutOfStock, false),
        modifierGroupIds: Array.isArray(values.modifierGroupIds) ? values.modifierGroupIds : [],
        availabilityWindows: parseJsonArray(values.availabilityWindows)
      })}
      normalizeUpdateValues={(values) => ({
        categoryId: toText(values.categoryId).trim() || null,
        brandId: toText(values.brandId).trim() || null,
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        description: toText(values.description).trim() || null,
        basePrice: toText(values.basePrice).trim() || null,
        status: toText(values.status, "ACTIVE"),
        isVisible: toBooleanText(values.isVisible, true),
        isAvailable: toBooleanText(values.isAvailable, true),
        isOutOfStock: toBooleanText(values.isOutOfStock, false),
        modifierGroupIds: Array.isArray(values.modifierGroupIds) ? values.modifierGroupIds : [],
        availabilityWindows: parseJsonArray(values.availabilityWindows)
      })}
    />
  );
}
