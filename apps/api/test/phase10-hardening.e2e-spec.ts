import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { prisma } from "@exetron/database";
import { AppModule } from "../src/app.module";
import { resetDatabase, seedPlatformAdmin } from "./db-test.utils";

type HttpServer = Parameters<typeof request>[0];

describe("PHASE 10 hardening and production readiness", () => {
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

  it("exposes liveness, readiness, metrics, and standardized error envelopes with request ids", async () => {
    const liveResponse = await request(httpServer).get("/health/live").expect(200);
    const liveBody = liveResponse.body as {
      status: string;
      service: string;
      check: string;
      uptimeSeconds: number;
    };
    expect(liveBody).toEqual(
      expect.objectContaining({
        status: "ok",
        service: "exetron-api",
        check: "liveness"
      })
    );
    expect(typeof liveBody.uptimeSeconds).toBe("number");
    expect(typeof liveResponse.headers["x-request-id"]).toBe("string");

    const readinessResponse = await request(httpServer)
      .get("/health/readiness")
      .expect(200);
    const readinessBody = readinessResponse.body as {
      status: string;
      dependencies: {
        database: string;
      };
    };
    expect(readinessBody).toEqual(
      expect.objectContaining({
        status: "ready",
        dependencies: {
          database: "up"
        }
      })
    );
    expect(typeof readinessResponse.headers["x-request-id"]).toBe("string");

    const unauthorizedResponse = await request(httpServer).get("/auth/me").expect(401);
    const unauthorizedBody = unauthorizedResponse.body as {
      statusCode: number;
      requestId: string;
      path: string;
    };
    expect(unauthorizedBody).toEqual(
      expect.objectContaining({
        statusCode: 401,
        path: "/auth/me"
      })
    );
    expect(typeof unauthorizedBody.requestId).toBe("string");
    expect(unauthorizedBody.requestId.length).toBeGreaterThan(0);
    expect(unauthorizedResponse.headers["x-request-id"]).toBe(
      unauthorizedBody.requestId
    );

    const metricsResponse = await request(httpServer)
      .get("/health/metrics")
      .expect(200);
    expect(metricsResponse.text).toContain("exetron_process_uptime_seconds");
    expect(metricsResponse.text).toContain(
      'exetron_http_requests_total{method="GET",route="/health/live",status="200"}'
    );
    expect(metricsResponse.text).toContain(
      'exetron_http_requests_total{method="GET",route="/auth/me",status="401"}'
    );
    expect(metricsResponse.text).toContain('exetron_http_exceptions_total{kind="UnauthorizedException",status="401"}');
  });
});
