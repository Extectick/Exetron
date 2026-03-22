"use client";

import type {
  GovernancePolicyDto,
  OrganizationDto,
  OrganizationOverviewDto,
  OrganizationMembershipDto,
  OrganizationTenantLinkDto,
  PartnerAccountDto,
  RolloutTemplateDto,
  TemplateApplicationDto,
  WhiteLabelPackDto
} from "@exetron/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../components/auth-provider";
import { apiBaseUrl } from "../../../lib/api";

type JsonRecord = Record<string, unknown>;

async function apiRequest<T>(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed with ${response.status}`);
  }

  return payload as T;
}

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJsonObject(value: string, label: string): JsonRecord {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed as JsonRecord;
}

function statusClass(status: string) {
  return `status-chip status-${status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "n/a";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function OrganizationsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [message, setMessage] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationDto[]>([]);
  const [overview, setOverview] = useState<OrganizationOverviewDto | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembershipDto[]>([]);
  const [tenantLinks, setTenantLinks] = useState<OrganizationTenantLinkDto[]>([]);
  const [policies, setPolicies] = useState<GovernancePolicyDto[]>([]);
  const [templates, setTemplates] = useState<RolloutTemplateDto[]>([]);
  const [applications, setApplications] = useState<TemplateApplicationDto[]>([]);
  const [packs, setPacks] = useState<WhiteLabelPackDto[]>([]);
  const [partners, setPartners] = useState<PartnerAccountDto[]>([]);

  const [organizationId, setOrganizationId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [linkId, setLinkId] = useState("");
  const [packId, setPackId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [policyKey, setPolicyKey] = useState("rollout-precedence");

  const [orgDraft, setOrgDraft] = useState({
    code: "network-core",
    name: "Network Core",
    status: "ACTIVE",
    metadata: "{\n  \"network\": \"core\"\n}"
  });
  const [membershipDraft, setMembershipDraft] = useState({ userId: "", roleKey: "owner" });
  const [linkDraft, setLinkDraft] = useState({ tenantId: "", roleKey: "owner" });
  const [policyDraft, setPolicyDraft] = useState('{\n  "mode": "template-first"\n}');
  const [templateDraft, setTemplateDraft] = useState({
    code: "regional-template",
    name: "Regional Template",
    artifact: '{\n  "locale": "en-US"\n}'
  });
  const [applicationDraft, setApplicationDraft] = useState({
    tenantId: "",
    storeId: "",
    sourceApplicationId: ""
  });
  const [packDraft, setPackDraft] = useState({
    code: "white-label-basic",
    name: "White Label Basic",
    artifact: '{\n  "branding": "core"\n}'
  });
  const [partnerDraft, setPartnerDraft] = useState({
    code: "partner-001",
    name: "Partner 001",
    metadata: '{\n  "tier": "starter"\n}'
  });

  const selectedOrganization = useMemo(
    () => organizations.find((item) => item.id === organizationId) ?? null,
    [organizationId, organizations]
  );
  const selectedMembership = useMemo(
    () => memberships.find((item) => item.id === membershipId) ?? null,
    [membershipId, memberships]
  );
  const selectedLink = useMemo(
    () => tenantLinks.find((item) => item.id === linkId) ?? null,
    [linkId, tenantLinks]
  );
  const selectedPolicy = useMemo(
    () => policies.find((item) => item.policyKey === policyKey) ?? null,
    [policies, policyKey]
  );
  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === templateId) ?? null,
    [templateId, templates]
  );
  const selectedApplication = useMemo(
    () => applications.find((item) => item.id === applicationId) ?? null,
    [applicationId, applications]
  );
  const selectedPack = useMemo(() => packs.find((item) => item.id === packId) ?? null, [packId, packs]);
  const selectedPartner = useMemo(
    () => partners.find((item) => item.id === partnerId) ?? null,
    [partnerId, partners]
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const orgList = await apiRequest<{ items: OrganizationDto[] }>("/organizations", token);
      const orgItems = orgList.items ?? [];
      setOrganizations(orgItems);

      if (!organizationId && orgItems[0]) {
        setOrganizationId(orgItems[0].id);
      }

      if (organizationId) {
        const [overviewResult, membershipsResult, linksResult, policiesResult, templatesResult, packsResult, partnersResult] =
          await Promise.all([
            apiRequest<OrganizationOverviewDto>(`/organizations/${organizationId}/overview`, token),
            apiRequest<{ items: OrganizationMembershipDto[] }>(`/organizations/${organizationId}/memberships`, token),
            apiRequest<{ items: OrganizationTenantLinkDto[] }>(`/organizations/${organizationId}/tenants`, token),
            apiRequest<{ items: GovernancePolicyDto[] }>(`/organizations/${organizationId}/governance-policies`, token),
            apiRequest<{ items: RolloutTemplateDto[] }>(`/organizations/${organizationId}/templates`, token),
            apiRequest<{ items: WhiteLabelPackDto[] }>(`/organizations/${organizationId}/white-label-packs`, token),
            apiRequest<{ items: PartnerAccountDto[] }>(`/organizations/${organizationId}/partner-accounts`, token)
          ]);

        setOverview(overviewResult);
        setMemberships(membershipsResult.items ?? []);
        setTenantLinks(linksResult.items ?? []);
        setPolicies(policiesResult.items ?? []);
        setTemplates(templatesResult.items ?? []);
        setPacks(packsResult.items ?? []);
        setPartners(partnersResult.items ?? []);

        if (!templateId && templatesResult.items?.[0]) {
          setTemplateId(templatesResult.items[0].id);
        }
      } else {
        setOverview(null);
        setMemberships([]);
        setTenantLinks([]);
        setPolicies([]);
        setTemplates([]);
        setApplications([]);
        setPacks([]);
        setPartners([]);
      }

      if (organizationId && templateId) {
        const history = await apiRequest<{ items: TemplateApplicationDto[] }>(
          `/organizations/${organizationId}/templates/${templateId}/applications`,
          token
        );
        setApplications(history.items ?? []);
      } else {
        setApplications([]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Organizations load failed.");
    }
  }, [organizationId, templateId, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (selectedOrganization) {
      setOrgDraft({
        code: selectedOrganization.code,
        name: selectedOrganization.name,
        status: selectedOrganization.status,
        metadata: prettyJson(selectedOrganization.metadata)
      });
    }
  }, [selectedOrganization]);

  useEffect(() => {
    if (selectedMembership) {
      setMembershipDraft({
        userId: selectedMembership.userId,
        roleKey: selectedMembership.roleKey
      });
    }
  }, [selectedMembership]);

  useEffect(() => {
    if (selectedLink) {
      setLinkDraft({
        tenantId: selectedLink.tenantId,
        roleKey: selectedLink.roleKey
      });
    }
  }, [selectedLink]);

  useEffect(() => {
    if (selectedPolicy) {
      setPolicyDraft(prettyJson(selectedPolicy.rules));
    }
  }, [selectedPolicy]);

  useEffect(() => {
    if (selectedTemplate) {
      setTemplateDraft({
        code: selectedTemplate.code,
        name: selectedTemplate.name,
        artifact: prettyJson(selectedTemplate.artifact)
      });
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedPack) {
      setPackDraft({
        code: selectedPack.code,
        name: selectedPack.name,
        artifact: prettyJson(selectedPack.artifact)
      });
    }
  }, [selectedPack]);

  useEffect(() => {
    if (selectedPartner) {
      setPartnerDraft({
        code: selectedPartner.code,
        name: selectedPartner.name,
        metadata: prettyJson(selectedPartner.metadata)
      });
    }
  }, [selectedPartner]);

  async function run(action: () => Promise<unknown>, note: string) {
    try {
      await action();
      setMessage(note);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Organization action failed.");
    }
  }

  function chooseOrganization(nextId: string) {
    setOrganizationId(nextId);
    setTemplateId("");
    setApplicationId("");
    setMembershipId("");
    setLinkId("");
    setPackId("");
    setPartnerId("");
  }

  function chooseTemplate(nextId: string) {
    setTemplateId(nextId);
    setApplicationId("");
  }

  return (
    <div className="stack-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">PHASE 19</span>
            <h2>Organization workspace</h2>
            <p>Operator console for network governance, rollout, branding and partner operations.</p>
          </div>
          <button className="ghost-button" type="button" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>

        {message ? <p className="error-banner">{message}</p> : null}

        <div className="toolbar">
          <label className="field" style={{ minWidth: 280 }}>
            <span>Organization</span>
            <select value={organizationId} onChange={(event) => chooseOrganization(event.target.value)}>
              <option value="">Select organization</option>
              {organizations.map((item) => (
                <option key={item.id} value={item.id}>{item.code} · {item.name}</option>
              ))}
            </select>
          </label>
          <label className="field" style={{ minWidth: 280 }}>
            <span>Template</span>
            <select value={templateId} onChange={(event) => chooseTemplate(event.target.value)}>
              <option value="">Select template</option>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>{item.code} · v{item.version}</option>
              ))}
            </select>
          </label>
          <div className="code-chip">scope: org / tenant / store / partner</div>
        </div>

        <div className="summary-grid">
          <article className="summary-card"><span>Organizations</span><strong>{organizations.length}</strong><span>{organizations.filter((item) => item.status === "ACTIVE").length} active</span></article>
          <article className="summary-card"><span>Access</span><strong>{memberships.length + tenantLinks.length}</strong><span>{memberships.length} memberships, {tenantLinks.length} tenant links</span></article>
          <article className="summary-card"><span>Governance</span><strong>{policies.length + templates.length}</strong><span>{templates.length} templates, {policies.length} policies</span></article>
          <article className="summary-card"><span>Branding</span><strong>{packs.length + partners.length}</strong><span>{packs.length} packs, {partners.length} partners</span></article>
        </div>
        {overview ? (
          <article className="entity-card" style={{ marginTop: 16 }}>
            <div className="entity-head">
              <div className="entity-title">
                <h3 style={{ margin: 0 }}>Operational Snapshot</h3>
                <span className="entity-meta inline-code">{overview.organization.id}</span>
              </div>
              <span className={statusClass(overview.organization.status)}>{overview.organization.status}</span>
            </div>
            <div className="detail-grid">
              <div><strong>Template apps</strong><span>{overview.summary.templateApplicationCount}</span></div>
              <div><strong>Linked tenants</strong><span>{overview.coverage.linkedTenantIds.length}</span></div>
              <div><strong>Members</strong><span>{overview.coverage.memberUserIds.length}</span></div>
              <div><strong>Stores touched</strong><span>{overview.coverage.linkedStoreIds.length}</span></div>
              <div><strong>Latest template</strong><span>{overview.latest.rolloutTemplate?.code ?? "n/a"}</span></div>
              <div><strong>Latest partner</strong><span>{overview.latest.partnerAccount?.code ?? "n/a"}</span></div>
            </div>
            <div className="detail-grid" style={{ marginTop: 12 }}>
              <div><strong>Policy statuses</strong><span className="inline-code">{prettyJson(overview.statuses.governancePolicies)}</span></div>
              <div><strong>Template statuses</strong><span className="inline-code">{prettyJson(overview.statuses.rolloutTemplates)}</span></div>
              <div><strong>Application statuses</strong><span className="inline-code">{prettyJson(overview.statuses.templateApplications)}</span></div>
              <div><strong>Pack statuses</strong><span className="inline-code">{prettyJson(overview.statuses.whiteLabelPacks)}</span></div>
            </div>
          </article>
        ) : null}
      </section>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Directory</span>
              <h2>Roster and selected organization</h2>
            </div>
          </div>
          <div className="split-grid">
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token) return;
              void run(() => apiRequest<{ id: string }>("/organizations", token, {
                method: "POST",
                body: JSON.stringify({
                  code: orgDraft.code,
                  name: orgDraft.name,
                  status: orgDraft.status,
                  metadata: parseJsonObject(orgDraft.metadata, "Organization metadata")
                })
              }).then((created) => chooseOrganization(created.id)), "Organization saved.");
            }}>
              <h3 style={{ margin: 0 }}>Create or update</h3>
              <label className="field"><span>Code</span><input value={orgDraft.code} onChange={(event) => setOrgDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <label className="field"><span>Name</span><input value={orgDraft.name} onChange={(event) => setOrgDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="field"><span>Status</span><select value={orgDraft.status} onChange={(event) => setOrgDraft((current) => ({ ...current, status: event.target.value }))}><option value="ACTIVE">ACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></label>
              <label className="field"><span>Metadata JSON</span><textarea rows={5} value={orgDraft.metadata} onChange={(event) => setOrgDraft((current) => ({ ...current, metadata: event.target.value }))} /></label>
              <div className="action-row">
                <button className="primary-button" type="submit">Save</button>
                <button className="ghost-button" type="button" disabled={!organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/status`, token!, { method: "POST", body: JSON.stringify({ status: "ACTIVE" }) }), "Organization marked active.")}>Set Active</button>
                <button className="ghost-button" type="button" disabled={!organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/archive`, token!, { method: "POST" }), "Organization archived.")}>Archive</button>
              </div>
            </form>
            <div className="entity-list">
              {organizations.map((item) => (
                <article className={`entity-card ${organizationId === item.id ? "active" : ""}`} key={item.id}>
                  <div className="entity-head"><div className="entity-title"><h4>{item.name}</h4><span className="entity-meta inline-code">{item.code}</span></div><span className={statusClass(item.status)}>{item.status}</span></div>
                  <div className="detail-grid"><div><strong>Updated</strong><span>{formatTimestamp(item.updatedAt)}</span></div><div><strong>Created</strong><span>{formatTimestamp(item.createdAt)}</span></div></div>
                  <div className="action-row"><button className="mini-button" type="button" onClick={() => chooseOrganization(item.id)}>Select</button></div>
                </article>
              ))}
              {!organizations.length ? <div className="empty-state">No organizations yet.</div> : null}
            </div>
          </div>
          <article className="entity-card" style={{ marginTop: 16 }}>
            <div className="entity-head"><div className="entity-title"><h3 style={{ margin: 0 }}>{selectedOrganization?.name ?? "Organization details"}</h3><span className="entity-meta inline-code">{selectedOrganization?.code ?? "Pick a roster item"}</span></div>{selectedOrganization ? <span className={statusClass(selectedOrganization.status)}>{selectedOrganization.status}</span> : null}</div>
            {selectedOrganization ? <div className="detail-grid"><div><strong>Organization ID</strong><span className="inline-code">{selectedOrganization.id}</span></div><div><strong>Created</strong><span>{formatTimestamp(selectedOrganization.createdAt)}</span></div><div><strong>Updated</strong><span>{formatTimestamp(selectedOrganization.updatedAt)}</span></div><div><strong>Metadata</strong><span className="code-chip">JSON object</span></div><pre>{prettyJson(selectedOrganization.metadata)}</pre></div> : <div className="empty-state">No organization selected.</div>}
          </article>
        </section>

        <section className="panel">
          <div className="panel-header"><div><span className="eyebrow">Access</span><h2>Memberships and tenant links</h2></div></div>
          <div className="split-grid">
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token || !organizationId) return;
              void run(() => apiRequest<{ id: string }>(`/organizations/${organizationId}/memberships`, token, { method: "POST", body: JSON.stringify(membershipDraft) }).then((created) => setMembershipId(created.id)), "Membership saved.");
            }}>
              <h3 style={{ margin: 0 }}>Membership</h3>
              <label className="field"><span>User ID</span><input value={membershipDraft.userId} onChange={(event) => setMembershipDraft((current) => ({ ...current, userId: event.target.value }))} /></label>
              <label className="field"><span>Role Key</span><input value={membershipDraft.roleKey} onChange={(event) => setMembershipDraft((current) => ({ ...current, roleKey: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save</button><button className="ghost-button" type="button" disabled={!membershipId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/memberships/${membershipId}`, token!, { method: "PATCH", body: JSON.stringify({ roleKey: membershipDraft.roleKey }) }), "Membership updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!membershipId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/memberships/${membershipId}/status`, token!, { method: "POST", body: JSON.stringify({ status: "ACTIVE" }) }), "Membership marked active.")}>Set Active</button><button className="ghost-button" type="button" disabled={!membershipId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/memberships/${membershipId}/archive`, token!, { method: "POST" }), "Membership archived.")}>Archive</button></div>
            </form>
            <form className="editor-form" onSubmit={(event) => {
              event.preventDefault();
              if (!token || !organizationId) return;
              void run(() => apiRequest<{ id: string }>(`/organizations/${organizationId}/tenants`, token, { method: "POST", body: JSON.stringify(linkDraft) }).then((created) => setLinkId(created.id)), "Tenant link saved.");
            }}>
              <h3 style={{ margin: 0 }}>Tenant link</h3>
              <label className="field"><span>Tenant ID</span><input value={linkDraft.tenantId} onChange={(event) => setLinkDraft((current) => ({ ...current, tenantId: event.target.value }))} /></label>
              <label className="field"><span>Role Key</span><input value={linkDraft.roleKey} onChange={(event) => setLinkDraft((current) => ({ ...current, roleKey: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save</button><button className="ghost-button" type="button" disabled={!linkId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/tenants/${linkId}`, token!, { method: "PATCH", body: JSON.stringify({ roleKey: linkDraft.roleKey }) }), "Tenant link updated.")}>Update Selected</button><button className="ghost-button" type="button" disabled={!linkId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/tenants/${linkId}/status`, token!, { method: "POST", body: JSON.stringify({ status: "ACTIVE" }) }), "Tenant link marked active.")}>Set Active</button><button className="ghost-button" type="button" disabled={!linkId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/tenants/${linkId}/archive`, token!, { method: "POST" }), "Tenant link archived.")}>Archive</button></div>
            </form>
          </div>
          <div className="entity-grid" style={{ marginTop: 16 }}>
            <article className="entity-card"><div className="entity-head"><div className="entity-title"><h4>Memberships</h4><span className="entity-meta">{memberships.length} records</span></div></div>{memberships.map((item) => <div className="detail-grid" key={item.id}><div><strong>User</strong><span className="inline-code">{item.userId}</span></div><div><strong>Role</strong><span>{item.roleKey}</span></div><div><button className="mini-button" type="button" onClick={() => setMembershipId(item.id)}>Select</button></div></div>)}{!memberships.length ? <div className="empty-state">No memberships yet.</div> : null}{selectedMembership ? <div className="detail-grid" style={{ marginTop: 12 }}><div><strong>Selected</strong><span className="inline-code">{selectedMembership.id}</span></div><div><strong>Status</strong><span>{membershipId === selectedMembership.id ? "selected" : "inactive"}</span></div></div> : null}</article>
            <article className="entity-card"><div className="entity-head"><div className="entity-title"><h4>Tenant links</h4><span className="entity-meta">{tenantLinks.length} records</span></div></div>{tenantLinks.map((item) => <div className="detail-grid" key={item.id}><div><strong>Tenant</strong><span className="inline-code">{item.tenantId}</span></div><div><strong>Role</strong><span>{item.roleKey}</span></div><div><button className="mini-button" type="button" onClick={() => setLinkId(item.id)}>Select</button></div></div>)}{!tenantLinks.length ? <div className="empty-state">No tenant links yet.</div> : null}{selectedLink ? <div className="detail-grid" style={{ marginTop: 12 }}><div><strong>Selected</strong><span className="inline-code">{selectedLink.id}</span></div><div><strong>Status</strong><span>{linkId === selectedLink.id ? "selected" : "inactive"}</span></div></div> : null}</article>
          </div>
        </section>
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-header"><div><span className="eyebrow">Governance</span><h2>Policies, templates and applications</h2></div></div>
          <div className="split-grid">
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); if (!token || !organizationId) return; void run(() => apiRequest(`/organizations/${organizationId}/governance-policies/${policyKey}`, token, { method: "PUT", body: JSON.stringify({ rules: parseJsonObject(policyDraft, "Governance policy rules") }) }), "Governance policy saved."); }}>
              <h3 style={{ margin: 0 }}>Governance policy</h3>
              <label className="field"><span>Policy key</span><input value={policyKey} onChange={(event) => setPolicyKey(event.target.value)} /></label>
              <label className="field"><span>Rules JSON</span><textarea rows={6} value={policyDraft} onChange={(event) => setPolicyDraft(event.target.value)} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save</button><button className="ghost-button" type="button" disabled={!organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/governance-policies/${policyKey}/status`, token!, { method: "POST", body: JSON.stringify({ status: "ACTIVE" }) }), "Governance policy marked active.")}>Set Active</button><button className="ghost-button" type="button" disabled={!organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/governance-policies/${policyKey}/archive`, token!, { method: "POST" }), "Governance policy archived.")}>Archive</button></div>
            </form>
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); if (!token || !organizationId) return; void run(() => apiRequest<{ id: string }>(`/organizations/${organizationId}/templates`, token, { method: "POST", body: JSON.stringify({ code: templateDraft.code, name: templateDraft.name, artifact: parseJsonObject(templateDraft.artifact, "Template artifact") }) }).then((created) => chooseTemplate(created.id)), "Template saved."); }}>
              <h3 style={{ margin: 0 }}>Rollout template</h3>
              <label className="field"><span>Code</span><input value={templateDraft.code} onChange={(event) => setTemplateDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <label className="field"><span>Name</span><input value={templateDraft.name} onChange={(event) => setTemplateDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="field"><span>Artifact JSON</span><textarea rows={6} value={templateDraft.artifact} onChange={(event) => setTemplateDraft((current) => ({ ...current, artifact: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save</button><button className="ghost-button" type="button" disabled={!templateId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/templates/${templateId}/status`, token!, { method: "POST", body: JSON.stringify({ status: "ACTIVE" }) }), "Template marked active.")}>Set Active</button><button className="ghost-button" type="button" disabled={!templateId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/templates/${templateId}/reapply`, token!, { method: "POST", body: JSON.stringify({ tenantId: applicationDraft.tenantId || undefined, storeId: applicationDraft.storeId || undefined, applicationId: applicationDraft.sourceApplicationId || undefined }) }), "Template reapplied.")}>Reapply</button><button className="ghost-button" type="button" disabled={!templateId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/templates/${templateId}/archive`, token!, { method: "POST" }), "Template archived.")}>Archive</button></div>
              <div className="detail-grid"><div><strong>Tenant</strong><input value={applicationDraft.tenantId} onChange={(event) => setApplicationDraft((current) => ({ ...current, tenantId: event.target.value }))} placeholder="tenant id" /></div><div><strong>Store</strong><input value={applicationDraft.storeId} onChange={(event) => setApplicationDraft((current) => ({ ...current, storeId: event.target.value }))} placeholder="store id" /></div><div><strong>Source application</strong><input value={applicationDraft.sourceApplicationId} onChange={(event) => setApplicationDraft((current) => ({ ...current, sourceApplicationId: event.target.value }))} placeholder="optional application id" /></div></div>
            </form>
          </div>
          <div className="entity-grid" style={{ marginTop: 16 }}>
            <article className="entity-card"><div className="entity-head"><div className="entity-title"><h4>Policies</h4><span className="entity-meta">{policies.length} policies</span></div></div>{policies.map((item) => <div className="detail-grid" key={item.id}><div><strong>Key</strong><span>{item.policyKey}</span></div><div><strong>Updated</strong><span>{formatTimestamp(item.updatedAt)}</span></div><div><button className="mini-button" type="button" onClick={() => setPolicyKey(item.policyKey)}>Select</button></div></div>)}{!policies.length ? <div className="empty-state">No policies yet.</div> : null}{selectedPolicy ? <div style={{ marginTop: 12 }}><div className="code-chip">selected policy: {selectedPolicy.policyKey}</div><pre>{prettyJson(selectedPolicy.rules)}</pre></div> : null}</article>
            <article className="entity-card"><div className="entity-head"><div className="entity-title"><h4>Templates</h4><span className="entity-meta">{templates.length} templates</span></div></div>{templates.map((item) => <div className="detail-grid" key={item.id}><div><strong>Code</strong><span>{item.code}</span></div><div><strong>Version</strong><span>{item.version}</span></div><div><button className="mini-button" type="button" onClick={() => chooseTemplate(item.id)}>Select</button></div></div>)}{!templates.length ? <div className="empty-state">No templates yet.</div> : null}{selectedTemplate ? <div style={{ marginTop: 12 }}><div className="detail-grid"><div><strong>Template</strong><span className="inline-code">{selectedTemplate.id}</span></div><div><strong>Version</strong><span>{selectedTemplate.version}</span></div></div><pre>{prettyJson(selectedTemplate.artifact)}</pre></div> : null}</article>
          </div>
          <article className="entity-card" style={{ marginTop: 16 }}>
            <div className="entity-head"><div className="entity-title"><h4>Template applications</h4><span className="entity-meta">{applications.length} items</span></div></div>
            {applications.map((item) => <div className="detail-grid" key={item.id}><div><strong>Tenant</strong><span className="inline-code">{item.tenantId ?? "n/a"}</span></div><div><strong>Store</strong><span className="inline-code">{item.storeId ?? "n/a"}</span></div><div><strong>Version</strong><span>{item.appliedVersion}</span></div><div><button className="mini-button" type="button" onClick={() => setApplicationId(item.id)}>Select</button></div></div>)}
            {!applications.length ? <div className="empty-state">No applications yet.</div> : null}
            <div className="action-row" style={{ marginTop: 12 }}><button className="ghost-button" type="button" disabled={!templateId || !applicationId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/templates/${templateId}/applications/${applicationId}/status`, token!, { method: "POST", body: JSON.stringify({ status: "APPLIED" }) }), "Template application marked applied.")}>Set Applied</button><button className="ghost-button" type="button" disabled={!templateId || !applicationId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/templates/${templateId}/applications/${applicationId}/status`, token!, { method: "POST", body: JSON.stringify({ status: "ARCHIVED" }) }), "Template application archived.")}>Archive</button></div>
            {selectedApplication ? <div style={{ marginTop: 12 }}><div className="detail-grid"><div><strong>Application</strong><span className="inline-code">{selectedApplication.id}</span></div><div><strong>Result</strong><span>{selectedApplication.resultSummary ? "available" : "n/a"}</span></div></div><pre>{prettyJson(selectedApplication.resultSummary)}</pre></div> : null}
          </article>
        </section>

        <section className="panel">
          <div className="panel-header"><div><span className="eyebrow">Branding</span><h2>White-label packs and partner accounts</h2></div></div>
          <div className="split-grid">
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); if (!token || !organizationId) return; void run(() => apiRequest<{ id: string }>(`/organizations/${organizationId}/white-label-packs`, token, { method: "POST", body: JSON.stringify({ code: packDraft.code, name: packDraft.name, artifact: parseJsonObject(packDraft.artifact, "White-label pack artifact") }) }).then((created) => setPackId(created.id)), "White-label pack saved."); }}>
              <h3 style={{ margin: 0 }}>White-label pack</h3>
              <label className="field"><span>Code</span><input value={packDraft.code} onChange={(event) => setPackDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <label className="field"><span>Name</span><input value={packDraft.name} onChange={(event) => setPackDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="field"><span>Artifact JSON</span><textarea rows={6} value={packDraft.artifact} onChange={(event) => setPackDraft((current) => ({ ...current, artifact: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save</button><button className="ghost-button" type="button" disabled={!packId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/white-label-packs/${packId}/status`, token!, { method: "POST", body: JSON.stringify({ status: "ACTIVE" }) }), "White-label pack marked active.")}>Set Active</button><button className="ghost-button" type="button" disabled={!packId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/white-label-packs/${packId}/archive`, token!, { method: "POST" }), "White-label pack archived.")}>Archive</button></div>
            </form>
            <form className="editor-form" onSubmit={(event) => { event.preventDefault(); if (!token || !organizationId) return; void run(() => apiRequest<{ id: string }>(`/organizations/${organizationId}/partner-accounts`, token, { method: "POST", body: JSON.stringify({ code: partnerDraft.code, name: partnerDraft.name, metadata: parseJsonObject(partnerDraft.metadata, "Partner metadata") }) }).then((created) => setPartnerId(created.id)), "Partner account saved."); }}>
              <h3 style={{ margin: 0 }}>Partner account</h3>
              <label className="field"><span>Code</span><input value={partnerDraft.code} onChange={(event) => setPartnerDraft((current) => ({ ...current, code: event.target.value }))} /></label>
              <label className="field"><span>Name</span><input value={partnerDraft.name} onChange={(event) => setPartnerDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="field"><span>Metadata JSON</span><textarea rows={6} value={partnerDraft.metadata} onChange={(event) => setPartnerDraft((current) => ({ ...current, metadata: event.target.value }))} /></label>
              <div className="action-row"><button className="primary-button" type="submit">Save</button><button className="ghost-button" type="button" disabled={!partnerId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/partner-accounts/${partnerId}/status`, token!, { method: "POST", body: JSON.stringify({ status: "ACTIVE" }) }), "Partner marked active.")}>Set Active</button><button className="ghost-button" type="button" disabled={!partnerId || !organizationId || !token} onClick={() => void run(() => apiRequest(`/organizations/${organizationId}/partner-accounts/${partnerId}/archive`, token!, { method: "POST" }), "Partner archived.")}>Archive</button></div>
            </form>
          </div>
          <div className="entity-grid" style={{ marginTop: 16 }}>
            <article className="entity-card"><div className="entity-head"><div className="entity-title"><h4>White-label packs</h4><span className="entity-meta">{packs.length} packs</span></div></div>{packs.map((item) => <div className="detail-grid" key={item.id}><div><strong>Code</strong><span>{item.code}</span></div><div><strong>Name</strong><span>{item.name}</span></div><div><button className="mini-button" type="button" onClick={() => setPackId(item.id)}>Select</button></div></div>)}{!packs.length ? <div className="empty-state">No packs yet.</div> : null}</article>
            <article className="entity-card"><div className="entity-head"><div className="entity-title"><h4>Partner accounts</h4><span className="entity-meta">{partners.length} partners</span></div></div>{partners.map((item) => <div className="detail-grid" key={item.id}><div><strong>Code</strong><span>{item.code}</span></div><div><strong>Status</strong><span>{item.status}</span></div><div><button className="mini-button" type="button" onClick={() => setPartnerId(item.id)}>Select</button></div></div>)}{!partners.length ? <div className="empty-state">No partners yet.</div> : null}</article>
          </div>
        </section>
      </div>
    </div>
  );
}
