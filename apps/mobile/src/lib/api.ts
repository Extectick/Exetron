import type {
  AddCartItemRequest,
  AuthMeResponse,
  AuthTokensResponse,
  CartDto,
  CheckoutCartRequest,
  CompiledCatalogResponse,
  CreateCartRequest,
  DeviceDto,
  ListResponse,
  LoginRequest,
  PaymentIntentDto,
  ProcessPaymentAllocationRequest,
  PosBootstrapResponse,
  PosSessionDto,
  PosShiftDto,
  RecordPaymentIntentRequest,
  StoreDto
} from "@exetron/contracts";

export function getMobileApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
}

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
  const response = await fetch(`${getMobileApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {})
    }
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

export interface MobileSession {
  accessToken: string;
  refreshToken: string;
  me: AuthMeResponse;
}

export interface PendingPosOrder {
  id: string;
  storeId: string;
  deviceId: string;
  sessionId: string;
  customerName?: string;
  note?: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
    priceListId?: string | null;
    modifierOptionIds: string[];
  }>;
  allocations: RecordPaymentIntentRequest["allocations"];
}

export function login(payload: LoginRequest): Promise<AuthTokensResponse> {
  return request<AuthTokensResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function me(accessToken: string): Promise<AuthMeResponse> {
  return request<AuthMeResponse>("/auth/me", {}, accessToken);
}

export function listStores(accessToken: string): Promise<ListResponse<StoreDto>> {
  return request<ListResponse<StoreDto>>("/stores", {}, accessToken);
}

export function listDevices(
  accessToken: string,
  tenantId?: string
): Promise<ListResponse<DeviceDto>> {
  const query = tenantId ? `?tenantId=${tenantId}` : "";
  return request<ListResponse<DeviceDto>>(`/devices${query}`, {}, accessToken);
}

export function bootstrapPos(
  accessToken: string,
  deviceId: string,
  tenantId?: string
): Promise<PosBootstrapResponse> {
  const params = new URLSearchParams({ deviceId });
  if (tenantId) {
    params.set("tenantId", tenantId);
  }

  return request<PosBootstrapResponse>(`/pos/bootstrap?${params.toString()}`, {}, accessToken);
}

export function openShift(
  accessToken: string,
  payload: {
    tenantId?: string;
    storeId: string;
    deviceId: string;
    openingCashAmount?: string | null;
  }
): Promise<PosShiftDto> {
  return request<PosShiftDto>(
    "/pos/shifts",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function startSession(
  accessToken: string,
  payload: {
    tenantId?: string;
    storeId: string;
    deviceId: string;
    shiftId: string;
  }
): Promise<PosSessionDto> {
  return request<PosSessionDto>(
    "/pos/sessions",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function heartbeatSession(
  accessToken: string,
  sessionId: string
): Promise<PosSessionDto> {
  return request<PosSessionDto>(
    `/pos/sessions/${sessionId}/heartbeat`,
    {
      method: "PATCH"
    },
    accessToken
  );
}

export function createCart(
  accessToken: string,
  payload: CreateCartRequest
): Promise<CartDto> {
  return request<CartDto>(
    "/carts",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function addCartItem(
  accessToken: string,
  cartId: string,
  payload: AddCartItemRequest
): Promise<CartDto> {
  return request<CartDto>(
    `/carts/${cartId}/items`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function checkoutCart(
  accessToken: string,
  cartId: string,
  payload: CheckoutCartRequest
) {
  return request<{ id: string; total: string }>(
    `/carts/${cartId}/checkout`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function createPaymentIntent(
  accessToken: string,
  payload: RecordPaymentIntentRequest
): Promise<PaymentIntentDto> {
  return request<PaymentIntentDto>(
    "/pos/payment-intents",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export function processPaymentAllocation(
  accessToken: string,
  intentId: string,
  allocationId: string,
  payload: ProcessPaymentAllocationRequest = {}
): Promise<PaymentIntentDto> {
  return request<PaymentIntentDto>(
    `/payments/intents/${intentId}/allocations/${allocationId}/process`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    accessToken
  );
}

export async function submitPosOrder(
  accessToken: string,
  payload: PendingPosOrder
): Promise<{ orderId: string; paymentIntentId: string; total: string }> {
  const cart = await createCart(accessToken, {
    storeId: payload.storeId,
    deviceId: payload.deviceId,
    channel: "POS",
    customerName: payload.customerName ?? null,
    note: payload.note ?? null
  });

  let workingCartId = cart.id;
  for (const item of payload.items) {
    const updatedCart = await addCartItem(accessToken, workingCartId, {
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
      priceListId: item.priceListId ?? null,
      modifierOptionIds: item.modifierOptionIds
    });
    workingCartId = updatedCart.id;
  }

  const order = await checkoutCart(accessToken, workingCartId, {
    customerName: payload.customerName ?? null,
    note: payload.note ?? null
  });

  const paymentIntent = await createPaymentIntent(accessToken, {
    storeId: payload.storeId,
    orderId: order.id,
    posSessionId: payload.sessionId,
    allocations: payload.allocations
  });

  let processedIntent = paymentIntent;
  for (const allocation of paymentIntent.allocations) {
    processedIntent = await processPaymentAllocation(
      accessToken,
      paymentIntent.id,
      allocation.id
    );
  }

  if (processedIntent.status !== "COMPLETED") {
    const failedAllocation = processedIntent.allocations.find(
      (allocation) => allocation.status === "FAILED"
    );
    throw new ApiError(
      failedAllocation?.failureReason ??
        `Payment intent is ${processedIntent.status.toLowerCase()}.`,
      400
    );
  }

  return {
    orderId: order.id,
    paymentIntentId: processedIntent.id,
    total: processedIntent.totalAmount
  };
}

export function extractCatalog(bootstrap: PosBootstrapResponse): CompiledCatalogResponse {
  return bootstrap.catalog;
}
