import { Metadata } from "next";
import { getServerFolderData } from "@/lib/serverLayoutService";
import { FolderClient } from "@/components/FolderClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

// এজ ক্যাশ: পেজটি একবার তৈরি হয়ে ভার্সেলে সেভ থাকবে (ইউজার ক্লিকে ০ ফায়ারবেস রিড)
export const revalidate = 1800;

// ফেসবুক ও মেসেঞ্জারের জন্য নিখুঁত ওপেন-গ্রাফ ও স্লাগ মেটাডাটা
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const folderData = await getServerFolderData(id);

  const folderTitle = folderData.title || "Study Materials";
  const canonicalUrl = `https://learnhive-web.vercel.app/f/${encodeURIComponent(folderData.canonicalSlug)}`;
  const ogImageUrl = `https://learnhive-web.vercel.app/api/og?title=${encodeURIComponent(
    folderTitle
  )}&q=${folderData.items.length}&t=Folder`;

  return {
    title: `${folderTitle} | Learn Hive`,
    description: `Learn Hive-এ ${folderTitle} ফোল্ডারের সকল কনটেন্ট, নোট ও পূর্ণাঙ্গ মডেল টেস্ট।`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${folderTitle} - অনলাইন প্রস্তুতি | Learn Hive`,
      description: `Learn Hive প্ল্যাটফর্মে ${folderTitle}-এর সকল মডেল টেস্ট ও প্রস্তুতিমূলক কনটেন্ট।`,
      url: canonicalUrl,
      siteName: "Learn Hive",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: folderTitle,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${folderTitle} | Learn Hive`,
      description: `Learn Hive প্ল্যাটফর্মে ${folderTitle}-এর সকল মডেল টেস্ট ও প্রস্তুতিমূলক কনটেন্ট।`,
      images: [ogImageUrl],
    },
  };
}

// 🔥 সম্পূর্ণ Server Component
export default async function ShortFolderPage({ params }: PageProps) {
  const { id } = await params;
  const folderData = await getServerFolderData(id);

  return (
    <FolderClient
      initialItems={folderData.items}
      folderTitle={folderData.title}
      cleanSlug={folderData.canonicalSlug}
    />
  );
}