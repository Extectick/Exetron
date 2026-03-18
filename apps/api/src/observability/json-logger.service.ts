import { Inject, Injectable, type LoggerService } from "@nestjs/common";
import type { ApiEnv } from "@exetron/config";
import { APP_ENV } from "../common/app-env.provider";

type LogLevel = "error" | "warn" | "log" | "debug" | "verbose";

const severityOrder: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 3,
  verbose: 4
};

@Injectable()
export class JsonLoggerService implements LoggerService {
  constructor(@Inject(APP_ENV) private readonly env: ApiEnv) {}

  log(message: unknown, context?: string): void {
    this.write("log", message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write("error", message, context, {
      trace: trace ?? null
    });
  }

  warn(message: unknown, context?: string): void {
    this.write("warn", message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write("debug", message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write("verbose", message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    extra?: Record<string, unknown>
  ): void {
    if (severityOrder[level] > severityOrder[this.env.LOG_LEVEL]) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? "Application",
      message,
      ...extra
    };
    const line = JSON.stringify(payload);

    switch (level) {
      case "error":
        console.error(line);
        break;
      case "warn":
        console.warn(line);
        break;
      default:
        console.log(line);
        break;
    }
  }
}
