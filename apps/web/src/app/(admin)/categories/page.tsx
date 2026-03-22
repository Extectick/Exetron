"use client";

import type { CategoryDto } from "@exetron/contracts";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type CategoryRow = CategoryDto & Record<string, unknown>;

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : Number(toText(value, String(fallback)) || fallback);
}

const categoryStatuses = [
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" }
] as const;

export default function CategoriesPage() {
  const { session } = useAuth();
  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const [parentOptions, setParentOptions] = useState<Array<{ label: string; value: string }>>([]);

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken) {
      return;
    }

    void listResource<CategoryDto>("/categories", accessToken).then((response) => {
      setParentOptions(
        response.items.map((category) => ({
          label: `${category.code} · ${category.name}`,
          value: category.id
        }))
      );
    });
  }, [session?.accessToken]);

  const columns = useMemo<ColumnsType<CategoryRow>>(
    () => [
      { title: "Code", dataIndex: "code" },
      { title: "Name", dataIndex: "name" },
      {
        title: "Parent",
        dataIndex: "parentId",
        render: (value: string | null) => value ?? "Root"
      },
      { title: "Sort order", dataIndex: "sortOrder" },
      {
        title: "Status",
        dataIndex: "status",
        render: (value: CategoryDto["status"]) => (
          <Tag color={value === "ACTIVE" ? "green" : "default"}>{value}</Tag>
        )
      }
    ],
    []
  );

  return (
    <CrudPage<CategoryRow>
      eyebrow="Catalog / Categories"
      title="Categories"
      description="Manage category hierarchies, sort order, and archive state inside a tenant scope."
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
          name: "parentId",
          label: "Parent",
          type: "select",
          options: [{ label: "Root", value: "" }, ...parentOptions],
          placeholder: "Select parent category"
        },
        { name: "code", label: "Code", required: true as const },
        { name: "name", label: "Name", required: true as const },
        { name: "description", label: "Description", type: "textarea" },
        {
          name: "sortOrder",
          label: "Sort order",
          type: "number",
          required: true as const
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          createHidden: true,
          options: categoryStatuses.map((status) => ({
            label: status.label,
            value: status.value
          })),
          required: true as const
        }
      ]}
      listItems={async () => {
        const response = await listResource<CategoryDto>("/categories", session!.accessToken);
        return response.items as CategoryRow[];
      }}
      createItem={(payload) =>
        createResource<CategoryDto>("/categories", payload, session!.accessToken)
      }
      updateItem={(id, payload) =>
        patchResource<CategoryDto>("/categories", id, payload, session!.accessToken)
      }
      getItemId={(item) => item.id}
      mapItemToFormValues={(item) => ({
        tenantId: item.tenantId,
        parentId: item.parentId ?? "",
        code: item.code,
        name: item.name,
        description: item.description ?? "",
        sortOrder: item.sortOrder,
        status: item.status
      })}
      normalizeCreateValues={(values) => ({
        tenantId: sessionTenantId || toText(values.tenantId).trim(),
        parentId: toText(values.parentId).trim() || null,
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        description: toText(values.description).trim() || null,
        sortOrder: toNumber(values.sortOrder)
      })}
      normalizeUpdateValues={(values) => ({
        parentId: toText(values.parentId).trim() || null,
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        description: toText(values.description).trim() || null,
        sortOrder: toNumber(values.sortOrder),
        status: toText(values.status, "ACTIVE")
      })}
    />
  );
}
