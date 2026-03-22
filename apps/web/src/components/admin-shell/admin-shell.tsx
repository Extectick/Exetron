"use client";

import {
  AppstoreOutlined,
  AuditOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FundProjectionScreenOutlined,
  RadarChartOutlined,
  ReconciliationOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ToolOutlined
} from "@ant-design/icons";
import { Avatar, Breadcrumb, Button, Input, Layout, Menu, Space, Tag, Typography } from "antd";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminGroups, adminResources, canAccessResource, type AdminNavGroup } from "../../refine/config/resources";
import { useAuth } from "../auth-provider";

const { Header, Sider, Content } = Layout;

const groupIcons: Record<AdminNavGroup, React.ReactNode> = {
  Overview: <DashboardOutlined />,
  Platform: <TeamOutlined />,
  Catalog: <AppstoreOutlined />,
  Operations: <ShoppingCartOutlined />,
  Intelligence: <FundProjectionScreenOutlined />,
  Control: <ToolOutlined />
};

function scopeLabel(scope: string) {
  switch (scope) {
    case "platform_admin":
      return "Platform Admin";
    case "tenant_member":
      return "Tenant Member";
    case "device":
      return "Device";
    default:
      return scope;
  }
}

function pageIconForPath(pathname: string) {
  if (pathname.startsWith("/payments")) return <ReconciliationOutlined />;
  if (pathname.startsWith("/owner-cabinet") || pathname.startsWith("/analytics")) {
    return <RadarChartOutlined />;
  }
  if (pathname.startsWith("/settings") || pathname.startsWith("/observability")) {
    return <SettingOutlined />;
  }
  if (pathname.startsWith("/audit")) return <AuditOutlined />;
  if (pathname.startsWith("/customization") || pathname.startsWith("/feature-flags")) {
    return <ExperimentOutlined />;
  }
  if (pathname.startsWith("/stores") || pathname.startsWith("/devices")) {
    return <ShopOutlined />;
  }
  return <DashboardOutlined />;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { session, logout } = useAuth();

  const visibleResources = useMemo(
    () => adminResources.filter((resource) => resource.meta.menu !== false && canAccessResource(session, resource)),
    [session]
  );

  const menuItems = useMemo(
    () =>
      adminGroups
        .map((group) => {
          const children = visibleResources
            .filter((resource) => resource.meta.group === group)
            .map((resource) => ({
              key: resource.list,
              label: resource.meta.label
            }));

          if (!children.length) {
            return null;
          }

          return {
            key: group,
            label: group,
            icon: groupIcons[group],
            children
          };
        })
        .filter(Boolean),
    [visibleResources]
  );

  const currentResource = visibleResources.find((resource) => pathname === resource.list);
  const currentPageTitle = currentResource?.meta.label ?? "Control Plane";

  return (
    <Layout className="ex-admin-layout">
      <Sider breakpoint="lg" collapsedWidth={84} width={304} className="ex-admin-sider">
        <div className="ex-admin-brand">
          <span className="ex-admin-brand__eyebrow">Exetron</span>
          <Typography.Title level={3}>Admin Control Plane</Typography.Title>
          <Typography.Paragraph>
            Refine-powered operations cockpit for the platform and tenant runtime.
          </Typography.Paragraph>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => router.push(String(key))}
          className="ex-admin-menu"
        />

        <div className="ex-admin-sider__footer">
          <Tag color="default">{scopeLabel(session?.me?.claims.scope ?? "guest")}</Tag>
          <Typography.Text type="secondary">
            {session?.me?.claims.tenantId ?? "Cross-tenant"}
          </Typography.Text>
        </div>
      </Sider>

      <Layout>
        <Header className="ex-admin-header">
          <div className="ex-admin-header__left">
            <Space size={12} align="center">
              <span className="ex-admin-page-icon">{pageIconForPath(pathname)}</span>
              <div>
                <Typography.Text className="ex-admin-header__eyebrow">
                  Authenticated Workspace
                </Typography.Text>
                <Typography.Title level={4}>{currentPageTitle}</Typography.Title>
              </div>
            </Space>
          </div>

          <div className="ex-admin-header__right">
            <Input
              placeholder="Search and quick actions will land here"
              allowClear
              className="ex-admin-search"
            />
            <div className="ex-admin-user">
              <Avatar>{session?.me?.user.firstName?.slice(0, 1) ?? "E"}</Avatar>
              <div>
                <Typography.Text strong>
                  {session?.me?.user.firstName} {session?.me?.user.lastName}
                </Typography.Text>
                <Typography.Text type="secondary">{session?.me?.user.email}</Typography.Text>
              </div>
            </div>
            <Button onClick={() => void logout()}>Sign out</Button>
          </div>
        </Header>

        <Content className="ex-admin-content">
          <div className="ex-admin-breadcrumbs">
            <Breadcrumb
              items={[
                { title: "Exetron" },
                { title: "Admin" },
                { title: currentPageTitle }
              ]}
            />
          </div>
          <div className="ex-admin-content__inner">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
