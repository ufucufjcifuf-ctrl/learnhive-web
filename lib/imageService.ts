import { API_BASE_URL } from "@/lib/apiClient";

const IMAGE_CACHE_KEY = "mcqhub_asset_images_map";
let inflightSync: Promise<Record<string, string>> | null = null;
let lastSyncMs = 0;

export function seedAssetImagesCache(map: Record<string, string>): void {
  if (typeof window === "undefined" || !map) return;
  try {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(map)) {
      if (k && v) normalized[k.trim().toLowerCase()] = v.trim();
    }
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(normalized));
    lastSyncMs = Date.now();
  } catch {
    // Ignore quota errors
  }
}

function readCachedAssetMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const fallback = localStorage.getItem(IMAGE_CACHE_KEY);
  if (!fallback) return {};
  try {
    return JSON.parse(fallback) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function syncAssetImages(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};

  if (Date.now() - lastSyncMs < 60_000 && lastSyncMs > 0) {
    const cached = readCachedAssetMap();
    if (Object.keys(cached).length > 0) return cached;
  }

  if (inflightSync) return inflightSync;

  inflightSync = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/media/assets`);
      if (res.ok) {
        const json = (await res.json()) as {
          images?: { imageName?: string; imageUrl?: string }[];
        };
        const rawList = json.images || [];
        const map: Record<string, string> = {};

        rawList.forEach((img) => {
          if (img.imageName && img.imageUrl) {
            map[img.imageName.trim().toLowerCase()] = img.imageUrl.trim();
          }
        });

        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(map));
        lastSyncMs = Date.now();
        return map;
      }
    } catch (e) {
      console.error("Failed to sync asset images:", e);
    }
    return readCachedAssetMap();
  })().finally(() => {
    inflightSync = null;
  });

  return inflightSync;
}

export function getSmartImageUrl(imageNameOrUrl?: string | null): string | null {
  if (!imageNameOrUrl) return null;
  const path = imageNameOrUrl.trim();
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/media/")) {
    return `${API_BASE_URL}${path}`;
  }

  if (typeof window !== "undefined") {
    const map = readCachedAssetMap();
    const resolved = map[path.toLowerCase()];
    if (resolved) {
      return resolved.startsWith("/media/") ? `${API_BASE_URL}${resolved}` : resolved;
    }
  }

  return null;
}