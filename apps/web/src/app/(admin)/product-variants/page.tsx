"use client";

import type { ProductDto, ProductVariantDto } from "@exetron/contracts";
import { Alert, Select, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, listResource, patchResource } from "../../../lib/api";

type ProductVariantRow = ProductVariantDto & Record<string, unknown>;

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

const variantStatuses = [
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Archived", value: "ARCHIVED" }
] as const;

const booleanOptions = [
  { label: "True", value: "true" },
  { label: "False", value: "false" }
] as const;

export default function ProductVariantsPage() {
  const { session } = useAuth();
  const [productOptions, setProductOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken) {
      return;
    }

    void listResource<ProductDto>("/products", accessToken).then((response) => {
      const options = response.items.map((product) => ({
        label: `${product.code} · ${product.name}`,
        value: product.id
      }));
      setProductOptions(options);
      setSelectedProductId((current) => current || options[0]?.value || "");
    });
  }, [session?.accessToken]);

  useEffect(() => {
    const accessToken = session?.accessToken;
    if (!accessToken || !selectedProductId) {
      setSelectedProduct(null);
      return;
    }

    void listResource<ProductDto>("/products", accessToken).then((response) => {
      setSelectedProduct(response.items.find((product) => product.id === selectedProductId) ?? null);
    });
  }, [selectedProductId, session?.accessToken]);

  const columns = useMemo<ColumnsType<ProductVariantRow>>(
    () => [
      { title: "Code", dataIndex: "code" },
      { title: "Name", dataIndex: "name" },
      { title: "SKU", dataIndex: "sku", render: (value: string | null) => value ?? "n/a" },
      {
        title: "Base price",
        dataIndex: "basePrice",
        render: (value: string | null) => value ?? "n/a"
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (value: ProductVariantDto["status"]) => (
          <Tag color={value === "ACTIVE" ? "green" : value === "INACTIVE" ? "gold" : "default"}>
            {value}
          </Tag>
        )
      }
    ],
    []
  );

  return (
    <CrudPage<ProductVariantRow>
      key={selectedProductId || "variants-empty"}
      eyebrow="Catalog / Product Variants"
      title="Product Variants"
      description="Manage variants inside a product context with parent selection instead of raw id entry."
      columns={columns}
      toolbar={
        <Space direction="vertical" size={12} className="w-full">
          <Alert
            type="info"
            showIcon
            message="Pick a product context first. Variants are loaded and saved against that product."
          />
          <Space wrap>
            <Typography.Text strong>Product context</Typography.Text>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select product"
              value={selectedProductId || undefined}
              options={productOptions}
              style={{ minWidth: 360 }}
              onChange={(value) => setSelectedProductId(value)}
            />
            <Typography.Text type="secondary">
              {selectedProduct ? `${selectedProduct.code} · ${selectedProduct.name}` : "No product selected"}
            </Typography.Text>
          </Space>
        </Space>
      }
      fields={[
        {
          name: "productId",
          label: "Product",
          type: "select",
          hidden: true,
          options: productOptions,
          required: true as const,
          placeholder: "Choose product"
        },
        { name: "code", label: "Code", required: true as const },
        { name: "name", label: "Name", required: true as const },
        { name: "sku", label: "SKU" },
        { name: "barcode", label: "Barcode" },
        { name: "basePrice", label: "Base price" },
        {
          name: "status",
          label: "Status",
          type: "select",
          createHidden: true,
          options: variantStatuses.map((status) => ({
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
          name: "availabilityWindows",
          label: "Availability windows",
          type: "json",
          placeholder: "[\n  {\n    \"weekday\": 1,\n    \"startTime\": \"08:00\",\n    \"endTime\": \"22:00\"\n  }\n]"
        }
      ]}
      listItems={async () => {
        if (!session?.accessToken || !selectedProductId) {
          return [];
        }

        const response = await listResource<ProductVariantDto>(
          `/products/${selectedProductId}/variants`,
          session.accessToken
        );
        return response.items as ProductVariantRow[];
      }}
      createItem={(payload) =>
        createResource<ProductVariantDto>(
          `/products/${selectedProductId}/variants`,
          payload,
          session!.accessToken
        )
      }
      updateItem={(id, payload) =>
        patchResource<ProductVariantDto>(
          `/products/${selectedProductId}/variants`,
          id,
          payload,
          session!.accessToken
        )
      }
      getItemId={(item) => item.id}
      mapItemToFormValues={(item) => ({
        productId: item.productId,
        code: item.code,
        name: item.name,
        sku: item.sku ?? "",
        barcode: item.barcode ?? "",
        basePrice: item.basePrice ?? "",
        status: item.status,
        isVisible: String(item.isVisible),
        isAvailable: String(item.isAvailable),
        isOutOfStock: String(item.isOutOfStock),
        availabilityWindows: JSON.stringify(item.availabilityWindows ?? [], null, 2)
      })}
      normalizeCreateValues={(values) => ({
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        sku: toText(values.sku).trim() || null,
        barcode: toText(values.barcode).trim() || null,
        basePrice: toText(values.basePrice).trim() || null,
        isVisible: toBooleanText(values.isVisible, true),
        isAvailable: toBooleanText(values.isAvailable, true),
        isOutOfStock: toBooleanText(values.isOutOfStock, false),
        availabilityWindows: parseJsonArray(values.availabilityWindows)
      })}
      normalizeUpdateValues={(values) => ({
        code: toText(values.code).trim(),
        name: toText(values.name).trim(),
        sku: toText(values.sku).trim() || null,
        barcode: toText(values.barcode).trim() || null,
        basePrice: toText(values.basePrice).trim() || null,
        status: toText(values.status, "ACTIVE"),
        isVisible: toBooleanText(values.isVisible, true),
        isAvailable: toBooleanText(values.isAvailable, true),
        isOutOfStock: toBooleanText(values.isOutOfStock, false),
        availabilityWindows: parseJsonArray(values.availabilityWindows)
      })}
      extraHeaderActions={
        <Typography.Text type="secondary">
          Parent-context flow keeps variant editing attached to the selected product.
        </Typography.Text>
      }
    />
  );
}
