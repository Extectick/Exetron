import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export const DEFAULT_OPERATOR_LIST_PAGE = 1;
export const DEFAULT_OPERATOR_LIST_PAGE_SIZE = 25;
export const MAX_OPERATOR_LIST_PAGE_SIZE = 100;

export class OperatorListQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional()
  @IsIn(["asc", "desc"])
  direction?: "asc" | "desc";

  @ApiPropertyOptional({ minimum: 1, default: DEFAULT_OPERATOR_LIST_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_OPERATOR_LIST_PAGE_SIZE,
    default: DEFAULT_OPERATOR_LIST_PAGE_SIZE
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_OPERATOR_LIST_PAGE_SIZE)
  pageSize?: number;
}

export function resolveOperatorListQuery(input?: Partial<OperatorListQueryDto>) {
  return {
    tenantId: input?.tenantId,
    organizationId: input?.organizationId,
    status: input?.status?.trim() || undefined,
    search: input?.search?.trim() || undefined,
    sort: input?.sort?.trim() || null,
    direction: input?.direction ?? null,
    page: input?.page ?? DEFAULT_OPERATOR_LIST_PAGE,
    pageSize: input?.pageSize ?? DEFAULT_OPERATOR_LIST_PAGE_SIZE
  };
}

export function buildOperatorListMeta(
  input?: Partial<OperatorListQueryDto>,
  filter?: Record<string, unknown> | null
) {
  const resolved = resolveOperatorListQuery(input);

  return {
    page: resolved.page,
    pageSize: resolved.pageSize,
    sort: resolved.sort,
    direction: resolved.direction,
    filter: filter ?? null
  };
}
