import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MobileSession, PendingPosOrder } from "./api";
import type { PosBootstrapResponse } from "@exetron/contracts";

const sessionKey = "exetron.mobile.session";
const bootstrapKey = "exetron.mobile.bootstrap";
const queueKey = "exetron.mobile.queue";

async function readJson<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : null;
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function loadMobileSession(): Promise<MobileSession | null> {
  return readJson<MobileSession>(sessionKey);
}

export function saveMobileSession(session: MobileSession | null): Promise<void> {
  if (!session) {
    return AsyncStorage.removeItem(sessionKey);
  }

  return writeJson(sessionKey, session);
}

export function loadBootstrapCache(): Promise<PosBootstrapResponse | null> {
  return readJson<PosBootstrapResponse>(bootstrapKey);
}

export function saveBootstrapCache(cache: PosBootstrapResponse | null): Promise<void> {
  if (!cache) {
    return AsyncStorage.removeItem(bootstrapKey);
  }

  return writeJson(bootstrapKey, cache);
}

export async function loadPendingQueue(): Promise<PendingPosOrder[]> {
  return (await readJson<PendingPosOrder[]>(queueKey)) ?? [];
}

export function savePendingQueue(queue: PendingPosOrder[]): Promise<void> {
  return writeJson(queueKey, queue);
}
