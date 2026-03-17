import type {
  AuthMeResponse,
  AuthTokensResponse,
  FeatureFlagDto,
  ListResponse,
  LoginRequest,
  RefreshRequest,
  StoreSettingDto,
  TenantSettingDto,
  UpsertFeatureFlagRequest,
  UpsertStoreSettingRequest,
  UpsertTenantSettingRequest
} from "@exetron/contracts";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

async function readBody<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errorPayload = await readBody<{ message?: string }>(response);
    throw new ApiError(
      errorPayload.message ?? `Request failed with ${response.status}`,
      response.status
    );
  }

  return readBody<T>(response);
}

export function login(payload: LoginRequest): Promise<AuthTokensResponse> {
  return request<AuthTokensResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function refresh(payload: RefreshRequest): Promise<AuthTokensResponse> {
  return request<AuthTokensResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function me(accessToken: string): Promise<AuthMeResponse> {
  return request<AuthMeResponse>("/auth/me", {}, accessToken);
}

export function logout(refreshToken: string, accessToken: string): Promise<{ success: true }> {
  return request<{ success: true }>(
    "/auth/logout",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    },
    accessToken
  );
}

export function listResource<T>(
  endpoint: string,
  accessToken: string
): Promise<ListResponse<T>> {
  return request<ListResponse<T>>(endpoint, {}, accessToken);
}

export function createResource<T>(
  endpoint: string,
  payload: Record<string, unknown>,
  accessToken: string
): Promise<T> {
  return request<T>(
    endpoint,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function patchResource<T>(
  endpoint: string,
  id: string,
  payload: Record<string, unknown>,
  accessToken: string
): Promise<T> {
  return request<T>(
    `${endpoint}/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function getTenantSettings(
  accessToken: string
): Promise<ListResponse<TenantSettingDto>> {
  return request<ListResponse<TenantSettingDto>>("/settings/tenant", {}, accessToken);
}

export function upsertTenantSetting(
  payload: UpsertTenantSettingRequest,
  accessToken: string
): Promise<TenantSettingDto> {
  return request<TenantSettingDto>(
    "/settings/tenant",
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function getStoreSettings(
  storeId: string,
  accessToken: string
): Promise<ListResponse<StoreSettingDto>> {
  return request<ListResponse<StoreSettingDto>>(
    `/settings/stores/${storeId}`,
    {},
    accessToken
  );
}

export function upsertStoreSetting(
  payload: UpsertStoreSettingRequest,
  accessToken: string
): Promise<StoreSettingDto> {
  return request<StoreSettingDto>(
    "/settings/store",
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function getFeatureFlags(
  accessToken: string
): Promise<ListResponse<FeatureFlagDto>> {
  return request<ListResponse<FeatureFlagDto>>("/feature-flags", {}, accessToken);
}

export function upsertFeatureFlag(
  payload: UpsertFeatureFlagRequest,
  accessToken: string
): Promise<FeatureFlagDto> {
  return request<FeatureFlagDto>(
    "/feature-flags",
    {
      method: "PUT",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}
