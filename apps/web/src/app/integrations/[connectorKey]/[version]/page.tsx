import type { EnterpriseDeveloperDocsDto, EnterpriseDeveloperPackageDto, EnterprisePublicPublicationDto } from "@exetron/contracts";
import { notFound } from "next/navigation";
import { apiBaseUrl } from "../../../../lib/api";

type PublicPageProps = {
  params: Promise<{
    connectorKey: string;
    version: string;
  }>;
  searchParams?: Promise<{
    grantToken?: string;
    consumerKey?: string;
  }>;
};

async function fetchJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store"
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function detailRow(label: string, value: string) {
  return (
    <div>
      <strong>{label}</strong>
      <span className="inline-code">{value}</span>
    </div>
  );
}

export default async function PublicIntegrationPublicationPage({ params, searchParams }: PublicPageProps) {
  const { connectorKey, version } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const grantToken = resolvedSearchParams.grantToken?.trim() ?? "";
  const consumerKey = resolvedSearchParams.consumerKey?.trim() || "public-web";
  const encodedConnectorKey = encodeURIComponent(connectorKey);
  const encodedVersion = encodeURIComponent(version);
  const tokenParams = new URLSearchParams();
  if (grantToken) {
    tokenParams.set("grantToken", grantToken);
  }
  if (consumerKey) {
    tokenParams.set("consumerKey", consumerKey);
  }
  const tokenQuery = tokenParams.toString() ? `?${tokenParams.toString()}` : "";
  const packageQuery = tokenQuery || `?consumerKey=${encodeURIComponent(consumerKey)}`;

  const publication = await fetchJson<EnterprisePublicPublicationDto>(
    `/enterprise/publications/${encodedConnectorKey}/${encodedVersion}${tokenQuery}`
  );

  if (!publication) {
    notFound();
  }

  const [developerPackage, developerDocs] = await Promise.all([
    fetchJson<EnterpriseDeveloperPackageDto>(
      `/enterprise/publications/${encodedConnectorKey}/${encodedVersion}/package${packageQuery}`
    ),
    fetchJson<EnterpriseDeveloperDocsDto>(
      `/enterprise/publications/${encodedConnectorKey}/${encodedVersion}/docs${packageQuery}`
    )
  ]);

  if (!developerPackage || !developerDocs) {
    notFound();
  }

  return (
    <div className="stack-layout" style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px" }}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">PUBLIC INTEGRATION RELEASE</span>
            <h2>{publication.connectorKey}@{publication.version}</h2>
            <p>Published developer package, docs and attestation snapshot for external consumers.</p>
          </div>
        </div>
        <div className="summary-grid">
          <article className="summary-card">
            <span>Channel</span>
            <strong>{publication.channel}</strong>
            <span>{publication.visibility} visibility</span>
          </article>
          <article className="summary-card">
            <span>Status</span>
            <strong>{publication.status}</strong>
            <span>{publication.revokedAt ? `Revoked ${publication.revokedAt}` : `Published ${publication.publishedAt}`}</span>
          </article>
          <article className="summary-card">
            <span>Signature</span>
            <strong>{publication.attestation.signatureStatus}</strong>
            <span>{publication.attestation.signatureAlgorithm ?? "unsigned"}</span>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Compatibility</span>
            <h2>Package snapshot</h2>
          </div>
        </div>
        <div className="detail-grid">
          {detailRow("Template version", developerPackage.compatibility.templateVersion ?? "n/a")}
          {detailRow("Rollout channel", developerPackage.compatibility.rolloutChannel)}
          {detailRow("Deprecation stage", developerPackage.lifecycle.deprecationStage)}
          {detailRow("Signature key", publication.attestation.keyRef ?? "n/a")}
          {detailRow("Package digest", publication.attestation.packageDigest)}
          {detailRow("Docs digest", publication.attestation.docsDigest)}
        </div>
        <textarea rows={16} value={developerPackage.content} readOnly style={{ width: "100%", marginTop: 16 }} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Documentation</span>
            <h2>Developer docs snapshot</h2>
          </div>
        </div>
        <div className="detail-grid">
          {detailRow("Title", developerDocs.title)}
          {detailRow("Summary", developerDocs.summary)}
          {detailRow("Package URL", publication.packageUrl)}
          {detailRow("Docs URL", publication.docsUrl)}
        </div>
        <textarea rows={20} value={developerDocs.markdown} readOnly style={{ width: "100%", marginTop: 16 }} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Attestation</span>
            <h2>Release payload</h2>
          </div>
        </div>
        <div className="detail-grid">
          {detailRow("Algorithm", publication.attestation.algorithm)}
          {detailRow("Artifact digest", publication.attestation.artifactDigest)}
          {detailRow("Signed at", publication.attestation.signedAt ?? "n/a")}
        </div>
        <textarea rows={14} value={publication.attestation.payload} readOnly style={{ width: "100%", marginTop: 16 }} />
      </section>
    </div>
  );
}
