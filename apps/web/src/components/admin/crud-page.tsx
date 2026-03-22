"use client";

import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";

type SelectOption = {
  label: string;
  value: string;
};

type CrudFieldBase = {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  hidden?: boolean;
  createHidden?: boolean;
  editHidden?: boolean;
  disabled?: boolean;
};

type CrudField =
  | (CrudFieldBase & {
      type?: "text" | "textarea" | "password";
    })
  | (CrudFieldBase & {
      type: "number";
    })
  | (CrudFieldBase & {
      type: "boolean";
    })
  | (CrudFieldBase & {
      type: "json";
    })
  | (CrudFieldBase & {
      type: "select" | "multiselect";
      options: SelectOption[];
    });

interface CrudPageProps<TItem extends Record<string, unknown>> {
  title: string;
  description: string;
  eyebrow?: string;
  columns: ColumnsType<TItem>;
  fields: CrudField[];
  rowKey?: keyof TItem | ((record: TItem) => React.Key);
  listItems: () => Promise<TItem[]>;
  createItem: (payload: Record<string, unknown>) => Promise<unknown>;
  updateItem: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  getItemId: (item: TItem) => string;
  mapItemToFormValues?: (item: TItem) => Record<string, unknown>;
  normalizeValues?: (values: Record<string, unknown>) => Record<string, unknown>;
  normalizeCreateValues?: (values: Record<string, unknown>) => Record<string, unknown>;
  normalizeUpdateValues?: (values: Record<string, unknown>) => Record<string, unknown>;
  toolbar?: React.ReactNode;
  sideContent?: React.ReactNode;
  extraHeaderActions?: React.ReactNode;
}

function normalizeJsonValue(rawValue: string) {
  if (!rawValue.trim()) {
    return null;
  }

  return JSON.parse(rawValue) as unknown;
}

function toFormValues(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      value as object | string | number | boolean | bigint | symbol | undefined
    ])
  );
}

export function CrudPage<TItem extends Record<string, unknown>>({
  title,
  description,
  eyebrow = "Resource",
  columns,
  fields,
  rowKey,
  listItems,
  createItem,
  updateItem,
  getItemId,
  mapItemToFormValues,
  normalizeValues,
  normalizeCreateValues,
  normalizeUpdateValues,
  toolbar,
  sideContent,
  extraHeaderActions
}: CrudPageProps<TItem>) {
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TItem | null>(null);
  const [form] = Form.useForm<Record<string, unknown>>();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextItems = await listItems();
      setItems(nextItems);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [listItems]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mergedColumns = useMemo<ColumnsType<TItem>>(
    () => [
      ...columns,
      {
        key: "__actions",
        title: "",
        width: 120,
        render: (_, record) => (
          <Button
            onClick={() => {
              setEditing(record);
              form.setFieldsValue(
                mapItemToFormValues ? toFormValues(mapItemToFormValues(record)) : toFormValues(record)
              );
              setOpen(true);
            }}
          >
            Edit
          </Button>
        )
      }
    ],
    [columns, form, mapItemToFormValues]
  );

  const visibleFields = useMemo(
    () =>
      fields.filter((field) => {
        if (field.hidden) {
          return false;
        }

        if (editing && field.editHidden) {
          return false;
        }

        if (!editing && field.createHidden) {
          return false;
        }

        return true;
      }),
    [editing, fields]
  );

  async function handleSubmit(values: Record<string, unknown>) {
    setSubmitting(true);

    try {
      if (editing) {
        const normalized = normalizeUpdateValues
          ? normalizeUpdateValues(values)
          : normalizeValues
            ? normalizeValues(values)
            : values;
        await updateItem(getItemId(editing), normalized);
      } else {
        const normalized = normalizeCreateValues
          ? normalizeCreateValues(values)
          : normalizeValues
            ? normalizeValues(values)
            : values;
        await createItem(normalized);
      }

      setOpen(false);
      setEditing(null);
      form.resetFields();
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to save data.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack-layout">
      <Card className="ex-panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <Space>
            {extraHeaderActions}
            <Button onClick={() => void refresh()} loading={loading}>
              Refresh
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                form.resetFields();
                setOpen(true);
              }}
            >
              Create
            </Button>
          </Space>
        </div>

        {toolbar}
        {error ? <Alert type="error" message={error} showIcon className="mb-4" /> : null}

        <Table
          rowKey={rowKey ?? ((record) => getItemId(record))}
          columns={mergedColumns}
          dataSource={items}
          loading={loading}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 920 }}
        />
      </Card>

      {sideContent ? <Card className="ex-panel-card">{sideContent}</Card> : null}

      <Modal
        title={editing ? `Edit ${title}` : `Create ${title}`}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => void form.submit()}
        okButtonProps={{ loading: submitting }}
        okText={editing ? "Save" : "Create"}
        width={720}
        destroyOnClose
      >
        <Form<Record<string, unknown>>
          form={form}
          layout="vertical"
          onFinish={(values) => {
            void handleSubmit(values);
          }}
        >
          {visibleFields.map((field) => {
            if (field.type === "boolean") {
              return (
                <Form.Item
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  valuePropName="checked"
                >
                  <Switch disabled={field.disabled} />
                </Form.Item>
              );
            }

            if (field.type === "number") {
              return (
                <Form.Item
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  rules={field.required ? [{ required: true, message: `${field.label} is required` }] : undefined}
                >
                  <InputNumber
                    className="w-full"
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                  />
                </Form.Item>
              );
            }

            if (field.type === "json") {
              return (
                <Form.Item
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  rules={[
                    ...(field.required ? [{ required: true, message: `${field.label} is required` }] : []),
                    {
                      validator: (_, value) => {
                        if (!value) {
                          return Promise.resolve();
                        }

                        try {
                          normalizeJsonValue(String(value));
                          return Promise.resolve();
                        } catch (error) {
                          return Promise.reject(
                            error instanceof Error
                              ? error
                              : new Error("Invalid JSON payload.")
                          );
                        }
                      }
                    }
                  ]}
                >
                  <Input.TextArea rows={8} placeholder={field.placeholder} disabled={field.disabled} />
                </Form.Item>
              );
            }

            if (field.type === "select" || field.type === "multiselect") {
              return (
                <Form.Item
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  rules={field.required ? [{ required: true, message: `${field.label} is required` }] : undefined}
                >
                  <Select
                    mode={field.type === "multiselect" ? "multiple" : undefined}
                    options={field.options}
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                  />
                </Form.Item>
              );
            }

            return (
              <Form.Item
                key={field.name}
                label={field.label}
                name={field.name}
                rules={field.required ? [{ required: true, message: `${field.label} is required` }] : undefined}
              >
                {field.type === "textarea" ? (
                  <Input.TextArea rows={5} placeholder={field.placeholder} disabled={field.disabled} />
                ) : (
                  <Input
                    type={field.type === "password" ? "password" : "text"}
                    placeholder={field.placeholder}
                    disabled={field.disabled}
                  />
                )}
              </Form.Item>
            );
          })}
        </Form>
      </Modal>
    </div>
  );
}

export function JsonTag({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <Tag>n/a</Tag>;
  }

  if (typeof value === "boolean") {
    return <Tag color={value ? "green" : "default"}>{value ? "true" : "false"}</Tag>;
  }

  if (Array.isArray(value)) {
    return <Tag>{value.map((item) => String(item)).join(", ")}</Tag>;
  }

  if (typeof value === "object") {
    return (
      <Typography.Text code ellipsis style={{ maxWidth: 280 }}>
        {JSON.stringify(value)}
      </Typography.Text>
    );
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return <span>{value.toString()}</span>;
  }

  if (typeof value === "symbol") {
    return <span>{value.description ?? "symbol"}</span>;
  }

  return <Tag>n/a</Tag>;
}
