import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { prisma } from "@exetron/database";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { resetDatabase, seedPlatformAdmin } from "./db-test.utils";

type HttpServer = Parameters<typeof request>[0];

describe("PHASE 11 observability boundary", () => {
  let app: INestApplication;
  let httpServer: HttpServer;

  beforeAll(async () => {
    await resetDatabase();
    await seedPlatformAdmin();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true
      })
    );

    await app.init();
    httpServer = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await prisma.$disconnect();
  });

  it("exposes observability runtime status and exporter gauges", async () => {
    const statusResponse = await request(httpServer)
      .get("/health/observability")
      .expect(200);
    const status = statusResponse.body as {
      service: string;
      exporterMode: string;
      metrics: { internalPrometheusEndpoint: string; externalExportEnabled: boolean };
      tracing: { enabled: boolean };
      alerts: { enabled: boolean };
    };

    expect(status.service).toBe("exetron-api");
    expect(status.exporterMode).toBe("internal");
    expect(status.metrics.internalPrometheusEndpoint).toBe("/health/metrics");
    expect(status.metrics.externalExportEnabled).toBe(false);
    expect(status.tracing.enabled).toBe(false);
    expect(status.alerts.enabled).toBe(false);

    const metricsResponse = await request(httpServer)
      .get("/health/metrics")
      .expect(200);

    expect(metricsResponse.text).toContain(
      'exetron_observability_exporter_enabled{signal="metrics",mode="internal"} 0'
    );
    expect(metricsResponse.text).toContain(
      'exetron_observability_exporter_enabled{signal="traces",mode="internal"} 0'
    );
  });
});
