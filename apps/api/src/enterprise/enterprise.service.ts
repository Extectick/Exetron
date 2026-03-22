import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { Prisma } from "@exetron/database";
import type { RequestContext } from "@exetron/types";
import { BILLING_STATE_KEY } from "../billing/billing-state.util";
import { PrismaService } from "../database/prisma.service";
import {
  asArray,
  asInputJson,
  asNullableInputJson,
  asObject,
  asUuidOrNull,
  JsonRecord,
  mapDates,
  resolveContext,
  toIso
} from "./enterprise.helpers";
import {
  consumeEnterpriseResetState,
  ENTERPRISE_RESET_STATEMENTS
} from "./enterprise.state";
import {
  evaluateInventorySupplierProviderRuntimeCompatibility,
  listInventorySupplierProviderRuntimePolicies,
  resolveInventorySupplierProviderRuntimePolicyForRuntime
} from "../inventory/inventory-supplier-provider-policy.util";

@Injectable()
export class EnterpriseService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly RELEASE_SIGNING_SECRET_KEY = "integration.release.signing-key";

  private countStatuses(items: Array<{ status?: string | null }>) {
    return items.reduce<Record<string, number>>((accumulator, item) => {
      const status = String(item.status ?? "UNKNOWN").trim().toUpperCase();
      accumulator[status] = (accumulator[status] ?? 0) + 1;
      return accumulator;
    }, {});
  }

  async onModuleInit(): Promise<void> {
    if (consumeEnterpriseResetState()) {
      for (const statement of ENTERPRISE_RESET_STATEMENTS) {
        await this.prisma.$executeRawUnsafe(statement);
      }
    }
  }

  private async one<T = Record<string, unknown>>(query: Prisma.Sql): Promise<T | null> {
    const rows = await this.prisma.$queryRaw<T[]>(query);
    return rows[0] ?? null;
  }

  private async tenantAccount(tenantId: string) {
    return this.one<any>(
      Prisma.sql`SELECT * FROM "EnterpriseBillingAccount" WHERE "tenantId" = ${tenantId}::uuid LIMIT 1`
    );
  }

  private async plan(planId: string) {
    return this.one<any>(
      Prisma.sql`SELECT * FROM "EnterpriseBillingPlan" WHERE "id" = ${planId}::uuid LIMIT 1`
    );
  }

  private async trial(tenantId: string) {
    return this.one<any>(
      Prisma.sql`SELECT * FROM "EnterpriseTrialGrant" WHERE "tenantId" = ${tenantId}::uuid LIMIT 1`
    );
  }

  private normalizeRecord<T extends Record<string, unknown>>(
    row: T,
    options: {
      json?: string[];
      nullableJson?: string[];
      arrays?: string[];
      dates?: string[];
    } = {}
  ) {
    const normalized = { ...row } as Record<string, unknown>;

    for (const key of options.json ?? []) {
      normalized[key] = asObject(normalized[key]);
    }

    for (const key of options.nullableJson ?? []) {
      normalized[key] = normalized[key] ? asObject(normalized[key]) : null;
    }

    for (const key of options.arrays ?? []) {
      normalized[key] = asArray(normalized[key]);
    }

    return mapDates(normalized, options.dates ?? []);
  }

  private ensureRecord<T>(row: T | null, message: string): T {
    if (!row) {
      throw new NotFoundException(message);
    }

    return row;
  }

  private partialUpdate(input: JsonRecord, keys: string[], transforms: Record<string, (value: unknown) => unknown> = {}) {
    const data: Record<string, unknown> = {};

    for (const key of keys) {
      if (input[key] !== undefined) {
        data[key] = transforms[key] ? transforms[key](input[key]) : input[key];
      }
    }

    return data;
  }

  private normalizePublication(row: Record<string, unknown>) {
    return this.normalizeRecord(row, {
      json: ["artifact", "attestation"],
      dates: ["publishedAt", "revokedAt", "createdAt", "updatedAt"]
    });
  }

  private normalizePublicationEvent(row: Record<string, unknown>) {
    return this.normalizeRecord(row, {
      nullableJson: ["metadata"],
      dates: ["createdAt"]
    });
  }

  private normalizeDistributionRequest(row: Record<string, unknown>) {
    return this.normalizeRecord(row, {
      nullableJson: ["intendedUse", "decisionNotes"],
      dates: ["grantExpiresAt", "approvedAt", "revokedAt", "createdAt", "updatedAt"]
    });
  }

  private normalizeActivationRequest(row: Record<string, unknown>) {
    return this.normalizeRecord(row, {
      nullableJson: ["requestNotes", "decisionNotes", "activationArtifact"],
      dates: [
        "approvedAt",
        "rejectedAt",
        "appliedAt",
        "revokedAt",
        "createdAt",
        "updatedAt"
      ]
    });
  }

  private normalizeAnalyticsEvent(item: Record<string, unknown>): Record<string, unknown> & {
    publicationId?: string | null;
    eventType: string;
    actorType: string;
    actorKey: string | null;
    createdAt: string;
  } {
    return {
      ...item,
      publicationId:
        item.publicationId !== undefined && item.publicationId !== null
          ? String(item.publicationId)
          : null,
      eventType: String(item.eventType),
      actorType: String(item.actorType),
      actorKey: item.actorKey ? String(item.actorKey) : null,
      createdAt: String(item.createdAt)
    };
  }

  private normalizeAnalyticsRequest(item: Record<string, unknown>): Record<string, unknown> & {
    publicationId?: string | null;
    accessToken?: string | null;
    grantedConsumerKey?: string | null;
    status: string;
    createdAt: string;
    grantExpiresAt: string | null;
    approvedAt: string | null;
    revokedAt: string | null;
    updatedAt: string;
  } {
    return {
      ...item,
      publicationId:
        item.publicationId !== undefined && item.publicationId !== null
          ? String(item.publicationId)
          : null,
      accessToken:
        item.accessToken !== undefined && item.accessToken !== null
          ? String(item.accessToken)
          : null,
      grantedConsumerKey:
        item.grantedConsumerKey !== undefined && item.grantedConsumerKey !== null
          ? String(item.grantedConsumerKey)
          : null,
      status: String(item.status ?? "PENDING").trim().toUpperCase(),
      createdAt: String(item.createdAt),
      grantExpiresAt: item.grantExpiresAt ? String(item.grantExpiresAt) : null,
      approvedAt: item.approvedAt ? String(item.approvedAt) : null,
      revokedAt: item.revokedAt ? String(item.revokedAt) : null,
      updatedAt: String(item.updatedAt)
    };
  }

  private countEventTypes(
    events: Array<{ eventType: string }>,
    eventTypes: string[]
  ) {
    const allowed = new Set(eventTypes);
    return events.reduce((count, item) => count + (allowed.has(item.eventType) ? 1 : 0), 0);
  }

  private buildPublicationAnalyticsWindow(
    events: Array<{ eventType: string; createdAt: string }>,
    requests: Array<{ status: string; createdAt: string; approvedAt: string | null }>,
    since: Date | null
  ) {
    const filteredEvents = since
      ? events.filter((item) => new Date(item.createdAt) >= since)
      : events;
    const filteredRequests = since
      ? requests.filter((item) => new Date(item.createdAt) >= since)
      : requests;
    const approvals = since
      ? requests.filter((item) => item.approvedAt && new Date(item.approvedAt) >= since)
      : requests.filter((item) => item.approvedAt);

    return {
      eventCount: filteredEvents.length,
      metadataFetches: this.countEventTypes(filteredEvents, [
        "PUBLIC_METADATA_FETCHED",
        "PARTNER_METADATA_FETCHED"
      ]),
      packageFetches: this.countEventTypes(filteredEvents, [
        "PUBLIC_PACKAGE_FETCHED",
        "PARTNER_PACKAGE_FETCHED"
      ]),
      docsFetches: this.countEventTypes(filteredEvents, [
        "PUBLIC_DOCS_FETCHED",
        "PARTNER_DOCS_FETCHED"
      ]),
      accessRequests: filteredRequests.length,
      approvals: approvals.length
    };
  }

  private buildPublicationAnalytics(
    publication: Record<string, unknown>,
    events: Array<Record<string, unknown>>,
    requests: Array<Record<string, unknown>>
  ) {
    const normalizedEvents = events.map((item) => this.normalizeAnalyticsEvent(item));
    const normalizedRequests = requests.map((item) => this.normalizeAnalyticsRequest(item));
    const byEventType = normalizedEvents.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.eventType] = (accumulator[item.eventType] ?? 0) + 1;
      return accumulator;
    }, {});
    const byActorType = normalizedEvents.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.actorType] = (accumulator[item.actorType] ?? 0) + 1;
      return accumulator;
    }, {});
    const actorMap = new Map<
      string,
      { actorType: string; actorKey: string | null; eventCount: number; lastEventAt: string }
    >();

    for (const item of normalizedEvents) {
      const key = `${item.actorType}::${item.actorKey ?? ""}`;
      const current = actorMap.get(key);
      if (!current) {
        actorMap.set(key, {
          actorType: item.actorType,
          actorKey: item.actorKey ?? null,
          eventCount: 1,
          lastEventAt: item.createdAt
        });
        continue;
      }

      current.eventCount += 1;
      if (current.lastEventAt < item.createdAt) {
        current.lastEventAt = item.createdAt;
      }
    }

    const topActors = Array.from(actorMap.values()).sort((left, right) => {
      if (right.eventCount !== left.eventCount) {
        return right.eventCount - left.eventCount;
      }

      return right.lastEventAt.localeCompare(left.lastEventAt);
    });
    const topExternalActors = topActors.filter(
      (item) => item.actorType === "PUBLIC_CLIENT" || item.actorType === "PARTNER_CLIENT"
    );
    const hasNextStatus = (item: { eventType: string } & Record<string, unknown>, status: string) => {
      if (item.eventType !== "ACCESS_REQUEST_STATUS_CHANGED") {
        return false;
      }

      return String(asObject(item.metadata).nextStatus ?? "").trim().toUpperCase() === status;
    };

    const publicMetadataFetches = byEventType.PUBLIC_METADATA_FETCHED ?? 0;
    const publicPackageFetches = byEventType.PUBLIC_PACKAGE_FETCHED ?? 0;
    const publicDocsFetches = byEventType.PUBLIC_DOCS_FETCHED ?? 0;
    const partnerMetadataFetches = byEventType.PARTNER_METADATA_FETCHED ?? 0;
    const partnerPackageFetches = byEventType.PARTNER_PACKAGE_FETCHED ?? 0;
    const partnerDocsFetches = byEventType.PARTNER_DOCS_FETCHED ?? 0;
    const pendingAccessRequests = normalizedRequests.filter((item) => item.status === "PENDING").length;
    const approvedAccessRequests = normalizedRequests.filter((item) => item.status === "APPROVED").length;
    const rejectedAccessRequests = normalizedRequests.filter((item) => item.status === "REJECTED").length;
    const revokedAccessRequests = normalizedRequests.filter((item) => item.status === "REVOKED").length;
    const activeGrants = normalizedRequests.filter(
      (item) => item.status === "APPROVED" && item.accessToken
    ).length;
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return {
      publicationId: String(publication.id),
      connectorKey: String(publication.connectorKey),
      version: String(publication.version),
      status: String(publication.status),
      visibility: String(publication.visibility),
      channel: String(publication.channel),
      totals: {
        totalEvents: normalizedEvents.length,
        publicMetadataFetches,
        publicPackageFetches,
        publicDocsFetches,
        partnerMetadataFetches,
        partnerPackageFetches,
        partnerDocsFetches,
        operatorDownloads: byEventType.PACKAGE_DOWNLOADED ?? 0,
        operatorDocsViews: byEventType.DOCS_VIEWED ?? 0,
        accessRequests: normalizedRequests.length,
        pendingAccessRequests,
        approvedAccessRequests,
        rejectedAccessRequests,
        revokedAccessRequests,
        activeGrants
      },
      funnel: {
        requestCount: normalizedRequests.length,
        approvedCount: approvedAccessRequests,
        pendingCount: pendingAccessRequests,
        rejectedCount: rejectedAccessRequests,
        revokedCount: revokedAccessRequests,
        activeGrantCount: activeGrants,
        publicMetadataReach: publicMetadataFetches,
        publicPackageReach: publicPackageFetches,
        publicDocsReach: publicDocsFetches,
        partnerMetadataReach: partnerMetadataFetches,
        partnerPackageReach: partnerPackageFetches,
        partnerDocsReach: partnerDocsFetches,
        requestApprovalRate:
          normalizedRequests.length > 0
            ? Number((approvedAccessRequests / normalizedRequests.length).toFixed(4))
            : null,
        grantActivationRate:
          approvedAccessRequests > 0
            ? Number((activeGrants / approvedAccessRequests).toFixed(4))
            : null
      },
      windows: {
        last24Hours: this.buildPublicationAnalyticsWindow(
          normalizedEvents,
          normalizedRequests,
          last24Hours
        ),
        last7Days: this.buildPublicationAnalyticsWindow(
          normalizedEvents,
          normalizedRequests,
          last7Days
        ),
        last30Days: this.buildPublicationAnalyticsWindow(
          normalizedEvents,
          normalizedRequests,
          last30Days
        ),
        allTime: this.buildPublicationAnalyticsWindow(normalizedEvents, normalizedRequests, null)
      },
      byEventType,
      byActorType,
      topActors: topActors.slice(0, 10),
      topExternalActors: topExternalActors.slice(0, 10),
      latest: {
        event: normalizedEvents[0] ?? null,
        publicMetadataFetch:
          normalizedEvents.find((item) => item.eventType === "PUBLIC_METADATA_FETCHED") ?? null,
        publicPackageFetch:
          normalizedEvents.find((item) => item.eventType === "PUBLIC_PACKAGE_FETCHED") ?? null,
        publicDocsFetch:
          normalizedEvents.find((item) => item.eventType === "PUBLIC_DOCS_FETCHED") ?? null,
        partnerMetadataFetch:
          normalizedEvents.find((item) => item.eventType === "PARTNER_METADATA_FETCHED") ?? null,
        partnerPackageFetch:
          normalizedEvents.find((item) => item.eventType === "PARTNER_PACKAGE_FETCHED") ?? null,
        partnerDocsFetch:
          normalizedEvents.find((item) => item.eventType === "PARTNER_DOCS_FETCHED") ?? null,
        accessRequest: normalizedEvents.find((item) => item.eventType === "ACCESS_REQUESTED") ?? null,
        approval: normalizedEvents.find((item) => hasNextStatus(item, "APPROVED")) ?? null,
        rejection: normalizedEvents.find((item) => hasNextStatus(item, "REJECTED")) ?? null,
        revocation: normalizedEvents.find((item) => hasNextStatus(item, "REVOKED")) ?? null
      }
    };
  }

  private buildDistributionOverviewWindow(
    events: Array<{ eventType: string; createdAt: string }>,
    requests: Array<{ createdAt: string; approvedAt: string | null }>,
    since: Date | null
  ) {
    const filteredEvents = since
      ? events.filter((item) => new Date(item.createdAt) >= since)
      : events;
    const filteredRequests = since
      ? requests.filter((item) => new Date(item.createdAt) >= since)
      : requests;
    const approvals = since
      ? requests.filter((item) => item.approvedAt && new Date(item.approvedAt) >= since)
      : requests.filter((item) => item.approvedAt);

    return {
      eventCount: filteredEvents.length,
      accessRequests: filteredRequests.length,
      approvals: approvals.length,
      fetches: this.countEventTypes(filteredEvents, [
        "PUBLIC_METADATA_FETCHED",
        "PUBLIC_PACKAGE_FETCHED",
        "PUBLIC_DOCS_FETCHED",
        "PARTNER_METADATA_FETCHED",
        "PARTNER_PACKAGE_FETCHED",
        "PARTNER_DOCS_FETCHED"
      ])
    };
  }

  private buildIntegrationDistributionOverview(
    scope: { tenantId?: string | null; organizationId?: string | null },
    publications: Array<Record<string, unknown>>,
    events: Array<Record<string, unknown>>,
    requests: Array<Record<string, unknown>>
  ) {
    const normalizedPublications = publications.map((item) =>
      this.normalizePublication(item) as Record<string, unknown>
    );
    const normalizedEvents = events.map((item) => this.normalizeAnalyticsEvent(item));
    const normalizedRequests = requests.map((item) => this.normalizeAnalyticsRequest(item));
    const byVisibility = normalizedPublications.reduce<Record<string, number>>((accumulator, item) => {
      const visibility = String(item.visibility ?? "UNKNOWN").trim().toUpperCase();
      accumulator[visibility] = (accumulator[visibility] ?? 0) + 1;
      return accumulator;
    }, {});
    const byChannel = normalizedPublications.reduce<Record<string, number>>((accumulator, item) => {
      const channel = String(item.channel ?? "default").trim();
      accumulator[channel] = (accumulator[channel] ?? 0) + 1;
      return accumulator;
    }, {});
    const byEventType = normalizedEvents.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.eventType] = (accumulator[item.eventType] ?? 0) + 1;
      return accumulator;
    }, {});
    const pendingAccessRequests = normalizedRequests.filter((item) => item.status === "PENDING").length;
    const approvedAccessRequests = normalizedRequests.filter((item) => item.status === "APPROVED").length;
    const rejectedAccessRequests = normalizedRequests.filter((item) => item.status === "REJECTED").length;
    const revokedAccessRequests = normalizedRequests.filter((item) => item.status === "REVOKED").length;
    const activeGrants = normalizedRequests.filter(
      (item) => item.status === "APPROVED" && item.accessToken
    ).length;
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const publicationMetrics = normalizedPublications.map((publication) => {
      const publicationId = String(publication.id);
      const publicationEvents = normalizedEvents.filter((item) => item.publicationId === publicationId);
      const publicationRequests = normalizedRequests.filter((item) => item.publicationId === publicationId);
      const totalFetches = this.countEventTypes(publicationEvents, [
        "PUBLIC_METADATA_FETCHED",
        "PUBLIC_PACKAGE_FETCHED",
        "PUBLIC_DOCS_FETCHED",
        "PARTNER_METADATA_FETCHED",
        "PARTNER_PACKAGE_FETCHED",
        "PARTNER_DOCS_FETCHED"
      ]);
      const approvedRequests = publicationRequests.filter((item) => item.status === "APPROVED").length;
      const activeGrantCount = publicationRequests.filter(
        (item) => item.status === "APPROVED" && item.accessToken
      ).length;

      return {
        publicationId,
        connectorKey: String(publication.connectorKey),
        version: String(publication.version),
        visibility: String(publication.visibility),
        channel: String(publication.channel),
        status: String(publication.status),
        totalFetches,
        accessRequests: publicationRequests.length,
        approvedRequests,
        activeGrants: activeGrantCount,
        lastEventAt: publicationEvents[0]?.createdAt ?? null,
        publishedAt: String(publication.publishedAt)
      };
    });

    publicationMetrics.sort((left, right) => {
      if (right.totalFetches !== left.totalFetches) {
        return right.totalFetches - left.totalFetches;
      }
      if (right.accessRequests !== left.accessRequests) {
        return right.accessRequests - left.accessRequests;
      }
      return right.publishedAt.localeCompare(left.publishedAt);
    });

    return {
      scope: {
        tenantId: scope.tenantId?.trim() || null,
        organizationId: scope.organizationId?.trim() || null
      },
      summary: {
        publicationCount: normalizedPublications.length,
        publishedCount: normalizedPublications.filter((item) => String(item.status) === "PUBLISHED").length,
        publicPublicationCount: byVisibility.PUBLIC ?? 0,
        partnerPublicationCount: byVisibility.PARTNER ?? 0,
        pendingAccessRequests,
        approvedAccessRequests,
        rejectedAccessRequests,
        revokedAccessRequests,
        activeGrants,
        publicMetadataFetches: byEventType.PUBLIC_METADATA_FETCHED ?? 0,
        publicPackageFetches: byEventType.PUBLIC_PACKAGE_FETCHED ?? 0,
        publicDocsFetches: byEventType.PUBLIC_DOCS_FETCHED ?? 0,
        partnerMetadataFetches: byEventType.PARTNER_METADATA_FETCHED ?? 0,
        partnerPackageFetches: byEventType.PARTNER_PACKAGE_FETCHED ?? 0,
        partnerDocsFetches: byEventType.PARTNER_DOCS_FETCHED ?? 0
      },
      byVisibility,
      byChannel,
      windows: {
        last7Days: this.buildDistributionOverviewWindow(
          normalizedEvents,
          normalizedRequests,
          last7Days
        ),
        last30Days: this.buildDistributionOverviewWindow(
          normalizedEvents,
          normalizedRequests,
          last30Days
        ),
        allTime: this.buildDistributionOverviewWindow(
          normalizedEvents,
          normalizedRequests,
          null
        )
      },
      topPublications: publicationMetrics.slice(0, 10),
      latest: {
        publication:
          normalizedPublications.sort((left, right) =>
            String(right.publishedAt).localeCompare(String(left.publishedAt))
          )[0] ?? null,
        accessRequest:
          normalizedRequests.sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ??
          null,
        event: normalizedEvents[0] ?? null
      }
    };
  }

  private digest(content: string) {
    return createHash("sha256").update(content).digest("hex");
  }

  private buildPublicationAttestation(input: {
    registryEntryId: string;
    connectorKey: string;
    version: string;
    visibility: string;
    channel: string;
    packageContent: string;
    docsContent: string;
    signingSecret: { id: string; key: string; value: string } | null;
    publishedAt: Date;
    attestedAt: Date;
  }) {
    const packageDigest = this.digest(input.packageContent);
    const docsDigest = this.digest(input.docsContent);
    const attestationPayload = JSON.stringify(
      {
        registryEntryId: input.registryEntryId,
        connectorKey: input.connectorKey,
        version: input.version,
        visibility: input.visibility,
        channel: input.channel,
        packageDigest,
        docsDigest,
        publishedAt: input.publishedAt.toISOString(),
        attestedAt: input.attestedAt.toISOString()
      },
      null,
      2
    );
    const artifactDigest = this.digest(attestationPayload);
    const signature = input.signingSecret
      ? createHmac("sha256", input.signingSecret.value).update(attestationPayload).digest("hex")
      : null;

    return {
      algorithm: "sha256",
      artifactDigest,
      packageDigest,
      docsDigest,
      signatureAlgorithm: input.signingSecret ? "hmac-sha256" : null,
      signature,
      signatureStatus: input.signingSecret ? "SIGNED" : "UNSIGNED",
      keyRef: input.signingSecret ? `${input.signingSecret.key}:${input.signingSecret.id}` : null,
      payload: attestationPayload,
      signedAt: input.signingSecret ? input.attestedAt.toISOString() : null
    };
  }

  private getPublicationLifecycleSnapshot(publication: Record<string, unknown>) {
    const artifact = asObject(publication.artifact);
    const packageArtifact = asObject(artifact.package);
    const lifecycle = asObject(packageArtifact.lifecycle);
    const deprecationStage = String(lifecycle.deprecationStage ?? "active").trim().toLowerCase();
    const sunsetAt =
      lifecycle.sunsetAt !== undefined && lifecycle.sunsetAt !== null
        ? new Date(String(lifecycle.sunsetAt))
        : null;
    const publicationStatus = String(publication.status ?? "UNKNOWN").trim().toUpperCase();
    const now = new Date();
    const isSunsetDue = Boolean(sunsetAt && !Number.isNaN(sunsetAt.getTime()) && sunsetAt <= now);
    const canAutoRevoke =
      publicationStatus === "PUBLISHED" &&
      (deprecationStage === "sunset" || deprecationStage === "archived") &&
      isSunsetDue;
    const warnings: string[] = [];
    const blockingIssues: string[] = [];

    if (publicationStatus !== "PUBLISHED") {
      warnings.push("Publication is not actively distributed.");
    }

    if ((deprecationStage === "sunset" || deprecationStage === "archived") && !sunsetAt) {
      warnings.push("Deprecation stage expects a sunsetAt timestamp but none is set.");
    }

    if (deprecationStage === "active") {
      warnings.push("Publication lifecycle is still active.");
    }

    return {
      deprecationStage,
      sunsetAt: sunsetAt ? sunsetAt.toISOString() : null,
      isSunsetDue,
      actionRequired: canAutoRevoke,
      canAutoRevoke,
      recommendedStatus: canAutoRevoke ? "REVOKED" : null,
      blockingIssues,
      warnings
    };
  }

  private mapPublicPublication(publication: Record<string, unknown>) {
    const connectorKey = String(publication.connectorKey);
    const version = String(publication.version);
    const channel = String(publication.channel);
    const attestation = asObject(publication.attestation);
    return {
      connectorKey,
      version,
      visibility: String(publication.visibility),
      channel,
      status: String(publication.status),
      packageFileName: String(publication.packageFileName),
      docsFileName: String(publication.docsFileName),
      publishedAt: String(publication.publishedAt),
      revokedAt: publication.revokedAt ? String(publication.revokedAt) : null,
      packageUrl: `/enterprise/publications/${encodeURIComponent(connectorKey)}/${encodeURIComponent(version)}/package${channel ? `?channel=${encodeURIComponent(channel)}` : ""}`,
      docsUrl: `/enterprise/publications/${encodeURIComponent(connectorKey)}/${encodeURIComponent(version)}/docs${channel ? `?channel=${encodeURIComponent(channel)}` : ""}`,
      attestation: {
        algorithm: String(attestation.algorithm ?? "sha256"),
        artifactDigest: String(attestation.artifactDigest ?? ""),
        packageDigest: String(attestation.packageDigest ?? ""),
        docsDigest: String(attestation.docsDigest ?? ""),
        signatureAlgorithm:
          attestation.signatureAlgorithm !== undefined && attestation.signatureAlgorithm !== null
            ? String(attestation.signatureAlgorithm)
            : null,
        signature:
          attestation.signature !== undefined && attestation.signature !== null
            ? String(attestation.signature)
            : null,
        signatureStatus: String(attestation.signatureStatus ?? "UNSIGNED"),
        keyRef:
          attestation.keyRef !== undefined && attestation.keyRef !== null
            ? String(attestation.keyRef)
            : null,
        payload: String(attestation.payload ?? ""),
        signedAt:
          attestation.signedAt !== undefined && attestation.signedAt !== null
            ? String(attestation.signedAt)
            : null
      }
    };
  }

  private async resolvePublicPublication(
    connectorKey: string,
    version: string,
    channel?: string | null
  ) {
    const publication = await this.prisma.integrationPublication.findFirst({
      where: {
        connectorKey,
        version,
        visibility: "PUBLIC",
        status: "PUBLISHED",
        revokedAt: null,
        ...(channel?.trim() ? { channel: channel.trim() } : {})
      },
      orderBy: { publishedAt: "desc" }
    });

    return this.ensureRecord(publication, "Public publication not found.");
  }

  private async resolveGrantedPublication(
    connectorKey: string,
    version: string,
    grantToken?: string | null,
    channel?: string | null,
    consumerKey?: string | null
  ) {
    const token = grantToken?.trim();
    if (!token) {
      return null;
    }

    const request = await this.prisma.integrationDistributionRequest.findFirst({
      where: {
        accessToken: token,
        status: "APPROVED"
      },
      orderBy: { updatedAt: "desc" }
    });

    if (!request) {
      return null;
    }

    const grantExpiresAt = request.grantExpiresAt;
    if (grantExpiresAt && grantExpiresAt <= new Date()) {
      return null;
    }

    if (
      request.grantedConsumerKey &&
      consumerKey?.trim() &&
      request.grantedConsumerKey !== consumerKey.trim()
    ) {
      return null;
    }

    if (request.grantedConsumerKey && !consumerKey?.trim()) {
      return null;
    }

    const publication = await this.prisma.integrationPublication.findUnique({
      where: { id: request.publicationId }
    });

    if (!publication) {
      return null;
    }

    if (
      publication.connectorKey !== connectorKey ||
      publication.version !== version ||
      publication.status !== "PUBLISHED" ||
      publication.revokedAt !== null
    ) {
      return null;
    }

    if (channel?.trim() && publication.channel !== channel.trim()) {
      return null;
    }

    return publication;
  }

  private getDistributionRequestGovernanceSnapshot(
    request: Record<string, unknown>
  ) {
    const status = String(request.status ?? "PENDING").trim().toUpperCase();
    const grantExpiresAtValue =
      request.grantExpiresAt !== undefined && request.grantExpiresAt !== null
        ? new Date(String(request.grantExpiresAt))
        : null;
    const grantExpiresAt =
      grantExpiresAtValue && !Number.isNaN(grantExpiresAtValue.getTime())
        ? grantExpiresAtValue.toISOString()
        : null;
    const isExpired =
      Boolean(grantExpiresAtValue && !Number.isNaN(grantExpiresAtValue.getTime()) && grantExpiresAtValue <= new Date());
    const canAutoRevoke = status === "APPROVED" && Boolean(request.accessToken) && isExpired;
    const warnings: string[] = [];
    const blockingIssues: string[] = [];

    if (status === "APPROVED" && !grantExpiresAt) {
      warnings.push("Grant does not expire automatically.");
    }

    if (status !== "APPROVED") {
      warnings.push("Request is not in APPROVED state.");
    }

    if (status === "REVOKED") {
      warnings.push("Grant is already revoked.");
    }

    return {
      requestId: String(request.id),
      publicationId: String(request.publicationId),
      connectorKey: String(request.connectorKey),
      version: String(request.version),
      status,
      grantedConsumerKey:
        request.grantedConsumerKey !== undefined && request.grantedConsumerKey !== null
          ? String(request.grantedConsumerKey)
          : null,
      grantExpiresAt,
      approvedAt:
        request.approvedAt !== undefined && request.approvedAt !== null
          ? String(request.approvedAt)
          : null,
      revokedAt:
        request.revokedAt !== undefined && request.revokedAt !== null
          ? String(request.revokedAt)
          : null,
      isExpired,
      actionRequired: canAutoRevoke,
      canAutoRevoke,
      blockingIssues,
      warnings
    };
  }

  private getActivationRequestReadinessSnapshot(
    request: Record<string, unknown>,
    publication: Record<string, unknown> | null,
    registryEntry: Record<string, unknown> | null
  ) {
    const requestStatus = String(request.status ?? "PENDING").trim().toUpperCase();
    const targetKind = String(request.targetKind ?? "SUPPLIER_CONNECTOR").trim().toUpperCase();
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const checks: Array<{ code: string; status: "READY" | "BLOCKED" | "WARN"; message: string }> = [];
    const addCheck = (
      code: string,
      status: "READY" | "BLOCKED" | "WARN",
      message: string
    ) => checks.push({ code, status, message });

    const publicationRequired =
      request.publicationId !== undefined && request.publicationId !== null && String(request.publicationId).trim().length > 0;
    if (!publication && publicationRequired) {
      blockingIssues.push("Published integration artifact is not available.");
      addCheck("PUBLICATION_MISSING", "BLOCKED", "Published integration artifact is not available.");
    } else if (!publication) {
      warnings.push("No publication snapshot is attached; activation will rely on registry runtime only.");
      addCheck("PUBLICATION_OPTIONAL", "WARN", "No publication snapshot is attached; activation will rely on registry runtime only.");
    } else if (String(publication.status ?? "").trim().toUpperCase() !== "PUBLISHED" || publication.revokedAt) {
      blockingIssues.push("Publication is not in active PUBLISHED state.");
      addCheck("PUBLICATION_NOT_ACTIVE", "BLOCKED", "Publication is not in active PUBLISHED state.");
    } else {
      addCheck("PUBLICATION_READY", "READY", "Published artifact is available for activation.");
    }

    if (!registryEntry) {
      blockingIssues.push("Registry entry for activation target was not found.");
      addCheck("REGISTRY_ENTRY_MISSING", "BLOCKED", "Registry entry for activation target was not found.");
    } else if (String(registryEntry.status ?? "").trim().toUpperCase() !== "ACTIVE") {
      blockingIssues.push("Registry entry is not ACTIVE.");
      addCheck("REGISTRY_ENTRY_NOT_ACTIVE", "BLOCKED", "Registry entry is not ACTIVE.");
    } else {
      addCheck("REGISTRY_ENTRY_READY", "READY", "Registry entry is active.");
    }

    if (targetKind !== "SUPPLIER_CONNECTOR") {
      blockingIssues.push(`Unsupported activation target '${targetKind}'.`);
      addCheck("TARGET_KIND_UNSUPPORTED", "BLOCKED", `Unsupported activation target '${targetKind}'.`);
    } else {
      addCheck("TARGET_KIND_READY", "READY", "Supplier connector activation target is supported.");
    }

    if (requestStatus === "REJECTED") {
      warnings.push("Activation request was rejected.");
    }
    if (requestStatus === "REVOKED") {
      warnings.push("Activation request was revoked.");
    }
    if (requestStatus === "APPLIED") {
      addCheck("ACTIVATION_ALREADY_APPLIED", "READY", "Activation has already been applied.");
    }

    const targetTenantId = this.readActivationTargetTenantId(request);
    const runtimeSummary = registryEntry
      ? this.summarizeConnectorRuntime(asObject(registryEntry.manifest))
      : {
          transportMode: "SIMULATED",
          providerAdapterKey: null,
          providerProfileKey: null
        };
    const publicationSignatureStatus =
      publication &&
      asObject(publication.attestation).signatureStatus !== undefined &&
      asObject(publication.attestation).signatureStatus !== null
        ? String(asObject(publication.attestation).signatureStatus)
        : null;
    const providerCompatibilityWithSignature = evaluateInventorySupplierProviderRuntimeCompatibility({
      providerAdapterKey: runtimeSummary.providerAdapterKey,
      providerProfileKey: runtimeSummary.providerProfileKey,
      publicationId: publication ? String(publication.id) : null,
      publicationVisibility:
        publication && publication.visibility !== undefined && publication.visibility !== null
          ? String(publication.visibility)
          : null,
      publicationChannel:
        publication && publication.channel !== undefined && publication.channel !== null
          ? String(publication.channel)
          : null,
      publicationStatus:
        publication && publication.status !== undefined && publication.status !== null
          ? String(publication.status)
          : null,
      publicationSignatureStatus,
      requestStatus,
      targetTenantId
    });
    for (const compatibilityCheck of providerCompatibilityWithSignature.checks) {
      if (compatibilityCheck.status !== "READY") {
        addCheck(compatibilityCheck.code, compatibilityCheck.status, compatibilityCheck.message);
      }
    }
    blockingIssues.push(...providerCompatibilityWithSignature.blockingIssues);
    warnings.push(...providerCompatibilityWithSignature.warnings);

    return {
      requestId: String(request.id),
      publicationId:
        request.publicationId !== undefined && request.publicationId !== null
          ? String(request.publicationId)
          : publication
            ? String(publication.id)
            : null,
      registryEntryId:
        request.registryEntryId !== undefined && request.registryEntryId !== null
          ? String(request.registryEntryId)
          : registryEntry
            ? String(registryEntry.id)
            : null,
      tenantId:
        request.tenantId !== undefined && request.tenantId !== null ? String(request.tenantId) : null,
      organizationId:
        request.organizationId !== undefined && request.organizationId !== null
          ? String(request.organizationId)
          : null,
      targetKind,
      connectorKey: String(request.connectorKey),
      version: String(request.version),
      requestStatus,
      status: checks.some((item) => item.status === "BLOCKED") ? "BLOCKED" : "READY",
      ready: blockingIssues.length === 0,
      publicationStatus: publication ? String(publication.status ?? "UNKNOWN") : null,
      registryStatus: registryEntry ? String(registryEntry.status ?? "UNKNOWN") : null,
      canApprove: blockingIssues.length === 0 && (requestStatus === "PENDING" || requestStatus === "REJECTED"),
      canApply: blockingIssues.length === 0 && requestStatus === "APPROVED",
      canActivate: blockingIssues.length === 0 && requestStatus === "APPROVED",
      canRevoke: requestStatus === "APPROVED" || requestStatus === "APPLIED",
      blockingIssues,
      warnings,
      checks,
      providerPolicy: providerCompatibilityWithSignature.policy,
      providerCompatibility: providerCompatibilityWithSignature,
      activation: {
        requestedAt: String(request.createdAt ?? ""),
        approvedAt:
          request.approvedAt !== undefined && request.approvedAt !== null ? String(request.approvedAt) : null,
        appliedAt:
          request.appliedAt !== undefined && request.appliedAt !== null ? String(request.appliedAt) : null,
        revokedAt:
          request.revokedAt !== undefined && request.revokedAt !== null ? String(request.revokedAt) : null,
        rejectedAt:
          request.rejectedAt !== undefined && request.rejectedAt !== null ? String(request.rejectedAt) : null
      }
    };
  }

  private buildActivationArtifact(
    request: Record<string, unknown>,
    publication: Record<string, unknown> | null,
    registryEntry: Record<string, unknown>
  ) {
    const publicationArtifact = publication ? asObject(publication.artifact) : {};
    const packageArtifact = asObject(publicationArtifact.package);
    const manifest = asObject(registryEntry.manifest);
    const runtimeSummary = this.summarizeConnectorRuntime(manifest);
    const providerCompatibility = evaluateInventorySupplierProviderRuntimeCompatibility({
      allowApprovedActivation: true,
      providerAdapterKey: runtimeSummary.providerAdapterKey,
      providerProfileKey: runtimeSummary.providerProfileKey,
      publicationId: publication ? String(publication.id) : null,
      publicationVisibility:
        publication && publication.visibility !== undefined && publication.visibility !== null
          ? String(publication.visibility)
          : null,
      publicationChannel:
        publication && publication.channel !== undefined && publication.channel !== null
          ? String(publication.channel)
          : null,
      publicationStatus:
        publication && publication.status !== undefined && publication.status !== null
          ? String(publication.status)
          : null,
      publicationSignatureStatus:
        publication &&
        asObject(publication.attestation).signatureStatus !== undefined &&
        asObject(publication.attestation).signatureStatus !== null
          ? String(asObject(publication.attestation).signatureStatus)
          : null,
      requestStatus:
        request.status !== undefined && request.status !== null ? String(request.status) : null,
      targetTenantId: this.readActivationTargetTenantId(request)
    });
    return {
      requestId: String(request.id),
      publicationId: publication ? String(publication.id) : null,
      registryEntryId: String(registryEntry.id),
      connectorKey: String(request.connectorKey),
      version: String(request.version),
      targetKind: String(request.targetKind ?? "SUPPLIER_CONNECTOR"),
      appliedAt: new Date().toISOString(),
      publication: publication
        ? {
            visibility: String(publication.visibility ?? ""),
            channel: String(publication.channel ?? ""),
            status: String(publication.status ?? "")
          }
        : null,
      package: {
        compatibility: asObject(packageArtifact.compatibility),
        lifecycle: asObject(packageArtifact.lifecycle),
        providerPolicy: providerCompatibility.policy
      },
      registry: {
        status: String(registryEntry.status ?? ""),
        runtime: asObject(manifest.runtime),
        provider: asObject(manifest.provider),
        providerPolicy: providerCompatibility.policy
      }
    };
  }

  private deepMergeRecords(base: JsonRecord, override: JsonRecord): JsonRecord {
    const result: JsonRecord = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        base[key] &&
        typeof base[key] === "object" &&
        !Array.isArray(base[key])
      ) {
        result[key] = this.deepMergeRecords(asObject(base[key]), asObject(value));
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private readActivationTargetTenantId(request: Record<string, unknown>) {
    const requestNotes = asObject(request.requestNotes);
    const targetTenantId = requestNotes.targetTenantId ?? request.tenantId ?? requestNotes.tenantId;
    return targetTenantId !== undefined && targetTenantId !== null
      ? String(targetTenantId).trim() || null
      : null;
  }

  private readActivationTargetStoreId(request: Record<string, unknown>) {
    const requestNotes = asObject(request.requestNotes);
    const targetStoreId = requestNotes.targetStoreId;
    return targetStoreId !== undefined && targetStoreId !== null
      ? String(targetStoreId).trim() || null
      : null;
  }

  private summarizeConnectorRuntime(manifest: JsonRecord) {
    const runtime = asObject(manifest.runtime);
    const transport = asObject(runtime.transport);
    const provider = asObject(manifest.provider);
    const providerAdapterKeySource =
      transport.providerAdapter ?? runtime.providerAdapter ?? provider.adapter ?? manifest.providerAdapter;
    const providerProfileKeySource =
      transport.providerProfile ?? runtime.providerProfile ?? provider.profile ?? manifest.providerProfile;
    return {
      transportMode: String(transport.mode ?? runtime.mode ?? "SIMULATED").trim().toUpperCase(),
      providerAdapterKey:
        providerAdapterKeySource !== undefined && providerAdapterKeySource !== null
          ? String(providerAdapterKeySource).trim() || null
          : null,
      providerProfileKey:
        providerProfileKeySource !== undefined && providerProfileKeySource !== null
          ? String(providerProfileKeySource).trim() || null
          : null
    };
  }

  private normalizeStringList(value: unknown): string[] {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => String(item ?? "").trim())
      .filter((item) => item.length > 0);
  }

  private inspectExecutionPolicyRuntime(manifest: JsonRecord) {
    const runtime = asObject(manifest.runtime);
    const transport = asObject(runtime.transport);
    const policy = asObject(runtime.executionPolicy ?? runtime.environment ?? runtime.deployment ?? manifest.executionPolicy);
    const auth = asObject(transport.auth ?? runtime.auth ?? policy.auth);
    const runtimeSummary = this.summarizeConnectorRuntime(manifest);
    const currentEnvironment =
      String(process.env.EXETRON_RUNTIME_ENVIRONMENT ?? process.env.NODE_ENV ?? "development").trim() || "development";

    const requiredSecrets = Array.from(
      new Set(
        [
          auth.secretKey,
          transport.secretKey,
          runtime.secretKey,
          policy.secretKey,
          ...this.normalizeStringList(policy.requiredSecrets ?? policy.secretKeys ?? policy.secrets)
        ]
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
      )
    );

    const allowedTenantIds = this.normalizeStringList(policy.allowedTenantIds ?? policy.tenantIds ?? policy.allowedTenants);
    const allowedStoreIds = this.normalizeStringList(policy.allowedStoreIds ?? policy.storeIds ?? policy.allowedStores);
    const allowedEnvironments = this.normalizeStringList(
      policy.allowedEnvironments ?? policy.environments ?? policy.allowedEnvironment ?? policy.environment
    );

    return {
      runtimeSummary,
      currentEnvironment,
      requiredSecrets,
      allowedTenantIds,
      allowedStoreIds,
      allowedEnvironments
    };
  }

  private async resolveExecutionPolicySecretResolution(tenantId: string | null, secretKeys: string[]) {
    const uniqueSecretKeys = Array.from(
      new Set(secretKeys.map((item) => String(item ?? "").trim()).filter((item) => item.length > 0))
    );
    if (!uniqueSecretKeys.length) {
      return {
        requiredSecrets: uniqueSecretKeys,
        resolvedSecrets: [] as string[],
        missingSecrets: [] as string[],
        checks: [] as Array<{
          code: string;
          status: "READY" | "BLOCKED" | "WARN";
          message: string;
        }>,
        blockingIssues: [] as string[],
        warnings: [] as string[],
        status: "READY" as const
      };
    }

    const rows = await this.prisma.secretRegistryEntry.findMany({
      where: {
        key: { in: uniqueSecretKeys },
        ...(tenantId
          ? {
              OR: [{ tenantId }, { tenantId: null }]
            }
          : {})
      },
      orderBy: { createdAt: "desc" }
    });
    const resolved = new Set(rows.map((row) => String(row.key).trim()));
    const resolvedSecrets = uniqueSecretKeys.filter((key) => resolved.has(key));
    const missingSecrets = uniqueSecretKeys.filter((key) => !resolved.has(key));
    const checks: Array<{
      code: string;
      status: "READY" | "BLOCKED" | "WARN";
      message: string;
    }> = [];
    const blockingIssues: string[] = [];

    for (const key of resolvedSecrets) {
      checks.push({
        code: "EXECUTION_POLICY_SECRET_READY",
        status: "READY",
        message: `Required secret '${key}' is resolved.`
      });
    }
    for (const key of missingSecrets) {
      const message = `Required secret '${key}' is not resolved.`;
      checks.push({
        code: "EXECUTION_POLICY_SECRET_BLOCKED",
        status: "BLOCKED",
        message
      });
      blockingIssues.push(message);
    }

    return {
      requiredSecrets: uniqueSecretKeys,
      resolvedSecrets,
      missingSecrets,
      checks,
      blockingIssues,
      warnings: [] as string[],
      status: missingSecrets.length > 0 ? ("BLOCKED" as const) : ("READY" as const)
    };
  }

  private evaluateExecutionPolicyDeploymentGates(input: {
    allowedTenantIds: string[];
    allowedStoreIds: string[];
    allowedEnvironments: string[];
    currentEnvironment: string;
    targetTenantId: string | null;
    targetStoreId: string | null;
  }) {
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const checks: Array<{
      code: string;
      status: "READY" | "BLOCKED" | "WARN";
      message: string;
    }> = [];
    const addCheck = (code: string, status: "READY" | "BLOCKED" | "WARN", message: string) => {
      checks.push({ code, status, message });
      if (status === "BLOCKED") {
        blockingIssues.push(message);
      } else if (status === "WARN") {
        warnings.push(message);
      }
    };
    const currentEnvironment = input.currentEnvironment.trim().toLowerCase();
    const allowedEnvironments = input.allowedEnvironments.map((item) => item.trim().toLowerCase());

    if (input.allowedTenantIds.length > 0) {
      if (!input.targetTenantId) {
        addCheck(
          "EXECUTION_POLICY_TENANT_BLOCKED",
          "BLOCKED",
          "Execution policy requires a tenant-scoped runtime target."
        );
      } else if (!input.allowedTenantIds.includes(input.targetTenantId)) {
        addCheck(
          "EXECUTION_POLICY_TENANT_BLOCKED",
          "BLOCKED",
          "Execution policy does not allow this tenant target."
        );
      } else {
        addCheck("EXECUTION_POLICY_TENANT_READY", "READY", "Execution policy allows the tenant target.");
      }
    }

    if (input.allowedStoreIds.length > 0) {
      if (!input.targetStoreId) {
        addCheck(
          "EXECUTION_POLICY_STORE_BLOCKED",
          "BLOCKED",
          "Execution policy requires a store-scoped runtime target."
        );
      } else if (!input.allowedStoreIds.includes(input.targetStoreId)) {
        addCheck(
          "EXECUTION_POLICY_STORE_BLOCKED",
          "BLOCKED",
          "Execution policy does not allow this store target."
        );
      } else {
        addCheck("EXECUTION_POLICY_STORE_READY", "READY", "Execution policy allows the store target.");
      }
    }

    if (allowedEnvironments.length > 0) {
      if (!allowedEnvironments.includes(currentEnvironment)) {
        addCheck(
          "EXECUTION_POLICY_ENVIRONMENT_BLOCKED",
          "BLOCKED",
          `Execution policy does not allow environment '${input.currentEnvironment}'.`
        );
      } else {
        addCheck(
          "EXECUTION_POLICY_ENVIRONMENT_READY",
          "READY",
          `Execution policy allows environment '${input.currentEnvironment}'.`
        );
      }
    }

    const status = blockingIssues.length > 0 ? "BLOCKED" : warnings.length > 0 ? "WARN" : "READY";
    return {
      status,
      blockingIssues,
      warnings,
      checks,
      currentEnvironment,
      allowedTenantIds: input.allowedTenantIds,
      allowedStoreIds: input.allowedStoreIds,
      allowedEnvironments
    };
  }

  private stripEnterpriseRollout(manifest: JsonRecord) {
    const clone = this.deepMergeRecords({}, manifest);
    delete clone.enterpriseRollout;
    return clone;
  }

  private computeRuntimeSourceDigest(manifest: JsonRecord) {
    return createHash("sha256").update(JSON.stringify(this.stripEnterpriseRollout(manifest))).digest("hex");
  }

  private resolveActivationConnectorTemplate(
    connectorKey: string,
    version: string,
    publication: Record<string, unknown> | null,
    connectorTemplateRow: Record<string, unknown> | null
  ) {
    if (connectorTemplateRow) {
      return {
        source: "CONNECTOR_TEMPLATE",
        templateId: String(connectorTemplateRow.id),
        templateVersion: String(connectorTemplateRow.version),
        manifest: asObject(connectorTemplateRow.manifest)
      };
    }
    const publicationArtifact = publication ? asObject(publication.artifact) : {};
    const packageArtifact = asObject(publicationArtifact.package);
    const connectorTemplate = asObject(packageArtifact.connectorTemplate);
    if (Object.keys(connectorTemplate).length > 0) {
      return {
        source: "PUBLICATION_PACKAGE",
        templateId:
          connectorTemplate.id !== undefined && connectorTemplate.id !== null
            ? String(connectorTemplate.id)
            : null,
        templateVersion:
          connectorTemplate.version !== undefined && connectorTemplate.version !== null
            ? String(connectorTemplate.version)
            : version,
        manifest: asObject(connectorTemplate.manifest)
      };
    }
    return {
      source: "REGISTRY_RUNTIME",
      templateId: null,
      templateVersion: null,
      manifest: {}
    };
  }

  private getActivationInstallReadinessSnapshot(
    request: Record<string, unknown>,
    publication: Record<string, unknown> | null,
    registryEntry: Record<string, unknown> | null,
    connectorTemplate: {
      source: string;
      templateId: string | null;
      templateVersion: string | null;
      manifest: JsonRecord;
    },
    existingRuntimeEntry: Record<string, unknown> | null
  ) {
    const requestStatus = String(request.status ?? "PENDING").trim().toUpperCase();
    const targetKind = String(request.targetKind ?? "SUPPLIER_CONNECTOR").trim().toUpperCase();
    const targetTenantId = this.readActivationTargetTenantId(request);
    const targetStoreId = this.readActivationTargetStoreId(request);
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const checks: Array<{
      code: string;
      status: "READY" | "BLOCKED" | "WARN";
      message: string;
    }> = [];
    const addCheck = (code: string, status: "READY" | "BLOCKED" | "WARN", message: string) => {
      checks.push({ code, status, message });
    };

    if (targetKind !== "SUPPLIER_CONNECTOR") {
      blockingIssues.push(`Unsupported install target '${targetKind}'.`);
      addCheck("TARGET_KIND_UNSUPPORTED", "BLOCKED", `Unsupported install target '${targetKind}'.`);
    } else {
      addCheck("TARGET_KIND_READY", "READY", "Supplier connector install target is supported.");
    }

    if (!targetTenantId) {
      blockingIssues.push("Target tenant is required to materialize runtime connector installation.");
      addCheck("TARGET_TENANT_MISSING", "BLOCKED", "Target tenant is required to materialize runtime connector installation.");
    } else {
      addCheck("TARGET_TENANT_READY", "READY", "Target tenant is present.");
    }

    if (requestStatus === "APPLIED") {
      addCheck("ACTIVATION_APPLIED", "READY", "Activation request is already APPLIED.");
    } else if (requestStatus === "APPROVED") {
      addCheck(
        "ACTIVATION_APPROVED",
        "READY",
        "Activation request is APPROVED and runtime install will materialize the applied state."
      );
    } else {
      blockingIssues.push("Activation request must be APPROVED or APPLIED before runtime install.");
      addCheck(
        "ACTIVATION_NOT_READY",
        "BLOCKED",
        "Activation request must be APPROVED or APPLIED before runtime install."
      );
    }

    if (!registryEntry) {
      blockingIssues.push("Registry runtime source for activation install was not found.");
      addCheck("REGISTRY_RUNTIME_MISSING", "BLOCKED", "Registry runtime source for activation install was not found.");
    } else {
      addCheck("REGISTRY_RUNTIME_READY", "READY", "Registry runtime source is available.");
    }

    if (connectorTemplate.source === "REGISTRY_RUNTIME") {
      warnings.push("No connector template was found; install will fall back to registry runtime manifest.");
      addCheck(
        "CONNECTOR_TEMPLATE_OPTIONAL",
        "WARN",
        "No connector template was found; install will fall back to registry runtime manifest."
      );
    } else {
      addCheck("CONNECTOR_TEMPLATE_READY", "READY", `Install source '${connectorTemplate.source}' is available.`);
    }

    const publicationStatus =
      publication && publication.status !== undefined && publication.status !== null
        ? String(publication.status).trim().toUpperCase()
        : null;
    if (publication && publicationStatus !== "PUBLISHED") {
      warnings.push(`Publication is ${publicationStatus}; install will rely on applied activation artifact.`);
      addCheck(
        "PUBLICATION_NON_PUBLISHED",
        "WARN",
        `Publication is ${publicationStatus}; install will rely on applied activation artifact.`
      );
    } else if (publication) {
      addCheck("PUBLICATION_READY", "READY", "Publication snapshot is available for runtime install metadata.");
    }

    const installMode = existingRuntimeEntry ? "UPDATE" : "CREATE";
    if (existingRuntimeEntry) {
      addCheck(
        "RUNTIME_ENTRY_EXISTS",
        "WARN",
        "Tenant-scoped runtime connector already exists and will be updated in place."
      );
    } else {
      addCheck("RUNTIME_ENTRY_MISSING", "READY", "Tenant-scoped runtime connector will be created.");
    }

    const mergedManifest = this.deepMergeRecords(
      registryEntry ? asObject(registryEntry.manifest) : {},
      connectorTemplate.manifest
    );
    const runtimeSummary = this.summarizeConnectorRuntime(mergedManifest);
    const existingRuntimeManifest = existingRuntimeEntry ? asObject(existingRuntimeEntry.manifest) : {};
    const existingEnterpriseRollout = asObject(existingRuntimeManifest.enterpriseRollout);
    const existingGovernance = asObject(existingEnterpriseRollout.governance);
    const publicationSignatureStatus =
      publication &&
      asObject(publication.attestation).signatureStatus !== undefined &&
      asObject(publication.attestation).signatureStatus !== null
        ? String(asObject(publication.attestation).signatureStatus)
        : null;
    const providerCompatibility = evaluateInventorySupplierProviderRuntimeCompatibility({
      allowApprovedActivation: true,
      providerAdapterKey: runtimeSummary.providerAdapterKey,
      providerProfileKey: runtimeSummary.providerProfileKey,
      targetTenantId,
      publicationId: publication ? String(publication.id) : null,
      publicationVisibility:
        publication && publication.visibility !== undefined && publication.visibility !== null
          ? String(publication.visibility)
          : null,
      publicationChannel:
        publication && publication.channel !== undefined && publication.channel !== null
          ? String(publication.channel)
          : null,
      publicationStatus,
      publicationSignatureStatus,
      requestStatus,
      installationSource:
        existingEnterpriseRollout.source !== undefined && existingEnterpriseRollout.source !== null
          ? String(existingEnterpriseRollout.source)
          : null,
      installationPublicationId:
        existingEnterpriseRollout.publicationId !== undefined && existingEnterpriseRollout.publicationId !== null
          ? String(existingEnterpriseRollout.publicationId)
          : null,
      installationGovernanceStatus:
        existingGovernance.status !== undefined && existingGovernance.status !== null
          ? String(existingGovernance.status)
          : null,
      installationDriftStatus:
        existingGovernance.driftStatus !== undefined && existingGovernance.driftStatus !== null
          ? String(existingGovernance.driftStatus)
          : null
    });
    for (const compatibilityCheck of providerCompatibility.checks) {
      if (compatibilityCheck.status !== "READY") {
        addCheck(compatibilityCheck.code, compatibilityCheck.status, compatibilityCheck.message);
      }
    }
    blockingIssues.push(...providerCompatibility.blockingIssues);
    warnings.push(...providerCompatibility.warnings);

    return {
      requestId: String(request.id),
      publicationId:
        request.publicationId !== undefined && request.publicationId !== null ? String(request.publicationId) : null,
      registryEntryId:
        request.registryEntryId !== undefined && request.registryEntryId !== null ? String(request.registryEntryId) : null,
      tenantId: targetTenantId,
      organizationId:
        request.organizationId !== undefined && request.organizationId !== null ? String(request.organizationId) : null,
      targetKind,
      connectorKey: String(request.connectorKey),
      version: String(request.version),
      requestStatus,
      status: blockingIssues.length === 0 ? "READY" : "BLOCKED",
      canInstall: blockingIssues.length === 0,
      blockingIssues,
      warnings,
      checks,
      providerPolicy: providerCompatibility.policy,
      providerCompatibility,
      install: {
        installMode,
        source: connectorTemplate.source,
        targetTenantId,
        targetStoreId,
        existingRuntimeEntryId:
          existingRuntimeEntry && existingRuntimeEntry.id !== undefined && existingRuntimeEntry.id !== null
            ? String(existingRuntimeEntry.id)
            : null,
        existingRuntimeStatus:
          existingRuntimeEntry && existingRuntimeEntry.status !== undefined && existingRuntimeEntry.status !== null
            ? String(existingRuntimeEntry.status)
            : null,
        connectorTemplateId: connectorTemplate.templateId,
        connectorTemplateVersion: connectorTemplate.templateVersion,
        transportMode: runtimeSummary.transportMode,
        providerAdapterKey: runtimeSummary.providerAdapterKey,
        providerProfileKey: runtimeSummary.providerProfileKey
      }
    };
  }

  private buildInstalledRuntimeManifest(
    sourceRegistryManifest: JsonRecord,
    connectorTemplate: {
      source: string;
      templateId: string | null;
      templateVersion: string | null;
      manifest: JsonRecord;
    },
    request: Record<string, unknown>,
    options: {
      publicationId: string | null;
      sourceRegistryEntryId: string | null;
      installedAt: string;
      installedByType: string;
      installedById: string | null;
      installMode: string;
      preserveTenantOverrides: boolean;
      existingManifest: JsonRecord | null;
    manifestOverrides: JsonRecord;
    runtimeOverrides: JsonRecord;
    installNotes: string | null;
    sourceDigest: string;
    governance: JsonRecord | null;
  }
  ) {
    let manifest = this.deepMergeRecords(sourceRegistryManifest, connectorTemplate.manifest);
    if (options.preserveTenantOverrides && options.existingManifest) {
      const existingWithoutRollout = { ...options.existingManifest };
      delete existingWithoutRollout.enterpriseRollout;
      manifest = this.deepMergeRecords(manifest, existingWithoutRollout);
    }
    manifest = this.deepMergeRecords(manifest, options.manifestOverrides);
    manifest.runtime = this.deepMergeRecords(asObject(manifest.runtime), options.runtimeOverrides);
    manifest.enterpriseRollout = {
      activationRequestId: String(request.id),
      publicationId: options.publicationId,
      sourceRegistryEntryId: options.sourceRegistryEntryId,
      connectorTemplateId: connectorTemplate.templateId,
      connectorTemplateVersion: connectorTemplate.templateVersion,
      source: connectorTemplate.source,
      targetTenantId: this.readActivationTargetTenantId(request),
      targetStoreId: this.readActivationTargetStoreId(request),
      installedAt: options.installedAt,
      installedByType: options.installedByType,
      installedById: options.installedById,
      installMode: options.installMode,
      installNotes: options.installNotes,
      sourceDigest: options.sourceDigest,
      governance: options.governance
    };
    return manifest;
  }

  private evaluateDistributionPolicy(
    manifest: JsonRecord,
    scope: {
      visibility: string;
      channel: string;
      hasConnectorTemplate: boolean;
      hasVersionScopedPartnerContract: boolean;
      signatureAvailable: boolean;
    }
  ) {
    const distribution = asObject(manifest.distribution);
    const allowedChannels = Array.isArray(distribution.allowedChannels)
      ? distribution.allowedChannels
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0)
      : [];
    const publicAccess = distribution.publicAccess !== false;
    const signatureRequired =
      scope.visibility === "PUBLIC"
        ? Boolean(distribution.requireSignedPublications ?? true)
        : Boolean(distribution.requireSignedPublications ?? false);
    const channelAllowed =
      allowedChannels.length === 0 ? true : allowedChannels.includes(scope.channel);

    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    if (!scope.hasConnectorTemplate) {
      blockingIssues.push("Connector template for this version is not published.");
    }

    if (!scope.hasVersionScopedPartnerContract) {
      warnings.push("No version-scoped partner SDK contract is published for this connector.");
    }

    if (scope.visibility === "PUBLIC" && !publicAccess) {
      blockingIssues.push("Manifest distribution policy forbids public publication.");
    }

    if (!channelAllowed) {
      blockingIssues.push(`Channel '${scope.channel}' is not allowed by manifest distribution policy.`);
    }

    if (signatureRequired && !scope.signatureAvailable) {
      blockingIssues.push("Signed publication is required but no signing key is available.");
    }

    return {
      canPublish: blockingIssues.length === 0,
      checks: {
        hasConnectorTemplate: scope.hasConnectorTemplate,
        hasVersionScopedPartnerContract: scope.hasVersionScopedPartnerContract,
        publicAccessAllowed: publicAccess,
        signatureAvailable: scope.signatureAvailable,
        signatureRequired,
        channelAllowed
      },
      distributionPolicy: {
        publicAccess,
        requireSignedPublications: signatureRequired,
        allowedChannels
      },
      blockingIssues,
      warnings
    };
  }

  private async resolveReleaseSigningSecret(scope: {
    tenantId?: string | null;
    organizationId?: string | null;
    signingKey?: string | null;
  }) {
    const key = scope.signingKey?.trim() || EnterpriseService.RELEASE_SIGNING_SECRET_KEY;
    const rows = await this.prisma.secretRegistryEntry.findMany({
      where: { key },
      orderBy: { createdAt: "desc" }
    });
    const selected =
      rows.find((row) => scope.organizationId && row.organizationId === scope.organizationId) ??
      rows.find((row) => scope.tenantId && row.tenantId === scope.tenantId) ??
      rows.find((row) => !row.organizationId && !row.tenantId) ??
      null;

    if (!selected) {
      return null;
    }

    const envelope = asObject(selected.valueEnvelope);
    const value = envelope.value;
    if (typeof value !== "string" || value.length === 0) {
      return null;
    }

    return {
      id: selected.id,
      key: selected.key,
      value
    };
  }

  private async createPublicationEvent(
    publicationId: string,
    eventType: string,
    actorType: string,
    actorKey: string | null,
    metadata: JsonRecord | null = null
  ) {
    const row = await this.prisma.integrationPublicationEvent.create({
      data: {
        publicationId,
        eventType,
        actorType,
        actorKey,
        metadata: asNullableInputJson(metadata)
      }
    });

    return this.normalizePublicationEvent(row);
  }

  private redactedSecretRow(row: Record<string, unknown>) {
    return this.normalizeRecord(
      {
        ...row,
        valueEnvelope: { kind: "redacted" }
      },
      {
        nullableJson: ["metadata"],
        dates: ["createdAt", "updatedAt"]
      }
    );
  }

  async billingOverview(_context: RequestContext, tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException("tenantId is required.");
    }

    const [billingAccount, subscriptions, trials, invoices, entitlements, quotas, tenantState] =
      await Promise.all([
        this.tenantAccount(tenantId),
        this.prisma.$queryRaw<any[]>(
          Prisma.sql`SELECT * FROM "EnterpriseSubscription" WHERE "tenantId" = ${tenantId}::uuid ORDER BY "createdAt" DESC`
        ),
        this.prisma.$queryRaw<any[]>(
          Prisma.sql`SELECT * FROM "EnterpriseTrialGrant" WHERE "tenantId" = ${tenantId}::uuid ORDER BY "createdAt" DESC`
        ),
        this.prisma.$queryRaw<any[]>(
          Prisma.sql`SELECT * FROM "EnterpriseInvoice" WHERE "tenantId" = ${tenantId}::uuid ORDER BY "createdAt" DESC`
        ),
        this.prisma.$queryRaw<any[]>(
          Prisma.sql`SELECT * FROM "EnterpriseEntitlementGrant" WHERE "tenantId" = ${tenantId}::uuid ORDER BY "updatedAt" DESC`
        ),
        this.prisma.$queryRaw<any[]>(
          Prisma.sql`SELECT * FROM "EnterpriseQuotaCounter" WHERE "tenantId" = ${tenantId}::uuid ORDER BY "updatedAt" DESC`
        ),
        this.prisma.tenantSetting
          .findUnique({ where: { tenantId_key: { tenantId, key: BILLING_STATE_KEY } } })
          .catch(() => null)
      ]);

    const subscription = subscriptions[0] ?? null;
    const plan = subscription ? await this.plan(String(subscription.planId)) : null;

    return {
      billingAccount: billingAccount
        ? mapDates(
            {
              ...billingAccount,
              metadata: billingAccount.metadata ? asObject(billingAccount.metadata) : null
            },
            ["createdAt", "updatedAt"]
          )
        : null,
      subscription: subscription
        ? mapDates(
            {
              ...subscription,
              metadata: subscription.metadata ? asObject(subscription.metadata) : null,
              cancelledAt: toIso(subscription.cancelledAt)
            },
            ["startedAt", "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt"]
          )
        : null,
      trial: trials[0]
        ? mapDates(
            {
              ...trials[0],
              convertedAt: toIso(trials[0].convertedAt)
            },
            ["startedAt", "endsAt", "createdAt", "updatedAt"]
          )
        : null,
      plan: plan
        ? mapDates(
            {
              ...plan,
              entitlements: asObject(plan.entitlements),
              quotas: asObject(plan.quotas),
              metadata: plan.metadata ? asObject(plan.metadata) : null
            },
            ["createdAt", "updatedAt"]
          )
        : null,
      invoices: invoices.map((item) =>
        mapDates(
          {
            ...item,
            lines: asArray(item.lines),
            metadata: item.metadata ? asObject(item.metadata) : null,
            dueAt: toIso(item.dueAt),
            issuedAt: toIso(item.issuedAt),
            paidAt: toIso(item.paidAt)
          },
          ["createdAt", "updatedAt"]
        )
      ),
      entitlements: entitlements.map((item) =>
        mapDates({ ...item, value: asObject(item.value) }, ["createdAt", "updatedAt"])
      ),
      quotas: quotas.map((item) =>
        mapDates({ ...item, resetAt: toIso(item.resetAt) }, ["createdAt", "updatedAt"])
      ),
      billingStateKey: BILLING_STATE_KEY,
      hasTenantBillingState: Boolean(tenantState)
    };
  }

  async operationsOverview(scope: { tenantId?: string | null; organizationId?: string | null }) {
    const tenantId = scope.tenantId?.trim() || null;
    const organizationId = scope.organizationId?.trim() || null;
    const tenantWhere = tenantId ? { tenantId } : undefined;
    const organizationWhere = organizationId ? { organizationId } : undefined;

    const identityProviders = await this.prisma.enterpriseIdentityProvider.findMany({
      where: {
        ...(tenantWhere ?? {}),
        ...(organizationWhere ?? {})
      },
      orderBy: { createdAt: "desc" }
    });

    const identityProviderIds = identityProviders.map((item) => item.id);

    const [
      billingPlans,
      subscriptions,
      invoices,
      rolePolicies,
      auditExports,
      compliancePacks,
      complianceEvidenceArtifacts,
      secretRegistryEntries,
      deploymentVariants,
      integrationRegistryEntries,
      connectorTemplates,
      partnerSdkContracts,
      federatedLinks
    ] = await Promise.all([
      this.prisma.enterpriseBillingPlan.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.enterpriseSubscription.findMany({
        where: tenantWhere ?? undefined,
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.enterpriseInvoice.findMany({
        where: tenantWhere ?? undefined,
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.advancedRolePolicy.findMany({
        where: {
          ...(tenantWhere ?? {}),
          ...(organizationWhere ?? {})
        },
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.auditExportJob.findMany({
        where: {
          ...(tenantWhere ?? {}),
          ...(organizationWhere ?? {})
        },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.compliancePack.findMany({
        where: {
          ...(tenantWhere ?? {}),
          ...(organizationWhere ?? {})
        },
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.complianceEvidenceArtifact.findMany({
        where: {
          ...(tenantWhere ?? {}),
          ...(organizationWhere ?? {})
        },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.secretRegistryEntry.findMany({
        where: {
          ...(tenantWhere ?? {}),
          ...(organizationWhere ?? {})
        },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.deploymentVariant.findMany({
        where: {
          ...(tenantWhere ?? {}),
          ...(organizationWhere ?? {})
        },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.integrationRegistryEntry.findMany({
        where: {
          ...(tenantWhere ?? {}),
          ...(organizationWhere ?? {})
        },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.connectorTemplate.findMany({ orderBy: { createdAt: "desc" } }),
      this.prisma.partnerSdkContract.findMany({ orderBy: { createdAt: "desc" } }),
      identityProviderIds.length
        ? this.prisma.federatedIdentityLink.findMany({
            where: { identityProviderId: { in: identityProviderIds } },
            orderBy: { createdAt: "desc" }
          })
        : Promise.resolve([])
    ]);

    const mappedSubscriptions = subscriptions.map((row) =>
      this.normalizeRecord(row, {
        nullableJson: ["metadata"],
        dates: ["startedAt", "currentPeriodStart", "currentPeriodEnd", "cancelledAt", "createdAt", "updatedAt"]
      })
    );
    const mappedInvoices = invoices.map((row) =>
      this.normalizeRecord(row, {
        arrays: ["lines"],
        nullableJson: ["metadata"],
        dates: ["dueAt", "issuedAt", "paidAt", "createdAt", "updatedAt"]
      })
    );
    const mappedIdentityProviders = identityProviders.map((row) =>
      this.normalizeRecord(row, {
        json: ["config"],
        dates: ["createdAt", "updatedAt"]
      })
    );
    const mappedAuditExports = auditExports.map((row) =>
      this.normalizeRecord(row, {
        nullableJson: ["filter", "artifact"],
        dates: ["completedAt", "createdAt", "updatedAt"]
      })
    );
    const mappedCompliancePacks = compliancePacks.map((row) =>
      this.normalizeRecord(row, {
        json: ["controls"],
        dates: ["createdAt", "updatedAt"]
      })
    );
    const mappedDeploymentVariants = deploymentVariants.map((row) =>
      this.normalizeRecord(row, {
        json: ["config"],
        dates: ["createdAt", "updatedAt"]
      })
    );
    const mappedRegistryEntries = integrationRegistryEntries.map((row) =>
      this.normalizeRecord(row, {
        json: ["manifest"],
        dates: ["createdAt", "updatedAt"]
      })
    );
    const mappedConnectorTemplates = connectorTemplates.map((row) =>
      this.normalizeRecord(row, {
        json: ["manifest"],
        dates: ["createdAt", "updatedAt"]
      })
    );
    const mappedPartnerSdkContracts = partnerSdkContracts.map((row) =>
      this.normalizeRecord(row, {
        json: ["schema"],
        dates: ["createdAt", "updatedAt"]
      })
    );

    return {
      scope: {
        tenantId,
        organizationId
      },
      summary: {
        billingPlanCount: billingPlans.length,
        billingSubscriptionCount: mappedSubscriptions.length,
        billingInvoiceCount: mappedInvoices.length,
        identityProviderCount: mappedIdentityProviders.length,
        federatedLinkCount: federatedLinks.length,
        advancedRolePolicyCount: rolePolicies.length,
        auditExportCount: mappedAuditExports.length,
        compliancePackCount: mappedCompliancePacks.length,
        complianceEvidenceArtifactCount: complianceEvidenceArtifacts.length,
        secretRegistryEntryCount: secretRegistryEntries.length,
        deploymentVariantCount: mappedDeploymentVariants.length,
        integrationRegistryEntryCount: mappedRegistryEntries.length,
        connectorTemplateCount: mappedConnectorTemplates.length,
        partnerSdkContractCount: mappedPartnerSdkContracts.length
      },
      statuses: {
        subscriptions: this.countStatuses(mappedSubscriptions),
        invoices: this.countStatuses(mappedInvoices),
        identityProviders: this.countStatuses(mappedIdentityProviders),
        auditExports: this.countStatuses(mappedAuditExports),
        compliancePacks: this.countStatuses(mappedCompliancePacks),
        deploymentVariants: this.countStatuses(mappedDeploymentVariants),
        integrationRegistryEntries: this.countStatuses(mappedRegistryEntries),
        partnerSdkContracts: this.countStatuses(mappedPartnerSdkContracts)
      },
      latest: {
        subscription: mappedSubscriptions[0] ?? null,
        invoice: mappedInvoices[0] ?? null,
        identityProvider: mappedIdentityProviders[0] ?? null,
        auditExport: mappedAuditExports[0] ?? null,
        compliancePack: mappedCompliancePacks[0] ?? null,
        deploymentVariant: mappedDeploymentVariants[0] ?? null,
        integrationRegistryEntry: mappedRegistryEntries[0] ?? null,
        connectorTemplate: mappedConnectorTemplates[0] ?? null,
        partnerSdkContract: mappedPartnerSdkContracts[0] ?? null
      }
    };
  }

  async createPlan(_context: RequestContext, input: JsonRecord) {
    const code = String(input.code ?? "").trim();
    const name = String(input.name ?? "").trim();
    if (!code || !name) {
      throw new BadRequestException("Plan code and name are required.");
    }

    const now = new Date();
    const row = await this.one<any>(Prisma.sql`
      INSERT INTO "EnterpriseBillingPlan" ("id","code","name","status","priceAmount","currency","intervalKey","entitlements","quotas","metadata","createdAt","updatedAt")
      VALUES (${randomUUID()}::uuid, ${code}, ${name}, ${String(input.status ?? "ACTIVE")}, ${String(input.priceAmount ?? "0.00")}, ${String(input.currency ?? "RUB")}, ${String(input.intervalKey ?? "MONTHLY")}, ${JSON.stringify(asObject(input.entitlements))}::jsonb, ${JSON.stringify(asObject(input.quotas))}::jsonb, ${input.metadata ? JSON.stringify(asObject(input.metadata)) : null}::jsonb, ${now}, ${now})
      RETURNING *
    `);

    return mapDates(
      {
        ...row,
        entitlements: asObject(row?.entitlements),
        quotas: asObject(row?.quotas),
        metadata: row?.metadata ? asObject(row.metadata) : null
      },
      ["createdAt", "updatedAt"]
    );
  }

  async createSubscription(context: RequestContext, input: JsonRecord) {
    const tenantId = String(input.tenantId ?? context.tenantId ?? "").trim();
    const planId = String(input.planId ?? "").trim();
    if (!tenantId || !planId) {
      throw new BadRequestException("tenantId and planId are required.");
    }

    const plan = await this.plan(planId);
    if (!plan) {
      throw new BadRequestException("Plan not found.");
    }

    let account = await this.tenantAccount(tenantId);
    const now = new Date();
    if (!account) {
      account = await this.one<any>(Prisma.sql`
        INSERT INTO "EnterpriseBillingAccount" ("id","tenantId","resellerAccountId","status","defaultPaymentTerms","metadata","createdAt","updatedAt")
        VALUES (${randomUUID()}::uuid, ${tenantId}::uuid, ${input.resellerAccountId ? String(input.resellerAccountId) : null}::uuid, 'ACTIVE', ${input.defaultPaymentTerms ? String(input.defaultPaymentTerms) : null}, ${input.metadata ? JSON.stringify(asObject(input.metadata)) : null}::jsonb, ${now}, ${now})
        RETURNING *
      `);
    }

    const periodDays = Number(input.currentPeriodDays ?? 30) || 30;
    const periodEnd = new Date(now.getTime() + periodDays * 86_400_000);
    const subscription = await this.one<any>(Prisma.sql`
      INSERT INTO "EnterpriseSubscription" ("id","tenantId","billingAccountId","planId","status","startedAt","currentPeriodStart","currentPeriodEnd","cancelledAt","metadata","createdAt","updatedAt")
      VALUES (${randomUUID()}::uuid, ${tenantId}::uuid, ${account.id}::uuid, ${planId}::uuid, ${String(input.status ?? "TRIAL")}, ${now}, ${now}, ${periodEnd}, ${null}::timestamptz, ${input.metadata ? JSON.stringify(asObject(input.metadata)) : null}::jsonb, ${now}, ${now})
      RETURNING *
    `);

    const trial = await this.trial(tenantId);
    if (trial) {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE "EnterpriseTrialGrant"
        SET "subscriptionId" = ${subscription?.id}::uuid, "status" = ${String(subscription?.status) === "TRIAL" ? "ACTIVE" : "CONVERTED"}, "convertedAt" = ${String(subscription?.status) === "TRIAL" ? null : now}::timestamptz, "updatedAt" = ${now}
        WHERE "id" = ${trial.id}::uuid
      `);
    } else {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "EnterpriseTrialGrant" ("id","tenantId","subscriptionId","status","startedAt","endsAt","convertedAt","createdAt","updatedAt")
        VALUES (${randomUUID()}::uuid, ${tenantId}::uuid, ${subscription?.id}::uuid, ${String(subscription?.status) === "TRIAL" ? "ACTIVE" : "CONVERTED"}, ${now}, ${periodEnd}, ${String(subscription?.status) === "TRIAL" ? null : now}::timestamptz, ${now}, ${now})
      `);
    }

    return mapDates(
      {
        ...subscription,
        billingAccountId: account.id,
        metadata: subscription?.metadata ? asObject(subscription.metadata) : null,
        cancelledAt: toIso(subscription?.cancelledAt)
      },
      ["startedAt", "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt"]
    );
  }

  async issueInvoice(context: RequestContext, input: JsonRecord) {
    const tenantId = String(input.tenantId ?? context.tenantId ?? "").trim();
    const billingAccountId = String(input.billingAccountId ?? "").trim();
    if (!tenantId || !billingAccountId) {
      throw new BadRequestException("tenantId and billingAccountId are required.");
    }

    const account = await this.tenantAccount(tenantId);
    if (!account || account.id !== billingAccountId) {
      throw new BadRequestException("Billing account not found.");
    }

    const now = new Date();
    const row = await this.one<any>(Prisma.sql`
      INSERT INTO "EnterpriseInvoice" ("id","tenantId","billingAccountId","subscriptionId","number","status","currency","subtotalAmount","totalAmount","dueAt","issuedAt","paidAt","lines","metadata","createdAt","updatedAt")
      VALUES (${randomUUID()}::uuid, ${tenantId}::uuid, ${billingAccountId}::uuid, ${input.subscriptionId ? String(input.subscriptionId) : null}::uuid, ${String(input.number ?? `INV-${Date.now()}`)}, ${String(input.status ?? "ISSUED")}, ${String(input.currency ?? "RUB")}, ${String(input.subtotalAmount ?? "0.00")}, ${String(input.totalAmount ?? "0.00")}, ${input.dueAt ? new Date(String(input.dueAt)) : null}::timestamptz, ${now}, ${null}::timestamptz, ${JSON.stringify(asArray(input.lines))}::jsonb, ${input.metadata ? JSON.stringify(asObject(input.metadata)) : null}::jsonb, ${now}, ${now})
      RETURNING *
    `);

    return mapDates(
      {
        ...row,
        lines: asArray(row?.lines),
        metadata: row?.metadata ? asObject(row.metadata) : null,
        dueAt: toIso(row?.dueAt),
        issuedAt: toIso(row?.issuedAt),
        paidAt: toIso(row?.paidAt)
      },
      ["createdAt", "updatedAt"]
    );
  }

  async upsertEntitlement(context: RequestContext, input: JsonRecord) {
    const tenantId = String(input.tenantId ?? context.tenantId ?? "").trim();
    const key = String(input.key ?? "").trim();
    const scopeType = String(input.scopeType ?? "TENANT").trim();
    const scopeId = input.scopeId == null ? null : String(input.scopeId);
    if (!tenantId || !key) {
      throw new BadRequestException("tenantId and key are required.");
    }

    const current = await this.one<any>(Prisma.sql`
      SELECT * FROM "EnterpriseEntitlementGrant"
      WHERE "tenantId" = ${tenantId}::uuid AND "key" = ${key} AND "scopeType" = ${scopeType} AND COALESCE("scopeId",'') = COALESCE(${scopeId},'')
      LIMIT 1
    `);
    const now = new Date();
    const row = current
      ? await this.one<any>(Prisma.sql`
          UPDATE "EnterpriseEntitlementGrant"
          SET "subscriptionId" = ${input.subscriptionId ? String(input.subscriptionId) : current.subscriptionId}::uuid, "value" = ${JSON.stringify(asObject(input.value))}::jsonb, "source" = ${String(input.source ?? current.source)}, "updatedAt" = ${now}
          WHERE "id" = ${current.id}::uuid
          RETURNING *
        `)
      : await this.one<any>(Prisma.sql`
          INSERT INTO "EnterpriseEntitlementGrant" ("id","tenantId","subscriptionId","key","scopeType","scopeId","value","source","createdAt","updatedAt")
          VALUES (${randomUUID()}::uuid, ${tenantId}::uuid, ${input.subscriptionId ? String(input.subscriptionId) : null}::uuid, ${key}, ${scopeType}, ${scopeId}, ${JSON.stringify(asObject(input.value))}::jsonb, ${String(input.source ?? "manual")}, ${now}, ${now})
          RETURNING *
        `);

    return mapDates({ ...row, value: asObject(row?.value) }, ["createdAt", "updatedAt"]);
  }

  async upsertQuota(context: RequestContext, input: JsonRecord) {
    const tenantId = String(input.tenantId ?? context.tenantId ?? "").trim();
    const key = String(input.key ?? "").trim();
    const scopeType = String(input.scopeType ?? "TENANT").trim();
    const scopeId = input.scopeId == null ? null : String(input.scopeId);
    if (!tenantId || !key) {
      throw new BadRequestException("tenantId and key are required.");
    }

    const current = await this.one<any>(Prisma.sql`
      SELECT * FROM "EnterpriseQuotaCounter"
      WHERE "tenantId" = ${tenantId}::uuid AND "key" = ${key} AND "scopeType" = ${scopeType} AND COALESCE("scopeId",'') = COALESCE(${scopeId},'')
      LIMIT 1
    `);
    const now = new Date();
    const row = current
      ? await this.one<any>(Prisma.sql`
          UPDATE "EnterpriseQuotaCounter"
          SET "subscriptionId" = ${input.subscriptionId ? String(input.subscriptionId) : current.subscriptionId}::uuid, "limitValue" = ${Number(input.limitValue ?? current.limitValue)}, "usedValue" = ${Number(input.usedValue ?? current.usedValue)}, "resetAt" = ${input.resetAt ? new Date(String(input.resetAt)) : current.resetAt}::timestamptz, "updatedAt" = ${now}
          WHERE "id" = ${current.id}::uuid
          RETURNING *
        `)
      : await this.one<any>(Prisma.sql`
          INSERT INTO "EnterpriseQuotaCounter" ("id","tenantId","subscriptionId","key","scopeType","scopeId","limitValue","usedValue","resetAt","createdAt","updatedAt")
          VALUES (${randomUUID()}::uuid, ${tenantId}::uuid, ${input.subscriptionId ? String(input.subscriptionId) : null}::uuid, ${key}, ${scopeType}, ${scopeId}, ${Number(input.limitValue ?? 0)}, ${Number(input.usedValue ?? 0)}, ${input.resetAt ? new Date(String(input.resetAt)) : null}::timestamptz, ${now}, ${now})
          RETURNING *
        `);

    return mapDates({ ...row, resetAt: toIso(row?.resetAt) }, ["createdAt", "updatedAt"]);
  }

  async createIdentityProvider(context: RequestContext, input: JsonRecord) {
    const code = String(input.code ?? "").trim();
    const type = String(input.type ?? "").trim();
    if (!code || !type) {
      throw new BadRequestException("Identity provider code and type are required.");
    }

    const row = await this.prisma.enterpriseIdentityProvider.create({
      data: {
        tenantId: input.tenantId ? String(input.tenantId) : context.tenantId ?? null,
        organizationId: input.organizationId ? String(input.organizationId) : null,
        code,
        type,
        status: String(input.status ?? "ACTIVE"),
        config: asInputJson(input.config)
      }
    });

    return mapDates({ ...row, config: asObject(row.config) }, ["createdAt", "updatedAt"]);
  }

  async addFederatedLink(_context: RequestContext, id: string, input: JsonRecord) {
    const userId = String(input.userId ?? "").trim();
    const externalSubject = String(input.externalSubject ?? "").trim();
    if (!userId || !externalSubject) {
      throw new BadRequestException("userId and externalSubject are required.");
    }

    const idp = await this.prisma.enterpriseIdentityProvider.findUnique({ where: { id } });
    if (!idp) {
      throw new BadRequestException("Identity provider not found.");
    }

    const row = await this.prisma.federatedIdentityLink.upsert({
      where: { identityProviderId_externalSubject: { identityProviderId: id, externalSubject } },
      update: { userId, email: input.email ? String(input.email) : null },
      create: { identityProviderId: id, userId, externalSubject, email: input.email ? String(input.email) : null }
    });

    return mapDates(row, ["createdAt", "updatedAt"]);
  }

  async createAdvancedRolePolicy(context: RequestContext, input: JsonRecord) {
    const key = String(input.key ?? "").trim();
    if (!key) {
      throw new BadRequestException("Policy key is required.");
    }

    const tenantId = input.tenantId ? String(input.tenantId) : context.tenantId ?? null;
    const organizationId = input.organizationId ? String(input.organizationId) : null;
    const current = await this.prisma.advancedRolePolicy.findFirst({
      where: { tenantId, organizationId, key },
      orderBy: { updatedAt: "desc" }
    });
    const row = current
      ? await this.prisma.advancedRolePolicy.update({
          where: { id: current.id },
          data: { rules: asInputJson(input.rules ?? input) }
        })
      : await this.prisma.advancedRolePolicy.create({
          data: { tenantId, organizationId, key, rules: asInputJson(input.rules ?? input) }
        });

    return mapDates({ ...row, rules: asObject(row.rules) }, ["createdAt", "updatedAt"]);
  }

  async createAuditExport(context: RequestContext, input: JsonRecord) {
    const now = new Date();
    const row = await this.prisma.auditExportJob.create({
      data: {
        tenantId: input.tenantId ? String(input.tenantId) : context.tenantId ?? null,
        organizationId: input.organizationId ? String(input.organizationId) : null,
        status: "COMPLETED",
        filter: asNullableInputJson(input.filter ?? null),
        artifact: { exportedAt: now.toISOString(), rows: 0 },
        createdByUserId: context.scope === "device" ? null : asUuidOrNull(context.userId),
        completedAt: now
      }
    });

    return mapDates(
      {
        ...row,
        filter: row.filter ? asObject(row.filter) : null,
        artifact: row.artifact ? asObject(row.artifact) : null,
        completedAt: toIso(row.completedAt)
      },
      ["createdAt", "updatedAt"]
    );
  }

  async createCompliancePack(context: RequestContext, input: JsonRecord) {
    const code = String(input.code ?? "").trim();
    const name = String(input.name ?? "").trim();
    if (!code || !name) {
      throw new BadRequestException("Compliance pack code and name are required.");
    }

    const row = await this.prisma.compliancePack.create({
      data: {
        tenantId: input.tenantId ? String(input.tenantId) : context.tenantId ?? null,
        organizationId: input.organizationId ? String(input.organizationId) : null,
        code,
        name,
        status: String(input.status ?? "ACTIVE"),
        controls: asInputJson(input.controls)
      }
    });

    return mapDates({ ...row, controls: asObject(row.controls) }, ["createdAt", "updatedAt"]);
  }

  async createComplianceEvidence(_context: RequestContext, input: JsonRecord) {
    const key = String(input.key ?? "").trim();
    if (!key) {
      throw new BadRequestException("Evidence key is required.");
    }

    if (input.compliancePackId) {
      const pack = await this.prisma.compliancePack.findUnique({
        where: { id: String(input.compliancePackId) }
      });
      if (!pack) {
        throw new BadRequestException("Compliance pack not found.");
      }
    }

    const row = await this.prisma.complianceEvidenceArtifact.create({
      data: {
        compliancePackId: input.compliancePackId ? String(input.compliancePackId) : null,
        tenantId: input.tenantId ? String(input.tenantId) : null,
        organizationId: input.organizationId ? String(input.organizationId) : null,
        key,
        artifact: asInputJson(input.artifact ?? input)
      }
    });

    return mapDates({ ...row, artifact: asObject(row.artifact) }, ["createdAt"]);
  }

  async createSecretEntry(context: RequestContext, input: JsonRecord) {
    const scopeType = String(input.scopeType ?? "").trim();
    const key = String(input.key ?? "").trim();
    if (!scopeType || !key) {
      throw new BadRequestException("scopeType and key are required.");
    }

    const row = await this.prisma.secretRegistryEntry.create({
      data: {
        tenantId: input.tenantId ? String(input.tenantId) : context.tenantId ?? null,
        organizationId: input.organizationId ? String(input.organizationId) : null,
        scopeType,
        scopeId: input.scopeId ? String(input.scopeId) : null,
        key,
        valueEnvelope: { kind: "opaque", storedAt: new Date().toISOString(), value: input.value ?? null },
        metadata: asNullableInputJson(input.metadata ?? null)
      }
    });

    return mapDates(
      { ...row, metadata: row.metadata ? asObject(row.metadata) : null },
      ["createdAt", "updatedAt"]
    );
  }

  async createDeploymentVariant(context: RequestContext, input: JsonRecord) {
    const code = String(input.code ?? "").trim();
    const name = String(input.name ?? "").trim();
    if (!code || !name) {
      throw new BadRequestException("Deployment variant code and name are required.");
    }

    const row = await this.prisma.deploymentVariant.create({
      data: {
        tenantId: input.tenantId ? String(input.tenantId) : context.tenantId ?? null,
        organizationId: input.organizationId ? String(input.organizationId) : null,
        code,
        name,
        status: String(input.status ?? "ACTIVE"),
        config: asInputJson(input.config)
      }
    });

    return mapDates({ ...row, config: asObject(row.config) }, ["createdAt", "updatedAt"]);
  }

  async createPartnerSdkContract(_context: RequestContext, input: JsonRecord) {
    const key = String(input.key ?? "").trim();
    const version = String(input.version ?? "").trim();
    if (!key || !version) {
      throw new BadRequestException("Partner SDK contract key and version are required.");
    }

    const row = await this.prisma.partnerSdkContract.create({
      data: {
        partnerAccountId: input.partnerAccountId ? String(input.partnerAccountId) : null,
        key,
        version,
        status: String(input.status ?? "ACTIVE"),
        schema: asInputJson(input.schema)
      }
    });

    return mapDates({ ...row, schema: asObject(row.schema) }, ["createdAt", "updatedAt"]);
  }

  async createRegistryEntry(context: RequestContext, input: JsonRecord) {
    const connectorKey = String(input.connectorKey ?? "").trim();
    const version = String(input.version ?? "").trim();
    if (!connectorKey || !version) {
      throw new BadRequestException("connectorKey and version are required.");
    }

    const row = await this.prisma.integrationRegistryEntry.create({
      data: {
        tenantId: input.tenantId ? String(input.tenantId) : context.tenantId ?? null,
        organizationId: input.organizationId ? String(input.organizationId) : null,
        connectorKey,
        version,
        status: String(input.status ?? "ACTIVE"),
        manifest: asInputJson(input.manifest)
      }
    });

    return mapDates({ ...row, manifest: asObject(row.manifest) }, ["createdAt", "updatedAt"]);
  }

  async createConnectorTemplate(_context: RequestContext, input: JsonRecord) {
    const connectorKey = String(input.connectorKey ?? "").trim();
    const version = String(input.version ?? "").trim();
    if (!connectorKey || !version) {
      throw new BadRequestException("connectorKey and version are required.");
    }

    const row = await this.prisma.connectorTemplate.upsert({
      where: { connectorKey_version: { connectorKey, version } },
      update: { manifest: asInputJson(input.manifest) },
      create: { connectorKey, version, manifest: asInputJson(input.manifest) }
    });

    return mapDates({ ...row, manifest: asObject(row.manifest) }, ["createdAt", "updatedAt"]);
  }

  async listBillingPlans() {
    const rows = await this.prisma.enterpriseBillingPlan.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        json: ["entitlements", "quotas"],
        nullableJson: ["metadata"],
        dates: ["createdAt", "updatedAt"]
      })
    );
  }

  async getBillingPlan(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.enterpriseBillingPlan.findUnique({ where: { id } }),
        "Plan not found."
      ),
      {
        json: ["entitlements", "quotas"],
        nullableJson: ["metadata"],
        dates: ["createdAt", "updatedAt"]
      }
    );
  }

  async updateBillingPlan(id: string, input: JsonRecord) {
    this.ensureRecord(await this.prisma.enterpriseBillingPlan.findUnique({ where: { id } }), "Plan not found.");
    const row = await this.prisma.enterpriseBillingPlan.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["code", "name", "status", "priceAmount", "currency", "intervalKey"]),
        ...(input.entitlements !== undefined ? { entitlements: asInputJson(input.entitlements) } : {}),
        ...(input.quotas !== undefined ? { quotas: asInputJson(input.quotas) } : {}),
        ...(input.metadata !== undefined ? { metadata: asNullableInputJson(input.metadata) } : {})
      }
    });

    return this.normalizeRecord(row, {
      json: ["entitlements", "quotas"],
      nullableJson: ["metadata"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async archiveBillingPlan(id: string) {
    this.ensureRecord(await this.prisma.enterpriseBillingPlan.findUnique({ where: { id } }), "Plan not found.");
    const row = await this.prisma.enterpriseBillingPlan.update({
      where: { id },
      data: { status: "ARCHIVED" }
    });

    return this.normalizeRecord(row, {
      json: ["entitlements", "quotas"],
      nullableJson: ["metadata"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async updateBillingPlanStatus(id: string, input: JsonRecord) {
    const status = String(input.status ?? "").trim();
    if (!status) {
      throw new BadRequestException("status is required.");
    }

    this.ensureRecord(await this.prisma.enterpriseBillingPlan.findUnique({ where: { id } }), "Plan not found.");
    const row = await this.prisma.enterpriseBillingPlan.update({
      where: { id },
      data: { status }
    });

    return this.normalizeRecord(row, {
      json: ["entitlements", "quotas"],
      nullableJson: ["metadata"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async listBillingSubscriptions() {
    const rows = await this.prisma.enterpriseSubscription.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        nullableJson: ["metadata"],
        dates: ["startedAt", "currentPeriodStart", "currentPeriodEnd", "cancelledAt", "createdAt", "updatedAt"]
      })
    );
  }

  async getBillingSubscription(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.enterpriseSubscription.findUnique({ where: { id } }),
        "Subscription not found."
      ),
      {
        nullableJson: ["metadata"],
        dates: ["startedAt", "currentPeriodStart", "currentPeriodEnd", "cancelledAt", "createdAt", "updatedAt"]
      }
    );
  }

  async updateBillingSubscription(id: string, input: JsonRecord) {
    this.ensureRecord(
      await this.prisma.enterpriseSubscription.findUnique({ where: { id } }),
      "Subscription not found."
    );
    const row = await this.prisma.enterpriseSubscription.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["planId", "billingAccountId", "status"]),
        ...(input.currentPeriodStart !== undefined
          ? { currentPeriodStart: new Date(String(input.currentPeriodStart)) }
          : {}),
        ...(input.currentPeriodEnd !== undefined ? { currentPeriodEnd: new Date(String(input.currentPeriodEnd)) } : {}),
        ...(input.cancelledAt !== undefined ? { cancelledAt: input.cancelledAt ? new Date(String(input.cancelledAt)) : null } : {}),
        ...(input.metadata !== undefined ? { metadata: asNullableInputJson(input.metadata) } : {})
      }
    });

    return this.normalizeRecord(row, {
      nullableJson: ["metadata"],
      dates: ["startedAt", "currentPeriodStart", "currentPeriodEnd", "cancelledAt", "createdAt", "updatedAt"]
    });
  }

  async archiveBillingSubscription(id: string) {
    this.ensureRecord(
      await this.prisma.enterpriseSubscription.findUnique({ where: { id } }),
      "Subscription not found."
    );
    const row = await this.prisma.enterpriseSubscription.update({
      where: { id },
      data: { status: "ARCHIVED", cancelledAt: new Date() }
    });

    return this.normalizeRecord(row, {
      nullableJson: ["metadata"],
      dates: ["startedAt", "currentPeriodStart", "currentPeriodEnd", "cancelledAt", "createdAt", "updatedAt"]
    });
  }

  async updateBillingSubscriptionStatus(id: string, input: JsonRecord) {
    const status = String(input.status ?? "").trim();
    if (!status) {
      throw new BadRequestException("status is required.");
    }

    this.ensureRecord(
      await this.prisma.enterpriseSubscription.findUnique({ where: { id } }),
      "Subscription not found."
    );
    const row = await this.prisma.enterpriseSubscription.update({
      where: { id },
      data: {
        status,
        ...(status === "CANCELLED" ? { cancelledAt: new Date() } : {})
      }
    });

    return this.normalizeRecord(row, {
      nullableJson: ["metadata"],
      dates: ["startedAt", "currentPeriodStart", "currentPeriodEnd", "cancelledAt", "createdAt", "updatedAt"]
    });
  }

  async listBillingInvoices() {
    const rows = await this.prisma.enterpriseInvoice.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        arrays: ["lines"],
        nullableJson: ["metadata"],
        dates: ["dueAt", "issuedAt", "paidAt", "createdAt", "updatedAt"]
      })
    );
  }

  async getBillingInvoice(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.enterpriseInvoice.findUnique({ where: { id } }),
        "Invoice not found."
      ),
      {
        arrays: ["lines"],
        nullableJson: ["metadata"],
        dates: ["dueAt", "issuedAt", "paidAt", "createdAt", "updatedAt"]
      }
    );
  }

  async updateBillingInvoice(id: string, input: JsonRecord) {
    this.ensureRecord(await this.prisma.enterpriseInvoice.findUnique({ where: { id } }), "Invoice not found.");
    const row = await this.prisma.enterpriseInvoice.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["billingAccountId", "subscriptionId", "number", "status", "currency", "subtotalAmount", "totalAmount"]),
        ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(String(input.dueAt)) : null } : {}),
        ...(input.issuedAt !== undefined ? { issuedAt: input.issuedAt ? new Date(String(input.issuedAt)) : null } : {}),
        ...(input.paidAt !== undefined ? { paidAt: input.paidAt ? new Date(String(input.paidAt)) : null } : {}),
        ...(input.lines !== undefined ? { lines: input.lines as Prisma.InputJsonValue } : {}),
        ...(input.metadata !== undefined ? { metadata: asNullableInputJson(input.metadata) } : {})
      }
    });

    return this.normalizeRecord(row, {
      arrays: ["lines"],
      nullableJson: ["metadata"],
      dates: ["dueAt", "issuedAt", "paidAt", "createdAt", "updatedAt"]
    });
  }

  async archiveBillingInvoice(id: string) {
    this.ensureRecord(await this.prisma.enterpriseInvoice.findUnique({ where: { id } }), "Invoice not found.");
    const row = await this.prisma.enterpriseInvoice.update({
      where: { id },
      data: { status: "ARCHIVED" }
    });

    return this.normalizeRecord(row, {
      arrays: ["lines"],
      nullableJson: ["metadata"],
      dates: ["dueAt", "issuedAt", "paidAt", "createdAt", "updatedAt"]
    });
  }

  async updateBillingInvoiceStatus(id: string, input: JsonRecord) {
    const status = String(input.status ?? "").trim();
    if (!status) {
      throw new BadRequestException("status is required.");
    }

    this.ensureRecord(await this.prisma.enterpriseInvoice.findUnique({ where: { id } }), "Invoice not found.");
    const row = await this.prisma.enterpriseInvoice.update({
      where: { id },
      data: { status }
    });

    return this.normalizeRecord(row, {
      arrays: ["lines"],
      nullableJson: ["metadata"],
      dates: ["dueAt", "issuedAt", "paidAt", "createdAt", "updatedAt"]
    });
  }

  async listBillingEntitlements() {
    const rows = await this.prisma.enterpriseEntitlementGrant.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        json: ["value"],
        dates: ["createdAt", "updatedAt"]
      })
    );
  }

  async getBillingEntitlement(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.enterpriseEntitlementGrant.findUnique({ where: { id } }),
        "Entitlement not found."
      ),
      {
        json: ["value"],
        dates: ["createdAt", "updatedAt"]
      }
    );
  }

  async updateBillingEntitlement(id: string, input: JsonRecord) {
    this.ensureRecord(
      await this.prisma.enterpriseEntitlementGrant.findUnique({ where: { id } }),
      "Entitlement not found."
    );
    const row = await this.prisma.enterpriseEntitlementGrant.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["subscriptionId", "key", "scopeType", "scopeId", "source"]),
        ...(input.value !== undefined ? { value: asInputJson(input.value) } : {})
      }
    });

    return this.normalizeRecord(row, {
      json: ["value"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async archiveBillingEntitlement(id: string) {
    this.ensureRecord(
      await this.prisma.enterpriseEntitlementGrant.findUnique({ where: { id } }),
      "Entitlement not found."
    );
    await this.prisma.enterpriseEntitlementGrant.delete({ where: { id } });
    return { archived: true, id };
  }

  async listBillingQuotas() {
    const rows = await this.prisma.enterpriseQuotaCounter.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        dates: ["resetAt", "createdAt", "updatedAt"]
      })
    );
  }

  async getBillingQuota(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.enterpriseQuotaCounter.findUnique({ where: { id } }),
        "Quota not found."
      ),
      {
        dates: ["resetAt", "createdAt", "updatedAt"]
      }
    );
  }

  async updateBillingQuota(id: string, input: JsonRecord) {
    this.ensureRecord(await this.prisma.enterpriseQuotaCounter.findUnique({ where: { id } }), "Quota not found.");
    const row = await this.prisma.enterpriseQuotaCounter.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["subscriptionId", "key", "scopeType", "scopeId"]),
        ...(input.limitValue !== undefined ? { limitValue: Number(input.limitValue) } : {}),
        ...(input.usedValue !== undefined ? { usedValue: Number(input.usedValue) } : {}),
        ...(input.resetAt !== undefined ? { resetAt: input.resetAt ? new Date(String(input.resetAt)) : null } : {})
      }
    });

    return this.normalizeRecord(row, {
      dates: ["resetAt", "createdAt", "updatedAt"]
    });
  }

  async archiveBillingQuota(id: string) {
    this.ensureRecord(await this.prisma.enterpriseQuotaCounter.findUnique({ where: { id } }), "Quota not found.");
    await this.prisma.enterpriseQuotaCounter.delete({ where: { id } });
    return { archived: true, id };
  }

  async listIdentityProviders() {
    const rows = await this.prisma.enterpriseIdentityProvider.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        json: ["config"],
        dates: ["createdAt", "updatedAt"]
      })
    );
  }

  async getIdentityProvider(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.enterpriseIdentityProvider.findUnique({ where: { id } }),
        "Identity provider not found."
      ),
      {
        json: ["config"],
        dates: ["createdAt", "updatedAt"]
      }
    );
  }

  async updateIdentityProvider(id: string, input: JsonRecord) {
    this.ensureRecord(
      await this.prisma.enterpriseIdentityProvider.findUnique({ where: { id } }),
      "Identity provider not found."
    );
    const row = await this.prisma.enterpriseIdentityProvider.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["tenantId", "organizationId", "code", "type", "status"]),
        ...(input.config !== undefined ? { config: asInputJson(input.config) } : {})
      }
    });

    return this.normalizeRecord(row, {
      json: ["config"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async archiveIdentityProvider(id: string) {
    this.ensureRecord(
      await this.prisma.enterpriseIdentityProvider.findUnique({ where: { id } }),
      "Identity provider not found."
    );
    const row = await this.prisma.enterpriseIdentityProvider.update({
      where: { id },
      data: { status: "ARCHIVED" }
    });

    return this.normalizeRecord(row, {
      json: ["config"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async updateIdentityProviderStatus(id: string, input: JsonRecord) {
    const status = String(input.status ?? "").trim();
    if (!status) {
      throw new BadRequestException("status is required.");
    }

    this.ensureRecord(
      await this.prisma.enterpriseIdentityProvider.findUnique({ where: { id } }),
      "Identity provider not found."
    );
    const row = await this.prisma.enterpriseIdentityProvider.update({
      where: { id },
      data: { status }
    });

    return this.normalizeRecord(row, {
      json: ["config"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async listFederatedLinks(identityProviderId?: string) {
    const rows = await this.prisma.federatedIdentityLink.findMany({
      where: identityProviderId ? { identityProviderId } : undefined,
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => this.normalizeRecord(row, { dates: ["createdAt", "updatedAt"] }));
  }

  async getFederatedLink(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.federatedIdentityLink.findUnique({ where: { id } }),
        "Federated link not found."
      ),
      { dates: ["createdAt", "updatedAt"] }
    );
  }

  async updateFederatedLink(id: string, input: JsonRecord) {
    this.ensureRecord(await this.prisma.federatedIdentityLink.findUnique({ where: { id } }), "Federated link not found.");
    const row = await this.prisma.federatedIdentityLink.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["userId", "externalSubject", "email"])
      }
    });

    return this.normalizeRecord(row, { dates: ["createdAt", "updatedAt"] });
  }

  async archiveFederatedLink(id: string) {
    this.ensureRecord(await this.prisma.federatedIdentityLink.findUnique({ where: { id } }), "Federated link not found.");
    await this.prisma.federatedIdentityLink.delete({ where: { id } });
    return { archived: true, id };
  }

  async listAdvancedRolePolicies() {
    const rows = await this.prisma.advancedRolePolicy.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        json: ["rules"],
        dates: ["createdAt", "updatedAt"]
      })
    );
  }

  async getAdvancedRolePolicy(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.advancedRolePolicy.findUnique({ where: { id } }),
        "Policy not found."
      ),
      {
        json: ["rules"],
        dates: ["createdAt", "updatedAt"]
      }
    );
  }

  async updateAdvancedRolePolicy(id: string, input: JsonRecord) {
    this.ensureRecord(await this.prisma.advancedRolePolicy.findUnique({ where: { id } }), "Policy not found.");
    const row = await this.prisma.advancedRolePolicy.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["tenantId", "organizationId", "key"]),
        ...(input.rules !== undefined ? { rules: asInputJson(input.rules) } : {})
      }
    });

    return this.normalizeRecord(row, {
      json: ["rules"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async archiveAdvancedRolePolicy(id: string) {
    this.ensureRecord(await this.prisma.advancedRolePolicy.findUnique({ where: { id } }), "Policy not found.");
    await this.prisma.advancedRolePolicy.delete({ where: { id } });
    return { archived: true, id };
  }

  async listAuditExports() {
    const rows = await this.prisma.auditExportJob.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        nullableJson: ["filter", "artifact"],
        dates: ["completedAt", "createdAt", "updatedAt"]
      })
    );
  }

  async getAuditExport(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.auditExportJob.findUnique({ where: { id } }),
        "Audit export not found."
      ),
      {
        nullableJson: ["filter", "artifact"],
        dates: ["completedAt", "createdAt", "updatedAt"]
      }
    );
  }

  async updateAuditExport(id: string, input: JsonRecord) {
    this.ensureRecord(await this.prisma.auditExportJob.findUnique({ where: { id } }), "Audit export not found.");
    const row = await this.prisma.auditExportJob.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["tenantId", "organizationId", "status", "createdByUserId"]),
        ...(input.filter !== undefined ? { filter: asNullableInputJson(input.filter) } : {}),
        ...(input.artifact !== undefined ? { artifact: asNullableInputJson(input.artifact) } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt ? new Date(String(input.completedAt)) : null } : {})
      }
    });

    return this.normalizeRecord(row, {
      nullableJson: ["filter", "artifact"],
      dates: ["completedAt", "createdAt", "updatedAt"]
    });
  }

  async updateAuditExportStatus(id: string, input: JsonRecord) {
    const status = String(input.status ?? "").trim();
    if (!status) {
      throw new BadRequestException("status is required.");
    }

    this.ensureRecord(await this.prisma.auditExportJob.findUnique({ where: { id } }), "Audit export not found.");
    const row = await this.prisma.auditExportJob.update({
      where: { id },
      data: { status }
    });

    return this.normalizeRecord(row, {
      nullableJson: ["filter", "artifact"],
      dates: ["completedAt", "createdAt", "updatedAt"]
    });
  }

  async archiveAuditExport(id: string) {
    this.ensureRecord(await this.prisma.auditExportJob.findUnique({ where: { id } }), "Audit export not found.");
    const row = await this.prisma.auditExportJob.update({
      where: { id },
      data: { status: "ARCHIVED" }
    });

    return this.normalizeRecord(row, {
      nullableJson: ["filter", "artifact"],
      dates: ["completedAt", "createdAt", "updatedAt"]
    });
  }

  async listCompliancePacks() {
    const rows = await this.prisma.compliancePack.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        json: ["controls"],
        dates: ["createdAt", "updatedAt"]
      })
    );
  }

  async getCompliancePack(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.compliancePack.findUnique({ where: { id } }),
        "Compliance pack not found."
      ),
      {
        json: ["controls"],
        dates: ["createdAt", "updatedAt"]
      }
    );
  }

  async updateCompliancePack(id: string, input: JsonRecord) {
    this.ensureRecord(await this.prisma.compliancePack.findUnique({ where: { id } }), "Compliance pack not found.");
    const row = await this.prisma.compliancePack.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["tenantId", "organizationId", "code", "name", "status"]),
        ...(input.controls !== undefined ? { controls: asInputJson(input.controls) } : {})
      }
    });

    return this.normalizeRecord(row, {
      json: ["controls"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async archiveCompliancePack(id: string) {
    this.ensureRecord(await this.prisma.compliancePack.findUnique({ where: { id } }), "Compliance pack not found.");
    const row = await this.prisma.compliancePack.update({
      where: { id },
      data: { status: "ARCHIVED" }
    });

    return this.normalizeRecord(row, {
      json: ["controls"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async updateCompliancePackStatus(id: string, input: JsonRecord) {
    const status = String(input.status ?? "").trim();
    if (!status) {
      throw new BadRequestException("status is required.");
    }

    this.ensureRecord(await this.prisma.compliancePack.findUnique({ where: { id } }), "Compliance pack not found.");
    const row = await this.prisma.compliancePack.update({
      where: { id },
      data: { status }
    });

    return this.normalizeRecord(row, {
      json: ["controls"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async listComplianceEvidenceArtifacts() {
    const rows = await this.prisma.complianceEvidenceArtifact.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        json: ["artifact"],
        dates: ["createdAt"]
      })
    );
  }

  async getComplianceEvidenceArtifact(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.complianceEvidenceArtifact.findUnique({ where: { id } }),
        "Evidence artifact not found."
      ),
      {
        json: ["artifact"],
        dates: ["createdAt"]
      }
    );
  }

  async updateComplianceEvidenceArtifact(id: string, input: JsonRecord) {
    this.ensureRecord(
      await this.prisma.complianceEvidenceArtifact.findUnique({ where: { id } }),
      "Evidence artifact not found."
    );
    const row = await this.prisma.complianceEvidenceArtifact.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["compliancePackId", "tenantId", "organizationId", "key"]),
        ...(input.artifact !== undefined ? { artifact: asInputJson(input.artifact) } : {})
      }
    });

    return this.normalizeRecord(row, {
      json: ["artifact"],
      dates: ["createdAt"]
    });
  }

  async archiveComplianceEvidenceArtifact(id: string) {
    this.ensureRecord(
      await this.prisma.complianceEvidenceArtifact.findUnique({ where: { id } }),
      "Evidence artifact not found."
    );
    await this.prisma.complianceEvidenceArtifact.delete({ where: { id } });
    return { archived: true, id };
  }

  async listSecretRegistryEntries() {
    const rows = await this.prisma.secretRegistryEntry.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) => this.redactedSecretRow(row));
  }

  async getSecretRegistryEntry(id: string) {
    return this.redactedSecretRow(
      this.ensureRecord(
        await this.prisma.secretRegistryEntry.findUnique({ where: { id } }),
        "Secret entry not found."
      )
    );
  }

  async updateSecretRegistryEntry(id: string, input: JsonRecord) {
    this.ensureRecord(
      await this.prisma.secretRegistryEntry.findUnique({ where: { id } }),
      "Secret entry not found."
    );
    const row = await this.prisma.secretRegistryEntry.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["tenantId", "organizationId", "scopeType", "scopeId", "key"]),
        ...(input.value !== undefined
          ? {
              valueEnvelope: {
                kind: "opaque",
                storedAt: new Date().toISOString(),
                value: input.value
              }
            }
          : {}),
        ...(input.metadata !== undefined ? { metadata: asNullableInputJson(input.metadata) } : {})
      }
    });

    return this.redactedSecretRow(row);
  }

  async archiveSecretRegistryEntry(id: string) {
    this.ensureRecord(
      await this.prisma.secretRegistryEntry.findUnique({ where: { id } }),
      "Secret entry not found."
    );
    await this.prisma.secretRegistryEntry.delete({ where: { id } });
    return { archived: true, id };
  }

  async listDeploymentVariants() {
    const rows = await this.prisma.deploymentVariant.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        json: ["config"],
        dates: ["createdAt", "updatedAt"]
      })
    );
  }

  async getDeploymentVariant(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.deploymentVariant.findUnique({ where: { id } }),
        "Deployment variant not found."
      ),
      {
        json: ["config"],
        dates: ["createdAt", "updatedAt"]
      }
    );
  }

  async updateDeploymentVariant(id: string, input: JsonRecord) {
    this.ensureRecord(await this.prisma.deploymentVariant.findUnique({ where: { id } }), "Deployment variant not found.");
    const row = await this.prisma.deploymentVariant.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["tenantId", "organizationId", "code", "name", "status"]),
        ...(input.config !== undefined ? { config: asInputJson(input.config) } : {})
      }
    });

    return this.normalizeRecord(row, {
      json: ["config"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async archiveDeploymentVariant(id: string) {
    this.ensureRecord(await this.prisma.deploymentVariant.findUnique({ where: { id } }), "Deployment variant not found.");
    const row = await this.prisma.deploymentVariant.update({
      where: { id },
      data: { status: "ARCHIVED" }
    });

    return this.normalizeRecord(row, {
      json: ["config"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async updateDeploymentVariantStatus(id: string, input: JsonRecord) {
    const status = String(input.status ?? "").trim();
    if (!status) {
      throw new BadRequestException("status is required.");
    }

    this.ensureRecord(await this.prisma.deploymentVariant.findUnique({ where: { id } }), "Deployment variant not found.");
    const row = await this.prisma.deploymentVariant.update({
      where: { id },
      data: { status }
    });

    return this.normalizeRecord(row, {
      json: ["config"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async listPartnerSdkContracts() {
    const rows = await this.prisma.partnerSdkContract.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        json: ["schema"],
        dates: ["createdAt", "updatedAt"]
      })
    );
  }

  async getPartnerSdkContract(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.partnerSdkContract.findUnique({ where: { id } }),
        "Partner SDK contract not found."
      ),
      {
        json: ["schema"],
        dates: ["createdAt", "updatedAt"]
      }
    );
  }

  async updatePartnerSdkContract(id: string, input: JsonRecord) {
    this.ensureRecord(
      await this.prisma.partnerSdkContract.findUnique({ where: { id } }),
      "Partner SDK contract not found."
    );
    const row = await this.prisma.partnerSdkContract.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["partnerAccountId", "key", "version", "status"]),
        ...(input.schema !== undefined ? { schema: asInputJson(input.schema) } : {})
      }
    });

    return this.normalizeRecord(row, {
      json: ["schema"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async archivePartnerSdkContract(id: string) {
    this.ensureRecord(
      await this.prisma.partnerSdkContract.findUnique({ where: { id } }),
      "Partner SDK contract not found."
    );
    const row = await this.prisma.partnerSdkContract.update({
      where: { id },
      data: { status: "ARCHIVED" }
    });

    return this.normalizeRecord(row, {
      json: ["schema"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async updatePartnerSdkContractStatus(id: string, input: JsonRecord) {
    const status = String(input.status ?? "").trim();
    if (!status) {
      throw new BadRequestException("status is required.");
    }

    this.ensureRecord(
      await this.prisma.partnerSdkContract.findUnique({ where: { id } }),
      "Partner SDK contract not found."
    );
    const row = await this.prisma.partnerSdkContract.update({
      where: { id },
      data: { status }
    });

    return this.normalizeRecord(row, {
      json: ["schema"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async listIntegrationRegistryEntries() {
    const rows = await this.prisma.integrationRegistryEntry.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        json: ["manifest"],
        dates: ["createdAt", "updatedAt"]
      })
    );
  }

  async getIntegrationRegistryEntry(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.integrationRegistryEntry.findUnique({ where: { id } }),
        "Registry entry not found."
      ),
      {
        json: ["manifest"],
        dates: ["createdAt", "updatedAt"]
      }
    );
  }

  async getDeveloperPackage(id: string) {
    const registryEntry = await this.getIntegrationRegistryEntry(id);
    const [connectorTemplateRows, partnerContractRows] = await Promise.all([
      this.prisma.connectorTemplate.findMany({
        where: { connectorKey: String(registryEntry.connectorKey) },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.partnerSdkContract.findMany({
        where: { key: String(registryEntry.connectorKey) },
        orderBy: { createdAt: "desc" }
      })
    ]);

    const exactTemplate =
      connectorTemplateRows.find((item) => item.version === registryEntry.version) ??
      connectorTemplateRows[0] ??
      null;
    const connectorTemplate = exactTemplate
      ? this.normalizeRecord(exactTemplate, {
          json: ["manifest"],
          dates: ["createdAt", "updatedAt"]
        })
      : null;
    const exactPartnerContractRows = partnerContractRows.filter(
      (item) => item.version === registryEntry.version
    );
    const selectedPartnerContractRows =
      exactPartnerContractRows.length > 0
        ? exactPartnerContractRows
        : partnerContractRows.length > 0
          ? [partnerContractRows[0]]
          : [];
    const partnerSdkContracts = selectedPartnerContractRows.map((row) =>
      this.normalizeRecord(row, {
        json: ["schema"],
        dates: ["createdAt", "updatedAt"]
      })
    );

    const manifest = asObject(registryEntry.manifest);
    const lifecycle = asObject(manifest.lifecycle);
    const compatibility = asObject(manifest.compatibility);
    const bundle = {
      connectorKey: registryEntry.connectorKey,
      version: registryEntry.version,
      registryEntry,
      connectorTemplate,
      partnerSdkContracts,
      compatibility: {
        templateVersion: connectorTemplate?.version ?? null,
        partnerContractVersions: partnerSdkContracts.map((item) => String(item.version)),
        rolloutChannel: String(compatibility.rolloutChannel ?? lifecycle.rolloutChannel ?? "general"),
        supportsBackwardCompatibility: Boolean(
          compatibility.supportsBackwardCompatibility ?? true
        )
      },
      lifecycle: {
        status: String(registryEntry.status),
        deprecationStage: String(
          lifecycle.deprecationStage ??
            (registryEntry.status === "ARCHIVED"
              ? "archived"
              : registryEntry.status === "DEPRECATED"
                ? "deprecated"
                : "active")
        ),
        sunsetAt: lifecycle.sunsetAt ? String(lifecycle.sunsetAt) : null
      }
    };

    return {
      connectorKey: String(registryEntry.connectorKey),
      version: String(registryEntry.version),
      packageFileName: `${registryEntry.connectorKey}-${registryEntry.version}-developer-package.json`,
      contentType: "application/json",
      compatibility: bundle.compatibility,
      lifecycle: bundle.lifecycle,
      registryEntry,
      connectorTemplate,
      partnerSdkContracts,
      content: JSON.stringify(bundle, null, 2)
    };
  }

  async getDeveloperDocs(id: string) {
    const developerPackage = await this.getDeveloperPackage(id);
    const sections = [
      {
        title: "Overview",
        body: `Connector \`${developerPackage.connectorKey}\` version \`${developerPackage.version}\` is published with lifecycle status \`${developerPackage.lifecycle.status}\` and rollout channel \`${developerPackage.compatibility.rolloutChannel}\`.`
      },
      {
        title: "Compatibility",
        body: `Template version: ${developerPackage.compatibility.templateVersion ?? "n/a"}. Partner contract versions: ${developerPackage.compatibility.partnerContractVersions.join(", ") || "none"}. Backward compatibility: ${developerPackage.compatibility.supportsBackwardCompatibility ? "supported" : "not guaranteed"}.`
      },
      {
        title: "Manifest",
        body: JSON.stringify(developerPackage.registryEntry.manifest, null, 2)
      },
      {
        title: "Template",
        body: developerPackage.connectorTemplate
          ? JSON.stringify(developerPackage.connectorTemplate.manifest, null, 2)
          : "No connector template is currently published for this registry entry."
      },
      {
        title: "Partner Contracts",
        body:
          developerPackage.partnerSdkContracts.length > 0
            ? developerPackage.partnerSdkContracts
                .map(
                  (item) =>
                    `- ${item.key}@${item.version} [${item.status}]\n${JSON.stringify(item.schema, null, 2)}`
                )
                .join("\n\n")
            : "No partner SDK contracts are currently published for this connector."
      }
    ];

    return {
      connectorKey: developerPackage.connectorKey,
      version: developerPackage.version,
      title: `${developerPackage.connectorKey} developer docs`,
      summary: `Developer-facing package for ${developerPackage.connectorKey}@${developerPackage.version}`,
      sections,
      markdown: sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n")
    };
  }

  async getIntegrationPublicationReadiness(id: string, input: JsonRecord = {}) {
    const registryEntry = await this.getIntegrationRegistryEntry(id);
    const tenantId = registryEntry.tenantId ? String(registryEntry.tenantId) : null;
    const organizationId = registryEntry.organizationId ? String(registryEntry.organizationId) : null;
    const connectorKey = String(registryEntry.connectorKey);
    const version = String(registryEntry.version);
    const manifest = asObject(registryEntry.manifest);
    const visibility = String(input.visibility ?? "PARTNER").trim().toUpperCase();
    const fallbackRolloutChannel = String(
      asObject(manifest.compatibility).rolloutChannel ??
        asObject(asObject(manifest).lifecycle).rolloutChannel ??
        "general"
    );
    const channel = String(input.channel ?? fallbackRolloutChannel).trim();
    const [connectorTemplate, partnerContract, signingSecret] = await Promise.all([
      this.prisma.connectorTemplate.findFirst({
        where: { connectorKey, version },
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.partnerSdkContract.findFirst({
        where: { key: connectorKey, version, status: { not: "ARCHIVED" } },
        orderBy: { createdAt: "desc" }
      }),
      this.resolveReleaseSigningSecret({
        tenantId,
        organizationId,
        signingKey: input.signingKey ? String(input.signingKey) : null
      })
    ]);

    const evaluation = this.evaluateDistributionPolicy(manifest, {
      visibility,
      channel,
      hasConnectorTemplate: Boolean(connectorTemplate),
      hasVersionScopedPartnerContract: Boolean(partnerContract),
      signatureAvailable: Boolean(signingSecret)
    });

    return {
      registryEntryId: String(registryEntry.id),
      connectorKey,
      version,
      targetVisibility: visibility,
      targetChannel: channel,
      ...evaluation
    };
  }

  async listIntegrationPublications() {
    const rows = await this.prisma.integrationPublication.findMany({
      orderBy: { publishedAt: "desc" }
    });
    return rows.map((row) => this.normalizePublication(row));
  }

  async getIntegrationPublication(id: string) {
    return this.normalizePublication(
      this.ensureRecord(
        await this.prisma.integrationPublication.findUnique({ where: { id } }),
        "Integration publication not found."
      )
    );
  }

  async getIntegrationPublicationPackage(id: string) {
    const publication = await this.getIntegrationPublication(id);
    return asObject(asObject(publication.artifact).package);
  }

  async getIntegrationPublicationDocs(id: string) {
    const publication = await this.getIntegrationPublication(id);
    return asObject(asObject(publication.artifact).docs);
  }

  async listIntegrationPublicationEvents(id: string) {
    this.ensureRecord(
      await this.prisma.integrationPublication.findUnique({ where: { id } }),
      "Integration publication not found."
    );
    const rows = await this.prisma.integrationPublicationEvent.findMany({
      where: { publicationId: id },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => this.normalizePublicationEvent(row));
  }

  async listIntegrationDistributionRequests(publicationId: string) {
    this.ensureRecord(
      await this.prisma.integrationPublication.findUnique({ where: { id: publicationId } }),
      "Integration publication not found."
    );
    const rows = await this.prisma.integrationDistributionRequest.findMany({
      where: { publicationId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => this.normalizeDistributionRequest(row));
  }

  async listIntegrationActivationRequests(publicationId: string) {
    this.ensureRecord(
      await this.prisma.integrationPublication.findUnique({ where: { id: publicationId } }),
      "Integration publication not found."
    );
    const rows = await this.prisma.integrationActivationRequest.findMany({
      where: { publicationId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => {
      const normalized = this.normalizeActivationRequest(row) as Record<string, unknown>;
      return {
        ...normalized,
        runtimeInstall: asObject(asObject(normalized.activationArtifact).runtimeInstall)
      };
    });
  }

  async listInventoryProviderRuntimePolicies() {
    return listInventorySupplierProviderRuntimePolicies().map((policy) => ({
      key: policy.key,
      name: policy.name,
      description: policy.description,
      riskLevel: policy.riskLevel,
      executionModel: policy.executionModel,
      adapterKeys: policy.adapterKeys.slice(),
      profileKeys: policy.profileKeys.slice(),
      distribution: { ...policy.distribution },
      activation: { ...policy.activation },
      runtime: { ...policy.runtime },
      summary: {
        allowedVisibility: policy.distribution.allowedVisibility,
        allowedChannels: policy.distribution.allowedChannels,
        requirePublicationSnapshot: policy.distribution.requirePublicationSnapshot,
        requireSignedPublication: policy.distribution.requireSignedPublication,
        requireApproval: policy.activation.requireApproval,
        requireAppliedActivation: policy.activation.requireAppliedActivation,
        requireTenantInstall: policy.activation.requireTenantInstall,
        requireCurrentGovernance: policy.runtime.requireCurrentGovernance,
        requireCurrentSourceDigest: policy.runtime.requireCurrentSourceDigest,
        requireResolvedSecrets: policy.runtime.requireResolvedSecrets,
        allowGlobalFallback: policy.runtime.allowGlobalFallback,
        preferredRetryExecution: policy.runtime.preferredRetryExecution
      }
    }));
  }

  async createIntegrationActivationRequest(
    context: RequestContext,
    publicationId: string,
    input: JsonRecord = {}
  ) {
    const publication = this.ensureRecord(
      await this.prisma.integrationPublication.findUnique({ where: { id: publicationId } }),
      "Integration publication not found."
    );
    const targetKind = String(input.targetKind ?? "SUPPLIER_CONNECTOR").trim().toUpperCase();
    const row = await this.prisma.integrationActivationRequest.create({
      data: {
        publicationId,
        registryEntryId: String(publication.registryEntryId),
        tenantId: publication.tenantId ? String(publication.tenantId) : null,
        organizationId: publication.organizationId ? String(publication.organizationId) : null,
        targetKind,
        connectorKey: String(publication.connectorKey),
        version: String(publication.version),
        requestNotes:
          input.requestNotes !== undefined ? asNullableInputJson(input.requestNotes) : undefined,
        decisionNotes:
          input.decisionNotes !== undefined ? asNullableInputJson(input.decisionNotes) : undefined,
        requestedByUserId:
          context.scope === "device" ? null : asUuidOrNull(context.userId)
      }
    });

    await this.createPublicationEvent(
      publicationId,
      "ACTIVATION_REQUESTED",
      context.scope === "device" ? "DEVICE" : "USER",
      context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
      {
        activationRequestId: row.id,
        targetKind,
        connectorKey: row.connectorKey,
        version: row.version
      }
    );

    return this.normalizeActivationRequest(row);
  }

  async getIntegrationActivationRequestReadiness(id: string) {
    const request = this.ensureRecord(
      await this.prisma.integrationActivationRequest.findUnique({ where: { id } }),
      "Integration activation request not found."
    );
    const [publication, registryEntry] = await Promise.all([
      request.publicationId
        ? this.prisma.integrationPublication.findUnique({ where: { id: request.publicationId } })
        : null,
      request.registryEntryId
        ? this.prisma.integrationRegistryEntry.findUnique({ where: { id: request.registryEntryId } })
        : this.prisma.integrationRegistryEntry.findFirst({
            where: {
              connectorKey: request.connectorKey,
              version: request.version,
              status: "ACTIVE",
              ...(request.tenantId ? { OR: [{ tenantId: request.tenantId }, { tenantId: null }] } : {})
            },
            orderBy: { createdAt: "desc" }
          })
    ]);

    return this.getActivationRequestReadinessSnapshot(
      this.normalizeActivationRequest(request) as Record<string, unknown>,
      publication ? (this.normalizePublication(publication) as unknown as Record<string, unknown>) : null,
      registryEntry
        ? (this.normalizeRecord(registryEntry, {
            json: ["manifest"],
            dates: ["createdAt", "updatedAt"]
          }) as unknown as Record<string, unknown>)
        : null
    );
  }

  async updateIntegrationActivationRequestStatus(id: string, input: JsonRecord = {}) {
    const current = this.ensureRecord(
      await this.prisma.integrationActivationRequest.findUnique({ where: { id } }),
      "Integration activation request not found."
    );
    const status = String(input.status ?? "").trim().toUpperCase();
    if (!status) {
      throw new BadRequestException("status is required.");
    }
    const row = await this.prisma.integrationActivationRequest.update({
      where: { id },
      data: {
        status,
        decisionNotes:
          input.decisionNotes !== undefined ? asNullableInputJson(input.decisionNotes) : undefined,
        approvedAt: status === "APPROVED" ? current.approvedAt ?? new Date() : status === "REVOKED" ? null : current.approvedAt,
        rejectedAt: status === "REJECTED" ? current.rejectedAt ?? new Date() : current.rejectedAt,
        revokedAt: status === "REVOKED" ? current.revokedAt ?? new Date() : current.revokedAt
      }
    });

    if (current.publicationId) {
      await this.createPublicationEvent(
        current.publicationId,
        "ACTIVATION_REQUEST_STATUS_CHANGED",
        "USER",
        null,
        {
          activationRequestId: id,
          previousStatus: current.status,
          nextStatus: status,
          targetKind: current.targetKind
        }
      );
    }

    return this.normalizeActivationRequest(row);
  }

  async applyIntegrationActivationRequest(
    context: RequestContext,
    id: string,
    input: JsonRecord = {}
  ) {
    const current = this.ensureRecord(
      await this.prisma.integrationActivationRequest.findUnique({ where: { id } }),
      "Integration activation request not found."
    );
    const readiness = await this.getIntegrationActivationRequestReadiness(id);
    if (!readiness.canApply && input.force !== true) {
      throw new BadRequestException(
        readiness.blockingIssues.join(" ") || "Activation request cannot be applied."
      );
    }
    const publication = current.publicationId
      ? this.ensureRecord(
          await this.prisma.integrationPublication.findUnique({ where: { id: current.publicationId } }),
          "Integration publication not found."
        )
      : null;
    const registryEntry = this.ensureRecord(
      current.registryEntryId
        ? await this.prisma.integrationRegistryEntry.findUnique({ where: { id: current.registryEntryId } })
        : await this.prisma.integrationRegistryEntry.findFirst({
            where: {
              connectorKey: current.connectorKey,
              version: current.version,
              status: "ACTIVE",
              ...(current.tenantId ? { OR: [{ tenantId: current.tenantId }, { tenantId: null }] } : {})
            },
            orderBy: { createdAt: "desc" }
          }),
      "Activation registry entry not found."
    );
    const activationArtifact = this.buildActivationArtifact(
      this.normalizeActivationRequest(current) as Record<string, unknown>,
      publication ? (this.normalizePublication(publication) as unknown as Record<string, unknown>) : null,
      this.normalizeRecord(registryEntry, {
        json: ["manifest"],
        dates: ["createdAt", "updatedAt"]
      }) as unknown as Record<string, unknown>
    );
    const row = await this.prisma.integrationActivationRequest.update({
      where: { id },
      data: {
        status: "APPLIED",
        appliedAt: new Date(),
        activationArtifact: asInputJson(activationArtifact),
        decisionNotes:
          input.decisionNotes !== undefined ? asNullableInputJson(input.decisionNotes) : undefined
      }
    });

    if (current.publicationId) {
      await this.createPublicationEvent(
        current.publicationId,
        "ACTIVATION_APPLIED",
        context.scope === "device" ? "DEVICE" : "USER",
        context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
        {
          activationRequestId: id,
          targetKind: current.targetKind,
          connectorKey: current.connectorKey,
          version: current.version
        }
      );
    }

    return this.normalizeActivationRequest(row);
  }

  async getIntegrationActivationRequestPackage(id: string) {
    const request = this.ensureRecord(
      await this.prisma.integrationActivationRequest.findUnique({ where: { id } }),
      "Integration activation request not found."
    );
    if (request.activationArtifact) {
      return asObject(request.activationArtifact);
    }
    const [publication, registryEntry] = await Promise.all([
      request.publicationId
        ? this.prisma.integrationPublication.findUnique({ where: { id: request.publicationId } })
        : null,
      request.registryEntryId
        ? this.prisma.integrationRegistryEntry.findUnique({ where: { id: request.registryEntryId } })
        : this.prisma.integrationRegistryEntry.findFirst({
            where: {
              connectorKey: request.connectorKey,
              version: request.version,
              status: "ACTIVE",
              ...(request.tenantId ? { OR: [{ tenantId: request.tenantId }, { tenantId: null }] } : {})
            },
            orderBy: { createdAt: "desc" }
          })
    ]);
    const artifact = registryEntry
      ? this.buildActivationArtifact(
          this.normalizeActivationRequest(request) as Record<string, unknown>,
          publication ? (this.normalizePublication(publication) as unknown as Record<string, unknown>) : null,
          this.normalizeRecord(registryEntry, {
            json: ["manifest"],
            dates: ["createdAt", "updatedAt"]
          }) as unknown as Record<string, unknown>
        )
      : {
          requestId: request.id,
          connectorKey: request.connectorKey,
          version: request.version,
          targetKind: request.targetKind,
          publicationId: request.publicationId ?? null,
      registryEntryId: request.registryEntryId ?? null
        };
    return artifact;
  }

  async getIntegrationActivationInstallReadiness(id: string) {
    const context = await this.resolveActivationRuntimeRolloutContext(id);
    const installReadiness = this.getActivationInstallReadinessSnapshot(
      context.normalizedRequest,
      context.normalizedPublication,
      context.normalizedRegistryEntry,
      context.connectorTemplate,
      context.normalizedInstalledRuntimeEntry
    );
    const runtimeRollout =
      context.normalizedInstalledRuntimeEntry
        ? this.getActivationRuntimeRolloutReadinessSnapshot({
            request: context.normalizedRequest,
            publication: context.normalizedPublication,
            registryEntry: context.normalizedRegistryEntry,
            connectorTemplate: context.connectorTemplate,
            installedRuntimeEntry: context.normalizedInstalledRuntimeEntry,
            targetTenantId: context.targetTenantId,
            targetStoreId: context.targetStoreId
          }).runtimeRollout
        : null;
    return {
      ...installReadiness,
      runtimeRollout
    };
  }

  async getIntegrationActivationInstallPackage(id: string) {
    const request = this.ensureRecord(
      await this.prisma.integrationActivationRequest.findUnique({ where: { id } }),
      "Integration activation request not found."
    );
    const [publication, registryEntry, connectorTemplateRow] = await Promise.all([
      request.publicationId
        ? this.prisma.integrationPublication.findUnique({ where: { id: request.publicationId } })
        : null,
      request.registryEntryId
        ? this.prisma.integrationRegistryEntry.findUnique({ where: { id: request.registryEntryId } })
        : this.prisma.integrationRegistryEntry.findFirst({
            where: {
              connectorKey: request.connectorKey,
              version: request.version,
              status: "ACTIVE",
              ...(request.tenantId ? { OR: [{ tenantId: request.tenantId }, { tenantId: null }] } : {})
            },
            orderBy: { createdAt: "desc" }
          }),
      this.prisma.connectorTemplate.findFirst({
        where: {
          connectorKey: request.connectorKey,
          version: request.version
        },
        orderBy: { createdAt: "desc" }
      })
    ]);
    const normalizedRequest = this.normalizeActivationRequest(request) as Record<string, unknown>;
    const normalizedPublication = publication
      ? (this.normalizePublication(publication) as unknown as Record<string, unknown>)
      : null;
    const normalizedRegistryEntry = registryEntry
      ? (this.normalizeRecord(registryEntry, {
          json: ["manifest"],
          dates: ["createdAt", "updatedAt"]
        }) as unknown as Record<string, unknown>)
      : null;
    const connectorTemplate = this.resolveActivationConnectorTemplate(
      request.connectorKey,
      request.version,
      normalizedPublication,
      connectorTemplateRow
        ? (this.normalizeRecord(connectorTemplateRow, {
            json: ["manifest"],
            dates: ["createdAt", "updatedAt"]
          }) as unknown as Record<string, unknown>)
        : null
    );
    const mergedManifest = this.deepMergeRecords(
      normalizedRegistryEntry ? asObject(normalizedRegistryEntry.manifest) : {},
      connectorTemplate.manifest
    );
    const runtimeSummary = this.summarizeConnectorRuntime(mergedManifest);
    const providerPolicy = resolveInventorySupplierProviderRuntimePolicyForRuntime({
      providerAdapterKey: runtimeSummary.providerAdapterKey,
      providerProfileKey: runtimeSummary.providerProfileKey
    });
    return {
      requestId: String(request.id),
      publicationId:
        normalizedRequest.publicationId !== undefined && normalizedRequest.publicationId !== null
          ? String(normalizedRequest.publicationId)
          : null,
      registryEntryId:
        normalizedRequest.registryEntryId !== undefined && normalizedRequest.registryEntryId !== null
          ? String(normalizedRequest.registryEntryId)
          : null,
      connectorKey: String(request.connectorKey),
      version: String(request.version),
      tenantId: this.readActivationTargetTenantId(normalizedRequest),
      targetTenantId: this.readActivationTargetTenantId(normalizedRequest),
      targetStoreId: this.readActivationTargetStoreId(normalizedRequest),
      source: connectorTemplate.source,
      templateId: connectorTemplate.templateId,
      templateVersion: connectorTemplate.templateVersion,
      runtime: {
        transportMode: runtimeSummary.transportMode,
        providerAdapterKey: runtimeSummary.providerAdapterKey,
        providerProfileKey: runtimeSummary.providerProfileKey,
        providerPolicyKey: providerPolicy?.key ?? null,
        providerPolicy: providerPolicy
          ? {
              key: providerPolicy.key,
              name: providerPolicy.name,
              riskLevel: providerPolicy.riskLevel,
              executionModel: providerPolicy.executionModel
            }
          : null,
        manifest: mergedManifest
      }
    };
  }

  private async resolveActivationRuntimeRolloutContext(id: string) {
    const request = this.ensureRecord(
      await this.prisma.integrationActivationRequest.findUnique({ where: { id } }),
      "Integration activation request not found."
    );
    const [publication, registryEntry, connectorTemplateRow] = await Promise.all([
      request.publicationId
        ? this.prisma.integrationPublication.findUnique({ where: { id: request.publicationId } })
        : null,
      request.registryEntryId
        ? this.prisma.integrationRegistryEntry.findUnique({ where: { id: request.registryEntryId } })
        : this.prisma.integrationRegistryEntry.findFirst({
            where: {
              connectorKey: request.connectorKey,
              version: request.version,
              status: "ACTIVE",
              ...(request.tenantId ? { OR: [{ tenantId: request.tenantId }, { tenantId: null }] } : {})
            },
            orderBy: { createdAt: "desc" }
          }),
      this.prisma.connectorTemplate.findFirst({
        where: {
          connectorKey: request.connectorKey,
          version: request.version
        },
        orderBy: { createdAt: "desc" }
      })
    ]);
    const normalizedRequest = this.normalizeActivationRequest(request) as Record<string, unknown>;
    const normalizedPublication = publication
      ? (this.normalizePublication(publication) as unknown as Record<string, unknown>)
      : null;
    const normalizedRegistryEntry = registryEntry
      ? (this.normalizeRecord(registryEntry, {
          json: ["manifest"],
          dates: ["createdAt", "updatedAt"]
        }) as unknown as Record<string, unknown>)
      : null;
    const connectorTemplate = this.resolveActivationConnectorTemplate(
      request.connectorKey,
      request.version,
      normalizedPublication,
      connectorTemplateRow
        ? (this.normalizeRecord(connectorTemplateRow, {
            json: ["manifest"],
            dates: ["createdAt", "updatedAt"]
          }) as unknown as Record<string, unknown>)
        : null
    );
    const targetTenantId = this.readActivationTargetTenantId(normalizedRequest);
    const installedRuntimeEntry = targetTenantId
      ? await this.prisma.integrationRegistryEntry.findFirst({
          where: {
            tenantId: targetTenantId,
            connectorKey: request.connectorKey,
            version: request.version
          },
          orderBy: { createdAt: "desc" }
        })
      : null;
    return {
      request,
      normalizedRequest,
      publication,
      normalizedPublication,
      registryEntry,
      normalizedRegistryEntry,
      connectorTemplate,
      targetTenantId,
      targetStoreId: this.readActivationTargetStoreId(normalizedRequest),
      installedRuntimeEntry,
      normalizedInstalledRuntimeEntry: installedRuntimeEntry
        ? (this.normalizeRecord(installedRuntimeEntry, {
            json: ["manifest"],
            dates: ["createdAt", "updatedAt"]
          }) as unknown as Record<string, unknown>)
        : null
    };
  }

  private getActivationRuntimeRolloutReadinessSnapshot(input: {
    request: Record<string, unknown>;
    publication: Record<string, unknown> | null;
    registryEntry: Record<string, unknown> | null;
    connectorTemplate: {
      source: string;
      templateId: string | null;
      templateVersion: string | null;
      manifest: JsonRecord;
    };
    installedRuntimeEntry: Record<string, unknown> | null;
    targetTenantId: string | null;
    targetStoreId: string | null;
  }) {
    const requestStatus = String(input.request.status ?? "PENDING").trim().toUpperCase();
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const checks: Array<{
      code: string;
      status: "READY" | "BLOCKED" | "WARN";
      message: string;
    }> = [];
    const addCheck = (code: string, status: "READY" | "BLOCKED" | "WARN", message: string) => {
      checks.push({ code, status, message });
    };

    if (!input.installedRuntimeEntry) {
      blockingIssues.push("Runtime connector is not installed for this activation request.");
      addCheck("RUNTIME_NOT_INSTALLED", "BLOCKED", "Runtime connector is not installed for this activation request.");
    } else {
      addCheck("RUNTIME_INSTALLED", "READY", "Runtime connector is installed.");
    }

    if (requestStatus !== "APPLIED") {
      blockingIssues.push("Activation request is no longer APPLIED for this runtime rollout.");
      addCheck("ACTIVATION_NOT_APPLIED", "BLOCKED", "Activation request is no longer APPLIED for this runtime rollout.");
    } else {
      addCheck("ACTIVATION_APPLIED", "READY", "Activation request remains APPLIED.");
    }

    let lifecycleSnapshot: ReturnType<EnterpriseService["getPublicationLifecycleSnapshot"]> | null = null;
    if (input.publication) {
      lifecycleSnapshot = this.getPublicationLifecycleSnapshot(input.publication);
      const publicationStatus = String(input.publication.status ?? "UNKNOWN").trim().toUpperCase();
      if (publicationStatus !== "PUBLISHED" || input.publication.revokedAt) {
        blockingIssues.push("Source publication is no longer actively published.");
        addCheck("PUBLICATION_NOT_PUBLISHED", "BLOCKED", "Source publication is no longer actively published.");
      } else {
        addCheck("PUBLICATION_PUBLISHED", "READY", "Source publication remains actively published.");
      }
      if (lifecycleSnapshot.actionRequired) {
        blockingIssues.push("Source publication lifecycle requires revocation/deactivation.");
        addCheck(
          "PUBLICATION_LIFECYCLE_BLOCKED",
          "BLOCKED",
          "Source publication lifecycle requires revocation/deactivation."
        );
      } else if (lifecycleSnapshot.warnings.length) {
        addCheck(
          "PUBLICATION_LIFECYCLE_WARN",
          "WARN",
          lifecycleSnapshot.warnings[0] ?? "Publication lifecycle should be reviewed."
        );
        warnings.push(...lifecycleSnapshot.warnings);
      } else {
        addCheck("PUBLICATION_LIFECYCLE_READY", "READY", "Source publication lifecycle is healthy.");
      }
    } else {
      warnings.push("No source publication snapshot is attached to this installed runtime.");
      addCheck(
        "PUBLICATION_OPTIONAL",
        "WARN",
        "No source publication snapshot is attached to this installed runtime."
      );
    }

    if (!input.registryEntry) {
      blockingIssues.push("Source registry runtime is no longer available.");
      addCheck("SOURCE_REGISTRY_MISSING", "BLOCKED", "Source registry runtime is no longer available.");
    } else {
      addCheck("SOURCE_REGISTRY_READY", "READY", "Source registry runtime is available.");
    }

    const sourceManifest = this.deepMergeRecords(
      input.registryEntry ? asObject(input.registryEntry.manifest) : {},
      input.connectorTemplate.manifest
    );
    const currentSourceDigest = this.computeRuntimeSourceDigest(sourceManifest);
    const installedManifest = input.installedRuntimeEntry ? asObject(input.installedRuntimeEntry.manifest) : {};
    const enterpriseRollout = asObject(installedManifest.enterpriseRollout);
    const installedSourceDigest =
      enterpriseRollout.sourceDigest !== undefined && enterpriseRollout.sourceDigest !== null
        ? String(enterpriseRollout.sourceDigest)
        : null;
    const driftStatus =
      installedSourceDigest === null
        ? "UNKNOWN"
        : installedSourceDigest === currentSourceDigest
          ? "CURRENT"
          : "DRIFTED";
    if (driftStatus === "DRIFTED") {
      warnings.push("Installed runtime source digest differs from current source artifact.");
      addCheck(
        "SOURCE_DRIFTED",
        "WARN",
        "Installed runtime source digest differs from current source artifact."
      );
    } else if (driftStatus === "CURRENT") {
      addCheck("SOURCE_CURRENT", "READY", "Installed runtime matches current source artifact digest.");
    } else {
      warnings.push("Installed runtime source digest is missing; reconcile is recommended.");
      addCheck("SOURCE_DIGEST_MISSING", "WARN", "Installed runtime source digest is missing; reconcile is recommended.");
    }

    const governance = asObject(enterpriseRollout.governance);
    const governanceStatus =
      governance.status !== undefined && governance.status !== null ? String(governance.status).trim().toUpperCase() : "UNKNOWN";
    if (governanceStatus === "BLOCKED") {
      addCheck(
        "GOVERNANCE_BLOCKED",
        "BLOCKED",
        governance.reason !== undefined && governance.reason !== null
          ? String(governance.reason)
          : "Runtime rollout governance is blocked."
      );
      blockingIssues.push(
        governance.reason !== undefined && governance.reason !== null
          ? String(governance.reason)
          : "Runtime rollout governance is blocked."
      );
    } else if (governanceStatus === "WARN") {
      addCheck(
        "GOVERNANCE_WARN",
        "WARN",
        governance.reason !== undefined && governance.reason !== null
          ? String(governance.reason)
          : "Runtime rollout governance should be reviewed."
      );
    }

    const runtimeStatus =
      input.installedRuntimeEntry && input.installedRuntimeEntry.status !== undefined && input.installedRuntimeEntry.status !== null
        ? String(input.installedRuntimeEntry.status).trim().toUpperCase()
        : null;
    if (runtimeStatus && runtimeStatus !== "ACTIVE") {
      warnings.push(`Installed runtime connector status is ${runtimeStatus}.`);
      addCheck("RUNTIME_STATUS_WARN", "WARN", `Installed runtime connector status is ${runtimeStatus}.`);
    } else if (runtimeStatus === "ACTIVE") {
      addCheck("RUNTIME_STATUS_ACTIVE", "READY", "Installed runtime connector is ACTIVE.");
    }

    const runtimeSummary = this.summarizeConnectorRuntime(sourceManifest);
    const publicationSignatureStatus =
      input.publication &&
      asObject(input.publication.attestation).signatureStatus !== undefined &&
      asObject(input.publication.attestation).signatureStatus !== null
        ? String(asObject(input.publication.attestation).signatureStatus)
        : null;
    const providerCompatibility = evaluateInventorySupplierProviderRuntimeCompatibility({
      providerAdapterKey: runtimeSummary.providerAdapterKey,
      providerProfileKey: runtimeSummary.providerProfileKey,
      targetTenantId: input.targetTenantId,
      publicationId: input.publication ? String(input.publication.id) : null,
      publicationVisibility:
        input.publication && input.publication.visibility !== undefined && input.publication.visibility !== null
          ? String(input.publication.visibility)
          : null,
      publicationChannel:
        input.publication && input.publication.channel !== undefined && input.publication.channel !== null
          ? String(input.publication.channel)
          : null,
      publicationStatus:
        input.publication && input.publication.status !== undefined && input.publication.status !== null
          ? String(input.publication.status)
          : null,
      publicationSignatureStatus,
      requestStatus,
      installationSource:
        enterpriseRollout.source !== undefined && enterpriseRollout.source !== null
          ? String(enterpriseRollout.source)
          : null,
      installationPublicationId:
        enterpriseRollout.publicationId !== undefined && enterpriseRollout.publicationId !== null
          ? String(enterpriseRollout.publicationId)
          : null,
      installationGovernanceStatus: governanceStatus,
      installationDriftStatus: driftStatus
    });
    for (const compatibilityCheck of providerCompatibility.checks) {
      if (compatibilityCheck.status !== "READY") {
        addCheck(compatibilityCheck.code, compatibilityCheck.status, compatibilityCheck.message);
      }
    }
    blockingIssues.push(...providerCompatibility.blockingIssues);
    warnings.push(...providerCompatibility.warnings);

    const status = checks.some((item) => item.status === "BLOCKED")
      ? "BLOCKED"
      : checks.some((item) => item.status === "WARN")
        ? "WARN"
        : "READY";

    return {
      requestId: String(input.request.id),
      connectorKey: String(input.request.connectorKey),
      version: String(input.request.version),
      tenantId: input.targetTenantId,
      targetTenantId: input.targetTenantId,
      targetStoreId: input.targetStoreId,
      status,
      canReconcile: Boolean(input.installedRuntimeEntry && input.registryEntry),
      canApplyGovernance: Boolean(input.installedRuntimeEntry),
      requestStatus,
      runtimeStatus,
      blockingIssues,
      warnings,
      checks,
      providerPolicy: providerCompatibility.policy,
      providerCompatibility,
      runtimeRollout: {
        installedRegistryEntryId:
          input.installedRuntimeEntry && input.installedRuntimeEntry.id !== undefined && input.installedRuntimeEntry.id !== null
            ? String(input.installedRuntimeEntry.id)
            : null,
        source: input.connectorTemplate.source,
        connectorTemplateId: input.connectorTemplate.templateId,
        connectorTemplateVersion: input.connectorTemplate.templateVersion,
        driftStatus,
        sourceDigestCurrent: currentSourceDigest,
        sourceDigestInstalled: installedSourceDigest,
        governanceStatus,
        governanceReason:
          governance.reason !== undefined && governance.reason !== null ? String(governance.reason) : null,
        lastGovernanceEvaluationAt:
          governance.lastEvaluatedAt !== undefined && governance.lastEvaluatedAt !== null
            ? String(governance.lastEvaluatedAt)
            : null,
        publicationLifecycle: lifecycleSnapshot
      }
    };
  }

  async installIntegrationActivationRuntime(
    context: RequestContext,
    id: string,
    input: JsonRecord = {}
  ) {
    const request = this.ensureRecord(
      await this.prisma.integrationActivationRequest.findUnique({ where: { id } }),
      "Integration activation request not found."
    );
    const readiness = await this.getIntegrationActivationInstallReadiness(id);
    if (!readiness.canInstall && input.force !== true) {
      throw new BadRequestException(
        readiness.blockingIssues.join(" ") || "Activation runtime install cannot be applied."
      );
    }

    const [publication, registryEntry, connectorTemplateRow] = await Promise.all([
      request.publicationId
        ? this.prisma.integrationPublication.findUnique({ where: { id: request.publicationId } })
        : null,
      request.registryEntryId
        ? this.prisma.integrationRegistryEntry.findUnique({ where: { id: request.registryEntryId } })
        : this.prisma.integrationRegistryEntry.findFirst({
            where: {
              connectorKey: request.connectorKey,
              version: request.version,
              status: "ACTIVE",
              ...(request.tenantId ? { OR: [{ tenantId: request.tenantId }, { tenantId: null }] } : {})
            },
            orderBy: { createdAt: "desc" }
          }),
      this.prisma.connectorTemplate.findFirst({
        where: {
          connectorKey: request.connectorKey,
          version: request.version
        },
        orderBy: { createdAt: "desc" }
      })
    ]);
    const normalizedRequest = this.normalizeActivationRequest(request) as Record<string, unknown>;
    const normalizedPublication = publication
      ? (this.normalizePublication(publication) as unknown as Record<string, unknown>)
      : null;
    const normalizedRegistryEntry = this.ensureRecord(
      registryEntry
        ? (this.normalizeRecord(registryEntry, {
            json: ["manifest"],
            dates: ["createdAt", "updatedAt"]
          }) as unknown as Record<string, unknown>)
        : null,
      "Activation registry entry not found."
    );
    const connectorTemplate = this.resolveActivationConnectorTemplate(
      request.connectorKey,
      request.version,
      normalizedPublication,
      connectorTemplateRow
        ? (this.normalizeRecord(connectorTemplateRow, {
            json: ["manifest"],
            dates: ["createdAt", "updatedAt"]
          }) as unknown as Record<string, unknown>)
        : null
    );
    const targetTenantId = this.ensureRecord(
      this.readActivationTargetTenantId(normalizedRequest),
      "Target tenant is required for runtime connector installation."
    );
    const targetStoreId = this.readActivationTargetStoreId(normalizedRequest);
    const manifestOverrides = asObject(input.manifestOverrides);
    const runtimeOverrides = asObject(input.runtimeOverrides);
    const installNotes =
      input.installNotes !== undefined && input.installNotes !== null
        ? String(input.installNotes).trim() || null
        : null;
    const preserveTenantOverrides = input.preserveTenantOverrides !== false;
    const existingRuntimeEntry = await this.prisma.integrationRegistryEntry.findFirst({
      where: {
        tenantId: targetTenantId,
        connectorKey: request.connectorKey,
        version: request.version
      },
      orderBy: { createdAt: "desc" }
    });
    const installMode = existingRuntimeEntry ? "UPDATE" : "CREATE";
    const installedAt = new Date().toISOString();
    const installedByType = context.scope === "device" ? "DEVICE" : "USER";
    const installedById = context.scope === "device" ? context.deviceId ?? null : context.userId ?? null;
    const sourceManifest = this.deepMergeRecords(
      asObject(normalizedRegistryEntry.manifest),
      connectorTemplate.manifest
    );
    const sourceDigest = this.computeRuntimeSourceDigest(sourceManifest);
    const manifest = this.buildInstalledRuntimeManifest(
      asObject(normalizedRegistryEntry.manifest),
      connectorTemplate,
      normalizedRequest,
      {
        publicationId: normalizedPublication ? String(normalizedPublication.id) : null,
        sourceRegistryEntryId: String(normalizedRegistryEntry.id),
        installedAt,
        installedByType,
        installedById,
        installMode,
        preserveTenantOverrides,
        existingManifest: existingRuntimeEntry ? asObject(existingRuntimeEntry.manifest) : null,
        manifestOverrides,
        runtimeOverrides,
        installNotes,
        sourceDigest,
        governance: {
          status: "READY",
          reason: "Runtime install is current.",
          lastEvaluatedAt: installedAt,
          driftStatus: "CURRENT"
        }
      }
    );
    const runtimeEntry = existingRuntimeEntry
      ? await this.prisma.integrationRegistryEntry.update({
          where: { id: existingRuntimeEntry.id },
          data: {
            organizationId:
              normalizedRequest.organizationId !== undefined && normalizedRequest.organizationId !== null
                ? String(normalizedRequest.organizationId)
                : existingRuntimeEntry.organizationId,
            status: String(input.runtimeStatus ?? existingRuntimeEntry.status ?? "ACTIVE").trim().toUpperCase(),
            manifest: asInputJson(manifest)
          }
        })
      : await this.prisma.integrationRegistryEntry.create({
          data: {
            tenantId: targetTenantId,
            organizationId:
              normalizedRequest.organizationId !== undefined && normalizedRequest.organizationId !== null
                ? String(normalizedRequest.organizationId)
                : null,
            connectorKey: request.connectorKey,
            version: request.version,
            status: String(input.runtimeStatus ?? "ACTIVE").trim().toUpperCase(),
            manifest: asInputJson(manifest)
          }
        });

    const runtimeSummary = this.summarizeConnectorRuntime(asObject(runtimeEntry.manifest));
    const baseArtifact = request.activationArtifact
      ? asObject(request.activationArtifact)
      : this.buildActivationArtifact(normalizedRequest, normalizedPublication, normalizedRegistryEntry);
    const runtimeInstallArtifact = {
      installedRegistryEntryId: runtimeEntry.id,
      source: connectorTemplate.source,
      installMode,
      targetTenantId,
      targetStoreId,
      connectorTemplateId: connectorTemplate.templateId,
      connectorTemplateVersion: connectorTemplate.templateVersion,
      installedAt,
      installedByType,
      installedById,
      runtimeStatus: runtimeEntry.status,
      sourceDigest,
      transportMode: runtimeSummary.transportMode,
      providerAdapterKey: runtimeSummary.providerAdapterKey,
      providerProfileKey: runtimeSummary.providerProfileKey,
      installNotes,
      governance: {
        status: "READY",
        reason: "Runtime install is current.",
        lastEvaluatedAt: installedAt,
        driftStatus: "CURRENT"
      }
    };
    const activationArtifact = this.deepMergeRecords(asObject(baseArtifact), {
      runtimeInstall: runtimeInstallArtifact
    });
    const shouldMarkApplied = String(request.status).trim().toUpperCase() === "APPROVED";
    const updatedRequest = await this.prisma.integrationActivationRequest.update({
      where: { id },
      data: {
        status: shouldMarkApplied ? "APPLIED" : request.status,
        appliedAt: shouldMarkApplied ? request.appliedAt ?? new Date(installedAt) : request.appliedAt,
        activationArtifact: asInputJson(activationArtifact),
        decisionNotes:
          input.decisionNotes !== undefined ? asNullableInputJson(input.decisionNotes) : undefined
      }
    });

    if (request.publicationId) {
      if (shouldMarkApplied) {
        await this.createPublicationEvent(
          request.publicationId,
          "ACTIVATION_APPLIED",
          installedByType,
          installedById,
          {
            activationRequestId: id,
            targetKind: request.targetKind,
            connectorKey: request.connectorKey,
            version: request.version,
            source: "INSTALL_RUNTIME"
          }
        );
      }
      await this.createPublicationEvent(
        request.publicationId,
        "ACTIVATION_RUNTIME_INSTALLED",
        installedByType,
        installedById,
        {
          activationRequestId: id,
          installedRegistryEntryId: runtimeEntry.id,
          connectorKey: request.connectorKey,
          version: request.version,
          installMode,
          source: connectorTemplate.source
        }
      );
    }

    return {
      ...(this.normalizeActivationRequest(updatedRequest) as Record<string, unknown>),
      runtimeInstall: runtimeInstallArtifact,
      installedRegistryEntry: this.normalizeRecord(runtimeEntry, {
        json: ["manifest"],
        dates: ["createdAt", "updatedAt"]
      })
    };
  }

  async getIntegrationRuntimeRolloutReadiness(id: string) {
    const context = await this.resolveActivationRuntimeRolloutContext(id);
    return this.getActivationRuntimeRolloutReadinessSnapshot({
      request: context.normalizedRequest,
      publication: context.normalizedPublication,
      registryEntry: context.normalizedRegistryEntry,
      connectorTemplate: context.connectorTemplate,
      installedRuntimeEntry: context.normalizedInstalledRuntimeEntry,
      targetTenantId: context.targetTenantId,
      targetStoreId: context.targetStoreId
    });
  }

  async getInventoryActivationExecutionPolicy(id: string) {
    const context = await this.resolveActivationRuntimeRolloutContext(id);
    const readiness = this.getActivationRuntimeRolloutReadinessSnapshot({
      request: context.normalizedRequest,
      publication: context.normalizedPublication,
      registryEntry: context.normalizedRegistryEntry,
      connectorTemplate: context.connectorTemplate,
      installedRuntimeEntry: context.normalizedInstalledRuntimeEntry,
      targetTenantId: context.targetTenantId,
      targetStoreId: context.targetStoreId
    });
    const sourceManifest = this.deepMergeRecords(
      context.normalizedRegistryEntry ? asObject(context.normalizedRegistryEntry.manifest) : {},
      context.connectorTemplate.manifest
    );
    const runtimeInspection = this.inspectExecutionPolicyRuntime(sourceManifest);
    const secretResolution = await this.resolveExecutionPolicySecretResolution(
      context.targetTenantId,
      runtimeInspection.requiredSecrets
    );
    const deploymentGate = this.evaluateExecutionPolicyDeploymentGates({
      allowedTenantIds: runtimeInspection.allowedTenantIds,
      allowedStoreIds: runtimeInspection.allowedStoreIds,
      allowedEnvironments: runtimeInspection.allowedEnvironments,
      currentEnvironment: runtimeInspection.currentEnvironment,
      targetTenantId: context.targetTenantId,
      targetStoreId: context.targetStoreId
    });
    const requestStatus = String(context.normalizedRequest.status ?? "PENDING").trim().toUpperCase();
    const runtimeStatus =
      context.normalizedInstalledRuntimeEntry &&
      context.normalizedInstalledRuntimeEntry.status !== undefined &&
      context.normalizedInstalledRuntimeEntry.status !== null
        ? String(context.normalizedInstalledRuntimeEntry.status).trim().toUpperCase()
        : null;
    const suspendedRuntimeStatuses = new Set(["SUSPENDED", "ARCHIVED", "REVOKED"]);
    const isSuspended =
      requestStatus === "REVOKED" ||
      requestStatus === "SUSPENDED" ||
      (runtimeStatus !== null && suspendedRuntimeStatuses.has(runtimeStatus));
    const blockingIssues = [
      ...readiness.blockingIssues,
      ...secretResolution.blockingIssues,
      ...deploymentGate.blockingIssues
    ];
    const warnings = [...readiness.warnings, ...secretResolution.warnings, ...deploymentGate.warnings];
    const checks = [...readiness.checks, ...secretResolution.checks, ...deploymentGate.checks];
    const actionableWarnings = warnings.filter((item) => item !== "Publication lifecycle is still active.");
    const state = isSuspended
      ? "SUSPENDED"
      : blockingIssues.length > 0
        ? "BLOCKED"
        : actionableWarnings.length > 0
          ? "WARN"
          : "READY";
    const evaluatedAt = new Date().toISOString();

    return {
      requestId: String(context.request.id),
      connectorKey: String(context.request.connectorKey),
      version: String(context.request.version),
      tenantId: context.targetTenantId,
      targetTenantId: context.targetTenantId,
      targetStoreId: context.targetStoreId,
      status: state,
      state,
      canApplyExecutionPolicy: Boolean(context.normalizedInstalledRuntimeEntry),
      blockingIssues,
      warnings,
      checks,
      providerPolicy: readiness.providerPolicy,
      providerCompatibility: readiness.providerCompatibility,
      runtimeRollout: readiness.runtimeRollout,
      executionPolicy: {
        state,
        reason: isSuspended
          ? "Installed runtime execution policy is suspended."
          : blockingIssues[0] ?? actionableWarnings[0] ?? warnings[0] ?? "Execution policy is ready.",
        evaluatedAt,
        requestStatus,
        runtimeStatus,
        providerPolicy: readiness.providerPolicy,
        providerCompatibility: readiness.providerCompatibility,
        runtimeRollout: readiness.runtimeRollout,
        secretResolution: {
          requiredSecrets: secretResolution.requiredSecrets,
          resolvedSecrets: secretResolution.resolvedSecrets,
          missingSecrets: secretResolution.missingSecrets,
          resolved: secretResolution.missingSecrets.length === 0
        },
        deployment: {
          currentEnvironment: deploymentGate.currentEnvironment,
          allowedTenantIds: deploymentGate.allowedTenantIds,
          allowedStoreIds: deploymentGate.allowedStoreIds,
          allowedEnvironments: deploymentGate.allowedEnvironments,
          status: deploymentGate.status,
          blockingIssues: deploymentGate.blockingIssues,
          warnings: deploymentGate.warnings,
          checks: deploymentGate.checks
        }
      }
    };
  }

  async reconcileIntegrationRuntimeRollout(
    context: RequestContext,
    id: string,
    input: JsonRecord = {}
  ) {
    const readiness = await this.getIntegrationRuntimeRolloutReadiness(id);
    if (!readiness.canReconcile && input.force !== true) {
      throw new BadRequestException(
        readiness.blockingIssues.join(" ") || "Runtime rollout cannot be reconciled."
      );
    }
    return this.installIntegrationActivationRuntime(context, id, {
      ...input,
      preserveTenantOverrides: input.preserveTenantOverrides !== false,
      installNotes:
        input.installNotes !== undefined && input.installNotes !== null
          ? String(input.installNotes)
          : "Reconciled runtime rollout to current source artifact."
    });
  }

  async applyInventoryExecutionPolicy(context: RequestContext, id: string, input: JsonRecord = {}) {
    const executionPolicy = await this.getInventoryActivationExecutionPolicy(id);
    const installedRuntimeEntry = this.ensureRecord(
      executionPolicy.runtimeRollout.installedRegistryEntryId
        ? await this.prisma.integrationRegistryEntry.findUnique({
            where: { id: executionPolicy.runtimeRollout.installedRegistryEntryId }
          })
        : null,
      "Runtime connector is not installed for this activation request."
    );
    const request = this.ensureRecord(
      await this.prisma.integrationActivationRequest.findUnique({ where: { id } }),
      "Integration activation request not found."
    );
    const now = new Date().toISOString();
    const shouldDeactivate =
      input.deactivateRuntime !== false &&
      (executionPolicy.state === "BLOCKED" || executionPolicy.state === "SUSPENDED");
    const nextRuntimeStatus = shouldDeactivate
      ? "SUSPENDED"
      : String(installedRuntimeEntry.status ?? "ACTIVE").trim().toUpperCase() || "ACTIVE";
    const currentManifest = asObject(installedRuntimeEntry.manifest);
    const currentEnterpriseRollout = asObject(currentManifest.enterpriseRollout);
    const executionPolicySnapshot = {
      state: shouldDeactivate ? "SUSPENDED" : executionPolicy.state,
      reason: executionPolicy.executionPolicy.reason,
      evaluatedAt: now,
      requestStatus: executionPolicy.executionPolicy.requestStatus,
      runtimeStatus: nextRuntimeStatus,
      providerPolicy: executionPolicy.providerPolicy,
      providerCompatibility: executionPolicy.providerCompatibility,
      runtimeRollout: executionPolicy.runtimeRollout,
      secretResolution: executionPolicy.executionPolicy.secretResolution,
      deployment: executionPolicy.executionPolicy.deployment
    };
    const updatedRuntimeEntry = await this.prisma.integrationRegistryEntry.update({
      where: { id: installedRuntimeEntry.id },
      data: {
        status: nextRuntimeStatus,
        manifest: asInputJson(
          this.deepMergeRecords(currentManifest, {
            enterpriseRollout: {
              ...currentEnterpriseRollout,
              executionPolicy: executionPolicySnapshot
            }
          })
        )
      }
    });
    const currentActivationArtifact = asObject(request.activationArtifact);
    const currentRuntimeInstall = asObject(currentActivationArtifact.runtimeInstall);
    const updatedRequest = await this.prisma.integrationActivationRequest.update({
      where: { id },
      data: {
        activationArtifact: asInputJson(
          this.deepMergeRecords(currentActivationArtifact, {
            runtimeInstall: {
              ...currentRuntimeInstall,
              executionPolicy: executionPolicySnapshot,
              runtimeStatus: nextRuntimeStatus
            }
          })
        )
      }
    });
    if (request.publicationId) {
      await this.createPublicationEvent(
        request.publicationId,
        "ACTIVATION_RUNTIME_EXECUTION_POLICY_APPLIED",
        context.scope === "device" ? "DEVICE" : "USER",
        context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
        {
          activationRequestId: id,
          executionPolicyState: executionPolicySnapshot.state,
          runtimeStatus: nextRuntimeStatus,
          installedRegistryEntryId: installedRuntimeEntry.id
        }
      );
    }

    return {
      ...(this.normalizeActivationRequest(updatedRequest) as Record<string, unknown>),
      state: executionPolicySnapshot.state,
      status: executionPolicySnapshot.state,
      executionPolicy: executionPolicySnapshot,
      runtimeRollout: {
        ...executionPolicy.runtimeRollout,
        runtimeStatus: nextRuntimeStatus,
        executionPolicy: executionPolicySnapshot
      },
      installedRegistryEntry: this.normalizeRecord(updatedRuntimeEntry, {
        json: ["manifest"],
        dates: ["createdAt", "updatedAt"]
      })
    };
  }

  async applyIntegrationRuntimeRolloutGovernance(
    context: RequestContext,
    id: string,
    input: JsonRecord = {}
  ) {
    const rollout = await this.resolveActivationRuntimeRolloutContext(id);
    const readiness = this.getActivationRuntimeRolloutReadinessSnapshot({
      request: rollout.normalizedRequest,
      publication: rollout.normalizedPublication,
      registryEntry: rollout.normalizedRegistryEntry,
      connectorTemplate: rollout.connectorTemplate,
      installedRuntimeEntry: rollout.normalizedInstalledRuntimeEntry,
      targetTenantId: rollout.targetTenantId,
      targetStoreId: rollout.targetStoreId
    });
    const installedRuntimeEntry = this.ensureRecord(
      rollout.installedRuntimeEntry,
      "Runtime connector is not installed for this activation request."
    );
    const now = new Date().toISOString();
    const governanceStatus = readiness.status === "BLOCKED" ? "BLOCKED" : readiness.status === "WARN" ? "WARN" : "READY";
    const governanceReason = readiness.blockingIssues[0] ?? readiness.warnings[0] ?? "Runtime rollout is healthy.";
    const existingManifest = asObject(installedRuntimeEntry.manifest);
    const enterpriseRollout = asObject(existingManifest.enterpriseRollout);
    const nextManifest = this.deepMergeRecords(existingManifest, {
      enterpriseRollout: {
        ...enterpriseRollout,
        governance: {
          status: governanceStatus,
          reason: governanceReason,
          lastEvaluatedAt: now,
          driftStatus: readiness.runtimeRollout.driftStatus,
          sourceDigestCurrent: readiness.runtimeRollout.sourceDigestCurrent,
          sourceDigestInstalled: readiness.runtimeRollout.sourceDigestInstalled
        }
      }
    });
    const nextRuntimeStatus =
      input.deactivateRuntime === true && governanceStatus === "BLOCKED"
        ? String(input.deactivatedStatus ?? "ARCHIVED").trim().toUpperCase()
        : installedRuntimeEntry.status;
    const updatedRuntimeEntry = await this.prisma.integrationRegistryEntry.update({
      where: { id: installedRuntimeEntry.id },
      data: {
        status: nextRuntimeStatus,
        manifest: asInputJson(nextManifest)
      }
    });
    const request = this.ensureRecord(
      await this.prisma.integrationActivationRequest.findUnique({ where: { id } }),
      "Integration activation request not found."
    );
    const currentActivationArtifact = asObject(request.activationArtifact);
    const currentRuntimeInstall = asObject(currentActivationArtifact.runtimeInstall);
    const updatedRequest = await this.prisma.integrationActivationRequest.update({
      where: { id },
      data: {
        activationArtifact: asInputJson(
          this.deepMergeRecords(currentActivationArtifact, {
            runtimeInstall: {
              ...currentRuntimeInstall,
              governance: {
                status: governanceStatus,
                reason: governanceReason,
                lastEvaluatedAt: now,
                driftStatus: readiness.runtimeRollout.driftStatus,
                sourceDigestCurrent: readiness.runtimeRollout.sourceDigestCurrent,
                sourceDigestInstalled: readiness.runtimeRollout.sourceDigestInstalled
              },
              runtimeStatus: nextRuntimeStatus
            }
          })
        )
      }
    });
    if (request.publicationId) {
      await this.createPublicationEvent(
        request.publicationId,
        "ACTIVATION_RUNTIME_GOVERNANCE_APPLIED",
        context.scope === "device" ? "DEVICE" : "USER",
        context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
        {
          activationRequestId: id,
          governanceStatus,
          governanceReason,
          installedRegistryEntryId: installedRuntimeEntry.id,
          runtimeStatus: nextRuntimeStatus
        }
      );
    }
    return {
      ...(this.normalizeActivationRequest(updatedRequest) as Record<string, unknown>),
      runtimeRollout: {
        ...readiness.runtimeRollout,
        governanceStatus,
        governanceReason,
        lastGovernanceEvaluationAt: now,
        runtimeStatus: nextRuntimeStatus,
        installedRegistryEntryId: updatedRuntimeEntry.id
      },
      installedRegistryEntry: this.normalizeRecord(updatedRuntimeEntry, {
        json: ["manifest"],
        dates: ["createdAt", "updatedAt"]
      })
    };
  }

  async getIntegrationRegistryActivationReadiness(id: string) {
    const registryEntry = this.ensureRecord(
      await this.prisma.integrationRegistryEntry.findUnique({ where: { id } }),
      "Registry entry not found."
    );
    const manifest = asObject(registryEntry.manifest);
    const activation = asObject(manifest.activation);
    const activationRequired = activation.required !== false;
    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    if (String(registryEntry.status).trim().toUpperCase() !== "ACTIVE") {
      blockingIssues.push("Registry entry is not ACTIVE.");
    }
    if (String(manifest.kind ?? "").trim().toUpperCase() !== "SUPPLIER") {
      warnings.push("Activation readiness is strongest for supplier connectors.");
    }

    return {
      registryEntryId: registryEntry.id,
      connectorKey: registryEntry.connectorKey,
      version: registryEntry.version,
      status: blockingIssues.length === 0 ? (activationRequired ? "READY" : "WARN") : "BLOCKED",
      activationRequired,
      scope: String(activation.scope ?? "TENANT"),
      blockingIssues,
      warnings
    };
  }

  async listInventoryActivationRequests(scope: {
    tenantId?: string | null;
    organizationId?: string | null;
  }) {
    const rows = await this.prisma.integrationActivationRequest.findMany({
      where: {
        targetKind: "SUPPLIER_CONNECTOR",
        ...(scope.tenantId?.trim() ? { tenantId: scope.tenantId.trim() } : {}),
        ...(scope.organizationId?.trim() ? { organizationId: scope.organizationId.trim() } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    const publicationIds = rows
      .map((row) => row.publicationId)
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    const publications = publicationIds.length
      ? await this.prisma.integrationPublication.findMany({
          where: { id: { in: publicationIds } }
        })
      : [];
    const publicationById = new Map(
      publications.map((item) => [item.id, this.normalizePublication(item) as unknown as Record<string, unknown>])
    );
    return Promise.all(rows.map(async (row) => {
      const normalized = this.normalizeActivationRequest(row) as Record<string, unknown>;
      const requestNotes = asObject(normalized.requestNotes);
      const runtimeRollout = await this.getIntegrationRuntimeRolloutReadiness(String(normalized.id)).catch(() => null);
      return {
        ...normalized,
        runtimeInstall: asObject(asObject(normalized.activationArtifact).runtimeInstall),
        runtimeRollout,
        targetTenantId: normalized.tenantId ?? null,
        targetStoreId:
          requestNotes.targetStoreId !== undefined && requestNotes.targetStoreId !== null
            ? String(requestNotes.targetStoreId)
            : null,
        notes:
          requestNotes.notes !== undefined && requestNotes.notes !== null
            ? String(requestNotes.notes)
            : null,
        metadata: asObject(requestNotes.metadata),
        publication:
          normalized.publicationId && publicationById.has(String(normalized.publicationId))
            ? publicationById.get(String(normalized.publicationId))
            : null
      };
    }));
  }

  async createInventoryActivationRequest(context: RequestContext, input: JsonRecord = {}) {
    const connectorKey = String(input.connectorKey ?? "").trim();
    const version = String(input.version ?? "").trim();
    const targetTenantId = input.targetTenantId ? String(input.targetTenantId).trim() : null;
    const registryEntryId = input.registryEntryId ? String(input.registryEntryId).trim() : null;
    if ((!connectorKey || !version) && !registryEntryId) {
      throw new BadRequestException("connectorKey/version or registryEntryId is required.");
    }
    const registryEntry = this.ensureRecord(
      registryEntryId
        ? await this.prisma.integrationRegistryEntry.findUnique({ where: { id: registryEntryId } })
        : await this.prisma.integrationRegistryEntry.findFirst({
            where: {
              connectorKey,
              version,
              status: "ACTIVE",
              ...(targetTenantId ? { OR: [{ tenantId: targetTenantId }, { tenantId: null }] } : {})
            },
            orderBy: { createdAt: "desc" }
          }),
      "Active registry entry for connector activation was not found."
    );
    const resolvedConnectorKey = connectorKey || String(registryEntry.connectorKey);
    const resolvedVersion = version || String(registryEntry.version);
    const publication = await this.prisma.integrationPublication.findFirst({
      where: {
        connectorKey: resolvedConnectorKey,
        version: resolvedVersion,
        status: "PUBLISHED",
        revokedAt: null,
        ...(targetTenantId ? { OR: [{ tenantId: targetTenantId }, { tenantId: null }] } : {})
      },
      orderBy: { publishedAt: "desc" }
    });
    const row = await this.prisma.integrationActivationRequest.create({
      data: {
        ...(publication?.id ? { publicationId: publication.id } : {}),
        registryEntryId: registryEntry.id,
        tenantId: targetTenantId || registryEntry.tenantId || null,
        organizationId:
          input.organizationId !== undefined
            ? String(input.organizationId ?? "").trim() || null
            : registryEntry.organizationId || null,
        targetKind: "SUPPLIER_CONNECTOR",
        connectorKey: resolvedConnectorKey,
        version: resolvedVersion,
        status: String(input.status ?? "PENDING").trim().toUpperCase(),
        requestNotes: asNullableInputJson({
          requestedChannel:
            input.requestedChannel !== undefined ? String(input.requestedChannel ?? "") || null : null,
          intendedUse: input.intendedUse ? asObject(input.intendedUse) : null,
          targetStoreId: input.targetStoreId ? String(input.targetStoreId).trim() : null,
          notes: input.notes ? String(input.notes) : null,
          metadata: input.metadata ? asObject(input.metadata) : null
        }),
        requestedByUserId: context.scope === "device" ? null : asUuidOrNull(context.userId)
      }
    });
    let normalized = this.normalizeActivationRequest(row) as Record<string, unknown>;
    if (publication) {
      await this.createPublicationEvent(
        publication.id,
        "ACTIVATION_REQUESTED",
        context.scope === "device" ? "DEVICE" : "USER",
        context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
        {
          activationRequestId: row.id,
          targetKind: "SUPPLIER_CONNECTOR",
          connectorKey: resolvedConnectorKey,
          version: resolvedVersion
        }
      );
    }
    const requestNotes = asObject(normalized.requestNotes);
    return {
      ...normalized,
      targetTenantId: normalized.tenantId ?? null,
      targetStoreId:
        requestNotes.targetStoreId !== undefined && requestNotes.targetStoreId !== null
          ? String(requestNotes.targetStoreId)
          : null,
      notes:
        requestNotes.notes !== undefined && requestNotes.notes !== null
          ? String(requestNotes.notes)
          : null,
      metadata: asObject(requestNotes.metadata),
      publication: publication ? (this.normalizePublication(publication) as unknown as Record<string, unknown>) : null
    };
  }

  async updateIntegrationDistributionRequestStatus(id: string, input: JsonRecord) {
    const current = this.ensureRecord(
      await this.prisma.integrationDistributionRequest.findUnique({ where: { id } }),
      "Integration distribution request not found."
    );
    const status = String(input.status ?? "").trim().toUpperCase();
    if (!status) {
      throw new BadRequestException("status is required.");
    }

    const shouldApprove = status === "APPROVED";
    const shouldRevoke = status === "REVOKED";
    const grantedConsumerKey =
      input.grantedConsumerKey !== undefined
        ? String(input.grantedConsumerKey ?? "").trim() || null
        : current.grantedConsumerKey;
    const ttlDays =
      input.grantTtlDays !== undefined
        ? Number.parseInt(String(input.grantTtlDays), 10)
        : 30;
    if (input.grantTtlDays !== undefined && (!Number.isFinite(ttlDays) || ttlDays <= 0)) {
      throw new BadRequestException("grantTtlDays must be a positive integer.");
    }

    const explicitGrantExpiresAt =
      input.grantExpiresAt !== undefined
        ? input.grantExpiresAt
          ? new Date(String(input.grantExpiresAt))
          : null
        : undefined;
    if (
      explicitGrantExpiresAt !== undefined &&
      explicitGrantExpiresAt !== null &&
      Number.isNaN(explicitGrantExpiresAt.getTime())
    ) {
      throw new BadRequestException("grantExpiresAt must be a valid ISO timestamp.");
    }

    const grantExpiresAt =
      shouldApprove
        ? explicitGrantExpiresAt === undefined
          ? current.grantExpiresAt ?? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)
          : explicitGrantExpiresAt
        : current.grantExpiresAt;
    const revokedAt = shouldRevoke ? current.revokedAt ?? new Date() : shouldApprove ? null : current.revokedAt;
    const row = await this.prisma.integrationDistributionRequest.update({
      where: { id },
      data: {
        status,
        decisionNotes:
          input.decisionNotes !== undefined ? asNullableInputJson(input.decisionNotes) : undefined,
        accessToken:
          shouldApprove
            ? current.accessToken ?? randomUUID()
            : shouldRevoke
              ? null
              : current.accessToken,
        grantedConsumerKey,
        grantExpiresAt,
        approvedAt: shouldApprove ? current.approvedAt ?? new Date() : shouldRevoke ? null : current.approvedAt,
        revokedAt
      }
    });

    await this.createPublicationEvent(
      current.publicationId,
      "ACCESS_REQUEST_STATUS_CHANGED",
      "USER",
      null,
      {
        requestId: id,
        previousStatus: current.status,
        nextStatus: status,
        contactEmail: current.contactEmail,
        grantedConsumerKey,
        grantExpiresAt: grantExpiresAt ? grantExpiresAt.toISOString() : null,
        revokedAt: revokedAt ? revokedAt.toISOString() : null
      }
    );

    return this.normalizeDistributionRequest(row);
  }

  async getIntegrationDistributionRequestGovernanceReadiness(id: string) {
    const request = this.ensureRecord(
      await this.prisma.integrationDistributionRequest.findUnique({ where: { id } }),
      "Integration distribution request not found."
    );
    return this.getDistributionRequestGovernanceSnapshot(
      this.normalizeDistributionRequest(request) as Record<string, unknown>
    );
  }

  async applyIntegrationDistributionRequestGovernance(
    context: RequestContext,
    id: string,
    input: JsonRecord = {}
  ) {
    const current = this.ensureRecord(
      await this.prisma.integrationDistributionRequest.findUnique({ where: { id } }),
      "Integration distribution request not found."
    );
    const readiness = await this.getIntegrationDistributionRequestGovernanceReadiness(id);
    if (!readiness.canAutoRevoke && input.force !== true) {
      throw new BadRequestException(
        readiness.actionRequired
          ? "Distribution request governance action is not allowed."
          : "No distribution request governance action is currently required."
      );
    }

    const nextStatus = "REVOKED";
    const revokedAt = new Date();
    const row = await this.prisma.integrationDistributionRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        accessToken: null,
        revokedAt
      }
    });

    await this.createPublicationEvent(
      current.publicationId,
      "ACCESS_REQUEST_STATUS_CHANGED",
      context.scope === "device" ? "DEVICE" : "USER",
      context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
      {
        requestId: id,
        previousStatus: String(current.status),
        nextStatus,
        contactEmail: current.contactEmail,
        reason: readiness.isExpired
          ? "Partner distribution grant expired."
          : "Distribution governance applied manually.",
        grantExpiresAt: readiness.grantExpiresAt
      }
    );

    return this.normalizeDistributionRequest(row);
  }

  async runIntegrationDistributionRequestGovernanceSweep(
    context: RequestContext,
    input: JsonRecord = {}
  ) {
    const dryRun = input.dryRun !== false;
    const rows = await this.prisma.integrationDistributionRequest.findMany({
      where: { status: "APPROVED" },
      orderBy: { updatedAt: "desc" }
    });
    const affected: Array<{
      requestId: string;
      publicationId: string;
      connectorKey: string;
      version: string;
      previousStatus: string;
      nextStatus: string;
      reason: string;
    }> = [];

    for (const row of rows) {
      const normalized = this.normalizeDistributionRequest(row) as Record<string, unknown>;
      const readiness = this.getDistributionRequestGovernanceSnapshot(normalized);
      if (!readiness.canAutoRevoke) {
        continue;
      }

      affected.push({
        requestId: String(normalized.id),
        publicationId: String(normalized.publicationId),
        connectorKey: String(normalized.connectorKey),
        version: String(normalized.version),
        previousStatus: String(normalized.status),
        nextStatus: "REVOKED",
        reason: "Partner distribution grant expired."
      });

      if (dryRun) {
        continue;
      }

      await this.prisma.integrationDistributionRequest.update({
        where: { id: String(normalized.id) },
        data: {
          status: "REVOKED",
          accessToken: null,
          revokedAt: new Date()
        }
      });

      await this.createPublicationEvent(
        String(normalized.publicationId),
        "ACCESS_REQUEST_STATUS_CHANGED",
        context.scope === "device" ? "DEVICE" : "USER",
        context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
        {
          requestId: String(normalized.id),
          previousStatus: String(normalized.status),
          nextStatus: "REVOKED",
          reason: "Partner distribution grant expired.",
          grantExpiresAt:
            normalized.grantExpiresAt !== undefined && normalized.grantExpiresAt !== null
              ? String(normalized.grantExpiresAt)
              : null
        }
      );
    }

    return {
      scannedCount: rows.length,
      affectedCount: affected.length,
      dryRun,
      affected
    };
  }

  async getIntegrationPublicationAnalytics(id: string) {
    const publication = await this.getIntegrationPublication(id);
    const events = await this.listIntegrationPublicationEvents(id);
    const requests = await this.listIntegrationDistributionRequests(id);
    return this.buildPublicationAnalytics(
      publication as unknown as Record<string, unknown>,
      events as Array<Record<string, unknown>>,
      requests as Array<Record<string, unknown>>
    );
  }

  async getIntegrationDistributionOverview(scope: {
    tenantId?: string | null;
    organizationId?: string | null;
  }) {
    const publications = await this.prisma.integrationPublication.findMany({
      where: {
        ...(scope.tenantId?.trim() ? { tenantId: scope.tenantId.trim() } : {}),
        ...(scope.organizationId?.trim() ? { organizationId: scope.organizationId.trim() } : {})
      },
      orderBy: { publishedAt: "desc" }
    });
    const publicationIds = publications.map((item) => item.id);
    const publicationMap = new Map(
      publications.map((item) => [
        item.id,
        this.normalizePublication(item) as unknown as Record<string, unknown>
      ])
    );
    const events = publicationIds.length
      ? await this.prisma.integrationPublicationEvent.findMany({
          where: { publicationId: { in: publicationIds } },
          orderBy: { createdAt: "desc" }
        })
      : [];
    const requests = publicationIds.length
      ? await this.prisma.integrationDistributionRequest.findMany({
          where: { publicationId: { in: publicationIds } },
          orderBy: { createdAt: "desc" }
        })
      : [];

    const eventsByPublication = new Map<string, Array<Record<string, unknown>>>();
    for (const event of events) {
      const key = String(event.publicationId);
      const current = eventsByPublication.get(key) ?? [];
      current.push(this.normalizePublicationEvent(event) as unknown as Record<string, unknown>);
      eventsByPublication.set(key, current);
    }

    const requestsByPublication = new Map<string, Array<Record<string, unknown>>>();
    for (const request of requests) {
      const key = String(request.publicationId);
      const current = requestsByPublication.get(key) ?? [];
      current.push(this.normalizeDistributionRequest(request) as unknown as Record<string, unknown>);
      requestsByPublication.set(key, current);
    }

    const analytics = publications.map((item) =>
      this.buildPublicationAnalytics(
        publicationMap.get(item.id) ?? (this.normalizePublication(item) as unknown as Record<string, unknown>),
        eventsByPublication.get(item.id) ?? [],
        requestsByPublication.get(item.id) ?? []
      )
    );
    const byVisibility = analytics.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.visibility] = (accumulator[item.visibility] ?? 0) + 1;
      return accumulator;
    }, {});
    const byChannel = analytics.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.channel] = (accumulator[item.channel] ?? 0) + 1;
      return accumulator;
    }, {});
    const allNormalizedEvents = events.map((item) =>
      this.normalizeAnalyticsEvent(
        this.normalizePublicationEvent(item) as unknown as Record<string, unknown>
      )
    );
    const allNormalizedRequests = requests.map((item) =>
      this.normalizeAnalyticsRequest(
        this.normalizeDistributionRequest(item) as unknown as Record<string, unknown>
      )
    );
    const last7Days = this.buildPublicationAnalyticsWindow(
      allNormalizedEvents,
      allNormalizedRequests,
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const last30Days = this.buildPublicationAnalyticsWindow(
      allNormalizedEvents,
      allNormalizedRequests,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    const allTime = this.buildPublicationAnalyticsWindow(allNormalizedEvents, allNormalizedRequests, null);

    return {
      scope: {
        tenantId: scope.tenantId?.trim() || null,
        organizationId: scope.organizationId?.trim() || null
      },
      summary: {
        publicationCount: analytics.length,
        publishedCount: analytics.filter((item) => item.status === "PUBLISHED").length,
        publicPublicationCount: analytics.filter((item) => item.visibility === "PUBLIC").length,
        partnerPublicationCount: analytics.filter((item) => item.visibility === "PARTNER").length,
        pendingAccessRequests: analytics.reduce(
          (total, item) => total + item.totals.pendingAccessRequests,
          0
        ),
        approvedAccessRequests: analytics.reduce(
          (total, item) => total + item.totals.approvedAccessRequests,
          0
        ),
        rejectedAccessRequests: analytics.reduce(
          (total, item) => total + item.totals.rejectedAccessRequests,
          0
        ),
        revokedAccessRequests: analytics.reduce(
          (total, item) => total + item.totals.revokedAccessRequests,
          0
        ),
        activeGrants: analytics.reduce((total, item) => total + item.totals.activeGrants, 0),
        publicMetadataFetches: analytics.reduce(
          (total, item) => total + item.totals.publicMetadataFetches,
          0
        ),
        publicPackageFetches: analytics.reduce(
          (total, item) => total + item.totals.publicPackageFetches,
          0
        ),
        publicDocsFetches: analytics.reduce(
          (total, item) => total + item.totals.publicDocsFetches,
          0
        ),
        partnerMetadataFetches: analytics.reduce(
          (total, item) => total + item.totals.partnerMetadataFetches,
          0
        ),
        partnerPackageFetches: analytics.reduce(
          (total, item) => total + item.totals.partnerPackageFetches,
          0
        ),
        partnerDocsFetches: analytics.reduce(
          (total, item) => total + item.totals.partnerDocsFetches,
          0
        )
      },
      byVisibility,
      byChannel,
      windows: {
        last7Days: {
          eventCount: last7Days.eventCount,
          accessRequests: last7Days.accessRequests,
          approvals: last7Days.approvals,
          fetches:
            last7Days.metadataFetches + last7Days.packageFetches + last7Days.docsFetches
        },
        last30Days: {
          eventCount: last30Days.eventCount,
          accessRequests: last30Days.accessRequests,
          approvals: last30Days.approvals,
          fetches:
            last30Days.metadataFetches + last30Days.packageFetches + last30Days.docsFetches
        },
        allTime: {
          eventCount: allTime.eventCount,
          accessRequests: allTime.accessRequests,
          approvals: allTime.approvals,
          fetches: allTime.metadataFetches + allTime.packageFetches + allTime.docsFetches
        }
      },
      topPublications: analytics
        .map((item) => ({
          publicationId: item.publicationId,
          connectorKey: item.connectorKey,
          version: item.version,
          visibility: item.visibility,
          channel: item.channel,
          status: item.status,
          totalFetches:
            item.totals.publicMetadataFetches +
            item.totals.publicPackageFetches +
            item.totals.publicDocsFetches +
            item.totals.partnerMetadataFetches +
            item.totals.partnerPackageFetches +
            item.totals.partnerDocsFetches,
          accessRequests: item.totals.accessRequests,
          approvedRequests: item.totals.approvedAccessRequests,
          activeGrants: item.totals.activeGrants,
          lastEventAt: item.latest.event ? String(item.latest.event.createdAt) : null,
          publishedAt: String(
            (publicationMap.get(item.publicationId)?.publishedAt as string | undefined) ?? ""
          )
        }))
        .sort((left, right) => {
          if (right.totalFetches !== left.totalFetches) {
            return right.totalFetches - left.totalFetches;
          }
          return right.publishedAt.localeCompare(left.publishedAt);
        })
        .slice(0, 10),
      latest: {
        publication:
          publications.length > 0
            ? this.normalizePublication(publications[0]) as unknown as Record<string, unknown>
            : null,
        accessRequest:
          requests.length > 0
            ? (this.normalizeDistributionRequest(requests[0]) as unknown as Record<string, unknown>)
            : null,
        event:
          events.length > 0
            ? (this.normalizePublicationEvent(events[0]) as unknown as Record<string, unknown>)
            : null
      }
    };
  }

  async getIntegrationPublicationSigningReadiness(id: string, input: JsonRecord = {}) {
    const publication = await this.getIntegrationPublication(id);
    const signingSecret = await this.resolveReleaseSigningSecret({
      tenantId: publication.tenantId ? String(publication.tenantId) : null,
      organizationId: publication.organizationId ? String(publication.organizationId) : null,
      signingKey: input.signingKey ? String(input.signingKey) : null
    });
    const attestation = asObject(publication.attestation);
    const currentKeyRef =
      attestation.keyRef !== undefined && attestation.keyRef !== null
        ? String(attestation.keyRef)
        : null;
    const latestKeyRef = signingSecret ? `${signingSecret.key}:${signingSecret.id}` : null;
    const signatureStatus = String(attestation.signatureStatus ?? "UNSIGNED");
    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    if (!signingSecret) {
      blockingIssues.push("No signing key is available for this publication scope.");
    }

    if (publication.status === "REVOKED" || publication.status === "ARCHIVED") {
      warnings.push("Publication is not active; re-signing only refreshes attestation metadata.");
    }

    const requiresRotation =
      Boolean(signingSecret) && (signatureStatus !== "SIGNED" || currentKeyRef !== latestKeyRef);

    return {
      publicationId: id,
      connectorKey: String(publication.connectorKey),
      version: String(publication.version),
      signingKeyRef: currentKeyRef,
      latestAvailableKeyRef: latestKeyRef,
      signatureStatus,
      canReSign: blockingIssues.length === 0,
      requiresRotation,
      blockingIssues,
      warnings
    };
  }

  async getIntegrationPublicationLifecycleReadiness(id: string) {
    const publication = await this.getIntegrationPublication(id);
    const lifecycle = this.getPublicationLifecycleSnapshot(
      publication as unknown as Record<string, unknown>
    );
    return {
      publicationId: id,
      connectorKey: String(publication.connectorKey),
      version: String(publication.version),
      publicationStatus: String(publication.status),
      ...lifecycle
    };
  }

  async applyIntegrationPublicationLifecycle(
    context: RequestContext,
    id: string,
    input: JsonRecord = {}
  ) {
    const publication = await this.getIntegrationPublication(id);
    const lifecycle = await this.getIntegrationPublicationLifecycleReadiness(id);
    if (!lifecycle.canAutoRevoke) {
      if (input.force !== true) {
        throw new BadRequestException(
          lifecycle.actionRequired
            ? "Publication lifecycle action is not allowed."
            : "No lifecycle action is currently required."
        );
      }
    }

    const requestedStatus = String(input.status ?? "").trim().toUpperCase();
    const nextStatus =
      lifecycle.recommendedStatus ?? (requestedStatus.length > 0 ? requestedStatus : "REVOKED");
    const revokedAt = new Date();
    const row = await this.prisma.integrationPublication.update({
      where: { id },
      data: {
        status: nextStatus,
        revokedAt
      }
    });

    await this.createPublicationEvent(
      id,
      "LIFECYCLE_APPLIED",
      context.scope === "device" ? "DEVICE" : "USER",
      context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
      {
        previousStatus: String(publication.status),
        nextStatus,
        deprecationStage: lifecycle.deprecationStage,
        sunsetAt: lifecycle.sunsetAt,
        reason: lifecycle.isSunsetDue
          ? "Sunset date reached for published artifact."
          : "Lifecycle policy applied manually."
      }
    );

    return this.normalizePublication(row);
  }

  async runIntegrationPublicationLifecycleSweep(
    context: RequestContext,
    input: JsonRecord = {}
  ) {
    const dryRun = input.dryRun !== false;
    const rows = await this.prisma.integrationPublication.findMany({
      where: {
        status: "PUBLISHED"
      },
      orderBy: { publishedAt: "desc" }
    });
    const affected: Array<{
      publicationId: string;
      connectorKey: string;
      version: string;
      previousStatus: string;
      nextStatus: string;
      reason: string;
    }> = [];

    for (const row of rows) {
      const normalized = this.normalizePublication(row) as unknown as Record<string, unknown>;
      const lifecycle = this.getPublicationLifecycleSnapshot(normalized);
      if (!lifecycle.canAutoRevoke) {
        continue;
      }

      const publicationId = String(normalized.id);
      const connectorKey = String(normalized.connectorKey);
      const version = String(normalized.version);
      const previousStatus = String(normalized.status);
      const nextStatus = lifecycle.recommendedStatus ?? "REVOKED";
      const reason = lifecycle.isSunsetDue
        ? "Sunset date reached for published artifact."
        : "Lifecycle policy requires status change.";

      affected.push({
        publicationId,
        connectorKey,
        version,
        previousStatus,
        nextStatus,
        reason
      });

      if (dryRun) {
        continue;
      }

      const revokedAt = new Date();
      await this.prisma.integrationPublication.update({
        where: { id: publicationId },
        data: {
          status: nextStatus,
          revokedAt
        }
      });
      await this.createPublicationEvent(
        publicationId,
        "LIFECYCLE_SWEEP_APPLIED",
        context.scope === "device" ? "DEVICE" : "USER",
        context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
        {
          previousStatus,
          nextStatus,
          deprecationStage: lifecycle.deprecationStage,
          sunsetAt: lifecycle.sunsetAt,
          reason
        }
      );
    }

    return {
      scannedCount: rows.length,
      affectedCount: affected.length,
      dryRun,
      affected
    };
  }

  async reSignIntegrationPublication(context: RequestContext, id: string, input: JsonRecord = {}) {
    const publication = await this.getIntegrationPublication(id);
    const readiness = await this.getIntegrationPublicationSigningReadiness(id, input);
    if (!readiness.canReSign) {
      throw new BadRequestException(readiness.blockingIssues.join(" "));
    }
    const signingSecret = await this.resolveReleaseSigningSecret({
      tenantId: publication.tenantId ? String(publication.tenantId) : null,
      organizationId: publication.organizationId ? String(publication.organizationId) : null,
      signingKey: input.signingKey ? String(input.signingKey) : null
    });
    if (!signingSecret) {
      throw new BadRequestException("No signing key is available for this publication scope.");
    }

    const artifact = asObject(publication.artifact);
    const packageArtifact = asObject(artifact.package);
    const docsArtifact = asObject(artifact.docs);
    const nextAttestation = this.buildPublicationAttestation({
      registryEntryId: String(publication.registryEntryId),
      connectorKey: String(publication.connectorKey),
      version: String(publication.version),
      visibility: String(publication.visibility),
      channel: String(publication.channel),
      packageContent: String(packageArtifact.content ?? ""),
      docsContent: String(docsArtifact.markdown ?? ""),
      signingSecret,
      publishedAt: new Date(String(publication.publishedAt)),
      attestedAt: new Date()
    });
    const previousAttestation = asObject(publication.attestation);
    const row = await this.prisma.integrationPublication.update({
      where: { id },
      data: {
        attestation: asInputJson(nextAttestation)
      }
    });

    await this.createPublicationEvent(
      id,
      "RE_SIGNED",
      context.scope === "device" ? "DEVICE" : "USER",
      context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
      {
        previousKeyRef:
          previousAttestation.keyRef !== undefined && previousAttestation.keyRef !== null
            ? String(previousAttestation.keyRef)
            : null,
        nextKeyRef: nextAttestation.keyRef,
        previousSignatureStatus:
          previousAttestation.signatureStatus !== undefined &&
          previousAttestation.signatureStatus !== null
            ? String(previousAttestation.signatureStatus)
            : null,
        nextSignatureStatus: nextAttestation.signatureStatus
      }
    );

    return this.normalizePublication(row);
  }

  async listPublicIntegrationPublications(scope: {
    connectorKey?: string | null;
    channel?: string | null;
  }) {
    const rows = await this.prisma.integrationPublication.findMany({
      where: {
        visibility: "PUBLIC",
        status: "PUBLISHED",
        revokedAt: null,
        ...(scope.connectorKey?.trim() ? { connectorKey: scope.connectorKey.trim() } : {}),
        ...(scope.channel?.trim() ? { channel: scope.channel.trim() } : {})
      },
      orderBy: { publishedAt: "desc" }
    });
    return rows.map((row) =>
      this.mapPublicPublication(
        this.normalizePublication(row) as unknown as Record<string, unknown>
      )
    );
  }

  async getPublicIntegrationPublication(
    connectorKey: string,
    version: string,
    channel?: string,
    grantToken?: string,
    consumerKey?: string
  ) {
    const publication =
      (await this.resolveGrantedPublication(connectorKey, version, grantToken, channel, consumerKey)) ??
      (await this.resolvePublicPublication(connectorKey, version, channel));
    await this.createPublicationEvent(
      String(publication.id),
      grantToken ? "PARTNER_METADATA_FETCHED" : "PUBLIC_METADATA_FETCHED",
      grantToken ? "PARTNER_CLIENT" : "PUBLIC_CLIENT",
      consumerKey?.trim() || null,
      {
        connectorKey,
        version,
        channel: channel?.trim() || String(publication.channel),
        transport: "public-api",
        grantTokenUsed: Boolean(grantToken)
      }
    );
    return this.mapPublicPublication(
      this.normalizePublication(publication) as unknown as Record<string, unknown>
    );
  }

  async getPublicIntegrationPublicationPackage(
    connectorKey: string,
    version: string,
    channel?: string,
    consumerKey?: string,
    grantToken?: string
  ) {
    const publication =
      (await this.resolveGrantedPublication(
        connectorKey,
        version,
        grantToken,
        channel,
        consumerKey
      )) ??
      (await this.resolvePublicPublication(connectorKey, version, channel));
    const normalized = this.normalizePublication(publication) as unknown as Record<string, unknown>;
    await this.createPublicationEvent(
      String(publication.id),
      grantToken ? "PARTNER_PACKAGE_FETCHED" : "PUBLIC_PACKAGE_FETCHED",
      grantToken ? "PARTNER_CLIENT" : "PUBLIC_CLIENT",
      consumerKey?.trim() || null,
      {
        connectorKey,
        version,
        channel: channel?.trim() || String(publication.channel),
        transport: "public-api",
        grantTokenUsed: Boolean(grantToken)
      }
    );
    return asObject(asObject(normalized.artifact).package);
  }

  async getPublicIntegrationPublicationDocs(
    connectorKey: string,
    version: string,
    channel?: string,
    consumerKey?: string,
    grantToken?: string
  ) {
    const publication =
      (await this.resolveGrantedPublication(
        connectorKey,
        version,
        grantToken,
        channel,
        consumerKey
      )) ??
      (await this.resolvePublicPublication(connectorKey, version, channel));
    const normalized = this.normalizePublication(publication) as unknown as Record<string, unknown>;
    await this.createPublicationEvent(
      String(publication.id),
      grantToken ? "PARTNER_DOCS_FETCHED" : "PUBLIC_DOCS_FETCHED",
      grantToken ? "PARTNER_CLIENT" : "PUBLIC_CLIENT",
      consumerKey?.trim() || null,
      {
        connectorKey,
        version,
        channel: channel?.trim() || String(publication.channel),
        transport: "public-api",
        grantTokenUsed: Boolean(grantToken)
      }
    );
    return asObject(asObject(normalized.artifact).docs);
  }

  async createPublicIntegrationDistributionRequest(
    connectorKey: string,
    version: string,
    input: JsonRecord
  ) {
    const companyName = String(input.companyName ?? "").trim();
    const contactName = String(input.contactName ?? "").trim();
    const contactEmail = String(input.contactEmail ?? "").trim();
    if (!companyName || !contactName || !contactEmail) {
      throw new BadRequestException("companyName, contactName and contactEmail are required.");
    }

    const publication = this.ensureRecord(
      await this.prisma.integrationPublication.findFirst({
        where: {
          connectorKey,
          version,
          visibility: "PARTNER",
          status: "PUBLISHED",
          revokedAt: null
        },
        orderBy: { publishedAt: "desc" }
      }),
      "Partner publication not found."
    );

    const requestedChannel = input.requestedChannel
      ? String(input.requestedChannel).trim()
      : String(publication.channel);
    const row = await this.prisma.integrationDistributionRequest.create({
      data: {
        publicationId: publication.id,
        connectorKey,
        version,
        requestedChannel: requestedChannel || null,
        companyName,
        contactName,
        contactEmail,
        intendedUse: asNullableInputJson(input.intendedUse ?? null),
        status: "PENDING"
      }
    });

    await this.createPublicationEvent(
      publication.id,
      "ACCESS_REQUESTED",
      "PUBLIC_CLIENT",
      contactEmail,
      {
        companyName,
        requestedChannel
      }
    );

    return this.normalizeDistributionRequest(row);
  }

  async recordIntegrationPublicationEvent(id: string, input: JsonRecord) {
    this.ensureRecord(
      await this.prisma.integrationPublication.findUnique({ where: { id } }),
      "Integration publication not found."
    );
    const eventType = String(input.eventType ?? "").trim();
    const actorType = String(input.actorType ?? "").trim();
    if (!eventType || !actorType) {
      throw new BadRequestException("eventType and actorType are required.");
    }

    return this.createPublicationEvent(
      id,
      eventType,
      actorType,
      input.actorKey ? String(input.actorKey) : null,
      input.metadata ? asObject(input.metadata) : null
    );
  }

  async updateIntegrationPublicationStatus(id: string, input: JsonRecord) {
    const status = String(input.status ?? "").trim();
    if (!status) {
      throw new BadRequestException("status is required.");
    }
    const current = this.ensureRecord(
      await this.prisma.integrationPublication.findUnique({ where: { id } }),
      "Integration publication not found."
    );
    const revokedAt =
      status === "REVOKED" || status === "ARCHIVED"
        ? current.revokedAt ?? new Date()
        : current.revokedAt;
    const row = await this.prisma.integrationPublication.update({
      where: { id },
      data: {
        status,
        revokedAt
      }
    });

    await this.createPublicationEvent(
      id,
      "STATUS_CHANGED",
      "SYSTEM",
      null,
      { status, revokedAt: revokedAt ? revokedAt.toISOString() : null }
    );

    return this.normalizePublication(row);
  }

  async publishIntegrationRegistryEntry(context: RequestContext, id: string, input: JsonRecord) {
    const registryEntry = await this.getIntegrationRegistryEntry(id);
    if (registryEntry.status === "ARCHIVED") {
      throw new BadRequestException("Archived registry entries cannot be published.");
    }
    const registryEntryId = String(registryEntry.id);
    const tenantId = registryEntry.tenantId ? String(registryEntry.tenantId) : null;
    const organizationId = registryEntry.organizationId ? String(registryEntry.organizationId) : null;
    const connectorKey = String(registryEntry.connectorKey);
    const version = String(registryEntry.version);

    const [developerPackage, developerDocs, signingSecret] = await Promise.all([
      this.getDeveloperPackage(id),
      this.getDeveloperDocs(id),
      this.resolveReleaseSigningSecret({
        tenantId,
        organizationId,
        signingKey: input.signingKey ? String(input.signingKey) : null
      })
    ]);

    const visibility = String(input.visibility ?? "PARTNER").trim().toUpperCase();
    const channel = String(
      input.channel ?? developerPackage.compatibility.rolloutChannel ?? "general"
    ).trim();
    const readiness = await this.getIntegrationPublicationReadiness(id, {
      visibility,
      channel,
      signingKey: input.signingKey
    });
    if (!readiness.canPublish) {
      throw new BadRequestException(readiness.blockingIssues.join(" "));
    }
    const publishedAt = new Date();
    const attestation = this.buildPublicationAttestation({
      registryEntryId,
      connectorKey,
      version,
      visibility,
      channel,
      packageContent: developerPackage.content,
      docsContent: developerDocs.markdown,
      signingSecret,
      publishedAt,
      attestedAt: publishedAt
    });
    const row = await this.prisma.integrationPublication.create({
      data: {
        registryEntryId,
        tenantId,
        organizationId,
        connectorKey,
        version,
        visibility,
        channel,
        status: String(input.status ?? "PUBLISHED").trim().toUpperCase(),
        packageFileName: developerPackage.packageFileName,
        docsFileName: `${developerDocs.connectorKey}-${developerDocs.version}-developer-docs.md`,
        artifact: asInputJson({
          package: developerPackage,
          docs: developerDocs
        }),
        attestation: asInputJson(attestation),
        publishedByUserId: context.scope === "device" ? null : asUuidOrNull(context.userId),
        publishedAt
      }
    });

    await this.createPublicationEvent(
      row.id,
      "PUBLISHED",
      context.scope === "device" ? "DEVICE" : "USER",
      context.scope === "device" ? context.deviceId ?? null : context.userId ?? null,
      {
        visibility,
        channel,
        signatureStatus: attestation.signatureStatus
      }
    );

    return this.normalizePublication(row);
  }

  async updateIntegrationRegistryEntry(id: string, input: JsonRecord) {
    this.ensureRecord(
      await this.prisma.integrationRegistryEntry.findUnique({ where: { id } }),
      "Registry entry not found."
    );
    const row = await this.prisma.integrationRegistryEntry.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["tenantId", "organizationId", "connectorKey", "version", "status"]),
        ...(input.manifest !== undefined ? { manifest: asInputJson(input.manifest) } : {})
      }
    });

    return this.normalizeRecord(row, {
      json: ["manifest"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async archiveIntegrationRegistryEntry(id: string) {
    this.ensureRecord(
      await this.prisma.integrationRegistryEntry.findUnique({ where: { id } }),
      "Registry entry not found."
    );
    const row = await this.prisma.integrationRegistryEntry.update({
      where: { id },
      data: { status: "ARCHIVED" }
    });

    return this.normalizeRecord(row, {
      json: ["manifest"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async updateIntegrationRegistryEntryStatus(id: string, input: JsonRecord) {
    const status = String(input.status ?? "").trim();
    if (!status) {
      throw new BadRequestException("status is required.");
    }

    this.ensureRecord(
      await this.prisma.integrationRegistryEntry.findUnique({ where: { id } }),
      "Registry entry not found."
    );
    const row = await this.prisma.integrationRegistryEntry.update({
      where: { id },
      data: { status }
    });

    return this.normalizeRecord(row, {
      json: ["manifest"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async listConnectorTemplates() {
    const rows = await this.prisma.connectorTemplate.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) =>
      this.normalizeRecord(row, {
        json: ["manifest"],
        dates: ["createdAt", "updatedAt"]
      })
    );
  }

  async getConnectorTemplate(id: string) {
    return this.normalizeRecord(
      this.ensureRecord(
        await this.prisma.connectorTemplate.findUnique({ where: { id } }),
        "Connector template not found."
      ),
      {
        json: ["manifest"],
        dates: ["createdAt", "updatedAt"]
      }
    );
  }

  async updateConnectorTemplate(id: string, input: JsonRecord) {
    this.ensureRecord(
      await this.prisma.connectorTemplate.findUnique({ where: { id } }),
      "Connector template not found."
    );
    const row = await this.prisma.connectorTemplate.update({
      where: { id },
      data: {
        ...this.partialUpdate(input, ["connectorKey", "version"]),
        ...(input.manifest !== undefined ? { manifest: asInputJson(input.manifest) } : {})
      }
    });

    return this.normalizeRecord(row, {
      json: ["manifest"],
      dates: ["createdAt", "updatedAt"]
    });
  }

  async archiveConnectorTemplate(id: string) {
    this.ensureRecord(
      await this.prisma.connectorTemplate.findUnique({ where: { id } }),
      "Connector template not found."
    );
    await this.prisma.connectorTemplate.delete({ where: { id } });
    return { archived: true, id };
  }
}
