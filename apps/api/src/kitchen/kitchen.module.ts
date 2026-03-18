import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  Module,
  Param,
  Post,
  Query
} from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import type { ApiEnv } from "@exetron/config";
import type {
  KitchenBoardEntryDto,
  KitchenTicketDto,
  ListResponse,
  RealtimeEventEnvelope,
  TransitionKitchenTicketRequest
} from "@exetron/contracts";
import type { JwtClaims, KitchenBoardStatus, KitchenTicketStatus, RequestContext } from "@exetron/types";
import type {
  KitchenTicketItem as KitchenTicketItemModel,
  Prisma
} from "@exetron/database";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID
} from "class-validator";
import type { Server, Socket } from "socket.io";
import { APP_ENV } from "../common/app-env.provider";
import { AccessControlService } from "../common/access-control.service";
import { CurrentContext } from "../common/decorators/current-context.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import { IdParamDto } from "../common/dto/id-param.dto";
import { decimalToString } from "../common/catalog-helpers";
import { AuditModule, AuditService } from "../audit/audit.module";
import { DatabaseContextService } from "../database/database-context.service";
import { PrismaService } from "../database/prisma.service";
import { DomainEventsModule } from "../domain-events/domain-events.module";
import { DomainEventsService } from "../domain-events/domain-events.service";
import {
  canTransitionKitchenTicket,
  deriveBoardStatus
} from "./kitchen-runtime.util";

class KitchenTicketsQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ enum: ["NEW", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"] })
  @IsOptional()
  @IsIn(["NEW", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"])
  status?: KitchenTicketStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stationKey?: string;
}

class BoardOrdersQueryDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ enum: ["NEW", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"] })
  @IsOptional()
  @IsIn(["NEW", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"])
  boardStatus?: KitchenBoardStatus;
}

class TransitionKitchenTicketDto implements TransitionKitchenTicketRequest {
  @ApiProperty({ enum: ["NEW", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"] })
  @IsIn(["NEW", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED"])
  toStatus!: KitchenTicketStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  reason?: string | null;
}

type LoadedKitchenTicket = Prisma.KitchenTicketGetPayload<{
  include: { items: true };
}>;

type BoardOrderRecord = Prisma.OrderGetPayload<{
  include: { kitchenTickets: true };
}>;

function mapKitchenTicketItem(item: KitchenTicketItemModel) {
  return {
    id: item.id,
    ticketId: item.ticketId,
    orderItemId: item.orderItemId,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    lineTotal: decimalToString(item.lineTotal) ?? "0.00",
    snapshot: item.snapshot as Record<string, unknown>,
    createdAt: item.createdAt.toISOString()
  };
}

function mapKitchenTicket(ticket: LoadedKitchenTicket): KitchenTicketDto {
  return {
    id: ticket.id,
    orderId: ticket.orderId,
    tenantId: ticket.tenantId,
    storeId: ticket.storeId,
    stationKey: ticket.stationKey,
    status: ticket.status,
    sourceChannel: ticket.sourceChannel,
    displayNumber: ticket.displayNumber,
    note: ticket.note,
    itemCount: ticket.itemCount,
    startedAt: ticket.startedAt?.toISOString() ?? null,
    readyAt: ticket.readyAt?.toISOString() ?? null,
    completedAt: ticket.completedAt?.toISOString() ?? null,
    cancelledAt: ticket.cancelledAt?.toISOString() ?? null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    items: ticket.items.map(mapKitchenTicketItem)
  };
}

function mapBoardEntry(order: BoardOrderRecord): KitchenBoardEntryDto {
  return {
    orderId: order.id,
    tenantId: order.tenantId,
    storeId: order.storeId,
    number: order.number,
    channel: order.channel,
    orderStatus: order.status,
    boardStatus: deriveBoardStatus({
      orderStatus: order.status,
      ticketStatuses: order.kitchenTickets.map((ticket) => ticket.status)
    }),
    customerName: order.customerName,
    note: order.note,
    placedAt: order.placedAt.toISOString(),
    readyAt: order.readyAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    ticketStatuses: order.kitchenTickets.map((ticket) => ({
      ticketId: ticket.id,
      stationKey: ticket.stationKey,
      status: ticket.status
    }))
  };
}

function roomForStore(tenantId: string, storeId: string): string {
  return `tenant:${tenantId}:store:${storeId}`;
}

@Injectable()
export class OperationsRealtimeService {
  private server: Server | null = null;

  attachServer(server: Server): void {
    this.server = server;
  }

  emitToStore<TPayload extends Record<string, unknown>>(
    tenantId: string,
    storeId: string,
    type: string,
    payload: TPayload
  ): void {
    if (!this.server) {
      return;
    }

    const envelope: RealtimeEventEnvelope<TPayload> = {
      type,
      tenantId,
      storeId,
      payload,
      emittedAt: new Date().toISOString()
    };

    this.server.to(roomForStore(tenantId, storeId)).emit("operations.event", envelope);
    this.server.to(roomForStore(tenantId, storeId)).emit(type, envelope);
  }
}

@Injectable()
class OperationsRealtimeAuthService {
  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService
  ) {}

  async authenticate(client: Socket): Promise<{
    context: RequestContext;
    tenantId: string;
    storeId: string;
  }> {
    const accessToken =
      this.extractString(client.handshake.auth?.accessToken) ??
      this.extractString(client.handshake.query.accessToken);
    const tenantIdHint =
      this.extractString(client.handshake.auth?.tenantId) ??
      this.extractString(client.handshake.query.tenantId);
    const storeId =
      this.extractString(client.handshake.auth?.storeId) ??
      this.extractString(client.handshake.query.storeId);

    if (!accessToken || !storeId) {
      throw new ForbiddenException("Realtime access token and store id are required.");
    }

    const claims = await this.jwtService.verifyAsync<JwtClaims>(accessToken, {
      secret: this.env.JWT_ACCESS_SECRET
    });

    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        storeAccess: true
      }
    });

    if (!user || user.status !== "ACTIVE") {
      throw new ForbiddenException("Realtime user is not active.");
    }

    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((link) =>
          link.role.permissions.map((permissionLink) => permissionLink.permission.key)
        )
      )
    );

    const context: RequestContext = {
      userId: user.id,
      tenantId: user.tenantId,
      scope: user.isPlatformAdmin ? "platform_admin" : "tenant_member",
      roleIds: user.userRoles.map((link) => link.roleId),
      permissions,
      storeIds: user.storeAccess.map((link) => link.storeId)
    };

    const tenantId = this.accessControl.resolveTenantId(context, tenantIdHint ?? user.tenantId);
    this.accessControl.enforceStoreAccess(context, storeId);

    return {
      context,
      tenantId,
      storeId
    };
  }

  private extractString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true
  }
})
class OperationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly realtime: OperationsRealtimeService,
    private readonly auth: OperationsRealtimeAuthService
  ) {}

  afterInit(): void {
    this.realtime.attachServer(this.server);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const authResult = await this.auth.authenticate(client);
      await client.join(roomForStore(authResult.tenantId, authResult.storeId));
      client.emit("connection.ready", {
        tenantId: authResult.tenantId,
        storeId: authResult.storeId
      });
    } catch (error) {
      client.emit("connection.error", {
        message: error instanceof Error ? error.message : "Realtime authentication failed."
      });
      client.disconnect(true);
    }
  }
}

@Injectable()
class KitchenService {
  constructor(
    private readonly dbContext: DatabaseContextService,
    private readonly accessControl: AccessControlService,
    private readonly audit: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly realtime: OperationsRealtimeService
  ) {}

  listTickets(
    context: RequestContext,
    query: KitchenTicketsQueryDto
  ): Promise<ListResponse<KitchenTicketDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const tickets = await tx.kitchenTicket.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(query.storeId ? { storeId: query.storeId } : {}),
          ...(query.status ? { status: query.status } : {}),
          ...(query.stationKey ? { stationKey: query.stationKey } : {}),
          ...(this.accessControl.storeFilter(context) && !query.storeId
            ? { storeId: this.accessControl.storeFilter(context) }
            : {})
        },
        include: {
          items: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      return {
        items: tickets.map(mapKitchenTicket),
        total: tickets.length
      };
    });
  }

  getTicket(context: RequestContext, ticketId: string): Promise<KitchenTicketDto> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      const ticket = await this.loadTicket(tx, ticketId);
      this.accessControl.resolveTenantId(context, ticket.tenantId);
      this.accessControl.enforceStoreAccess(context, ticket.storeId);
      return mapKitchenTicket(ticket);
    });
  }

  async transitionTicket(
    context: RequestContext,
    ticketId: string,
    dto: TransitionKitchenTicketDto
  ): Promise<KitchenTicketDto> {
    const result = await this.dbContext.withRequestContext(context, async (tx) => {
      const current = await this.loadTicket(tx, ticketId);
      this.accessControl.resolveTenantId(context, current.tenantId);
      this.accessControl.enforceStoreAccess(context, current.storeId);

      if (!canTransitionKitchenTicket(current.status, dto.toStatus)) {
        throw new BadRequestException(
          `Kitchen ticket transition ${current.status} -> ${dto.toStatus} is not allowed.`
        );
      }

      const now = new Date();
      const ticket = await tx.kitchenTicket.update({
        where: { id: current.id },
        data: {
          status: dto.toStatus,
          ...(dto.toStatus === "IN_PROGRESS" ? { startedAt: now } : {}),
          ...(dto.toStatus === "READY" ? { readyAt: now } : {}),
          ...(dto.toStatus === "COMPLETED" ? { completedAt: now } : {}),
          ...(dto.toStatus === "CANCELLED" ? { cancelledAt: now } : {})
        },
        include: {
          items: {
            orderBy: { createdAt: "asc" }
          }
        }
      });

      const eventPayload = {
        ticketId: ticket.id,
        orderId: ticket.orderId,
        stationKey: ticket.stationKey,
        fromStatus: current.status,
        toStatus: ticket.status,
        reason: dto.reason ?? null
      };

      await this.audit.recordTx(tx, {
        tenantId: ticket.tenantId,
        storeId: ticket.storeId,
        actorType: "USER",
        actorId: context.userId,
        action: "kitchen.ticket_status_changed",
        entityType: "kitchen_ticket",
        entityId: ticket.id,
        payload: eventPayload
      });

      await this.domainEvents.record(tx, {
        tenantId: ticket.tenantId,
        eventName: "kitchen.ticket_status_changed",
        aggregate: "kitchen_ticket",
        aggregateId: ticket.id,
        payload: eventPayload
      });

      const boardEntry = await this.syncOrderStatusFromTickets(tx, context, ticket.orderId);
      return {
        ticket: mapKitchenTicket(ticket),
        boardEntry
      };
    });

    this.realtime.emitToStore(result.ticket.tenantId, result.ticket.storeId, "kitchen.ticket.updated", {
      ticket: result.ticket
    });
    this.realtime.emitToStore(result.ticket.tenantId, result.ticket.storeId, "board.order.updated", {
      entry: result.boardEntry
    });

    return result.ticket;
  }

  listBoardEntries(
    context: RequestContext,
    query: BoardOrdersQueryDto
  ): Promise<ListResponse<KitchenBoardEntryDto>> {
    return this.dbContext.withRequestContext(context, async (tx) => {
      if (query.storeId) {
        this.accessControl.enforceStoreAccess(context, query.storeId);
      }

      const orders = await tx.order.findMany({
        where: {
          ...this.accessControl.tenantWhere(context, query.tenantId),
          ...(query.storeId ? { storeId: query.storeId } : {}),
          kitchenTickets: {
            some: {}
          },
          ...(this.accessControl.storeFilter(context) && !query.storeId
            ? { storeId: this.accessControl.storeFilter(context) }
            : {})
        },
        include: {
          kitchenTickets: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { placedAt: "desc" }
      });

      const items = orders
        .map(mapBoardEntry)
        .filter((entry) => (query.boardStatus ? entry.boardStatus === query.boardStatus : true));

      return {
        items,
        total: items.length
      };
    });
  }

  private async loadTicket(
    tx: Prisma.TransactionClient,
    ticketId: string
  ): Promise<LoadedKitchenTicket> {
    return tx.kitchenTicket.findUniqueOrThrow({
      where: { id: ticketId },
      include: {
        items: {
          orderBy: { createdAt: "asc" }
        }
      }
    });
  }

  private async syncOrderStatusFromTickets(
    tx: Prisma.TransactionClient,
    context: RequestContext,
    orderId: string
  ): Promise<KitchenBoardEntryDto> {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        kitchenTickets: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    const ticketStatuses = order.kitchenTickets.map((ticket) => ticket.status);
    let nextStatus = order.status;
    const now = new Date();
    const updateData: Prisma.OrderUpdateInput = {};

    if (
      ticketStatuses.some((status) => status === "IN_PROGRESS") &&
      order.status === "CONFIRMED"
    ) {
      nextStatus = "IN_PREPARATION";
      updateData.status = "IN_PREPARATION";
    } else if (
      ticketStatuses.length > 0 &&
      ticketStatuses.every((status) => status === "READY" || status === "COMPLETED") &&
      !["READY", "COMPLETED", "CANCELLED"].includes(order.status)
    ) {
      nextStatus = "READY";
      updateData.status = "READY";
      updateData.readyAt = order.readyAt ?? now;
    } else if (
      ticketStatuses.length > 0 &&
      ticketStatuses.every((status) => status === "COMPLETED" || status === "CANCELLED") &&
      !["COMPLETED", "CANCELLED"].includes(order.status)
    ) {
      nextStatus = "COMPLETED";
      updateData.status = "COMPLETED";
      updateData.completedAt = order.completedAt ?? now;
    }

    let syncedOrder = order;

    if (Object.keys(updateData).length) {
      syncedOrder = await tx.order.update({
        where: { id: order.id },
        data: updateData,
        include: {
          kitchenTickets: {
            orderBy: { createdAt: "asc" }
          }
        }
      });

      const eventPayload = {
        orderId: syncedOrder.id,
        fromStatus: order.status,
        toStatus: nextStatus,
        reason: "kitchen_runtime"
      };

      await tx.orderEvent.create({
        data: {
          orderId: syncedOrder.id,
          tenantId: syncedOrder.tenantId,
          storeId: syncedOrder.storeId,
          type: "order.status_changed",
          payload: eventPayload as Prisma.InputJsonObject
        }
      });

      await this.audit.recordTx(tx, {
        tenantId: syncedOrder.tenantId,
        storeId: syncedOrder.storeId,
        actorType: "USER",
        actorId: context.userId,
        action: "order.status_changed",
        entityType: "order",
        entityId: syncedOrder.id,
        payload: eventPayload
      });

      await this.domainEvents.record(tx, {
        tenantId: syncedOrder.tenantId,
        eventName: "order.status_changed",
        aggregate: "order",
        aggregateId: syncedOrder.id,
        payload: eventPayload
      });
    }

    return mapBoardEntry(syncedOrder);
  }
}

@ApiTags("kitchen")
@Controller("kitchen")
class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get("tickets")
  @Permissions("kitchen.read")
  listTickets(
    @CurrentContext() context: RequestContext,
    @Query() query: KitchenTicketsQueryDto
  ): Promise<ListResponse<KitchenTicketDto>> {
    return this.kitchenService.listTickets(context, query);
  }

  @Get("tickets/:id")
  @Permissions("kitchen.read")
  getTicket(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto
  ): Promise<KitchenTicketDto> {
    return this.kitchenService.getTicket(context, params.id);
  }

  @Post("tickets/:id/transition")
  @Permissions("kitchen.write")
  transitionTicket(
    @CurrentContext() context: RequestContext,
    @Param() params: IdParamDto,
    @Body() dto: TransitionKitchenTicketDto
  ): Promise<KitchenTicketDto> {
    return this.kitchenService.transitionTicket(context, params.id, dto);
  }
}

@ApiTags("board")
@Controller("board")
class BoardController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get("orders")
  @Permissions("board.read")
  listBoardEntries(
    @CurrentContext() context: RequestContext,
    @Query() query: BoardOrdersQueryDto
  ): Promise<ListResponse<KitchenBoardEntryDto>> {
    return this.kitchenService.listBoardEntries(context, query);
  }
}

@Module({
  imports: [AuditModule, DomainEventsModule, JwtModule.register({})],
  controllers: [KitchenController, BoardController],
  providers: [
    KitchenService,
    OperationsRealtimeService,
    OperationsRealtimeAuthService,
    OperationsGateway
  ],
  exports: [OperationsRealtimeService]
})
export class KitchenModule {}
