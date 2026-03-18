import {
  Controller,
  Get,
  Header,
  ServiceUnavailableException
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "./common/decorators/public.decorator";
import { PrismaService } from "./database/prisma.service";
import { ObservabilityService } from "./observability/observability.service";

@ApiTags("system")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService
  ) {}

  @Public()
  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "exetron-api",
      uptimeSeconds: this.observability.getUptimeSeconds(),
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get("live")
  getLiveness() {
    return {
      status: "ok",
      service: "exetron-api",
      check: "liveness",
      uptimeSeconds: this.observability.getUptimeSeconds(),
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get("readiness")
  async getReadiness() {
    try {
      await this.prisma.$queryRawUnsafe("select 1");

      return {
        status: "ready",
        service: "exetron-api",
        dependencies: {
          database: "up"
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: "not_ready",
        service: "exetron-api",
        dependencies: {
          database: "down"
        },
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Database readiness check failed."
      });
    }
  }

  @Public()
  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  getMetrics(): string {
    return this.observability.renderPrometheusMetrics();
  }
}
