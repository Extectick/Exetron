"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { createResource, listResource, patchResource } from "../lib/api";
import { useAuth } from "./auth-provider";

type FieldKind = "text" | "textarea" | "json" | "boolean" | "number" | "list";

interface FieldConfig {
  name: string;
  label: string;
  kind?: FieldKind;
  placeholder?: string;
}

interface ResourceWorkspaceProps<TItem extends Record<string, unknown>> {
  title: string;
  description: string;
  endpoint?: string;
  endpointTemplate?: string;
  fields: FieldConfig[];
  columns: Array<keyof TItem>;
  initialDraft: Record<string, string>;
}

function resolveEndpointTemplate(
  endpointTemplate: string | undefined,
  draft: Record<string, string>
): string | null {
  if (!endpointTemplate) {
    return null;
  }

  const placeholders = endpointTemplate.match(/:[A-Za-z0-9_]+/g) ?? [];
  let resolved = endpointTemplate;

  for (const placeholder of placeholders) {
    const key = placeholder.slice(1);
    const value = draft[key];

    if (!value) {
      return null;
    }

    resolved = resolved.replaceAll(placeholder, value);
  }

  return resolved;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return "";
}

function parseValue(kind: FieldKind | undefined, value: string) {
  switch (kind) {
    case "json":
      return value ? (JSON.parse(value) as Record<string, unknown>) : {};
    case "boolean":
      return value === "true";
    case "number":
      return value ? Number(value) : null;
    case "list":
      return value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    default:
      return value === "" ? null : value;
  }
}

export function ResourceWorkspace<TItem extends Record<string, unknown>>({
  title,
  description,
  endpoint,
  endpointTemplate,
  fields,
  columns,
  initialDraft
}: ResourceWorkspaceProps<TItem>) {
  const { session } = useAuth();
  const [items, setItems] = useState<TItem[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>(initialDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resolvedEndpoint = endpoint ?? resolveEndpointTemplate(endpointTemplate, draft);

  const loadItems = useCallback(async () => {
    if (!session?.accessToken || !resolvedEndpoint) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await listResource<TItem>(resolvedEndpoint, session.accessToken);
      startTransition(() => {
        setItems(response.items);
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load data.");
    } finally {
      setBusy(false);
    }
  }, [resolvedEndpoint, session?.accessToken]);

  useEffect(() => {
    void loadItems();
  }, [loadItems, resolvedEndpoint, session?.accessToken]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (!resolvedEndpoint) {
        throw new Error("Fill in the route identifier fields before saving.");
      }

      const payload = Object.fromEntries(
        fields.map((field) => [field.name, parseValue(field.kind, draft[field.name] ?? "")])
      );

      if (selectedId) {
        await patchResource<TItem>(
          resolvedEndpoint,
          selectedId,
          payload,
          session.accessToken
        );
      } else {
        await createResource<TItem>(resolvedEndpoint, payload, session.accessToken);
      }

      setDraft(initialDraft);
      setSelectedId(null);
      await loadItems();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">CRUD Workspace</span>
            <h2>{title}</h2>
            <p>{description}</p>
            {!resolvedEndpoint && endpointTemplate ? (
              <p>Fill in the route key fields and press Refresh to load records.</p>
            ) : null}
          </div>
          <button
            className="ghost-button"
            onClick={() => {
              void loadItems();
            }}
            disabled={busy}
          >
            Refresh
          </button>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        <div className="table-frame">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={String(column)}>{String(column)}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const rawId = item.id;
                const rowKey =
                  typeof rawId === "string" || typeof rawId === "number"
                    ? rawId.toString()
                    : index.toString();

                return (
                <tr key={rowKey}>
                  {columns.map((column) => (
                    <td key={String(column)}>{stringifyValue(item[column])}</td>
                  ))}
                  <td>
                    <button
                      className="mini-button"
                      onClick={() => {
                        setSelectedId(String(item.id));
                        setDraft(
                          Object.fromEntries(
                            fields.map((field) => [
                              field.name,
                              stringifyValue(item[field.name] ?? "")
                            ])
                          )
                        );
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
                );
              })}
              {!items.length ? (
                <tr>
                  <td colSpan={columns.length + 1}>No records yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel form-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">{selectedId ? "Update" : "Create"}</span>
            <h2>{selectedId ? "Edit record" : "New record"}</h2>
          </div>
          {selectedId ? (
            <button
              className="ghost-button"
              onClick={() => {
                setSelectedId(null);
                setDraft(initialDraft);
              }}
            >
              Reset
            </button>
          ) : null}
        </div>
        <form
          className="editor-form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          {fields.map((field) => (
            <label className="field" key={field.name}>
              <span>{field.label}</span>
              {field.kind === "textarea" || field.kind === "json" ? (
                <textarea
                  value={draft[field.name] ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                  rows={field.kind === "json" ? 6 : 4}
                />
              ) : field.kind === "boolean" ? (
                <select
                  value={draft[field.name] ?? "false"}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                >
                  <option value="false">false</option>
                  <option value="true">true</option>
                </select>
              ) : (
                <input
                  value={draft[field.name] ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                />
              )}
            </label>
          ))}
          <button className="primary-button" type="submit" disabled={busy}>
            {selectedId ? "Update record" : "Create record"}
          </button>
        </form>
      </section>
    </div>
  );
}
