import {
  applyCustomizationRuleActions,
  matchesCustomizationRule
} from "./customization-runtime.util";

describe("customization runtime util", () => {
  it("patches settings, feature flags, and branding deterministically", () => {
    const next = applyCustomizationRuleActions(
      {
        settings: {
          "kiosk.rules": {
            allowNotes: true,
            requireCustomerName: false
          }
        },
        featureFlags: {
          "kiosk.cash.enabled": false
        },
        branding: {
          heroTitle: "Tenant Hero",
          colors: {
            accent: "#111111"
          }
        }
      },
      {
        patchSettings: {
          "kiosk.rules": {
            requireCustomerName: true
          }
        },
        setFeatureFlags: {
          "kiosk.cash.enabled": true
        },
        patchBranding: {
          heroSubtitle: "Custom Subtitle",
          colors: {
            surface: "#ffffff"
          }
        }
      }
    );

    expect(next.settings["kiosk.rules"]).toEqual({
      allowNotes: true,
      requireCustomerName: true
    });
    expect(next.featureFlags["kiosk.cash.enabled"]).toBe(true);
    expect(next.branding).toEqual({
      heroTitle: "Tenant Hero",
      heroSubtitle: "Custom Subtitle",
      colors: {
        accent: "#111111",
        surface: "#ffffff"
      }
    });
  });

  it("matches rules by payment method, customer name, weekday, and feature flags", () => {
    const now = new Date("2026-03-18T09:00:00.000Z");

    expect(
      matchesCustomizationRule(
        {
          paymentMethodIn: ["CARD"],
          customerNameProvided: true,
          weekdayIn: [3],
          hourFrom: 8,
          hourTo: 10,
          featureFlagEquals: {
            "kiosk.priorityUpsell": true
          }
        },
        {
          tenantId: "tenant-1",
          storeId: "store-1",
          channel: "KIOSK",
          pointKey: "KIOSK-01",
          inputs: {
            paymentMethod: "CARD",
            customerName: "Alice"
          },
          now,
          featureFlags: {
            "kiosk.priorityUpsell": true
          }
        }
      )
    ).toBe(true);

    expect(
      matchesCustomizationRule(
        {
          paymentMethodIn: ["QR"],
          customerNameProvided: true
        },
        {
          tenantId: "tenant-1",
          storeId: "store-1",
          channel: "KIOSK",
          pointKey: "KIOSK-01",
          inputs: {
            paymentMethod: "CARD",
            customerName: "Alice"
          },
          now,
          featureFlags: {}
        }
      )
    ).toBe(false);
  });
});
