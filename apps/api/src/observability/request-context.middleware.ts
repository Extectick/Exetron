import { Injectable, type NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export interface RequestWithContext extends Request {
  requestId?: string;
  requestStartedAt?: number;
  metricsRecorded?: boolean;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: NextFunction): void {
    const incomingRequestId = request.headers["x-request-id"];
    const requestId =
      typeof incomingRequestId === "string" && incomingRequestId.trim()
        ? incomingRequestId.trim()
        : randomUUID();

    request.requestId = requestId;
    request.requestStartedAt = Date.now();
    response.setHeader("x-request-id", requestId);
    next();
  }
}
