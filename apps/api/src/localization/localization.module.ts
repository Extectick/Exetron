import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Put,
  Query
} from "@nestjs/common";
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiTags
} from "@nestjs/swagger";
import type {
  CountryProfileDto,
  ImportLocalizationLanguagePackRequest,
  ListResponse,
  LocalizationContextDto,
  LocalizationLanguagePackDto,
  LocalizationPreferencesDto,
  LocalizationPreferencesStateDto,
  LocalizedContentDto,
  LocalizedTemplateDto,
  RenderLocalizedTemplateRequest,
  RenderLocalizedTemplateResponse,
  UpsertCountryProfileRequest,
  UpsertLocalizationPreferencesRequest,
  UpsertLocalizedContentRequest,
  UpsertLocalizedTemplateRequest
} from "@exetron/contracts";
import type { Prisma } from "@exetron/database";
import type { CustomizationChannel, RequestContext } from "@exetron/types";
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches
} from "class-validator";
import { AuditModule, AuditService } from "../audit/audit.module";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { DatabaseContextService } from "../database/database-context.service";

const localizationPreferencesKey = "localization.preferences";
const countryProfilePrefix = "localization.country-profile.";
const localizedContentPrefix = "localization.content.";
const localizedTemplatePrefix = "localization.template.";

const customizationChannels: CustomizationChannel[] = [
  "ADMIN",
  "POS",
  "KIOSK",
  "DELIVERY",
  "KITCHEN",
  "BOARD",
  "BACKOFFICE"
];

const localizedContentTargetTypes = [
  "CATEGORY",
  "PRODUCT",
  "VARIANT",
  "MODIFIER_GROUP",
  "MODIFIER_OPTION",
  "BRANDING"
] as const;

type LocalizedContentTargetType = (typeof localizedContentTargetTypes)[number];

interface LocalizationPreferencesValue {
  defaultLocale: string;
  fallbackLocale: string;
  supportedLocales: string[];
  countryCode: string | null;
  currency: string | null;
  timezone: string | null;
  channelLocales: Partial<Record<CustomizationChannel, string>>;
}

interface CountryProfileValue {
  defaultLocale: string;
  supportedLocales: string[];
  currency: string;
  tax: {
    mode: "NONE" | "INCLUSIVE" | "EXCLUSIVE";
    ratePercent: number | null;
    label: string | null;
  };
  complianceFlags: string[];
  metadata: Record<string, unknown>;
}

interface LocalizedContentValue {
  entries: Record<string, Record<string, string>>;
}

interface LocalizedTemplateValue {
  channel: CustomizationChannel | null;
  description: string | null;
  variables: string[];
  entries: Record<
    string,
    {
      subject?: string;
      title?: string;
      body?: string;
      sms?: string;
      pushTitle?: string;
      pushBody?: string;
    }
  >;
}

interface ResolveLocalizationInput {
  tenantId?: string;
  storeId?: string | null;
  locale?: string;
  customerLocale?: string;
  countryCode?: string;
  channel?: CustomizationChannel | null;
  currency?: string | null;
}

interface ResolvedLocalizationContextInternal extends LocalizationContextDto {
  localeChain: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asInputJsonObject(value: unknown): Prisma.InputJsonObject {
  return value as unknown as Prisma.InputJsonObject;
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function normalizeCountryCode(countryCode: string | null | undefined): string | null {
  const trimmed = countryCode?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function normalizeLocaleTag(locale: string | null | undefined): string | null {
  const trimmed = locale?.trim().replace(/_/g, "-");
  if (!trimmed) {
    return null;
  }

  const [language, ...rest] = trimmed.split("-");
  if (!language) {
    return null;
  }

  return [
    language.toLowerCase(),
    ...rest.map((segment) => (segment.length <= 3 ? segment.toUpperCase() : segment))
  ].join("-");
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (!value || result.includes(value)) {
      continue;
    }
    result.push(value);
  }
  return result;
}

function buildLocaleVariants(locale: string): string[] {
  const normalized = normalizeLocaleTag(locale);
  if (!normalized) {
    return [];
  }

  const [language] = normalized.split("-");
  return dedupeStrings([normalized, language]);
}

function normalizeSupportedLocales(
  locales: Array<string | null | undefined>,
  defaultLocale?: string | null,
  fallbackLocale?: string | null
): string[] {
  return dedupeStrings(
    [...locales, defaultLocale ?? null, fallbackLocale ?? null].map((locale) =>
      normalizeLocaleTag(locale)
    )
  );
}

function buildChannelLocales(
  value: unknown
): Partial<Record<CustomizationChannel, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [CustomizationChannel, string] =>
      customizationChannels.includes(entry[0] as CustomizationChannel) &&
      typeof entry[1] === "string"
  );

  return Object.fromEntries(
    entries.map(([channel, locale]) => [channel, normalizeLocaleTag(locale) ?? locale])
  );
}

function parseLocalizationPreferences(
  value: Prisma.JsonValue | null | undefined,
  fallback?: Partial<LocalizationPreferencesValue>
): LocalizationPreferencesValue {
  const record = asRecord(value) ?? {};
  const defaultLocale =
    normalizeLocaleTag(typeof record.defaultLocale === "string" ? record.defaultLocale : null) ??
    normalizeLocaleTag(fallback?.defaultLocale) ??
    "en-US";
  const fallbackLocale =
    normalizeLocaleTag(typeof record.fallbackLocale === "string" ? record.fallbackLocale : null) ??
    normalizeLocaleTag(fallback?.fallbackLocale) ??
    defaultLocale;

  return {
    defaultLocale,
    fallbackLocale,
    supportedLocales: normalizeSupportedLocales(
      Array.isArray(record.supportedLocales) ? (record.supportedLocales as string[]) : [],
      defaultLocale,
      fallbackLocale
    ),
    countryCode:
      normalizeCountryCode(
        typeof record.countryCode === "string" ? record.countryCode : fallback?.countryCode
      ) ?? null,
    currency:
      typeof record.currency === "string"
        ? record.currency.trim().toUpperCase()
        : fallback?.currency ?? null,
    timezone:
      typeof record.timezone === "string" ? record.timezone : fallback?.timezone ?? null,
    channelLocales: buildChannelLocales(record.channelLocales)
  };
}

function parseCountryProfile(
  value: Prisma.JsonValue | null | undefined,
  countryCode: string
): CountryProfileValue {
  const record = asRecord(value) ?? {};
  const defaultLocale =
    normalizeLocaleTag(typeof record.defaultLocale === "string" ? record.defaultLocale : null) ??
    "en-US";
  const taxRecord = asRecord(record.tax);

  return {
    defaultLocale,
    supportedLocales: normalizeSupportedLocales(
      Array.isArray(record.supportedLocales) ? (record.supportedLocales as string[]) : [],
      defaultLocale,
      defaultLocale
    ),
    currency:
      typeof record.currency === "string" && record.currency.trim()
        ? record.currency.trim().toUpperCase()
        : "USD",
    tax: {
      mode:
        taxRecord?.mode === "INCLUSIVE" ||
        taxRecord?.mode === "EXCLUSIVE" ||
        taxRecord?.mode === "NONE"
          ? taxRecord.mode
          : "NONE",
      ratePercent: typeof taxRecord?.ratePercent === "number" ? taxRecord.ratePercent : null,
      label: typeof taxRecord?.label === "string" ? taxRecord.label : null
    },
    complianceFlags: Array.isArray(record.complianceFlags)
      ? (record.complianceFlags as string[]).filter((item) => typeof item === "string")
      : [],
    metadata: asRecord(record.metadata) ?? {
      countryCode,
      profileStatus: "base"
    }
  };
}

function parseLocalizedContentValue(
  value: Prisma.JsonValue | null | undefined
): LocalizedContentValue {
  const record = asRecord(value) ?? {};
  const rawEntries = asRecord(record.entries) ?? {};
  return {
    entries: Object.fromEntries(
      Object.entries(rawEntries).map(([locale, fields]) => [
        normalizeLocaleTag(locale) ?? locale,
        asStringRecord(fields)
      ])
    )
  };
}

function collectTemplateVariables(entries: LocalizedTemplateValue["entries"]): string[] {
  const variableRegex = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  const variables = new Set<string>();

  for (const entry of Object.values(entries)) {
    for (const value of Object.values(entry)) {
      if (!value) {
        continue;
      }
      let match = variableRegex.exec(value);
      while (match) {
        variables.add(match[1]);
        match = variableRegex.exec(value);
      }
      variableRegex.lastIndex = 0;
    }
  }

  return Array.from(variables).sort();
}

function parseLocalizedTemplateValue(
  value: Prisma.JsonValue | null | undefined,
  channel: CustomizationChannel | null
): LocalizedTemplateValue {
  const record = asRecord(value) ?? {};
  const rawEntries = asRecord(record.entries) ?? {};
  const entries = Object.fromEntries(
    Object.entries(rawEntries).map(([locale, rawTemplate]) => [
      normalizeLocaleTag(locale) ?? locale,
      asRecord(rawTemplate) ?? {}
    ])
  ) as LocalizedTemplateValue["entries"];

  return {
    channel,
    description: typeof record.description === "string" ? record.description : null,
    variables:
      Array.isArray(record.variables) && record.variables.every((item) => typeof item === "string")
        ? (record.variables as string[])
        : collectTemplateVariables(entries),
    entries
  };
}

function mapPreferencesDto(input: {
  scope: "TENANT" | "STORE";
  tenantId: string;
  storeId: string | null;
  value: LocalizationPreferencesValue;
  createdAt: Date | null;
  updatedAt: Date | null;
}): LocalizationPreferencesDto {
  return {
    scope: input.scope,
    tenantId: input.tenantId,
    storeId: input.storeId,
    defaultLocale: input.value.defaultLocale,
    fallbackLocale: input.value.fallbackLocale,
    supportedLocales: input.value.supportedLocales,
    countryCode: input.value.countryCode,
    currency: input.value.currency,
    timezone: input.value.timezone,
    channelLocales: input.value.channelLocales,
    createdAt: input.createdAt?.toISOString() ?? null,
    updatedAt: input.updatedAt?.toISOString() ?? null
  };
}

function mapCountryProfileDto(input: {
  tenantId: string;
  countryCode: string;
  value: CountryProfileValue;
  createdAt: Date | null;
  updatedAt: Date | null;
}): CountryProfileDto {
  return {
    tenantId: input.tenantId,
    countryCode: input.countryCode,
    defaultLocale: input.value.defaultLocale,
    supportedLocales: input.value.supportedLocales,
    currency: input.value.currency,
    tax: input.value.tax,
    complianceFlags: input.value.complianceFlags,
    metadata: input.value.metadata,
    createdAt: input.createdAt?.toISOString() ?? null,
    updatedAt: input.updatedAt?.toISOString() ?? null
  };
}

function mapLocalizedContentDto(input: {
  tenantId: string;
  targetType: LocalizedContentTargetType;
  targetId: string;
  value: LocalizedContentValue;
  createdAt: Date | null;
  updatedAt: Date | null;
}): LocalizedContentDto {
  return {
    tenantId: input.tenantId,
    targetType: input.targetType,
    targetId: input.targetId,
    entries: input.value.entries,
    createdAt: input.createdAt?.toISOString() ?? null,
    updatedAt: input.updatedAt?.toISOString() ?? null
  };
}

function mapLocalizedTemplateDto(input: {
  tenantId: string;
  templateKey: string;
  value: LocalizedTemplateValue;
  createdAt: Date | null;
  updatedAt: Date | null;
}): LocalizedTemplateDto {
  return {
    tenantId: input.tenantId,
    templateKey: input.templateKey,
    channel: input.value.channel,
    description: input.value.description,
    variables: input.value.variables,
    entries: input.value.entries,
    createdAt: input.createdAt?.toISOString() ?? null,
    updatedAt: input.updatedAt?.toISOString() ?? null
  };
}

function buildCountryProfileKey(countryCode: string): string {
  return `${countryProfilePrefix}${normalizeCountryCode(countryCode)}`;
}

function parseCountryProfileKey(key: string): string | null {
  return key.startsWith(countryProfilePrefix)
    ? normalizeCountryCode(key.slice(countryProfilePrefix.length))
    : null;
}

function buildLocalizedContentKey(
  targetType: LocalizedContentTargetType,
  targetId: string
): string {
  return `${localizedContentPrefix}${targetType}.${targetId}`;
}

function parseLocalizedContentKey(
  key: string
): { targetType: LocalizedContentTargetType; targetId: string } | null {
  if (!key.startsWith(localizedContentPrefix)) {
    return null;
  }

  const payload = key.slice(localizedContentPrefix.length);
  const [targetType, ...targetIdParts] = payload.split(".");
  if (
    !targetIdParts.length ||
    !localizedContentTargetTypes.includes(targetType as LocalizedContentTargetType)
  ) {
    return null;
  }

  return {
    targetType: targetType as LocalizedContentTargetType,
    targetId: targetIdParts.join(".")
  };
}

function buildLocalizedTemplateKey(
  channel: CustomizationChannel | null,
  templateKey: string
): string {
  return `${localizedTemplatePrefix}${channel ?? "shared"}.${templateKey}`;
}

function parseLocalizedTemplateKey(
  key: string
): { channel: CustomizationChannel | null; templateKey: string } | null {
  if (!key.startsWith(localizedTemplatePrefix)) {
    return null;
  }

  const payload = key.slice(localizedTemplatePrefix.length);
  const [scope, ...templateKeyParts] = payload.split(".");
  if (!scope || !templateKeyParts.length) {
    return null;
  }

  return {
    channel: scope === "shared" ? null : (scope as CustomizationChannel),
    templateKey: templateKeyParts.join(".")
  };
}

function resolveLocalizedEntry<T extends Record<string, unknown>>(
  entries: Record<string, T>,
  localeChain: string[]
): { locale: string; value: T } | null {
  for (const locale of localeChain) {
    for (const variant of buildLocaleVariants(locale)) {
      if (entries[variant]) {
        return {
          locale: variant,
          value: entries[variant]
        };
      }
    }
  }

  const firstEntry = Object.entries(entries).find((entry) => Object.keys(entry[1]).length > 0);
  return firstEntry
    ? {
        locale: firstEntry[0],
        value: firstEntry[1]
      }
    : null;
}

function buildFormattingPreview(
  locale: string,
  currency: string,
  countryCode: string | null
): LocalizationContextDto["formatting"] {
  return {
    moneyExample: new Intl.NumberFormat(locale, {
      style: "currency",
      currency
    }).format(1234.56),
    dateExample: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
      new Date("2026-03-18T12:00:00.000Z")
    ),
    addressExample:
      countryCode === "RU"
        ? "ул. Ленина, 10, Новосибирск"
        : countryCode === "DE"
          ? "Unter den Linden 1, Berlin"
          : "221B Baker Street, London",
    phoneExample:
      countryCode === "RU"
        ? "+7 913 555-01-01"
        : countryCode === "DE"
          ? "+49 30 123456"
          : "+1 415 555 0101"
  };
}

function interpolateTemplate(
  template: string | undefined,
  variables: Record<string, string | number | boolean | null | undefined>
): string | undefined {
  if (!template) {
    return undefined;
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

class LocalizationScopedQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}

class LocalizationContextQueryDto extends LocalizationScopedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerLocale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ enum: customizationChannels, nullable: true })
  @IsOptional()
  @IsIn(customizationChannels)
  channel?: CustomizationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}

class LocalizationContentQueryDto extends LocalizationScopedQueryDto {
  @ApiPropertyOptional({ enum: localizedContentTargetTypes })
  @IsOptional()
  @IsIn(localizedContentTargetTypes)
  targetType?: LocalizedContentTargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetId?: string;
}

class LocalizationTemplateQueryDto extends LocalizationScopedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateKey?: string;

  @ApiPropertyOptional({ enum: customizationChannels, nullable: true })
  @IsOptional()
  @IsIn(customizationChannels)
  channel?: CustomizationChannel;
}

class CountryProfileParamDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  countryCode!: string;
}

class UpsertLocalizationPreferencesDto implements UpsertLocalizationPreferencesRequest {
  @ApiProperty()
  @IsString()
  defaultLocale!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fallbackLocale?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedLocales?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  countryCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  currency?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  timezone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  channelLocales?: Partial<Record<CustomizationChannel, string>>;
}

class UpsertStoreLocalizationPreferencesDto extends UpsertLocalizationPreferencesDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  storeId!: string;
}

class UpsertCountryProfileDto implements UpsertCountryProfileRequest {
  @ApiProperty()
  @IsString()
  defaultLocale!: string;

  @ApiProperty()
  @IsString()
  currency!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedLocales?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  tax?: UpsertCountryProfileRequest["tax"];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complianceFlags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

class UpsertLocalizedContentDto implements UpsertLocalizedContentRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ enum: localizedContentTargetTypes })
  @IsIn(localizedContentTargetTypes)
  targetType!: LocalizedContentTargetType;

  @ApiProperty()
  @IsString()
  targetId!: string;

  @ApiProperty()
  @IsObject()
  entries!: Record<string, Record<string, string>>;
}

class UpsertLocalizedTemplateDto implements UpsertLocalizedTemplateRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  tenantId!: string;

  @ApiProperty()
  @IsString()
  templateKey!: string;

  @ApiPropertyOptional({ enum: customizationChannels, nullable: true })
  @IsOptional()
  @IsIn(customizationChannels)
  channel?: CustomizationChannel | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiProperty()
  @IsObject()
  entries!: Record<string, LocalizedTemplateDto["entries"][string]>;
}

class ImportLocalizationLanguagePackDto implements ImportLocalizationLanguagePackRequest {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiProperty()
  @IsObject()
  pack!: LocalizationLanguagePackDto;
}

class RenderLocalizedTemplateDto implements RenderLocalizedTemplateRequest {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  storeId?: string | null;

  @ApiProperty()
  @IsString()
  templateKey!: string;

  @ApiPropertyOptional({ enum: customizationChannels, nullable: true })
  @IsOptional()
  @IsIn(customizationChannels)
  channel?: CustomizationChannel | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerLocale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean | null>;
}

@Injectable()
export class LocalizationService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService
  ) {}

  listPreferences(
    context: RequestContext,
    query: LocalizationScopedQueryDto
  ): Promise<LocalizationPreferencesStateDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const scope = await this.resolveScopeTx(tx, context, query);
      const tenantSetting = await tx.tenantSetting.findUnique({
        where: {
          tenantId_key: {
            tenantId: scope.tenantId,
            key: localizationPreferencesKey
          }
        }
      });

      const storeSetting = scope.storeId
        ? await tx.storeSetting.findUnique({
            where: {
              storeId_key: {
                storeId: scope.storeId,
                key: localizationPreferencesKey
              }
            }
          })
        : null;

      return {
        tenant: tenantSetting
          ? mapPreferencesDto({
              scope: "TENANT",
              tenantId: scope.tenantId,
              storeId: null,
              value: parseLocalizationPreferences(tenantSetting.value),
              createdAt: tenantSetting.createdAt,
              updatedAt: tenantSetting.updatedAt
            })
          : null,
        store: storeSetting
          ? mapPreferencesDto({
              scope: "STORE",
              tenantId: storeSetting.tenantId,
              storeId: storeSetting.storeId,
              value: parseLocalizationPreferences(storeSetting.value),
              createdAt: storeSetting.createdAt,
              updatedAt: storeSetting.updatedAt
            })
          : null
      };
    });
  }

  upsertTenantPreferences(
    context: RequestContext,
    dto: UpsertLocalizationPreferencesDto,
    tenantId?: string
  ): Promise<LocalizationPreferencesDto> {
    const resolvedTenantId = this.accessControl.resolveTenantId(
      context,
      tenantId ?? context.tenantId
    );

    return this.dbContext.withRequestContext(context, async (tx) => {
      const value = this.buildPreferencesValue(dto);
      const setting = await tx.tenantSetting.upsert({
        where: {
          tenantId_key: {
            tenantId: resolvedTenantId,
            key: localizationPreferencesKey
          }
        },
        update: {
          value: asInputJsonObject(value)
        },
        create: {
          tenantId: resolvedTenantId,
          key: localizationPreferencesKey,
          value: asInputJsonObject(value)
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: resolvedTenantId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "localization.tenant_preferences_upserted",
        entityType: "tenant_setting",
        entityId: setting.id,
        payload: {
          key: localizationPreferencesKey,
          defaultLocale: value.defaultLocale
        }
      });

      return mapPreferencesDto({
        scope: "TENANT",
        tenantId: resolvedTenantId,
        storeId: null,
        value,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      });
    });
  }

  upsertStorePreferences(
    context: RequestContext,
    dto: UpsertStoreLocalizationPreferencesDto
  ): Promise<LocalizationPreferencesDto> {
    this.accessControl.enforceStoreAccess(context, dto.storeId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const store = await tx.store.findUniqueOrThrow({
        where: { id: dto.storeId }
      });
      this.accessControl.resolveTenantId(context, store.tenantId);

      const value = this.buildPreferencesValue(dto);
      const setting = await tx.storeSetting.upsert({
        where: {
          storeId_key: {
            storeId: dto.storeId,
            key: localizationPreferencesKey
          }
        },
        update: {
          value: asInputJsonObject(value)
        },
        create: {
          tenantId: store.tenantId,
          storeId: dto.storeId,
          key: localizationPreferencesKey,
          value: asInputJsonObject(value)
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: store.tenantId,
        storeId: dto.storeId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "localization.store_preferences_upserted",
        entityType: "store_setting",
        entityId: setting.id,
        payload: {
          key: localizationPreferencesKey,
          defaultLocale: value.defaultLocale
        }
      });

      return mapPreferencesDto({
        scope: "STORE",
        tenantId: store.tenantId,
        storeId: dto.storeId,
        value,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      });
    });
  }

  listCountryProfiles(
    context: RequestContext,
    query: LocalizationScopedQueryDto
  ): Promise<ListResponse<CountryProfileDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const scope = await this.resolveScopeTx(tx, context, query);
      const settings = await tx.tenantSetting.findMany({
        where: {
          tenantId: scope.tenantId,
          key: {
            startsWith: countryProfilePrefix
          }
        },
        orderBy: { key: "asc" }
      });

      const items = settings
        .map((setting) => {
          const countryCode = parseCountryProfileKey(setting.key);
          return countryCode
            ? mapCountryProfileDto({
                tenantId: scope.tenantId,
                countryCode,
                value: parseCountryProfile(setting.value, countryCode),
                createdAt: setting.createdAt,
                updatedAt: setting.updatedAt
              })
            : null;
        })
        .filter(Boolean) as CountryProfileDto[];

      return {
        items,
        total: items.length
      };
    });
  }

  upsertCountryProfile(
    context: RequestContext,
    countryCode: string,
    dto: UpsertCountryProfileDto,
    tenantId?: string
  ): Promise<CountryProfileDto> {
    const resolvedTenantId = this.accessControl.resolveTenantId(
      context,
      tenantId ?? context.tenantId
    );
    const normalizedCountryCode = normalizeCountryCode(countryCode);
    if (!normalizedCountryCode) {
      throw new BadRequestException("Country code is required.");
    }

    return this.dbContext.withRequestContext(context, async (tx) => {
      const value: CountryProfileValue = {
        defaultLocale: normalizeLocaleTag(dto.defaultLocale) ?? "en-US",
        supportedLocales: normalizeSupportedLocales(
          dto.supportedLocales ?? [],
          dto.defaultLocale,
          dto.defaultLocale
        ),
        currency: dto.currency.trim().toUpperCase(),
        tax: {
          mode:
            dto.tax?.mode === "INCLUSIVE" ||
            dto.tax?.mode === "EXCLUSIVE" ||
            dto.tax?.mode === "NONE"
              ? dto.tax.mode
              : "NONE",
          ratePercent: typeof dto.tax?.ratePercent === "number" ? dto.tax.ratePercent : null,
          label: dto.tax?.label ?? null
        },
        complianceFlags: dedupeStrings(dto.complianceFlags ?? []),
        metadata: dto.metadata ?? {}
      };

      const setting = await tx.tenantSetting.upsert({
        where: {
          tenantId_key: {
            tenantId: resolvedTenantId,
            key: buildCountryProfileKey(normalizedCountryCode)
          }
        },
        update: {
          value: asInputJsonObject(value)
        },
        create: {
          tenantId: resolvedTenantId,
          key: buildCountryProfileKey(normalizedCountryCode),
          value: asInputJsonObject(value)
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: resolvedTenantId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "localization.country_profile_upserted",
        entityType: "tenant_setting",
        entityId: setting.id,
        payload: {
          countryCode: normalizedCountryCode,
          currency: value.currency
        }
      });

      return mapCountryProfileDto({
        tenantId: resolvedTenantId,
        countryCode: normalizedCountryCode,
        value,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      });
    });
  }

  listLocalizedContent(
    context: RequestContext,
    query: LocalizationContentQueryDto
  ): Promise<ListResponse<LocalizedContentDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const scope = await this.resolveScopeTx(tx, context, query);
      const settings = await tx.tenantSetting.findMany({
        where: {
          tenantId: scope.tenantId,
          key: {
            startsWith: localizedContentPrefix
          }
        },
        orderBy: { key: "asc" }
      });

      const items = settings
        .map((setting) => {
          const parsed = parseLocalizedContentKey(setting.key);
          if (!parsed) {
            return null;
          }
          if (query.targetType && parsed.targetType !== query.targetType) {
            return null;
          }
          if (query.targetId && parsed.targetId !== query.targetId) {
            return null;
          }
          return mapLocalizedContentDto({
            tenantId: scope.tenantId,
            targetType: parsed.targetType,
            targetId: parsed.targetId,
            value: parseLocalizedContentValue(setting.value),
            createdAt: setting.createdAt,
            updatedAt: setting.updatedAt
          });
        })
        .filter(Boolean) as LocalizedContentDto[];

      return {
        items,
        total: items.length
      };
    });
  }

  upsertLocalizedContent(
    context: RequestContext,
    dto: UpsertLocalizedContentDto
  ): Promise<LocalizedContentDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const value: LocalizedContentValue = {
        entries: Object.fromEntries(
          Object.entries(dto.entries).map(([locale, fields]) => [
            normalizeLocaleTag(locale) ?? locale,
            asStringRecord(fields)
          ])
        )
      };

      const setting = await tx.tenantSetting.upsert({
        where: {
          tenantId_key: {
            tenantId,
            key: buildLocalizedContentKey(dto.targetType, dto.targetId)
          }
        },
        update: {
          value: asInputJsonObject(value)
        },
        create: {
          tenantId,
          key: buildLocalizedContentKey(dto.targetType, dto.targetId),
          value: asInputJsonObject(value)
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "localization.content_upserted",
        entityType: "tenant_setting",
        entityId: setting.id,
        payload: {
          targetType: dto.targetType,
          targetId: dto.targetId
        }
      });

      return mapLocalizedContentDto({
        tenantId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        value,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      });
    });
  }

  listTemplates(
    context: RequestContext,
    query: LocalizationTemplateQueryDto
  ): Promise<ListResponse<LocalizedTemplateDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const scope = await this.resolveScopeTx(tx, context, query);
      const settings = await tx.tenantSetting.findMany({
        where: {
          tenantId: scope.tenantId,
          key: {
            startsWith: localizedTemplatePrefix
          }
        },
        orderBy: { key: "asc" }
      });

      const items = settings
        .map((setting) => {
          const parsed = parseLocalizedTemplateKey(setting.key);
          if (!parsed) {
            return null;
          }
          if (query.templateKey && parsed.templateKey !== query.templateKey) {
            return null;
          }
          if (query.channel !== undefined && parsed.channel !== query.channel) {
            return null;
          }
          return mapLocalizedTemplateDto({
            tenantId: scope.tenantId,
            templateKey: parsed.templateKey,
            value: parseLocalizedTemplateValue(setting.value, parsed.channel),
            createdAt: setting.createdAt,
            updatedAt: setting.updatedAt
          });
        })
        .filter(Boolean) as LocalizedTemplateDto[];

      return {
        items,
        total: items.length
      };
    });
  }

  upsertTemplate(
    context: RequestContext,
    dto: UpsertLocalizedTemplateDto
  ): Promise<LocalizedTemplateDto> {
    const tenantId = this.accessControl.resolveTenantId(context, dto.tenantId);

    return this.dbContext.withRequestContext(context, async (tx) => {
      const normalizedEntries = Object.fromEntries(
        Object.entries(dto.entries).map(([locale, entry]) => [
          normalizeLocaleTag(locale) ?? locale,
          asRecord(entry) ?? {}
        ])
      ) as LocalizedTemplateValue["entries"];

      const value: LocalizedTemplateValue = {
        channel: dto.channel ?? null,
        description: dto.description ?? null,
        variables: dto.variables?.length
          ? dedupeStrings(dto.variables)
          : collectTemplateVariables(normalizedEntries),
        entries: normalizedEntries
      };

      const setting = await tx.tenantSetting.upsert({
        where: {
          tenantId_key: {
            tenantId,
            key: buildLocalizedTemplateKey(dto.channel ?? null, dto.templateKey)
          }
        },
        update: {
          value: asInputJsonObject(value)
        },
        create: {
          tenantId,
          key: buildLocalizedTemplateKey(dto.channel ?? null, dto.templateKey),
          value: asInputJsonObject(value)
        }
      });

      await this.audit.recordTx(tx, {
        tenantId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "localization.template_upserted",
        entityType: "tenant_setting",
        entityId: setting.id,
        payload: {
          templateKey: dto.templateKey,
          channel: dto.channel ?? null
        }
      });

      return mapLocalizedTemplateDto({
        tenantId,
        templateKey: dto.templateKey,
        value,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt
      });
    });
  }

  resolveContext(
    context: RequestContext,
    query: LocalizationContextQueryDto
  ): Promise<LocalizationContextDto> {
    return this.dbContext.withRequestContext(context, async (tx) =>
      this.resolveContextTx(tx, context, query)
    );
  }

  exportLanguagePack(
    context: RequestContext,
    query: LocalizationScopedQueryDto
  ): Promise<LocalizationLanguagePackDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const scope = await this.resolveScopeTx(tx, context, query);
      const [tenantPreferences, storePreferences, countryProfiles, content, templates] =
        await Promise.all([
          tx.tenantSetting.findUnique({
            where: {
              tenantId_key: {
                tenantId: scope.tenantId,
                key: localizationPreferencesKey
              }
            }
          }),
          tx.storeSetting.findMany({
            where: {
              tenantId: scope.tenantId,
              key: localizationPreferencesKey
            },
            orderBy: { storeId: "asc" }
          }),
          tx.tenantSetting.findMany({
            where: {
              tenantId: scope.tenantId,
              key: {
                startsWith: countryProfilePrefix
              }
            },
            orderBy: { key: "asc" }
          }),
          tx.tenantSetting.findMany({
            where: {
              tenantId: scope.tenantId,
              key: {
                startsWith: localizedContentPrefix
              }
            },
            orderBy: { key: "asc" }
          }),
          tx.tenantSetting.findMany({
            where: {
              tenantId: scope.tenantId,
              key: {
                startsWith: localizedTemplatePrefix
              }
            },
            orderBy: { key: "asc" }
          })
        ]);

      return {
        tenantId: scope.tenantId,
        generatedAt: new Date().toISOString(),
        preferences: {
          tenant: tenantPreferences
            ? mapPreferencesDto({
                scope: "TENANT",
                tenantId: scope.tenantId,
                storeId: null,
                value: parseLocalizationPreferences(tenantPreferences.value),
                createdAt: tenantPreferences.createdAt,
                updatedAt: tenantPreferences.updatedAt
              })
            : null,
          stores: storePreferences.map((setting) =>
            mapPreferencesDto({
              scope: "STORE",
              tenantId: setting.tenantId,
              storeId: setting.storeId,
              value: parseLocalizationPreferences(setting.value),
              createdAt: setting.createdAt,
              updatedAt: setting.updatedAt
            })
          )
        },
        countryProfiles: countryProfiles
          .map((setting) => {
            const countryCode = parseCountryProfileKey(setting.key);
            return countryCode
              ? mapCountryProfileDto({
                  tenantId: scope.tenantId,
                  countryCode,
                  value: parseCountryProfile(setting.value, countryCode),
                  createdAt: setting.createdAt,
                  updatedAt: setting.updatedAt
                })
              : null;
          })
          .filter(Boolean) as CountryProfileDto[],
        content: content
          .map((setting) => {
            const parsed = parseLocalizedContentKey(setting.key);
            return parsed
              ? mapLocalizedContentDto({
                  tenantId: scope.tenantId,
                  targetType: parsed.targetType,
                  targetId: parsed.targetId,
                  value: parseLocalizedContentValue(setting.value),
                  createdAt: setting.createdAt,
                  updatedAt: setting.updatedAt
                })
              : null;
          })
          .filter(Boolean) as LocalizedContentDto[],
        templates: templates
          .map((setting) => {
            const parsed = parseLocalizedTemplateKey(setting.key);
            return parsed
              ? mapLocalizedTemplateDto({
                  tenantId: scope.tenantId,
                  templateKey: parsed.templateKey,
                  value: parseLocalizedTemplateValue(setting.value, parsed.channel),
                  createdAt: setting.createdAt,
                  updatedAt: setting.updatedAt
                })
              : null;
          })
          .filter(Boolean) as LocalizedTemplateDto[]
      };
    });
  }

  importLanguagePack(
    context: RequestContext,
    dto: ImportLocalizationLanguagePackDto
  ): Promise<LocalizationLanguagePackDto> {
    const resolvedTenantId = this.accessControl.resolveTenantId(
      context,
      dto.tenantId ?? dto.pack.tenantId ?? context.tenantId
    );
    if (dto.pack.tenantId && dto.pack.tenantId !== resolvedTenantId) {
      throw new BadRequestException("Language pack tenant mismatch.");
    }

    return this.dbContext.withRequestContext(context, async (tx) => {
      if (dto.pack.preferences.tenant) {
        await tx.tenantSetting.upsert({
          where: {
            tenantId_key: {
              tenantId: resolvedTenantId,
              key: localizationPreferencesKey
            }
          },
          update: {
            value: asInputJsonObject(this.buildPreferencesValue(dto.pack.preferences.tenant))
          },
          create: {
            tenantId: resolvedTenantId,
            key: localizationPreferencesKey,
            value: asInputJsonObject(this.buildPreferencesValue(dto.pack.preferences.tenant))
          }
        });
      }

      for (const storePreference of dto.pack.preferences.stores) {
        if (!storePreference.storeId) {
          continue;
        }
        this.accessControl.enforceStoreAccess(context, storePreference.storeId);
        await tx.storeSetting.upsert({
          where: {
            storeId_key: {
              storeId: storePreference.storeId,
              key: localizationPreferencesKey
            }
          },
          update: {
            value: asInputJsonObject(this.buildPreferencesValue(storePreference))
          },
          create: {
            tenantId: resolvedTenantId,
            storeId: storePreference.storeId,
            key: localizationPreferencesKey,
            value: asInputJsonObject(this.buildPreferencesValue(storePreference))
          }
        });
      }

      for (const countryProfile of dto.pack.countryProfiles) {
        await tx.tenantSetting.upsert({
          where: {
            tenantId_key: {
              tenantId: resolvedTenantId,
              key: buildCountryProfileKey(countryProfile.countryCode)
            }
          },
          update: {
            value: asInputJsonObject({
              defaultLocale: countryProfile.defaultLocale,
              supportedLocales: countryProfile.supportedLocales,
              currency: countryProfile.currency,
              tax: countryProfile.tax,
              complianceFlags: countryProfile.complianceFlags,
              metadata: countryProfile.metadata
            })
          },
          create: {
            tenantId: resolvedTenantId,
            key: buildCountryProfileKey(countryProfile.countryCode),
            value: asInputJsonObject({
              defaultLocale: countryProfile.defaultLocale,
              supportedLocales: countryProfile.supportedLocales,
              currency: countryProfile.currency,
              tax: countryProfile.tax,
              complianceFlags: countryProfile.complianceFlags,
              metadata: countryProfile.metadata
            })
          }
        });
      }

      for (const content of dto.pack.content) {
        await tx.tenantSetting.upsert({
          where: {
            tenantId_key: {
              tenantId: resolvedTenantId,
              key: buildLocalizedContentKey(content.targetType, content.targetId)
            }
          },
          update: {
            value: asInputJsonObject({
              entries: content.entries
            })
          },
          create: {
            tenantId: resolvedTenantId,
            key: buildLocalizedContentKey(content.targetType, content.targetId),
            value: asInputJsonObject({
              entries: content.entries
            })
          }
        });
      }

      for (const template of dto.pack.templates) {
        await tx.tenantSetting.upsert({
          where: {
            tenantId_key: {
              tenantId: resolvedTenantId,
              key: buildLocalizedTemplateKey(template.channel, template.templateKey)
            }
          },
          update: {
            value: asInputJsonObject({
              channel: template.channel,
              description: template.description,
              variables: template.variables,
              entries: template.entries
            })
          },
          create: {
            tenantId: resolvedTenantId,
            key: buildLocalizedTemplateKey(template.channel, template.templateKey),
            value: asInputJsonObject({
              channel: template.channel,
              description: template.description,
              variables: template.variables,
              entries: template.entries
            })
          }
        });
      }

      await this.audit.recordTx(tx, {
        tenantId: resolvedTenantId,
        actorType: this.resolveActorType(context),
        actorId: this.resolveActorId(context),
        action: "localization.language_pack_imported",
        entityType: "localization_language_pack",
        entityId: resolvedTenantId,
        payload: {
          countryProfiles: dto.pack.countryProfiles.length,
          contentItems: dto.pack.content.length,
          templates: dto.pack.templates.length
        }
      });

      return {
        tenantId: resolvedTenantId,
        generatedAt: new Date().toISOString(),
        preferences: dto.pack.preferences,
        countryProfiles: dto.pack.countryProfiles,
        content: dto.pack.content,
        templates: dto.pack.templates
      };
    });
  }

  renderTemplate(
    context: RequestContext,
    dto: RenderLocalizedTemplateDto
  ): Promise<RenderLocalizedTemplateResponse> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const localization = await this.resolveContextTx(tx, context, dto);
      const templateKeys = dedupeStrings([
        buildLocalizedTemplateKey(dto.channel ?? null, dto.templateKey),
        buildLocalizedTemplateKey(null, dto.templateKey)
      ]);
      const settings = await tx.tenantSetting.findMany({
        where: {
          tenantId: localization.tenantId,
          key: {
            in: templateKeys
          }
        }
      });

      const preferredSetting =
        settings.find((setting) => parseLocalizedTemplateKey(setting.key)?.channel === (dto.channel ?? null)) ??
        settings.find((setting) => parseLocalizedTemplateKey(setting.key)?.channel === null);
      if (!preferredSetting) {
        throw new BadRequestException("Localized template was not found.");
      }

      const parsed = parseLocalizedTemplateKey(preferredSetting.key);
      if (!parsed) {
        throw new BadRequestException("Localized template key is invalid.");
      }

      const template = parseLocalizedTemplateValue(preferredSetting.value, parsed.channel);
      const resolvedTemplateEntry = resolveLocalizedEntry(template.entries, localization.localeChain);
      if (!resolvedTemplateEntry) {
        throw new BadRequestException("Localized template has no entries.");
      }

      return {
        tenantId: localization.tenantId,
        storeId: localization.storeId,
        templateKey: parsed.templateKey,
        channel: template.channel,
        locale: resolvedTemplateEntry.locale,
        fallbackLocale: localization.fallbackLocale,
        rendered: {
          subject: interpolateTemplate(resolvedTemplateEntry.value.subject, dto.variables ?? {}),
          title: interpolateTemplate(resolvedTemplateEntry.value.title, dto.variables ?? {}),
          body: interpolateTemplate(resolvedTemplateEntry.value.body, dto.variables ?? {}),
          sms: interpolateTemplate(resolvedTemplateEntry.value.sms, dto.variables ?? {}),
          pushTitle: interpolateTemplate(
            resolvedTemplateEntry.value.pushTitle,
            dto.variables ?? {}
          ),
          pushBody: interpolateTemplate(
            resolvedTemplateEntry.value.pushBody,
            dto.variables ?? {}
          )
        }
      };
    });
  }

  async resolveContextTx(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    input: ResolveLocalizationInput
  ): Promise<ResolvedLocalizationContextInternal> {
    const scope = await this.resolveScopeTx(tx, context, {
      tenantId: input.tenantId,
      storeId: input.storeId ?? undefined
    });

    const [tenantSetting, storeSetting] = await Promise.all([
      tx.tenantSetting.findUnique({
        where: {
          tenantId_key: {
            tenantId: scope.tenantId,
            key: localizationPreferencesKey
          }
        }
      }),
      scope.storeId
        ? tx.storeSetting.findUnique({
            where: {
              storeId_key: {
                storeId: scope.storeId,
                key: localizationPreferencesKey
              }
            }
          })
        : Promise.resolve(null)
    ]);

    const tenantPreferences = parseLocalizationPreferences(tenantSetting?.value);
    const storePreferences = parseLocalizationPreferences(storeSetting?.value, {
      defaultLocale: tenantPreferences.defaultLocale,
      fallbackLocale: tenantPreferences.fallbackLocale,
      countryCode: tenantPreferences.countryCode,
      currency: tenantPreferences.currency,
      timezone: scope.store?.timezone ?? tenantPreferences.timezone
    });

    const countryCode =
      normalizeCountryCode(input.countryCode) ??
      storePreferences.countryCode ??
      tenantPreferences.countryCode ??
      null;

    const countryProfile = countryCode
      ? await tx.tenantSetting.findUnique({
          where: {
            tenantId_key: {
              tenantId: scope.tenantId,
              key: buildCountryProfileKey(countryCode)
            }
          }
        })
      : null;
    const parsedCountryProfile = countryCode
      ? parseCountryProfile(countryProfile?.value, countryCode)
      : null;

    const localeCandidates: Array<[string | null, string]> = [
      [normalizeLocaleTag(input.locale), "query.locale"],
      [normalizeLocaleTag(input.customerLocale), "query.customerLocale"],
      [
        input.channel ? normalizeLocaleTag(storePreferences.channelLocales[input.channel]) : null,
        "store.preferences.channelLocale"
      ],
      [storePreferences.defaultLocale, "store.preferences.defaultLocale"],
      [
        input.channel ? normalizeLocaleTag(tenantPreferences.channelLocales[input.channel]) : null,
        "tenant.preferences.channelLocale"
      ],
      [tenantPreferences.defaultLocale, "tenant.preferences.defaultLocale"],
      [parsedCountryProfile?.defaultLocale ?? null, "countryProfile.defaultLocale"],
      [storePreferences.fallbackLocale, "store.preferences.fallbackLocale"],
      [tenantPreferences.fallbackLocale, "tenant.preferences.fallbackLocale"],
      ["en-US", "platform.defaultLocale"]
    ];

    const supportedLocales = normalizeSupportedLocales(
      [
        ...storePreferences.supportedLocales,
        ...tenantPreferences.supportedLocales,
        ...(parsedCountryProfile?.supportedLocales ?? [])
      ],
      parsedCountryProfile?.defaultLocale ?? storePreferences.defaultLocale,
      storePreferences.fallbackLocale
    );

    let resolvedLocale =
      localeCandidates.find((entry) => entry[0] !== null)?.[0] ?? tenantPreferences.defaultLocale;

    if (supportedLocales.length && !supportedLocales.includes(resolvedLocale)) {
      const supportedMatch = localeCandidates
        .map(([locale]) => locale)
        .find((locale): locale is string => !!locale && supportedLocales.includes(locale));
      resolvedLocale = supportedMatch ?? supportedLocales[0];
    }

    const resolvedBy: string[] = [];
    for (const [candidate, source] of localeCandidates) {
      if (!candidate) {
        continue;
      }
      resolvedBy.push(source);
      if (candidate === resolvedLocale) {
        break;
      }
    }

    const fallbackLocale =
      storePreferences.fallbackLocale ??
      tenantPreferences.fallbackLocale ??
      parsedCountryProfile?.defaultLocale ??
      "en-US";
    const currency =
      (input.currency?.trim().toUpperCase() || null) ??
      storePreferences.currency ??
      tenantPreferences.currency ??
      parsedCountryProfile?.currency ??
      "USD";

    return {
      tenantId: scope.tenantId,
      storeId: scope.storeId,
      locale: resolvedLocale,
      fallbackLocale,
      resolvedBy,
      countryCode,
      supportedLocales,
      currency,
      tax: parsedCountryProfile?.tax ?? {
        mode: "NONE",
        ratePercent: null,
        label: null
      },
      complianceFlags: parsedCountryProfile?.complianceFlags ?? [],
      formatting: buildFormattingPreview(resolvedLocale, currency, countryCode),
      localeChain: dedupeStrings([
        resolvedLocale,
        fallbackLocale,
        parsedCountryProfile?.defaultLocale ?? null,
        "en-US"
      ])
    };
  }

  async resolveLocalizedContentForTargetsTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    targets: Array<{ targetType: LocalizedContentTargetType; targetId: string }>,
    localeChain: string[]
  ): Promise<Map<string, { locale: string | null; fields: Record<string, string> }>> {
    const keys = dedupeStrings(
      targets.map((target) => buildLocalizedContentKey(target.targetType, target.targetId))
    );
    if (!keys.length) {
      return new Map();
    }

    const settings = await tx.tenantSetting.findMany({
      where: {
        tenantId,
        key: {
          in: keys
        }
      }
    });

    const resolved = new Map<string, { locale: string | null; fields: Record<string, string> }>();
    for (const setting of settings) {
      const parsed = parseLocalizedContentKey(setting.key);
      if (!parsed) {
        continue;
      }

      const content = parseLocalizedContentValue(setting.value);
      const localizedEntry = resolveLocalizedEntry(content.entries, localeChain);
      resolved.set(`${parsed.targetType}:${parsed.targetId}`, {
        locale: localizedEntry?.locale ?? null,
        fields: localizedEntry?.value ?? {}
      });
    }

    return resolved;
  }

  private async resolveScopeTx(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    query: { tenantId?: string; storeId?: string }
  ): Promise<{
    tenantId: string;
    storeId: string | null;
    store: { id: string; timezone: string } | null;
  }> {
    const store = query.storeId
      ? await tx.store.findUniqueOrThrow({
          where: { id: query.storeId }
        })
      : null;

    if (store) {
      this.accessControl.enforceStoreAccess(context, store.id);
    }

    return {
      tenantId: this.accessControl.resolveTenantId(
        context,
        query.tenantId ?? store?.tenantId ?? context.tenantId
      ),
      storeId: store?.id ?? null,
      store: store
        ? {
            id: store.id,
            timezone: store.timezone
          }
        : null
    };
  }

  private buildPreferencesValue(
    dto: UpsertLocalizationPreferencesRequest | LocalizationPreferencesDto
  ): LocalizationPreferencesValue {
    const defaultLocale = normalizeLocaleTag(dto.defaultLocale) ?? "en-US";
    const fallbackLocale = normalizeLocaleTag(dto.fallbackLocale) ?? defaultLocale;

    return {
      defaultLocale,
      fallbackLocale,
      supportedLocales: normalizeSupportedLocales(
        dto.supportedLocales ?? [],
        defaultLocale,
        fallbackLocale
      ),
      countryCode: normalizeCountryCode(dto.countryCode),
      currency: dto.currency?.trim().toUpperCase() ?? null,
      timezone: dto.timezone ?? null,
      channelLocales: buildChannelLocales(dto.channelLocales)
    };
  }

  private resolveActorType(context: RequestContext): "USER" | "DEVICE" {
    return context.scope === "device" ? "DEVICE" : "USER";
  }

  private resolveActorId(context: RequestContext): string {
    return context.scope === "device" && context.deviceId ? context.deviceId : context.userId;
  }
}

@ApiTags("localization")
@Controller("localization")
class LocalizationController {
  constructor(private readonly localizationService: LocalizationService) {}

  @Get("preferences")
  @Permissions("settings.read")
  listPreferences(
    @CurrentContext() context: RequestContext,
    @Query() query: LocalizationScopedQueryDto
  ): Promise<LocalizationPreferencesStateDto> {
    return this.localizationService.listPreferences(context, query);
  }

  @Put("preferences/tenant")
  @Permissions("settings.write")
  upsertTenantPreferences(
    @CurrentContext() context: RequestContext,
    @Body() dto: UpsertLocalizationPreferencesDto,
    @Query() query: LocalizationScopedQueryDto
  ): Promise<LocalizationPreferencesDto> {
    return this.localizationService.upsertTenantPreferences(context, dto, query.tenantId);
  }

  @Put("preferences/store")
  @Permissions("settings.write")
  upsertStorePreferences(
    @CurrentContext() context: RequestContext,
    @Body() dto: UpsertStoreLocalizationPreferencesDto
  ): Promise<LocalizationPreferencesDto> {
    return this.localizationService.upsertStorePreferences(context, dto);
  }

  @Get("country-profiles")
  @Permissions("settings.read")
  listCountryProfiles(
    @CurrentContext() context: RequestContext,
    @Query() query: LocalizationScopedQueryDto
  ): Promise<ListResponse<CountryProfileDto>> {
    return this.localizationService.listCountryProfiles(context, query);
  }

  @Put("country-profiles/:countryCode")
  @Permissions("settings.write")
  upsertCountryProfile(
    @CurrentContext() context: RequestContext,
    @Param() params: CountryProfileParamDto,
    @Body() dto: UpsertCountryProfileDto,
    @Query() query: LocalizationScopedQueryDto
  ): Promise<CountryProfileDto> {
    return this.localizationService.upsertCountryProfile(
      context,
      params.countryCode,
      dto,
      query.tenantId
    );
  }

  @Get("content")
  @Permissions("settings.read")
  listLocalizedContent(
    @CurrentContext() context: RequestContext,
    @Query() query: LocalizationContentQueryDto
  ): Promise<ListResponse<LocalizedContentDto>> {
    return this.localizationService.listLocalizedContent(context, query);
  }

  @Put("content")
  @Permissions("settings.write")
  upsertLocalizedContent(
    @CurrentContext() context: RequestContext,
    @Body() dto: UpsertLocalizedContentDto
  ): Promise<LocalizedContentDto> {
    return this.localizationService.upsertLocalizedContent(context, dto);
  }

  @Get("templates")
  @Permissions("settings.read")
  listTemplates(
    @CurrentContext() context: RequestContext,
    @Query() query: LocalizationTemplateQueryDto
  ): Promise<ListResponse<LocalizedTemplateDto>> {
    return this.localizationService.listTemplates(context, query);
  }

  @Put("templates")
  @Permissions("settings.write")
  upsertTemplate(
    @CurrentContext() context: RequestContext,
    @Body() dto: UpsertLocalizedTemplateDto
  ): Promise<LocalizedTemplateDto> {
    return this.localizationService.upsertTemplate(context, dto);
  }

  @Get("context")
  @Permissions("settings.read")
  resolveContext(
    @CurrentContext() context: RequestContext,
    @Query() query: LocalizationContextQueryDto
  ): Promise<LocalizationContextDto> {
    return this.localizationService.resolveContext(context, query);
  }

  @Get("language-pack")
  @Permissions("settings.read")
  exportLanguagePack(
    @CurrentContext() context: RequestContext,
    @Query() query: LocalizationScopedQueryDto
  ): Promise<LocalizationLanguagePackDto> {
    return this.localizationService.exportLanguagePack(context, query);
  }

  @Post("language-pack/import")
  @Permissions("settings.write")
  importLanguagePack(
    @CurrentContext() context: RequestContext,
    @Body() dto: ImportLocalizationLanguagePackDto
  ): Promise<LocalizationLanguagePackDto> {
    return this.localizationService.importLanguagePack(context, dto);
  }

  @Post("templates/render")
  @Permissions("settings.read")
  renderTemplate(
    @CurrentContext() context: RequestContext,
    @Body() dto: RenderLocalizedTemplateDto
  ): Promise<RenderLocalizedTemplateResponse> {
    return this.localizationService.renderTemplate(context, dto);
  }
}

@Module({
  imports: [AuditModule],
  controllers: [LocalizationController],
  providers: [LocalizationService],
  exports: [LocalizationService]
})
export class LocalizationModule {}
