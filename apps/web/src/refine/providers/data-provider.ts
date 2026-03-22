"use client";

import type {
  BaseKey,
  BaseRecord,
  CreateManyParams,
  DataProvider,
  DeleteManyParams,
  GetListParams,
  GetManyParams,
  GetOneParams,
  UpdateManyParams
} from "@refinedev/core";
import { apiBaseUrl, createResource, listResource, patchResource, request } from "../../lib/api";
import { readStoredSession } from "../../lib/session";
import { findAdminResource } from "../config/resources";

function resolveEndpoint(resource: string) {
  const definition = findAdminResource(resource);
  return definition?.meta.endpoint ?? definition?.list ?? `/${resource}`;
}

function getAccessToken() {
  return readStoredSession()?.accessToken;
}

function filtersToParams(filters: GetListParams["filters"] = []) {
  const params: Record<string, string> = {};

  for (const filter of filters) {
    if ("field" in filter && filter.value !== undefined && filter.value !== null) {
      params[String(filter.field)] = String(filter.value);
    }
  }

  return params;
}

async function fetchOne<TData extends BaseRecord>(endpoint: string, id: BaseKey): Promise<TData> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Missing access token.");
  }

  return request<TData>(`${endpoint}/${id}`, {}, accessToken);
}

async function getList<TData extends BaseRecord = BaseRecord>({
  resource,
  filters
}: GetListParams) {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Missing access token.");
  }

  const endpoint = resolveEndpoint(resource);
  const queryParams = filtersToParams(filters);
  const search = new URLSearchParams(queryParams).toString();
  const resolvedEndpoint = search ? `${endpoint}?${search}` : endpoint;
  const response = await listResource<TData>(resolvedEndpoint, accessToken);

  return {
    data: response.items,
    total: response.total
  };
}

async function getOne<TData extends BaseRecord = BaseRecord>({ resource, id }: GetOneParams) {
  const endpoint = resolveEndpoint(resource);
  const data = await fetchOne<TData>(endpoint, id);
  return { data };
}

async function create<
  TData extends BaseRecord = BaseRecord,
  TVariables = Record<string, unknown>
>({ resource, variables }: { resource: string; variables?: TVariables }) {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Missing access token.");
  }

  const endpoint = resolveEndpoint(resource);
  const data = await createResource<TData>(
    endpoint,
    (variables ?? {}) as Record<string, unknown>,
    accessToken
  );

  return { data };
}

async function update<
  TData extends BaseRecord = BaseRecord,
  TVariables = Record<string, unknown>
>({ resource, id, variables }: { resource: string; id: BaseKey; variables?: TVariables }) {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Missing access token.");
  }

  const endpoint = resolveEndpoint(resource);
  const data = await patchResource<TData>(
    endpoint,
    String(id),
    (variables ?? {}) as Record<string, unknown>,
    accessToken
  );

  return { data };
}

function deleteOne<TData extends BaseRecord = BaseRecord>({
  resource,
  id
}: {
  resource: string;
  id: BaseKey;
}): Promise<{ data: TData }> {
  return Promise.reject(new Error(`deleteOne is not supported for resource ${resource}:${String(id)}`));
}

async function getMany<TData extends BaseRecord = BaseRecord>({ resource, ids }: GetManyParams) {
  const endpoint = resolveEndpoint(resource);
  const data = await Promise.all(ids.map((id) => fetchOne<TData>(endpoint, id)));

  return { data };
}

async function createMany<
  TData extends BaseRecord = BaseRecord,
  TVariables = Record<string, unknown>
>({
  resource,
  variables
}: CreateManyParams<TVariables>) {
  const created = await Promise.all(
    variables.map((item) =>
      create<TData, TVariables>({
        resource,
        variables: item,
      })
    )
  );

  return { data: created.map((item) => item.data) };
}

async function updateMany<
  TData extends BaseRecord = BaseRecord,
  TVariables = Record<string, unknown>
>({
  resource,
  ids,
  variables
}: UpdateManyParams<TVariables>) {
  const updated = await Promise.all(
    ids.map((id) =>
      update<TData, TVariables>({
        resource,
        id,
        variables,
      })
    )
  );

  return { data: updated.map((item) => item.data) };
}

function deleteMany<TData extends BaseRecord = BaseRecord, TVariables = unknown>({
  resource,
  ids
}: DeleteManyParams<TVariables>): Promise<{ data: TData[] }> {
  return Promise.reject(new Error(`deleteMany is not supported for resource ${resource}:${ids.join(",")}`));
}

async function custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
  params: {
    url: string;
    method: string;
    payload?: TPayload;
    query?: TQuery;
    headers?: HeadersInit;
  }
) {
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new Error("Missing access token.");
  }

  const query =
    params.query && typeof params.query === "object" && !Array.isArray(params.query)
      ? Object.fromEntries(
          Object.entries(params.query as Record<string, unknown>).map(([key, value]) => [
            key,
            String(value)
          ])
        )
      : undefined;
  const search = query ? `?${new URLSearchParams(query).toString()}` : "";
  const data = await request<TData>(
    `${params.url}${search}`,
    {
      method: params.method,
      body: params.payload ? JSON.stringify(params.payload) : undefined,
      headers: params.headers
    },
    accessToken
  );

  return { data };
};

export const dataProvider: DataProvider = {
  getApiUrl: () => apiBaseUrl,
  getList,
  getOne,
  create,
  update,
  deleteOne,
  getMany,
  createMany,
  updateMany,
  deleteMany,
  custom
};
