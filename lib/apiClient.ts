import { auth } from "@/lib/firebase";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://learnhive-api.learnhive2026.workers.dev"
).replace(/\/+$/, "");

let serverTimeOffsetMs = 0;
let lastTimeSyncAt = 0;

export function updateServerTimeOffset(serverTimeMs: number): void {
  if (Number.isFinite(serverTimeMs) && serverTimeMs > 0) {
    serverTimeOffsetMs = serverTimeMs - Date.now();
    lastTimeSyncAt = Date.now();
  }
}

export function getServerNow(): number {
  return Date.now() + serverTimeOffsetMs;
}

export async function syncServerTime(): Promise<number> {
  if (Date.now() - lastTimeSyncAt < 60_000 && lastTimeSyncAt > 0) {
    return getServerNow();
  }
  try {
    const before = Date.now();
    const res = await fetch(`${API_BASE_URL}/api/time`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { serverTimeMs?: number };
      if (data.serverTimeMs) {
        const after = Date.now();
        const rttHalf = Math.floor((after - before) / 2);
        serverTimeOffsetMs = data.serverTimeMs + rttHalf - after;
        lastTimeSyncAt = after;
      }
    }
  } catch {
    // Fallback cleanly to local clock if offline
  }
  return getServerNow();
}

export function getWebDeviceId(): string {
  if (typeof window === "undefined") return "SSR";
  const key = "learnhive_web_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? `web_${crypto.randomUUID()}`
        : `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  requireAuth?: boolean;
  withOptionalAuth?: boolean;
  next?: { revalidate?: number | false; tags?: string[] };
}

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, requireAuth = false, withOptionalAuth = false, headers: customHeaders, ...rest } = options;

  const headers = new Headers(customHeaders);
  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (requireAuth || withOptionalAuth) {
    const token = await getAuthToken();
    if (requireAuth && !token) {
      throw new ApiError("লগইন প্রয়োজন। অনুগ্রহ করে সাইন-ইন করুন।", 401);
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...rest,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    serverTimeMs?: number;
  };

  if (json.serverTimeMs) {
    updateServerTimeOffset(json.serverTimeMs);
  }

  if (!res.ok) {
    throw new ApiError(json.error || `Request failed (${res.status})`, res.status, json);
  }

  return json as T;
}