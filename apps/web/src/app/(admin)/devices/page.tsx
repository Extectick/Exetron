"use client";

import type { ColumnsType } from "antd/es/table";
import type { DeviceDto, KioskAccessTokenDto } from "@exetron/contracts";
import { Button, Card, Space, Tag, Typography, notification } from "antd";
import { useMemo, useState } from "react";
import { CrudPage } from "../../../components/admin/crud-page";
import { useAuth } from "../../../components/auth-provider";
import { createResource, issueKioskAccessToken, listResource, patchResource } from "../../../lib/api";

type DeviceRow = DeviceDto & Record<string, unknown>;

function readInputText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return "";
}

const deviceKindOptions = ["POS", "KIOSK", "KITCHEN", "BOARD", "BACKOFFICE"].map((value) => ({
  label: value,
  value
}));

const deviceStatusColor: Record<DeviceDto["status"], string> = {
  PENDING: "blue",
  ACTIVE: "green",
  SUSPENDED: "gold",
  RETIRED: "default"
};

export default function DevicesPage() {
  const { session } = useAuth();
  const [lastToken, setLastToken] = useState<KioskAccessTokenDto | null>(null);
  const [issuingDeviceId, setIssuingDeviceId] = useState<string | null>(null);
  const accessToken = session?.accessToken ?? "";

  const columns: ColumnsType<DeviceRow> = useMemo(
    () => [
      {
        title: "Tenant",
        dataIndex: "tenantId",
        render: (value: string) => <Typography.Text code>{value}</Typography.Text>
      },
      {
        title: "Store",
        dataIndex: "storeId",
        render: (value: string) => <Typography.Text code>{value}</Typography.Text>
      },
      {
        title: "Code",
        dataIndex: "code",
        render: (value: string) => <Typography.Text code>{value}</Typography.Text>
      },
      { title: "Name", dataIndex: "name" },
      { title: "Type", dataIndex: "type" },
      {
        title: "Status",
        dataIndex: "status",
        render: (value: DeviceDto["status"]) => <Tag color={deviceStatusColor[value]}>{value}</Tag>
      },
      {
        title: "Kiosk token",
        render: (_, record) =>
          record.type === "KIOSK" ? (
            <Button
              size="small"
              loading={issuingDeviceId === record.id}
              onClick={() => {
                void (async () => {
                  setIssuingDeviceId(record.id);
                  try {
                    const response = await issueKioskAccessToken(accessToken, record.id);
                    setLastToken(response);
                    notification.success({
                      message: "Kiosk token issued",
                      description: `Token issued for ${record.code}.`
                    });
                  } catch (caughtError) {
                    notification.error({
                      message: "Kiosk token issue failed",
                      description:
                        caughtError instanceof Error
                          ? caughtError.message
                          : "Unable to issue token."
                    });
                  } finally {
                    setIssuingDeviceId(null);
                  }
                })();
              }}
            >
              Issue token
            </Button>
          ) : (
            <Tag>n/a</Tag>
          )
      }
    ],
    [accessToken, issuingDeviceId]
  );

  if (!accessToken) {
    return null;
  }

  return (
    <CrudPage<DeviceRow>
      title="Devices"
      description="Register POS, kiosk, kitchen and board devices under a store."
      eyebrow="Platform"
      columns={columns}
      fields={[
        { name: "tenantId", label: "Tenant ID", required: true, placeholder: "tenant-id" },
        { name: "storeId", label: "Store ID", required: true, placeholder: "store-id" },
        { name: "code", label: "Code", required: true, placeholder: "kiosk-1" },
        { name: "name", label: "Name", required: true, placeholder: "Kiosk 1" },
        { name: "type", label: "Type", type: "select", required: true, options: deviceKindOptions }
      ]}
      listItems={async () =>
        (await listResource<DeviceDto>("/devices", accessToken)).items as DeviceRow[]
      }
      createItem={(payload) => createResource<DeviceDto>("/devices", payload, accessToken)}
      updateItem={(id, payload) => patchResource<DeviceDto>("/devices", id, payload, accessToken)}
      getItemId={(item) => item.id}
      normalizeValues={(values) => ({
        tenantId: readInputText(values.tenantId),
        storeId: readInputText(values.storeId),
        code: readInputText(values.code),
        name: readInputText(values.name),
        type: readInputText(values.type)
      })}
      sideContent={
        <Card variant="borderless" title="Latest kiosk token">
          {lastToken ? (
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Typography.Text type="secondary">Device</Typography.Text>
              <Typography.Text code>{lastToken.deviceId}</Typography.Text>
              <Typography.Text type="secondary">Token</Typography.Text>
              <Typography.Text code copyable style={{ wordBreak: "break-all" }}>
                {lastToken.accessToken}
              </Typography.Text>
              <Typography.Text type="secondary">
                Expires at {new Date(lastToken.expiresAt).toLocaleString()}
              </Typography.Text>
            </Space>
          ) : (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Issue a token for a kiosk device to activate the public kiosk bootstrap flow.
            </Typography.Paragraph>
          )}
        </Card>
      }
    />
  );
}
