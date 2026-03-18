import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule
} from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { HttpExceptionFilter } from "./http-exception.filter";
import { JsonLoggerService } from "./json-logger.service";
import { ObservabilityService } from "./observability.service";
import { RequestContextMiddleware } from "./request-context.middleware";
import { RequestLoggingInterceptor } from "./request-logging.interceptor";

@Global()
@Module({
  providers: [
    JsonLoggerService,
    ObservabilityService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    }
  ],
  exports: [JsonLoggerService, ObservabilityService]
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
