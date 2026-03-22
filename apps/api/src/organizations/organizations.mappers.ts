import { Prisma } from "@exetron/database";
import { asObject, readManagedStatus } from "./organizations.helpers";

export function mapOrganization(record: {
  id: string;
  code: string;
  name: string;
  status: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    status: record.status,
    metadata: asObject(record.metadata),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export function mapMembership(record: {
  id: string;
  organizationId: string;
  userId: string;
  roleKey: string;
  createdAt: Date;
}) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    userId: record.userId,
    roleKey: record.roleKey,
    status: "ACTIVE",
    createdAt: record.createdAt.toISOString()
  };
}

export function mapTenantLink(record: {
  id: string;
  organizationId: string;
  tenantId: string;
  roleKey: string;
  createdAt: Date;
}) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    tenantId: record.tenantId,
    roleKey: record.roleKey,
    status: "ACTIVE",
    createdAt: record.createdAt.toISOString()
  };
}

export function mapGovernancePolicy(record: {
  id: string;
  organizationId: string;
  policyKey: string;
  rules: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    policyKey: record.policyKey,
    rules: asObject(record.rules),
    status: readManagedStatus(record.rules),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export function mapRolloutTemplate(record: {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  artifact: Prisma.JsonValue;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    code: record.code,
    name: record.name,
    artifact: asObject(record.artifact),
    status: readManagedStatus(record.artifact),
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export function mapTemplateApplication(record: {
  id: string;
  templateId: string;
  tenantId: string | null;
  storeId: string | null;
  appliedVersion: number;
  resultSummary: Prisma.JsonValue | null;
  createdAt: Date;
}) {
  return {
    id: record.id,
    templateId: record.templateId,
    tenantId: record.tenantId,
    storeId: record.storeId,
    appliedVersion: record.appliedVersion,
    resultSummary: record.resultSummary ? asObject(record.resultSummary) : null,
    status: readManagedStatus(record.resultSummary, "APPLIED"),
    createdAt: record.createdAt.toISOString()
  };
}

export function mapWhiteLabelPack(record: {
  id: string;
  organizationId: string | null;
  tenantId: string | null;
  code: string;
  name: string;
  artifact: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    tenantId: record.tenantId,
    code: record.code,
    name: record.name,
    artifact: asObject(record.artifact),
    status: readManagedStatus(record.artifact),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export function mapPartnerAccount(record: {
  id: string;
  organizationId: string | null;
  tenantId: string | null;
  code: string;
  name: string;
  status: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    tenantId: record.tenantId,
    code: record.code,
    name: record.name,
    status: record.status,
    metadata: record.metadata ? asObject(record.metadata) : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}
