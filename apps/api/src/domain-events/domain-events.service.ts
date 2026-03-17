import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Prisma } from "@exetron/database";

interface DomainEventInput {
  tenantId?: string | null;
  eventName: string;
  aggregate: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class DomainEventsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async record(tx: Prisma.TransactionClient, input: DomainEventInput): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        tenantId: input.tenantId ?? null,
        eventName: input.eventName,
        aggregate: input.aggregate,
        aggregateId: input.aggregateId,
        payload: input.payload as Prisma.InputJsonObject
      }
    });

    this.eventEmitter.emit(input.eventName, input.payload);
  }
}
