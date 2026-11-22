"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { PdfReader } from "@/components/PdfReader";
import { findItemDeeply } from "@/lib/layoutService";
import { API_BASE_URL, apiFetch, getAuthToken } from "@/lib/apiClient";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { DashboardItem } from "@/types";
import { ArrowLeft, Lock } from "lucide-react";

function resolveServerMediaUrl(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/media/")) return `${API_BASE_URL}${trimmed}`;
  if (trimmed.startsWith("media/")) return `${API_BASE_URL}/${trimmed}`;
  if (trimmed.startsWith("pdfs/")) return `${API_BASE_URL}/media/${trimmed}`;
  return `${API_BASE_URL}/media/${trimmed.replace(/^\/+/, "")}`;
}

export default function NoteViewerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, isPro, loading: authLoading } = useAuth();

  const id = params?.id ? decodeURIComponent(String(params.id)) : "";
  const isAttachedExamNote = searchParams.get("mode") === "attached";

  const [title, setTitle] = useState("PDF Note");
  const [canonicalNoteId, setCanonicalNoteId] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [isPremiumNote, setIsPremiumNote] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPremiumBlocked, setIsPremiumBlocked] = useState(false);

  const refreshToken = useCallback(async () => {
    try {
      const fresh = (await auth.currentUser?.getIdToken(true)) || null;
      setAuthToken(fresh);
      return fresh;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (authLoading || !id) return;
    let cancelled = false;

    async function resolveNoteAccess() {
      setLoading(true);
      setErrorMsg(null);
      setIsPremiumBlocked(false);

      try {
        let matchedItem: DashboardItem | null = await findItemDeeply(id).catch(() => null);
        if (!matchedItem) {
          const res = await apiFetch<{ success: boolean; item?: DashboardItem }>(
            `/api/resolve/${encodeURIComponent(id)}`
          ).catch(() => null);
          matchedItem = res?.item || null;
        }

        if (!matchedItem) {
          if (!cancelled) setErrorMsg("এই PDF নোটটি খুঁজে পাওয়া যায়নি বা সরিয়ে ফেলা হয়েছে।");
          return;
        }

        const itemPremium = Boolean(matchedItem.isPremium || matchedItem.examConfig?.isPremium);
        const resolvedTitle = matchedItem.title || "PDF Note";

        let rawTarget = "";
        let resolvedNoteKey = matchedItem.id;

        if (isAttachedExamNote || matchedItem.type === "EXAM_FIREBASE") {
          rawTarget = matchedItem.examConfig?.attachedNoteLink || "";
          resolvedNoteKey = `${matchedItem.id}_note`;
        } else {
          rawTarget = matchedItem.command || "";
          resolvedNoteKey = matchedItem.id;
        }

        if (!rawTarget) {
          if (!cancelled) setErrorMsg("PDF নোটের লিংক সংযুক্ত করা নেই।");
          return;
        }

        if (itemPremium && !isPro) {
          if (!cancelled) {
            setTitle(resolvedTitle);
            setIsPremiumBlocked(true);
            setErrorMsg("👑 এটি একটি প্রিমিয়াম PDF নোট! এটি পড়তে PRO মেম্বারশিপ প্রয়োজন।");
          }
          return;
        }

        const resolvedUrl = resolveServerMediaUrl(rawTarget);
        const token = resolvedUrl.startsWith(API_BASE_URL) ? await getAuthToken() : null;

        if (!cancelled) {
          setTitle(resolvedTitle);
          setCanonicalNoteId(resolvedNoteKey);
          setPdfUrl(resolvedUrl);
          setIsPremiumNote(itemPremium);
          setAuthToken(token);
        }
      } catch (e) {
        console.error("Failed to resolve PDF note:", e);
        if (!cancelled) {
          setErrorMsg("নোট লোড করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolveNoteAccess();
    return () => {
      cancelled = true;
    };
  }, [id, isAttachedExamNote, isPro, authLoading]);

  const watermarkText = profile
    ? `${profile.name} • ${profile.username ? `@${profile.username}` : profile.uid.slice(0, 6)}`
    : user
    ? `${user.displayName || "Student"} • ${user.uid.slice(0, 6)}`
    : "Learn Hive • Reader";

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-gray-400 animate-pulse">নোট যাচাই ও প্রস্তুত হচ্ছে...</p>
      </div>
    );
  }

  if (errorMsg || !pdfUrl) {
    return (
      <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#121218] border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          {isPremiumBlocked && (
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400 mb-4">
              <Lock size={28} />
            </div>
          )}
          <p className="text-sm font-bold text-gray-200 mb-5">{errorMsg || "PDF পাওয়া যায়নি।"}</p>
          <div className="flex flex-col gap-2.5">
            {isPremiumBlocked && (
              <Link
                href={user ? "/premium" : "/login"}
                data-card-surface="custom"
                className="bg-amber-400 hover:bg-amber-300 text-black font-black px-6 py-3 rounded-2xl text-xs transition"
              >
                {user ? "PRO মেম্বারশিপ নিন 👑" : "লগইন / অ্যাকাউন্ট খুলুন"}
              </Link>
            )}
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold px-5 py-2.5 rounded-2xl text-xs transition"
            >
              <ArrowLeft size={14} /> ফিরে যান
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PdfReader
      noteId={canonicalNoteId}
      title={title}
      pdfUrl={pdfUrl}
      isPremium={isPremiumNote}
      watermarkText={watermarkText}
      authToken={authToken}
      onRefreshToken={refreshToken}
      onBack={() => router.back()}
    />
  );
}