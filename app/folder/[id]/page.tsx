import { Metadata } from "next";
import { getServerFolderData } from "@/lib/serverLayoutService";
import { FolderClient } from "@/components/FolderClient";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ title?: string }>;
};

// 🔥 ভার্সেল এজ ক্যাশ: পেজটি একবার তৈরি হয়ে ভার্সেলে জমা থাকবে (ইউজার ক্লিকে ০ ফায়ারবেস রিড)
export const revalidate = 1800;

// ফেসবুক ও মেসেঞ্জারের জন্য ডায়নামিক ওপেন-গ্রাফ মেটাডাটা
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const folderData = await getServerFolderData(id);

  const folderTitle = sp?.title || folderData.title || "Study Materials";
  const ogImageUrl = `https://learnhive-web.vercel.app/api/og?title=${encodeURIComponent(
    folderTitle
  )}&q=${folderData.items.length}&t=Folder`;

  return {
    title: `${folderTitle} | Learn Hive`,
    description: `Learn Hive-এ ${folderTitle} ফোল্ডারের সকল কনটেন্ট, নোট ও পূর্ণাঙ্গ মডেল টেস্ট।`,
    alternates: {
      canonical: `https://learnhive-web.vercel.app/folder/${encodeURIComponent(id)}`,
    },
    openGraph: {
      title: `${folderTitle} - অনলাইন প্রস্তুতি | Learn Hive`,
      description: `Learn Hive প্ল্যাটফর্মে ${folderTitle}-এর সকল মডেল টেস্ট ও প্রস্তুতিমূলক কনটেন্ট।`,
      url: `https://learnhive-web.vercel.app/folder/${encodeURIComponent(id)}`,
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

// 🔥 সম্পূর্ণ Server Component: ভার্সেল সার্ভার পেজটি রেডি করে ক্যাশে রেখে দেবে
export default async function DynamicFolderPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const folderData = await getServerFolderData(id);
  const finalTitle = sp?.title || folderData.title || "Folder Contents";

  return <FolderClient initialItems={folderData.items} folderTitle={finalTitle} />;
}