"use client";

import { Refine } from "@refinedev/core";
import { useNotificationProvider } from "@refinedev/antd";
import routerProvider from "@refinedev/nextjs-router";
import { App as AntdApp, ConfigProvider } from "antd";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/auth-provider";
import { AdminShell } from "../../components/admin-shell/admin-shell";
import { LoadingScreen } from "../../components/admin-shell/loading-screen";
import { adminResources } from "../config/resources";
import { adminTheme } from "../config/theme";
import { accessControlProvider } from "../providers/access-control-provider";
import { authProvider } from "../providers/auth-provider";
import { dataProvider } from "../providers/data-provider";

export function AdminRoot({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "guest") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading" || status === "guest") {
    return <LoadingScreen copy="Restoring session and control-plane context..." />;
  }

  return (
    <ConfigProvider theme={adminTheme}>
      <AntdApp>
        <Refine
          authProvider={authProvider}
          dataProvider={dataProvider}
          accessControlProvider={accessControlProvider}
          notificationProvider={useNotificationProvider}
          routerProvider={routerProvider}
          resources={adminResources}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true
          }}
        >
          <AdminShell>{children}</AdminShell>
        </Refine>
      </AntdApp>
    </ConfigProvider>
  );
}
