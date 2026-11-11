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

export function extractShortHash(id: string): string {
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
  const hash = extractShortHash(id);
  return `${baseSlug}-${hash}`;
}

export function createExamSlug(title: string, id: string, customSlug?: string | null): string {
  if (customSlug && customSlug.trim()) {
    return slugify(customSlug.trim());
  }
  const baseSlug = slugify(title) || "exam";
  const hash = extractShortHash(id);
  return `${baseSlug}-${hash}`;
}

export function createNoteSlug(title: string, id: string, customSlug?: string | null): string {
  if (customSlug && customSlug.trim()) {
    return slugify(customSlug.trim());
  }
  const baseSlug = slugify(title) || "note";
  const hash = extractShortHash(id);
  return `${baseSlug}-${hash}`;
}