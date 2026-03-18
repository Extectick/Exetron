import { Inject, Injectable } from "@nestjs/common";
import type { ObservabilityStatusDto } from "@exetron/contracts";
import type { ApiEnv } from "@exetron/config";
import { APP_ENV } from "../common/app-env.provider";

interface RequestMetricKey {
  method: string;
  route: string;
  status: number;
}

interface RequestMetricValue {
  count: number;
  totalMs: number;
  maxMs: number;
}

function labelKey(input: Record<string, string | number>): string {
  return Object.entries(input)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}

function parseLabelKey(key: string): Record<string, string> {
  return Object.fromEntries(
    key.split("|").map((entry) => {
      const [label, ...rest] = entry.split(":");
      return [label, rest.join(":")];
    })
  );
}

function escapeLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

@Injectable()
export class ObservabilityService {
  private readonly startedAt = Date.now();
  private readonly requestMetrics = new Map<string, RequestMetricValue>();
  private readonly exceptionCounts = new Map<string, number>();

  constructor(@Inject(APP_ENV) private readonly env: ApiEnv) {}

  recordHttpRequest(input: RequestMetricKey & { durationMs: number }): void {
    const key = labelKey({
      method: input.method,
      route: input.route,
      status: input.status
    });
    const current = this.requestMetrics.get(key) ?? {
      count: 0,
      totalMs: 0,
      maxMs: 0
    };

    current.count += 1;
    current.totalMs += input.durationMs;
    current.maxMs = Math.max(current.maxMs, input.durationMs);
    this.requestMetrics.set(key, current);
  }

  recordException(kind: string, statusCode: number): void {
    const key = labelKey({
      kind,
      status: statusCode
    });
    this.exceptionCounts.set(key, (this.exceptionCounts.get(key) ?? 0) + 1);
  }

  getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  getObservabilityStatus(): ObservabilityStatusDto {
    const exporterMode = this.env.OBSERVABILITY_EXPORTER_MODE;
    const endpoint = this.env.OBSERVABILITY_OTLP_ENDPOINT ?? null;
    const externalExportEnabled = exporterMode !== "internal" && endpoint !== null;
    const alertsEnabled = Boolean(this.env.OBSERVABILITY_ALERT_WEBHOOK_URL);

    return {
      service: "exetron-api",
      serviceName: this.env.OBSERVABILITY_SERVICE_NAME,
      generatedAt: new Date().toISOString(),
      exporterMode,
      metrics: {
        internalPrometheusEndpoint: "/health/metrics",
        externalExportEnabled,
        endpoint
      },
      tracing: {
        enabled: externalExportEnabled,
        transport: externalExportEnabled ? "otlp_http" : "none",
        endpoint
      },
      alerts: {
        enabled: alertsEnabled,
        channel: alertsEnabled ? "webhook" : "none",
        targetPresent: alertsEnabled
      }
    };
  }

  renderPrometheusMetrics(): string {
    const observabilityStatus = this.getObservabilityStatus();
    const lines = [
      "# HELP exetron_process_uptime_seconds Process uptime in seconds.",
      "# TYPE exetron_process_uptime_seconds gauge",
      `exetron_process_uptime_seconds ${this.getUptimeSeconds()}`,
      "# HELP exetron_process_resident_memory_bytes Resident set size in bytes.",
      "# TYPE exetron_process_resident_memory_bytes gauge",
      `exetron_process_resident_memory_bytes ${process.memoryUsage().rss}`,
      "# HELP exetron_http_requests_total Total HTTP requests grouped by method, route, and status.",
      "# TYPE exetron_http_requests_total counter",
      "# HELP exetron_http_request_duration_ms_sum Sum of HTTP request durations in milliseconds.",
      "# TYPE exetron_http_request_duration_ms_sum counter",
      "# HELP exetron_http_request_duration_ms_count Count of HTTP requests included in the duration summary.",
      "# TYPE exetron_http_request_duration_ms_count counter",
      "# HELP exetron_http_request_duration_ms_max Max HTTP request duration in milliseconds.",
      "# TYPE exetron_http_request_duration_ms_max gauge",
      "# HELP exetron_observability_exporter_enabled Whether an external exporter path is configured for the signal.",
      "# TYPE exetron_observability_exporter_enabled gauge"
    ];

    for (const [key, value] of this.requestMetrics.entries()) {
      const labels = parseLabelKey(key);
      const labelText = `{method="${escapeLabel(labels.method ?? "")}",route="${escapeLabel(
        labels.route ?? ""
      )}",status="${escapeLabel(labels.status ?? "")}"}`;
      lines.push(`exetron_http_requests_total${labelText} ${value.count}`);
      lines.push(
        `exetron_http_request_duration_ms_sum${labelText} ${value.totalMs.toFixed(2)}`
      );
      lines.push(
        `exetron_http_request_duration_ms_count${labelText} ${value.count}`
      );
      lines.push(
        `exetron_http_request_duration_ms_max${labelText} ${value.maxMs.toFixed(2)}`
      );
    }

    lines.push(
      "# HELP exetron_http_exceptions_total Total handled HTTP exceptions grouped by kind and status."
    );
    lines.push("# TYPE exetron_http_exceptions_total counter");

    for (const [key, value] of this.exceptionCounts.entries()) {
      const labels = parseLabelKey(key);
      const labelText = `{kind="${escapeLabel(labels.kind ?? "")}",status="${escapeLabel(
        labels.status ?? ""
      )}"}`;
      lines.push(`exetron_http_exceptions_total${labelText} ${value}`);
    }

    lines.push(
      `exetron_observability_exporter_enabled{signal="metrics",mode="${escapeLabel(
        observabilityStatus.exporterMode
      )}"} ${observabilityStatus.metrics.externalExportEnabled ? 1 : 0}`
    );
    lines.push(
      `exetron_observability_exporter_enabled{signal="traces",mode="${escapeLabel(
        observabilityStatus.exporterMode
      )}"} ${observabilityStatus.tracing.enabled ? 1 : 0}`
    );
    lines.push(
      `exetron_observability_exporter_enabled{signal="alerts",mode="${escapeLabel(
        observabilityStatus.exporterMode
      )}"} ${observabilityStatus.alerts.enabled ? 1 : 0}`
    );

    return `${lines.join("\n")}\n`;
  }
}
