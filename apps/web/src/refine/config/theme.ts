import type { ThemeConfig } from "antd";

export const adminTheme: ThemeConfig = {
  token: {
    fontFamily:
      'var(--font-sora), "IBM Plex Sans", "Segoe UI", sans-serif',
    colorPrimary: "#c46d38",
    colorSuccess: "#2e6f50",
    colorError: "#a83f39",
    colorWarning: "#d98324",
    colorText: "#1f2e27",
    colorTextSecondary: "#627168",
    colorTextTertiary: "#7f8d84",
    colorBgLayout: "#efe7d9",
    colorBgContainer: "#fffaf1",
    colorBorder: "rgba(31, 46, 39, 0.14)",
    colorBorderSecondary: "rgba(31, 46, 39, 0.08)",
    colorFillSecondary: "rgba(196, 109, 56, 0.08)",
    borderRadius: 18,
    borderRadiusLG: 24,
    boxShadow: "0 24px 80px rgba(31, 46, 39, 0.08)"
  },
  components: {
    Layout: {
      bodyBg: "#efe7d9",
      siderBg: "rgba(251, 246, 238, 0.96)",
      headerBg: "rgba(255, 250, 241, 0.9)"
    },
    Menu: {
      itemBg: "transparent",
      itemColor: "#637168",
      itemSelectedBg: "rgba(196, 109, 56, 0.12)",
      itemSelectedColor: "#1f2e27",
      itemHoverBg: "rgba(196, 109, 56, 0.08)"
    },
    Table: {
      headerBg: "rgba(255, 248, 237, 0.92)",
      headerColor: "#627168",
      rowHoverBg: "rgba(196, 109, 56, 0.05)"
    },
    Card: {
      headerBg: "transparent"
    }
  }
};
