// টেক্সটকে ক্লিন স্লাগে রূপান্তর করার ফাংশন (বাংলা ও ইংরেজি উভয় সাপোর্ট করে)
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // স্পেসকে হাইফেন দিয়ে পরিবর্তন
    .replace(/[^\w\u0980-\u09FF-]+/g, "") // বর্ণমালা, সংখ্যা, বাংলা অক্ষর ও হাইফেন রাখা
    .replace(/\-\-+/g, "-") // একাধিক হাইফেনকে একটি করা
    .replace(/^-+/, "") // শুরুর হাইফেন ছাঁটাই
    .replace(/-+$/, ""); // শেষের হাইফেন ছাঁটাই
}

// ইউনিক আইডির প্রথম ৪-৫ অক্ষর বের করা (কনফ্লিক্ট বা ডুপ্লিকেট রোধে)
export function extractShortHash(id: string): string {
  if (!id) return "f1";
  const clean = id.replace(/^(folder_|exam_)/, "").replace(/[^a-zA-Z0-9]/g, "");
  return clean.slice(0, 5).toLowerCase() || "f1";
}

// ফোল্ডারের জন্য সুন্দর ও ইউনিক শর্ট স্লাগ তৈরি করা (যেমন: dhaka-university-ea288)
export function createFolderSlug(title: string, id: string, customSlug?: string | null): string {
  if (customSlug && customSlug.trim()) {
    return slugify(customSlug.trim());
  }
  const baseSlug = slugify(title) || "folder";
  const hash = extractShortHash(id);
  return `${baseSlug}-${hash}`;
}