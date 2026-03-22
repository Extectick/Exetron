"use client";

import type { OnboardingBootstrapResponse } from "@exetron/contracts";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  List,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  notification
} from "antd";
import { useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { onboardingBootstrap } from "../../../lib/api";

const deviceKindOptions = ["POS", "KIOSK", "KITCHEN", "BOARD", "BACKOFFICE"].map((value) => ({
  label: value,
  value
}));

export default function OnboardingPage() {
  const { session } = useAuth();
  const [form] = Form.useForm();
  const [result, setResult] = useState<OnboardingBootstrapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type OnboardingFormValues = {
    tenant: { slug: string; name: string };
    store: { code: string; name: string; timezone: string; brandId?: string };
    devices: Array<{
      code: string;
      name: string;
      type: "POS" | "KIOSK" | "KITCHEN" | "BOARD" | "BACKOFFICE";
    }>;
    issueKioskAccessToken?: boolean;
  };

  function readInputText(value: unknown): string {
    if (typeof value === "string") {
      return value.trim();
    }

    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
      return String(value);
    }

    return "";
  }

  async function handleFinish(values: OnboardingFormValues) {
    if (!session?.accessToken) {
      setError("You must be signed in to run onboarding.");
      return;
    }

    setLoading(true);
    try {
      const response = await onboardingBootstrap(session.accessToken, {
        tenant: {
          slug: readInputText(values.tenant.slug),
          name: readInputText(values.tenant.name)
        },
        store: {
          code: readInputText(values.store.code),
          name: readInputText(values.store.name),
          timezone: readInputText(values.store.timezone),
          brandId: readInputText(values.store.brandId) ? readInputText(values.store.brandId) : undefined
        },
        devices: values.devices.map((device) => ({
          code: readInputText(device.code),
          name: readInputText(device.name),
          type: device.type
        })),
        issueKioskAccessToken: values.issueKioskAccessToken ?? false
      });

      setResult(response);
      setError(null);
      notification.success({
        message: "Bootstrap completed",
        description: `Created tenant ${response.tenant.slug} and ${response.devices.length} device(s).`
      });
      form.resetFields();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Onboarding bootstrap failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={14}>
        <Card title="Guided onboarding" variant="borderless">
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Title level={3} style={{ marginTop: 0 }}>
              Bootstrap a tenant, first store and initial devices
            </Typography.Title>
            <Typography.Paragraph type="secondary">
              This flow provisions the minimum platform core in one call to{" "}
              <Typography.Text code>POST /onboarding/bootstrap</Typography.Text>.
            </Typography.Paragraph>
            {error ? <Tag color="error">{error}</Tag> : null}

            <Form
              form={form}
              layout="vertical"
              initialValues={{
                tenant: { slug: "", name: "" },
                store: { code: "", name: "", timezone: "Asia/Novosibirsk", brandId: "" },
                devices: [
                  { code: "kiosk-1", name: "Kiosk 1", type: "KIOSK" },
                  { code: "pos-1", name: "POS 1", type: "POS" }
                ],
                issueKioskAccessToken: true
              }}
              onFinish={(values: OnboardingFormValues) => {
                void handleFinish(values);
              }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Card size="small" title="Tenant">
                    <Form.Item
                      label="Slug"
                      name={["tenant", "slug"]}
                      rules={[{ required: true, message: "Tenant slug is required" }]}
                    >
                      <Input placeholder="acme" />
                    </Form.Item>
                    <Form.Item
                      label="Name"
                      name={["tenant", "name"]}
                      rules={[{ required: true, message: "Tenant name is required" }]}
                    >
                      <Input placeholder="Acme Group" />
                    </Form.Item>
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card size="small" title="Store">
                    <Form.Item
                      label="Code"
                      name={["store", "code"]}
                      rules={[{ required: true, message: "Store code is required" }]}
                    >
                      <Input placeholder="msk-001" />
                    </Form.Item>
                    <Form.Item
                      label="Name"
                      name={["store", "name"]}
                      rules={[{ required: true, message: "Store name is required" }]}
                    >
                      <Input placeholder="Main Store" />
                    </Form.Item>
                    <Form.Item
                      label="Timezone"
                      name={["store", "timezone"]}
                      rules={[{ required: true, message: "Timezone is required" }]}
                    >
                      <Input placeholder="Asia/Novosibirsk" />
                    </Form.Item>
                    <Form.Item label="Brand ID" name={["store", "brandId"]}>
                      <Input placeholder="Optional brand binding" />
                    </Form.Item>
                  </Card>
                </Col>
              </Row>

              <Card size="small" title="Initial devices" style={{ marginTop: 16 }}>
                <Form.List name="devices">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" style={{ width: "100%" }} size={12}>
                      {fields.map((field, index) => (
                        <Card
                          key={field.key}
                          size="small"
                          title={`Device ${index + 1}`}
                          extra={
                            fields.length > 1 ? (
                              <Button danger type="link" onClick={() => remove(field.name)}>
                                Remove
                              </Button>
                            ) : null
                          }
                        >
                          <Row gutter={12}>
                            <Col xs={24} md={8}>
                              <Form.Item
                                label="Code"
                                name={[field.name, "code"]}
                                rules={[{ required: true, message: "Device code is required" }]}
                              >
                                <Input placeholder="kiosk-1" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item
                                label="Name"
                                name={[field.name, "name"]}
                                rules={[{ required: true, message: "Device name is required" }]}
                              >
                                <Input placeholder="Kiosk 1" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                              <Form.Item
                                label="Type"
                                name={[field.name, "type"]}
                                rules={[{ required: true, message: "Device type is required" }]}
                              >
                                <Select options={deviceKindOptions} />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                      <Button onClick={() => add({ code: "", name: "", type: "KIOSK" })} type="dashed">
                        Add device
                      </Button>
                    </Space>
                  )}
                </Form.List>
              </Card>

              <Card size="small" title="Bootstrap controls" style={{ marginTop: 16 }}>
                <Form.Item name="issueKioskAccessToken" valuePropName="checked">
                  <Switch /> Issue kiosk access token for kiosk devices
                </Form.Item>
              </Card>

              <Space style={{ marginTop: 16 }}>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Run bootstrap
                </Button>
                <Button onClick={() => form.resetFields()} disabled={loading}>
                  Reset
                </Button>
              </Space>
            </Form>
          </Space>
        </Card>
      </Col>

      <Col xs={24} xl={10}>
        <Card title="Bootstrap result" variant="borderless">
          {result ? (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Tenant">
                  {result.tenant.slug} / {result.tenant.name}
                </Descriptions.Item>
                <Descriptions.Item label="Store">
                  {result.store.code} / {result.store.name}
                </Descriptions.Item>
                <Descriptions.Item label="Devices">{result.devices.length}</Descriptions.Item>
              </Descriptions>
              <List
                bordered
                dataSource={result.devices}
                renderItem={(entry) => (
                  <List.Item>
                    <Space direction="vertical" style={{ width: "100%" }} size={4}>
                      <Space wrap>
                        <Typography.Text strong>{entry.device.name}</Typography.Text>
                        <Tag>{entry.device.type}</Tag>
                        <Tag color="green">{entry.device.status}</Tag>
                      </Space>
                      <Typography.Text type="secondary">Bootstrap secret:</Typography.Text>
                      <Typography.Text code copyable style={{ wordBreak: "break-all" }}>
                        {entry.bootstrapSecret}
                      </Typography.Text>
                      {entry.kioskAccessToken ? (
                        <>
                          <Typography.Text type="secondary">Kiosk access token:</Typography.Text>
                          <Typography.Text code copyable style={{ wordBreak: "break-all" }}>
                            {entry.kioskAccessToken.token}
                          </Typography.Text>
                        </>
                      ) : null}
                    </Space>
                  </List.Item>
                )}
              />
            </Space>
          ) : (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Submitted bootstrap data will be shown here, including the created tenant, store and
              one-shot secrets for each device.
            </Typography.Paragraph>
          )}
        </Card>
      </Col>
    </Row>
  );
}
