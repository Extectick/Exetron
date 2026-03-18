import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import type { Response } from "express";
import { JsonLoggerService } from "./json-logger.service";
import { ObservabilityService } from "./observability.service";
import type { RequestWithContext } from "./request-context.middleware";

function normalizePath(request: RequestWithContext): string {
  return request.originalUrl.split("?")[0] || request.url;
}

function extractMessage(response: string | object): string | string[] {
  if (typeof response === "string") {
    return response;
  }

  if (Array.isArray((response as { message?: unknown }).message)) {
    return (response as { message: string[] }).message;
  }

  if (typeof (response as { message?: unknown }).message === "string") {
    return (response as { message: string }).message;
  }

  return "Internal server error";
}

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: JsonLoggerService,
    private readonly observability: ObservabilityService
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";
    const message = extractMessage(exceptionResponse);
    const errorName =
      exception instanceof HttpException
        ? exception.name
        : exception instanceof Error
          ? exception.name
          : "Error";

    if (!request.metricsRecorded) {
      this.observability.recordHttpRequest({
        method: request.method,
        route: normalizePath(request),
        status: statusCode,
        durationMs: Date.now() - (request.requestStartedAt ?? Date.now())
      });
      request.metricsRecorded = true;
    }

    this.observability.recordException(errorName, statusCode);
    this.logger.error(
      {
        event: "http.exception",
        requestId: request.requestId ?? null,
        method: request.method,
        path: normalizePath(request),
        statusCode,
        errorName,
        message
      },
      exception instanceof Error ? exception.stack : undefined,
      "HttpExceptionFilter"
    );

    response.status(statusCode).json({
      statusCode,
      timestamp: new Date().toISOString(),
      path: normalizePath(request),
      requestId: request.requestId ?? null,
      error: errorName,
      message
    });
  }
}
