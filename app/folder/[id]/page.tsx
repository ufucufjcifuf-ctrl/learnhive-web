import { redirect } from "next/navigation";
import { getServerFolderData } from "@/lib/serverLayoutService";

type PageProps = {
  params: Promise<{ id: string }>;
};

// 🔥 পুরোনো /folder/... লিংকে কেউ ঢুকলে সরাসরি নতুন ছোট /f/... লিংকে অটো-রিডাইরেক্ট হবে
export default async function LegacyFolderRedirectPage({ params }: PageProps) {
  const { id } = await params;
  const folderData = await getServerFolderData(id);
  
  redirect(`/f/${encodeURIComponent(folderData.canonicalSlug)}`);
}