export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0980-\u09FF-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// Deterministic FNV-1a 32-bit hash matching Cloudflare Worker (prevents Sheet-Tab collision)
export function computeDeterministicHash(input: string): string {
  if (!input) return "h00001";
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(6, "0");
}

export function extractShortHash(id: string): string {
  return computeDeterministicHash(id);
}

export function extractLegacyShortHash(id: string): string {
  if (!id) return "h1";
  const clean = id
    .replace(/^(folder_|exam_|note_)/, "")
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  return clean.slice(0, 5).toLowerCase() || "h1";
}

export function createFolderSlug(title: string, id: string, customSlug?: string | null): string {
  if (customSlug && customSlug.trim()) {
    return slugify(customSlug.trim());
  }
  const baseSlug = slugify(title) || "folder";
  return `${baseSlug}-${computeDeterministicHash(id)}`;
}

export function createExamSlug(title: string, id: string, customSlug?: string | null): string {
  if (customSlug && customSlug.trim()) {
    return slugify(customSlug.trim());
  }
  const baseSlug = slugify(title) || "exam";
  return `${baseSlug}-${computeDeterministicHash(id)}`;
}

export function createNoteSlug(title: string, id: string, customSlug?: string | null): string {
  if (customSlug && customSlug.trim()) {
    return slugify(customSlug.trim());
  }
  const baseSlug = slugify(title) || "note";
  return `${baseSlug}-${computeDeterministicHash(id)}`;
}