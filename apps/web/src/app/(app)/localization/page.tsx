"use client";

import { useCallback, useEffect, useState } from "react";
import type { LocalizationLanguagePackDto } from "@exetron/contracts";
import { useAuth } from "../../../components/auth-provider";
import {
  exportLocalizationLanguagePack,
  getLocalizationContext,
  getLocalizationPreferences,
  importLocalizationLanguagePack,
  listCountryProfiles,
  listLocalizedContent,
  listLocalizedTemplates,
  renderLocalizedTemplate,
  upsertCountryProfile,
  upsertLocalizedContent,
  upsertLocalizedTemplate,
  upsertStoreLocalizationPreferences,
  upsertTenantLocalizationPreferences
} from "../../../lib/api";

const channels = [
  "ADMIN",
  "POS",
  "KIOSK",
  "DELIVERY",
  "KITCHEN",
  "BOARD",
  "BACKOFFICE"
] as const;

const contentTargetTypes = [
  "CATEGORY",
  "PRODUCT",
  "VARIANT",
  "MODIFIER_GROUP",
  "MODIFIER_OPTION",
  "BRANDING"
] as const;

export default function LocalizationPage() {
  const { session } = useAuth();
  const sessionTenantId = session?.me?.claims.tenantId ?? "";
  const [tenantId, setTenantId] = useState(sessionTenantId);
  const [storeId, setStoreId] = useState("");
  const [preferencesState, setPreferencesState] = useState<string>("{}");
  const [countryProfiles, setCountryProfiles] = useState<string>("[]");
  const [localizedContent, setLocalizedContent] = useState<string>("[]");
  const [localizedTemplates, setLocalizedTemplates] = useState<string>("[]");
  const [languagePack, setLanguagePack] = useState<string>("{}");
  const [contextPreview, setContextPreview] = useState<string>("{}");
  const [renderedTemplate, setRenderedTemplate] = useState<string>("{}");
  const [error, setError] = useState<string | null>(null);
  const [tenantPreferencesDraft, setTenantPreferencesDraft] = useState(
    '{\n  "defaultLocale": "en-US",\n  "fallbackLocale": "en-US",\n  "supportedLocales": ["en-US"],\n  "countryCode": "US",\n  "currency": "USD",\n  "channelLocales": {\n    "KIOSK": "en-US"\n  }\n}'
  );
  const [storePreferencesDraft, setStorePreferencesDraft] = useState(
    '{\n  "defaultLocale": "ru-RU",\n  "fallbackLocale": "en-US",\n  "supportedLocales": ["ru-RU", "en-US"],\n  "countryCode": "RU",\n  "currency": "RUB",\n  "channelLocales": {\n    "KIOSK": "ru-RU"\n  }\n}'
  );
  const [countryDraft, setCountryDraft] = useState({
    countryCode: "RU",
    payload:
      '{\n  "defaultLocale": "ru-RU",\n  "supportedLocales": ["ru-RU", "en-US"],\n  "currency": "RUB",\n  "tax": {\n    "mode": "INCLUSIVE",\n    "ratePercent": 10,\n    "label": "VAT"\n  },\n  "complianceFlags": ["fiscal_receipt_required"],\n  "metadata": {\n    "menuStyle": "metro"\n  }\n}'
  });
  const [contentDraft, setContentDraft] = useState({
    targetType: "PRODUCT" as (typeof contentTargetTypes)[number],
    targetId: "",
    entries:
      '{\n  "ru-RU": {\n    "name": "Локализованный товар",\n    "description": "Описание для русской локали"\n  },\n  "en-US": {\n    "name": "Localized Product",\n    "description": "English fallback description"\n  }\n}'
  });
  const [templateDraft, setTemplateDraft] = useState({
    templateKey: "order-status-paid",
    channel: "DELIVERY" as (typeof channels)[number],
    description: "Paid order notification",
    variables: '["orderNumber", "storeName"]',
    entries:
      '{\n  "ru-RU": {\n    "title": "Заказ {{orderNumber}} готовится",\n    "body": "{{storeName}} принял оплату и начал готовить заказ."\n  },\n  "en-US": {\n    "title": "Order {{orderNumber}} is in progress",\n    "body": "{{storeName}} received the payment and started preparation."\n  }\n}'
  });
  const [contextDraft, setContextDraft] = useState({
    locale: "",
    customerLocale: "",
    countryCode: "",
    channel: "KIOSK" as (typeof channels)[number]
  });
  const [renderDraft, setRenderDraft] = useState({
    templateKey: "order-status-paid",
    channel: "DELIVERY" as (typeof channels)[number],
    locale: "",
    customerLocale: "",
    countryCode: "",
    variables: '{\n  "orderNumber": "A-1024",\n  "storeName": "Central Kitchen"\n}'
  });

  const effectiveTenantId = sessionTenantId || tenantId.trim();

  const loadWorkspace = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    const [preferences, countries, content, templates, pack] = await Promise.all([
      getLocalizationPreferences(session.accessToken, {
        tenantId: effectiveTenantId,
        storeId: storeId || undefined
      }),
      listCountryProfiles(session.accessToken, effectiveTenantId),
      listLocalizedContent(session.accessToken, {
        tenantId: effectiveTenantId
      }),
      listLocalizedTemplates(session.accessToken, {
        tenantId: effectiveTenantId
      }),
      exportLocalizationLanguagePack(session.accessToken, effectiveTenantId)
    ]);

    setError(null);
    setPreferencesState(JSON.stringify(preferences, null, 2));
    setCountryProfiles(JSON.stringify(countries.items, null, 2));
    setLocalizedContent(JSON.stringify(content.items, null, 2));
    setLocalizedTemplates(JSON.stringify(templates.items, null, 2));
    setLanguagePack(JSON.stringify(pack, null, 2));
  }, [effectiveTenantId, session?.accessToken, storeId]);

  useEffect(() => {
    if (!session?.accessToken || !sessionTenantId) {
      return;
    }

    void loadWorkspace();
  }, [loadWorkspace, session?.accessToken, sessionTenantId]);

  return (
    <div className="split-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Localization Runtime</span>
            <h2>Preferences, country profiles and localized assets</h2>
          </div>
          <button className="ghost-button" onClick={() => void loadWorkspace()}>
            Refresh
          </button>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        {!sessionTenantId ? (
          <label className="field">
            <span>Tenant ID</span>
            <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
          </label>
        ) : null}
        <label className="field">
          <span>Store ID for store-scoped previews</span>
          <input value={storeId} onChange={(event) => setStoreId(event.target.value)} />
        </label>

        <div className="split-grid">
          <form
            className="editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!session?.accessToken || !effectiveTenantId) {
                setError("Tenant ID is required.");
                return;
              }

              try {
                const payload = JSON.parse(tenantPreferencesDraft) as {
                  defaultLocale: string;
                  fallbackLocale?: string;
                  supportedLocales?: string[];
                  countryCode?: string | null;
                  currency?: string | null;
                  timezone?: string | null;
                  channelLocales?: Record<string, string>;
                };

                void upsertTenantLocalizationPreferences(
                  session.accessToken,
                  payload,
                  effectiveTenantId
                )
                  .then(() => loadWorkspace())
                  .catch((caughtError) =>
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Tenant preferences save failed."
                    )
                  );
              } catch {
                setError("Tenant preferences JSON must be valid.");
              }
            }}
          >
            <h3 style={{ margin: 0 }}>Tenant Preferences</h3>
            <textarea
              rows={12}
              value={tenantPreferencesDraft}
              onChange={(event) => setTenantPreferencesDraft(event.target.value)}
            />
            <button className="primary-button" type="submit">
              Save Tenant Preferences
            </button>
          </form>

          <form
            className="editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!session?.accessToken || !storeId.trim()) {
                setError("Store ID is required.");
                return;
              }

              try {
                const payload = JSON.parse(storePreferencesDraft) as {
                  defaultLocale: string;
                  fallbackLocale?: string;
                  supportedLocales?: string[];
                  countryCode?: string | null;
                  currency?: string | null;
                  timezone?: string | null;
                  channelLocales?: Record<string, string>;
                };

                void upsertStoreLocalizationPreferences(session.accessToken, {
                  storeId: storeId.trim(),
                  ...payload
                })
                  .then(() => loadWorkspace())
                  .catch((caughtError) =>
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Store preferences save failed."
                    )
                  );
              } catch {
                setError("Store preferences JSON must be valid.");
              }
            }}
          >
            <h3 style={{ margin: 0 }}>Store Preferences</h3>
            <textarea
              rows={12}
              value={storePreferencesDraft}
              onChange={(event) => setStorePreferencesDraft(event.target.value)}
            />
            <button className="primary-button" type="submit">
              Save Store Preferences
            </button>
          </form>
        </div>

        <div className="split-grid">
          <form
            className="editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!session?.accessToken || !effectiveTenantId) {
                setError("Tenant ID is required.");
                return;
              }

              try {
                const payload = JSON.parse(countryDraft.payload) as {
                  defaultLocale: string;
                  supportedLocales?: string[];
                  currency: string;
                  tax?: { mode?: "NONE" | "INCLUSIVE" | "EXCLUSIVE"; ratePercent?: number | null; label?: string | null };
                  complianceFlags?: string[];
                  metadata?: Record<string, unknown>;
                };

                void upsertCountryProfile(
                  session.accessToken,
                  countryDraft.countryCode,
                  payload,
                  effectiveTenantId
                )
                  .then(() => loadWorkspace())
                  .catch((caughtError) =>
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Country profile save failed."
                    )
                  );
              } catch {
                setError("Country profile JSON must be valid.");
              }
            }}
          >
            <h3 style={{ margin: 0 }}>Country Profile</h3>
            <label className="field">
              <span>Country Code</span>
              <input
                value={countryDraft.countryCode}
                onChange={(event) =>
                  setCountryDraft((current) => ({ ...current, countryCode: event.target.value }))
                }
              />
            </label>
            <textarea
              rows={12}
              value={countryDraft.payload}
              onChange={(event) =>
                setCountryDraft((current) => ({ ...current, payload: event.target.value }))
              }
            />
            <button className="primary-button" type="submit">
              Save Country Profile
            </button>
          </form>

          <form
            className="editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!session?.accessToken || !effectiveTenantId || !contentDraft.targetId.trim()) {
                setError("Tenant ID and target ID are required.");
                return;
              }

              try {
                const entries = JSON.parse(contentDraft.entries) as Record<string, Record<string, string>>;
                void upsertLocalizedContent(session.accessToken, {
                  tenantId: effectiveTenantId,
                  targetType: contentDraft.targetType,
                  targetId: contentDraft.targetId.trim(),
                  entries
                })
                  .then(() => loadWorkspace())
                  .catch((caughtError) =>
                    setError(
                      caughtError instanceof Error
                        ? caughtError.message
                        : "Localized content save failed."
                    )
                  );
              } catch {
                setError("Localized content JSON must be valid.");
              }
            }}
          >
            <h3 style={{ margin: 0 }}>Localized Content</h3>
            <label className="field">
              <span>Target Type</span>
              <select
                value={contentDraft.targetType}
                onChange={(event) =>
                  setContentDraft((current) => ({
                    ...current,
                    targetType: event.target.value as (typeof contentTargetTypes)[number]
                  }))
                }
              >
                {contentTargetTypes.map((targetType) => (
                  <option key={targetType} value={targetType}>
                    {targetType}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Target ID</span>
              <input
                value={contentDraft.targetId}
                onChange={(event) =>
                  setContentDraft((current) => ({ ...current, targetId: event.target.value }))
                }
              />
            </label>
            <textarea
              rows={10}
              value={contentDraft.entries}
              onChange={(event) =>
                setContentDraft((current) => ({ ...current, entries: event.target.value }))
              }
            />
            <button className="primary-button" type="submit">
              Save Localized Content
            </button>
          </form>
        </div>

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken || !effectiveTenantId) {
              setError("Tenant ID is required.");
              return;
            }

            try {
              const entries = JSON.parse(templateDraft.entries) as Record<string, {
                subject?: string;
                title?: string;
                body?: string;
                sms?: string;
                pushTitle?: string;
                pushBody?: string;
              }>;
              const variables = JSON.parse(templateDraft.variables) as string[];

              void upsertLocalizedTemplate(session.accessToken, {
                tenantId: effectiveTenantId,
                templateKey: templateDraft.templateKey,
                channel: templateDraft.channel,
                description: templateDraft.description,
                variables,
                entries
              })
                .then(() => loadWorkspace())
                .catch((caughtError) =>
                  setError(
                    caughtError instanceof Error
                      ? caughtError.message
                      : "Localized template save failed."
                  )
                );
            } catch {
              setError("Template JSON must be valid.");
            }
          }}
        >
          <h3 style={{ margin: 0 }}>Localized Template</h3>
          <div className="split-grid">
            <label className="field">
              <span>Template Key</span>
              <input
                value={templateDraft.templateKey}
                onChange={(event) =>
                  setTemplateDraft((current) => ({ ...current, templateKey: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Channel</span>
              <select
                value={templateDraft.channel}
                onChange={(event) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    channel: event.target.value as (typeof channels)[number]
                  }))
                }
              >
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Description</span>
            <input
              value={templateDraft.description}
              onChange={(event) =>
                setTemplateDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Variables JSON</span>
            <textarea
              rows={3}
              value={templateDraft.variables}
              onChange={(event) =>
                setTemplateDraft((current) => ({ ...current, variables: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Entries JSON</span>
            <textarea
              rows={10}
              value={templateDraft.entries}
              onChange={(event) =>
                setTemplateDraft((current) => ({ ...current, entries: event.target.value }))
              }
            />
          </label>
          <button className="primary-button" type="submit">
            Save Localized Template
          </button>
        </form>

        <pre>{preferencesState}</pre>
        <pre>{countryProfiles}</pre>
        <pre>{localizedContent}</pre>
        <pre>{localizedTemplates}</pre>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Preview & Language Packs</span>
            <h2>Resolved locale context and template rendering</h2>
          </div>
        </div>

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken || !effectiveTenantId) {
              setError("Tenant ID is required.");
              return;
            }

            void getLocalizationContext(session.accessToken, {
              tenantId: effectiveTenantId,
              storeId: storeId || undefined,
              locale: contextDraft.locale || undefined,
              customerLocale: contextDraft.customerLocale || undefined,
              countryCode: contextDraft.countryCode || undefined,
              channel: contextDraft.channel
            })
              .then((response) => {
                setError(null);
                setContextPreview(JSON.stringify(response, null, 2));
              })
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error
                    ? caughtError.message
                    : "Localization context load failed."
                )
              );
          }}
        >
          <h3 style={{ margin: 0 }}>Localization Context</h3>
          <div className="split-grid">
            <label className="field">
              <span>Locale</span>
              <input
                value={contextDraft.locale}
                onChange={(event) =>
                  setContextDraft((current) => ({ ...current, locale: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Customer Locale</span>
              <input
                value={contextDraft.customerLocale}
                onChange={(event) =>
                  setContextDraft((current) => ({
                    ...current,
                    customerLocale: event.target.value
                  }))
                }
              />
            </label>
          </div>
          <div className="split-grid">
            <label className="field">
              <span>Country Code</span>
              <input
                value={contextDraft.countryCode}
                onChange={(event) =>
                  setContextDraft((current) => ({ ...current, countryCode: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Channel</span>
              <select
                value={contextDraft.channel}
                onChange={(event) =>
                  setContextDraft((current) => ({
                    ...current,
                    channel: event.target.value as (typeof channels)[number]
                  }))
                }
              >
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="primary-button" type="submit">
            Resolve Context
          </button>
        </form>

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken || !effectiveTenantId) {
              setError("Tenant ID is required.");
              return;
            }

            try {
              const variables = JSON.parse(renderDraft.variables) as Record<
                string,
                string | number | boolean | null
              >;

              void renderLocalizedTemplate(session.accessToken, {
                tenantId: effectiveTenantId,
                storeId: storeId || null,
                templateKey: renderDraft.templateKey,
                channel: renderDraft.channel,
                locale: renderDraft.locale || undefined,
                customerLocale: renderDraft.customerLocale || undefined,
                countryCode: renderDraft.countryCode || undefined,
                variables
              })
                .then((response) => {
                  setError(null);
                  setRenderedTemplate(JSON.stringify(response, null, 2));
                })
                .catch((caughtError) =>
                  setError(
                    caughtError instanceof Error
                      ? caughtError.message
                      : "Localized template render failed."
                  )
                );
            } catch {
              setError("Template render variables JSON must be valid.");
            }
          }}
        >
          <h3 style={{ margin: 0 }}>Render Template</h3>
          <div className="split-grid">
            <label className="field">
              <span>Template Key</span>
              <input
                value={renderDraft.templateKey}
                onChange={(event) =>
                  setRenderDraft((current) => ({
                    ...current,
                    templateKey: event.target.value
                  }))
                }
              />
            </label>
            <label className="field">
              <span>Channel</span>
              <select
                value={renderDraft.channel}
                onChange={(event) =>
                  setRenderDraft((current) => ({
                    ...current,
                    channel: event.target.value as (typeof channels)[number]
                  }))
                }
              >
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="split-grid">
            <label className="field">
              <span>Locale</span>
              <input
                value={renderDraft.locale}
                onChange={(event) =>
                  setRenderDraft((current) => ({ ...current, locale: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span>Customer Locale</span>
              <input
                value={renderDraft.customerLocale}
                onChange={(event) =>
                  setRenderDraft((current) => ({
                    ...current,
                    customerLocale: event.target.value
                  }))
                }
              />
            </label>
          </div>
          <label className="field">
            <span>Country Code</span>
            <input
              value={renderDraft.countryCode}
              onChange={(event) =>
                setRenderDraft((current) => ({ ...current, countryCode: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Variables JSON</span>
            <textarea
              rows={6}
              value={renderDraft.variables}
              onChange={(event) =>
                setRenderDraft((current) => ({ ...current, variables: event.target.value }))
              }
            />
          </label>
          <button className="primary-button" type="submit">
            Render Template
          </button>
        </form>

        <form
          className="editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!session?.accessToken || !effectiveTenantId) {
              setError("Tenant ID is required.");
              return;
            }

            try {
              const pack = JSON.parse(languagePack) as LocalizationLanguagePackDto;

              void importLocalizationLanguagePack(session.accessToken, {
                tenantId: effectiveTenantId,
                pack
              })
                .then((response) => {
                  setError(null);
                  setLanguagePack(JSON.stringify(response, null, 2));
                  return loadWorkspace();
                })
                .catch((caughtError) =>
                  setError(
                    caughtError instanceof Error
                      ? caughtError.message
                      : "Localization language pack import failed."
                  )
                );
            } catch {
              setError("Language pack JSON must be valid.");
            }
          }}
        >
          <h3 style={{ margin: 0 }}>Language Pack</h3>
          <textarea
            rows={18}
            value={languagePack}
            onChange={(event) => setLanguagePack(event.target.value)}
          />
          <button className="primary-button" type="submit">
            Import Language Pack
          </button>
        </form>

        <pre>{contextPreview}</pre>
        <pre>{renderedTemplate}</pre>
      </section>
    </div>
  );
}
