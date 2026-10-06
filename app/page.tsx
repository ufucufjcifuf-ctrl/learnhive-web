import { getServerHomeLayout } from "@/lib/serverLayoutService";
import { HomeClient } from "@/components/HomeClient";
import { Metadata } from "next";

// 🔥 ৩০ মিনিট পর পর স্বয়ংক্রিয় ব্যাকগ্রাউন্ড চেক (যদি কখনো অ্যাডমিন হুক মিস হয়)
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Learn Hive - অনলাইন এক্সাম ও মডেল টেস্ট প্ল্যাটফর্ম",
  description: "বিসিএস, মেডিকেল, এইচএসসি ও এসএসসির পূর্ণাঙ্গ মডেল টেস্ট এবং তাৎক্ষণিক মেধা তালিকা।",
};

export default async function HomePage() {
  // সার্ভার সাইডে Vercel একাই ফায়ারবেস থেকে ডাটা এনে রেডি করে রাখবে
  const items = await getServerHomeLayout();

  return <HomeClient initialItems={items} />;
}