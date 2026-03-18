import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { ApiEnv } from "@exetron/config";
import { APP_ENV } from "./common/app-env.provider";
import { AppModule } from "./app.module";
import { JsonLoggerService } from "./observability/json-logger.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const env = app.get<ApiEnv>(APP_ENV);
  const logger = app.get(JsonLoggerService);
  app.useLogger(logger);
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.enableCors({
    origin: true,
    credentials: true
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Exetron Platform Core API")
    .setDescription("Phase 0 and Phase 1 REST contracts")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument);

  process.on("unhandledRejection", (reason) => {
    logger.error(
      {
        event: "process.unhandled_rejection",
        reason: reason instanceof Error ? reason.message : reason
      },
      reason instanceof Error ? reason.stack : undefined,
      "Bootstrap"
    );
  });

  process.on("uncaughtException", (error) => {
    logger.error(
      {
        event: "process.uncaught_exception",
        message: error.message
      },
      error.stack,
      "Bootstrap"
    );
  });

  await app.listen(env.PORT);
  logger.log(
    {
      event: "app.started",
      port: env.PORT,
      docsUrl: `http://localhost:${env.PORT}/docs`
    },
    "Bootstrap"
  );
}

void bootstrap();
