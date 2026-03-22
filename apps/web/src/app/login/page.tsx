"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../components/auth-provider";

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(values: LoginFormValues) {
    setBusy(true);
    setError(null);

    try {
      await login(values);
      router.replace("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ex-login">
      <div className="ex-login__hero">
        <span className="ex-login__eyebrow">Exetron</span>
        <Typography.Title>Operational control plane for multi-store commerce.</Typography.Title>
        <Typography.Paragraph>
          Sign in with the seeded platform admin credentials to manage tenants, catalog,
          devices, payments, analytics and operational runtime screens from one place.
        </Typography.Paragraph>
      </div>

      <Card className="ex-login__card" variant="borderless">
        <div className="ex-login__header">
          <span className="ex-login__eyebrow">Refine Cutover</span>
          <Typography.Title level={2}>Sign in to Admin</Typography.Title>
          <Typography.Paragraph>
            This workspace uses the current JWT backend and keeps the kiosk runtime isolated.
          </Typography.Paragraph>
        </div>

        {error ? <Alert type="error" message={error} showIcon /> : null}

        <Form<LoginFormValues>
          layout="vertical"
          initialValues={{
            email: "admin@exetron.local",
            password: "ChangeMe123!"
          }}
          onFinish={(values) => void handleSubmit(values)}
          className="ex-login__form"
        >
          <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
            <Input
              prefix={<MailOutlined />}
              placeholder="admin@exetron.local"
              size="large"
            />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true }]}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="ChangeMe123!"
              size="large"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={busy}>
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
