"use client";

import type { CustomerProfileDto, PromotionCampaignDto } from "@exetron/contracts";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import {
  adjustCustomerLoyalty,
  createPromotionCampaign,
  listCustomerProfiles,
  listPromotions
} from "../../../lib/api";

export default function CustomersPage() {
  const { session } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [profiles, setProfiles] = useState<CustomerProfileDto[]>([]);
  const [promotions, setPromotions] = useState<PromotionCampaignDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoDraft, setPromoDraft] = useState({
    code: "WELCOME10",
    name: "Welcome 10%",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT" | "LOYALTY_REDEEM",
    value: "10.00",
    minimumOrderTotal: "0.00",
    pointsCost: "50",
    segmentKeys: "NEW"
  });

  const effectiveTenantId = session?.me?.claims.tenantId ?? tenantId.trim();
  const effectiveStoreId = storeId.trim() || undefined;

  const reload = useCallback(async () => {
    if (!session?.accessToken || !effectiveTenantId) {
      return;
    }

    setBusy(true);
    try {
      const [profilesResponse, promotionsResponse] = await Promise.all([
        listCustomerProfiles(session.accessToken, {
          tenantId: effectiveTenantId,
          storeId: effectiveStoreId
        }),
        listPromotions(session.accessToken, {
          tenantId: effectiveTenantId,
          storeId: effectiveStoreId
        })
      ]);
      setProfiles(profilesResponse.items);
      setPromotions(promotionsResponse.items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Customer CRM load failed.");
    } finally {
      setBusy(false);
    }
  }, [effectiveStoreId, effectiveTenantId, session?.accessToken]);

  useEffect(() => {
    if (!effectiveTenantId || !session?.accessToken) {
      return;
    }

    void reload();
  }, [effectiveTenantId, reload, session?.accessToken]);

  return (
    <div className="split-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">PHASE 15</span>
            <h2>Customers, loyalty, and retention</h2>
            <p>Profiles, loyalty balances, growth segments, and promo inventory.</p>
          </div>
          <button className="ghost-button" onClick={() => void reload()} disabled={busy}>
            Refresh
          </button>
        </div>

        <div className="editor-form">
          {!session?.me?.claims.tenantId ? (
            <label className="field">
              <span>Tenant ID</span>
              <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
            </label>
          ) : null}
          <label className="field">
            <span>Store ID</span>
            <input value={storeId} onChange={(event) => setStoreId(event.target.value)} />
          </label>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        <div className="workspace-grid">
          {profiles.map((profile) => (
            <article className="panel" key={profile.id}>
              <div className="panel-header">
                <div>
                  <span className="eyebrow">{profile.segments.join(", ") || "No segments"}</span>
                  <h2>{profile.fullName ?? profile.phone}</h2>
                  <p>
                    {profile.phone} · orders {profile.orderCount} · spent {profile.totalSpent}
                  </p>
                </div>
              </div>
              <p>
                Loyalty: {profile.loyalty?.pointsBalance ?? 0} pts · tier{" "}
                {profile.loyalty?.tierKey ?? "starter"}
              </p>
              <p>
                Retention: {profile.retention?.action ?? "n/a"} ·{" "}
                {profile.retention?.templateKey ?? "n/a"}
              </p>
              <button
                className="mini-button"
                onClick={() => {
                  if (!session?.accessToken) {
                    return;
                  }

                  void adjustCustomerLoyalty(session.accessToken, profile.id, {
                    points: 25,
                    description: "Manual support bonus"
                  })
                    .then(() => reload())
                    .catch((caughtError) =>
                      setError(
                        caughtError instanceof Error
                          ? caughtError.message
                          : "Loyalty adjustment failed."
                      )
                    );
                }}
              >
                +25 Loyalty
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Promotions</span>
            <h2>Create promo campaign</h2>
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

            void createPromotionCampaign(session.accessToken, {
              tenantId: effectiveTenantId,
              storeId: effectiveStoreId ?? null,
              code: promoDraft.code,
              name: promoDraft.name,
              type: promoDraft.type,
              value: promoDraft.value,
              minimumOrderTotal: promoDraft.minimumOrderTotal,
              pointsCost:
                promoDraft.type === "LOYALTY_REDEEM" ? Number(promoDraft.pointsCost) : null,
              segmentKeys: promoDraft.segmentKeys
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            })
              .then(() => reload())
              .catch((caughtError) =>
                setError(
                  caughtError instanceof Error
                    ? caughtError.message
                    : "Promotion campaign create failed."
                )
              );
          }}
        >
          <label className="field">
            <span>Code</span>
            <input
              value={promoDraft.code}
              onChange={(event) => setPromoDraft((current) => ({ ...current, code: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Name</span>
            <input
              value={promoDraft.name}
              onChange={(event) => setPromoDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Type</span>
            <select
              value={promoDraft.type}
              onChange={(event) =>
                setPromoDraft((current) => ({
                  ...current,
                  type: event.target.value as typeof current.type
                }))
              }
            >
              <option value="PERCENTAGE">PERCENTAGE</option>
              <option value="FIXED_AMOUNT">FIXED_AMOUNT</option>
              <option value="LOYALTY_REDEEM">LOYALTY_REDEEM</option>
            </select>
          </label>
          <label className="field">
            <span>Value</span>
            <input
              value={promoDraft.value}
              onChange={(event) => setPromoDraft((current) => ({ ...current, value: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Minimum Order Total</span>
            <input
              value={promoDraft.minimumOrderTotal}
              onChange={(event) =>
                setPromoDraft((current) => ({ ...current, minimumOrderTotal: event.target.value }))
              }
            />
          </label>
          {promoDraft.type === "LOYALTY_REDEEM" ? (
            <label className="field">
              <span>Points Cost</span>
              <input
                value={promoDraft.pointsCost}
                onChange={(event) =>
                  setPromoDraft((current) => ({ ...current, pointsCost: event.target.value }))
                }
              />
            </label>
          ) : null}
          <label className="field">
            <span>Segment Keys</span>
            <input
              value={promoDraft.segmentKeys}
              onChange={(event) =>
                setPromoDraft((current) => ({ ...current, segmentKeys: event.target.value }))
              }
            />
          </label>
          <button className="primary-button" type="submit">
            Create Promotion
          </button>
        </form>

        <div className="workspace-grid">
          {promotions.map((promotion) => (
            <article className="panel" key={promotion.id}>
              <div className="panel-header">
                <div>
                  <span className="eyebrow">{promotion.type}</span>
                  <h2>{promotion.code}</h2>
                  <p>
                    {promotion.name} · used {promotion.usedCount}
                    {promotion.usageLimit ? ` / ${promotion.usageLimit}` : ""}
                  </p>
                </div>
              </div>
              <p>
                Value: {promotion.value} · min order {promotion.minimumOrderTotal}
              </p>
              <p>Segments: {promotion.segmentKeys.join(", ") || "all customers"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
