import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { ApiEnv } from "@exetron/config";
import { APP_ENV } from "./common/app-env.provider";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = app.get<ApiEnv>(APP_ENV);

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

  await app.listen(env.PORT);
}

void bootstrap();
