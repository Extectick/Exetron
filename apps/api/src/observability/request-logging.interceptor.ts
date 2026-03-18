import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import type { Response } from "express";
import { JsonLoggerService } from "./json-logger.service";
import { ObservabilityService } from "./observability.service";
import type { RequestWithContext } from "./request-context.middleware";

function normalizeRoute(request: RequestWithContext): string {
  const route = request.route as { path?: unknown } | undefined;
  const routePath =
    route && typeof route.path === "string"
      ? route.path
      : null;

  if (request.baseUrl && routePath) {
    return routePath.startsWith("/")
      ? `${request.baseUrl}${routePath}`
      : `${request.baseUrl}/${routePath}`;
  }

  if (routePath) {
    return routePath;
  }

  return request.originalUrl.split("?")[0] || request.url;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: JsonLoggerService,
    private readonly observability: ObservabilityService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - (request.requestStartedAt ?? Date.now());
        const route = normalizeRoute(request);
        const statusCode = response.statusCode ?? 500;

        this.observability.recordHttpRequest({
          method: request.method,
          route,
          status: statusCode,
          durationMs
        });
        request.metricsRecorded = true;

        this.logger.log(
          {
            event: "http.request.completed",
            requestId: request.requestId ?? null,
            method: request.method,
            route,
            statusCode,
            durationMs
          },
          "Http"
        );
      })
    );
  }
}
