import { ApiPropertyOptional } from "@nestjs/swagger";
import type { RequestContext } from "@exetron/types";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { OperatorListQueryDto } from "../common/dto/operator-list-query.dto";

export type JsonRecord = Record<string, unknown>;

export interface ResolveContextRequest {
  user?: Partial<RequestContext> & { sub?: string; userId?: string };
}

export class OrganizationListQueryDto extends OperatorListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  linkedTenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  memberUserId?: string;
}
