"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { API_BASE_URL, apiFetch, ApiError, getAuthToken } from "@/lib/apiClient";
import {
  PaymentMethod,
  PremiumConfig,
  PremiumPackage,
  PremiumRequestItem,
} from "@/types";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Eye,
  FileText,
  ImagePlus,
  LogIn,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  XCircle,
  Zap,
} from "lucide-react";

interface PaymentChannel {
  method: PaymentMethod;
  label: string;
  number: string;
  note: string;
  accentClass: string;
  badgeBgClass: string;
}

const DEFAULT_CONFIG: PremiumConfig = {
  instructions:
    "পছন্দের প্যাকেজের সমপরিমাণ টাকা নিচের যেকোনো নম্বরে পাঠিয়ে Transaction ID এবং স্ক্রিনশট সহ রিকোয়েস্ট সাবমিট করুন।",
  whatsappNumber: "",
  facebookLink: "",
  bkashNumber: "",
  bkashNote: "Personal (Send Money)",
  nagadNumber: "",
  nagadNote: "Personal (Send Money)",
  rocketNumber: "",
  rocketNote: "Personal (Send Money)",
  buyRules: "",
  packages: [],
};

async function compressScreenshotInBrowser(file: File): Promise<File> {
  const maxDim = 1400;
  const imgUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("ছবিটি পড়া যায়নি। অনুগ্রহ করে সঠিক ছবি দিন।"));
      el.src = imgUrl;
    });

    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || 800) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 800) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("ব্রাউজার ক্যানভাস সাপোর্ট পাওয়া যায়নি।");
    }
    ctx.drawImage(img, 0, 0, width, height);

    const toBlobAsync = (mime: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));

    let blob = await toBlobAsync("image/webp", 0.84);
    let finalMime = "image/webp";
    let finalExt = "webp";

    // Safari/older WebView fallback if WebP encoding returned PNG or failed
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlobAsync("image/jpeg", 0.85);
      finalMime = "image/jpeg";
      finalExt = "jpg";
    }

    if (!blob) {
      throw new Error("ছবি কম্প্রেস করতে ব্যর্থ হয়েছে।");
    }

    const baseName = file.name.replace(/\.[^/.]+$/, "").slice(0, 40) || "payment_proof";
    return new File([blob], `${baseName}.${finalExt}`, { type: finalMime });
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

export default function PremiumPage() {
  const router = useRouter();
  const { user, profile, isPro, loading: authLoading, refreshProfile } = useAuth();

  const [config, setConfig] = useState<PremiumConfig>(DEFAULT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [myRequests, setMyRequests] = useState<PremiumRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ text: string; isError: boolean } | null>(null);

  // Checkout Modal State
  const [checkoutPkg, setCheckoutPkg] = useState<PremiumPackage | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("BKASH");
  const [transactionId, setTransactionId] = useState("");
  const [senderPhoneLast, setSenderPhoneLast] = useState("");
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Screenshot Modal Viewer State
  const [viewingShotUrl, setViewingShotUrl] = useState<string | null>(null);
  const [loadingShotId, setLoadingShotId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await apiFetch<{ success: boolean; premium?: Partial<PremiumConfig> }>(
        "/api/config/public",
        { cache: "no-store" }
      );
      if (res?.premium) {
        const p = res.premium;
        setConfig({
          instructions: p.instructions || DEFAULT_CONFIG.instructions,
          whatsappNumber: p.whatsappNumber || "",
          facebookLink: p.facebookLink || "",
          bkashNumber: p.bkashNumber || "",
          bkashNote: p.bkashNote || "Personal (Send Money)",
          nagadNumber: p.nagadNumber || "",
          nagadNote: p.nagadNote || "Personal (Send Money)",
          rocketNumber: p.rocketNumber || "",
          rocketNote: p.rocketNote || "Personal (Send Money)",
          buyRules: p.buyRules || "",
          packages: Array.isArray(p.packages) ? p.packages : [],
        });
      }
    } catch {
      // keep defaults
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const loadMyRequests = useCallback(async () => {
    if (!user) {
      setMyRequests([]);
      return;
    }
    setLoadingRequests(true);
    try {
      const res = await apiFetch<{ success: boolean; requests: PremiumRequestItem[] }>(
        "/api/premium/my-requests",
        { requireAuth: true, cache: "no-store" }
      );
      setMyRequests(res.requests || []);
    } catch {
      // non-fatal
    } finally {
      setLoadingRequests(false);
    }
  }, [user]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!authLoading) {
      loadMyRequests();
    }
  }, [authLoading, loadMyRequests]);

  // Cleanup preview & viewer object URLs on unmount/change
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (viewingShotUrl) URL.revokeObjectURL(viewingShotUrl);
    };
  }, [viewingShotUrl]);

  const paymentChannels = useMemo<PaymentChannel[]>(() => {
    const list: PaymentChannel[] = [];
    if (config.bkashNumber?.trim()) {
      list.push({
        method: "BKASH",
        label: "bKash",
        number: config.bkashNumber.trim(),
        note: config.bkashNote?.trim() || "Personal (Send Money)",
        accentClass: "border-pink-500/40 bg-pink-500/10 text-pink-300",
        badgeBgClass: "bg-[#E2136E] text-white",
      });
    }
    if (config.nagadNumber?.trim()) {
      list.push({
        method: "NAGAD",
        label: "Nagad",
        number: config.nagadNumber.trim(),
        note: config.nagadNote?.trim() || "Personal (Send Money)",
        accentClass: "border-orange-500/40 bg-orange-500/10 text-orange-300",
        badgeBgClass: "bg-[#F7941D] text-black",
      });
    }
    if (config.rocketNumber?.trim()) {
      list.push({
        method: "ROCKET",
        label: "Rocket",
        number: config.rocketNumber.trim(),
        note: config.rocketNote?.trim() || "Personal (Send Money)",
        accentClass: "border-purple-500/40 bg-purple-500/10 text-purple-300",
        badgeBgClass: "bg-[#8C3494] text-white",
      });
    }
    return list;
  }, [config]);

  const visiblePackages = useMemo(
    () => (config.packages || []).filter((pkg) => !pkg.isHidden),
    [config.packages]
  );

  const hasPendingRequest = useMemo(
    () => myRequests.some((r) => r.status === "PENDING"),
    [myRequests]
  );

  const handleCopy = (key: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const openCheckout = (pkg: PremiumPackage) => {
    if (!user) {
      router.push("/login?redirect=%2Fpremium");
      return;
    }
    if (hasPendingRequest) {
      setStatusBanner({
        text: "আপনার একটি পেমেন্ট রিকোয়েস্ট ইতিমধ্যে যাচাইয়ের অপেক্ষায় (PENDING) আছে।",
        isError: true,
      });
      return;
    }
    if (paymentChannels.length === 0) {
      setStatusBanner({
        text: "বর্তমানে কোনো পেমেন্ট নম্বর সক্রিয় নেই। অনুগ্রহ করে পরে চেষ্টা করুন।",
        isError: true,
      });
      return;
    }

    setSelectedMethod(paymentChannels[0].method);
    setTransactionId("");
    setSenderPhoneLast("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCompressedFile(null);
    setFormError(null);
    setCheckoutPkg(pkg);
  };

  const closeCheckout = () => {
    if (submitting) return;
    setCheckoutPkg(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCompressedFile(null);
    setFormError(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    e.target.value = "";
    if (!rawFile) return;

    setFormError(null);
    setCompressing(true);
    try {
      const processed = await compressScreenshotInBrowser(rawFile);
      if (processed.size > 5 * 1024 * 1024) {
        setFormError("ছবিটি ৫ MB-এর চেয়ে বড়। অনুগ্রহ করে ছোট স্ক্রিনশট নির্বাচন করুন।");
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const nextUrl = URL.createObjectURL(processed);
      setCompressedFile(processed);
      setPreviewUrl(nextUrl);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "ছবি প্রসেস করতে সমস্যা হয়েছে।");
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPkg || submitting) return;

    const cleanTrx = transactionId.trim().toUpperCase().replace(/\s+/g, "");
    const cleanPhone = senderPhoneLast.replace(/[^0-9+]/g, "").trim();

    if (!/^[A-Z0-9_-]{4,40}$/.test(cleanTrx)) {
      setFormError("সঠিক Transaction ID লিখুন (৪–৪০ অক্ষর/সংখ্যা)।");
      return;
    }
    if (!/^[0-9+]{4,15}$/.test(cleanPhone)) {
      setFormError("যে নম্বর থেকে টাকা পাঠিয়েছেন তার শেষ ৪–১১ ডিজিট লিখুন।");
      return;
    }
    if (!compressedFile) {
      setFormError("অনুগ্রহ করে পেমেন্ট স্ক্রিনশট আপলোড করুন।");
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("packageId", checkoutPkg.id);
      formData.append("paymentMethod", selectedMethod);
      formData.append("transactionId", cleanTrx);
      formData.append("senderPhoneLast", cleanPhone);
      formData.append("screenshot", compressedFile);

      const res = await apiFetch<{ success: boolean; message: string }>("/api/premium/request", {
        method: "POST",
        requireAuth: true,
        body: formData,
      });

      setCheckoutPkg(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCompressedFile(null);

      setStatusBanner({
        text: res.message || "পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে!",
        isError: false,
      });
      await Promise.all([loadMyRequests(), refreshProfile()]);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "পেমেন্ট রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewMyScreenshot = async (req: PremiumRequestItem) => {
    if (!req.screenshotPath) return;
    setLoadingShotId(req.id);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}${req.screenshotPath}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        alert("স্ক্রিনশটটি লোড করা যায়নি বা মুছে ফেলা হয়েছে।");
        return;
      }
      const blob = await res.blob();
      if (viewingShotUrl) URL.revokeObjectURL(viewingShotUrl);
      setViewingShotUrl(URL.createObjectURL(blob));
    } catch {
      alert("স্ক্রিনশট লোড করতে সমস্যা হয়েছে।");
    } finally {
      setLoadingShotId(null);
    }
  };

  const proExpiryLabel = useMemo(() => {
    if (!profile) return null;
    if (profile.isPremium) return "Lifetime Pro";
    if (profile.premiumExpiry && profile.premiumExpiry > Date.now()) {
      return new Date(profile.premiumExpiry).toLocaleDateString("bn-BD", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return null;
  }, [profile]);

  const rulesText = (config.buyRules || config.instructions || "").trim();
  const activeChannel = paymentChannels.find((c) => c.method === selectedMethod);

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center p-4 md:p-6 selection:bg-amber-500 selection:text-black">
      <div className="w-full max-w-3xl pb-24">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-extrabold text-base md:text-lg text-amber-400 flex items-center gap-2">
                <Sparkles size={20} /> প্রিমিয়াম এক্সেস (Go Pro)
              </h1>
              <p className="text-[11px] text-gray-400">
                বিজ্ঞাপনমুক্ত অভিজ্ঞতা, সব ব্যাখ্যা ও প্রিমিয়াম কনটেন্ট আনলক করুন
              </p>
            </div>
          </div>

          {user && (
            <button
              type="button"
              onClick={() => {
                loadMyRequests();
                refreshProfile();
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 transition"
              title="স্ট্যাটাস রিফ্রেশ করুন"
            >
              <RefreshCw size={16} className={loadingRequests ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        {/* Status Hero Card */}
        <div className="bg-gradient-to-br from-amber-500/15 via-[#161620] to-[#121218] border border-amber-500/30 rounded-3xl p-6 mb-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-2">
                <Crown size={12} /> {isPro ? "PRO MEMBERSHIP ACTIVE" : "MEMBERSHIP PLANS"}
              </span>
              <h2 className="text-lg md:text-2xl font-black text-white">
                {isPro
                  ? `আপনার Pro মেম্বারশিপ সক্রিয় (${proExpiryLabel})`
                  : "আপনার প্রস্তুতিকে নিন অনন্য উচ্চতায়"}
              </h2>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                {isPro
                  ? "এখনই মেয়াদ আরও বাড়াতে চাইলে নিচের যেকোনো প্যাকেজ কিনতে পারেন।"
                  : "নিচের নম্বরগুলোতে টাকা পাঠিয়ে ট্রানজ্যাকশন আইডি ও স্ক্রিনশট সাবমিট করলেই স্বল্প সময়ে Pro সক্রিয় হয়ে যাবে।"}
              </p>
            </div>
          </div>

          {user ? (
            <div className="mt-5 bg-black/50 border border-white/10 rounded-2xl p-3 flex justify-between items-center text-xs">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-gray-400 block">লগইন করা অ্যাকাউন্ট</span>
                <span className="text-cyan-400 font-bold truncate block">
                  {profile?.name || user.displayName || "Student"} ({profile?.email || user.email || user.uid})
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("uid", user.uid)}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl font-bold text-gray-200 transition flex-shrink-0"
              >
                {copiedKey === "uid" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>UID</span>
              </button>
            </div>
          ) : (
            <div className="mt-5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-200">
                <b className="text-cyan-300 block mb-0.5">লগইন প্রয়োজন</b>
                প্যাকেজ কিনতে ও পেমেন্ট সাবমিট করতে অনুগ্রহ করে আগে লগইন করুন।
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href="/login?redirect=%2Fpremium"
                  data-card-surface="custom"
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <LogIn size={14} /> লগইন
                </Link>
                <Link
                  href="/signup?redirect=%2Fpremium"
                  className="bg-white/10 hover:bg-white/15 text-white font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  অ্যাকাউন্ট খুলুন
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Inline Notification Banner */}
        {statusBanner && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 ${
              statusBanner.isError
                ? "bg-red-500/10 border-red-500/35 text-red-300"
                : "bg-emerald-500/10 border-emerald-500/35 text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusBanner.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{statusBanner.text}</span>
            </div>
            <button type="button" onClick={() => setStatusBanner(null)} className="p-1 opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* My Payment Requests Tracker */}
        {user && myRequests.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock size={14} /> আমার পেমেন্ট রিকোয়েস্টসমূহ ({myRequests.length})
            </h3>
            <div className="flex flex-col gap-3">
              {myRequests.map((req) => {
                const isPending = req.status === "PENDING";
                const isApproved = req.status === "APPROVED";
                const dateStr = new Date(req.createdAt).toLocaleString("bn-BD", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={req.id}
                    className={`bg-[#121218] border rounded-2xl p-4 shadow-lg ${
                      isPending
                        ? "border-amber-500/40"
                        : isApproved
                        ? "border-emerald-500/35"
                        : "border-red-500/35"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="font-extrabold text-sm text-white">
                          {req.packageTitle}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          (৳{req.packagePrice} • {req.durationDays} দিন)
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          isPending
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                            : isApproved
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "bg-red-500/15 border-red-500/40 text-red-300"
                        }`}
                      >
                        {isPending ? "⏳ যাচাই চলছে" : isApproved ? "✅ অনুমোদিত" : "❌ বাতিল"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
                      <span>
                        {req.paymentMethod} • TrxID:{" "}
                        <b className="font-mono text-cyan-300">{req.transactionId}</b> • প্রেরক:{" "}
                        <b className="font-mono text-gray-200">{req.senderPhoneLast}</b>
                      </span>
                      <span>{dateStr}</span>
                    </div>

                    {req.status === "REJECTED" && req.adminNote && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-1.5">
                        <XCircle size={14} className="flex-shrink-0" />
                        <span>বাতিলের কারণ: {req.adminNote}</span>
                      </div>
                    )}

                    {req.hasScreenshot && req.screenshotPath && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleViewMyScreenshot(req)}
                          disabled={loadingShotId === req.id}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-3 py-1 rounded-xl transition"
                        >
                          <Eye size={13} />
                          {loadingShotId === req.id ? "লোড হচ্ছে..." : "জমা দেওয়া স্ক্রিনশট দেখুন"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Payment Numbers & Rules */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[#121218] border border-white/10 rounded-3xl p-5 shadow-xl">
            <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <ShieldCheck size={15} /> টাকা পাঠানোর নম্বর (Payment Numbers)
            </h3>

            {loadingConfig ? (
              <p className="text-xs text-gray-500 animate-pulse py-4">লোড হচ্ছে...</p>
            ) : paymentChannels.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">
                পেমেন্ট নম্বর এখনো কনফিগার করা হয়নি।
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {paymentChannels.map((ch) => (
                  <div
                    key={ch.method}
                    className={`rounded-2xl border p-3.5 flex items-center justify-between gap-2 ${ch.accentClass}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          data-card-surface="custom"
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${ch.badgeBgClass}`}
                        >
                          {ch.label}
                        </span>
                        <span className="text-[11px] text-gray-300 truncate">{ch.note}</span>
                      </div>
                      <p className="font-mono font-black text-base text-white mt-1 tracking-wide">
                        {ch.number}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(ch.method, ch.number)}
                      className="flex items-center gap-1 bg-black/40 hover:bg-black/60 border border-white/15 px-3 py-2 rounded-xl text-xs font-bold text-white transition flex-shrink-0"
                    >
                      {copiedKey === ch.method ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="text-emerald-400">কপি!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>কপি</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#121218] border border-white/10 rounded-3xl p-5 shadow-xl">
            <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <FileText size={15} /> পেমেন্ট নির্দেশনা ও নিয়মাবলী
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
              {rulesText}
            </p>
          </div>
        </section>

        {/* Packages Grid */}
        <section>
          <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-widest mb-3">
            প্যাকেজ নির্বাচন করুন ({visiblePackages.length} টি)
          </h3>

          {loadingConfig ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400">প্যাকেজ সমূহ লোড হচ্ছে...</p>
            </div>
          ) : visiblePackages.length === 0 ? (
            <div className="bg-[#121218] border border-white/5 rounded-3xl p-10 text-center text-gray-400 text-sm">
              বর্তমানে কোনো প্যাকেজ সক্রিয় নেই।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visiblePackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`bg-[#121218] rounded-3xl p-6 border relative flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 ${
                    pkg.isPopular
                      ? "border-amber-400/60 shadow-xl shadow-amber-500/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  {pkg.isPopular && (
                    <span className="absolute top-4 right-4 bg-amber-400 text-black font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      জনপ্রিয়
                    </span>
                  )}

                  <div>
                    <h4 className="font-extrabold text-lg text-white pr-14">{pkg.title}</h4>
                    <div className="flex items-baseline gap-1 my-3">
                      <span className="text-3xl font-black text-amber-400">৳{pkg.price}</span>
                      <span className="text-xs text-gray-400">/ {pkg.durationDays} দিন</span>
                    </div>

                    <ul className="flex flex-col gap-2 my-4 text-xs text-gray-300">
                      {pkg.features
                        .split(",")
                        .map((f) => f.trim())
                        .filter(Boolean)
                        .map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCheckout(pkg)}
                    disabled={Boolean(user && hasPendingRequest)}
                    data-card-surface="custom"
                    className="w-full mt-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-45 text-black font-extrabold py-3.5 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
                  >
                    <Zap size={14} className="fill-black" />
                    {!user
                      ? "লগইন করে কিনুন"
                      : hasPendingRequest
                      ? "একটি রিকোয়েস্ট যাচাই চলছে"
                      : "প্যাকেজটি কিনুন"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Checkout Modal */}
      {checkoutPkg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121218] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="font-black text-base text-white">{checkoutPkg.title}</h3>
                <p className="text-xs text-amber-400 font-bold">
                  পরিশোধযোগ্য: ৳{checkoutPkg.price} ({checkoutPkg.durationDays} দিন)
                </p>
              </div>
              <button
                type="button"
                onClick={closeCheckout}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  পেমেন্ট মেথড নির্বাচন করুন
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentChannels.map((ch) => {
                    const active = selectedMethod === ch.method;
                    return (
                      <button
                        key={ch.method}
                        type="button"
                        onClick={() => setSelectedMethod(ch.method)}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-extrabold transition ${
                          active
                            ? "border-cyan-400 bg-cyan-500/15 text-cyan-300"
                            : "border-white/10 bg-white/5 text-gray-400"
                        }`}
                      >
                        {ch.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeChannel && (
                <div className="bg-black/40 border border-white/10 rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">
                      {activeChannel.label} ({activeChannel.note})
                    </span>
                    <span className="font-mono font-black text-sm text-white">
                      {activeChannel.number}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy("modal_num", activeChannel.number)}
                    className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl font-bold text-cyan-300 text-xs flex items-center gap-1"
                  >
                    {copiedKey === "modal_num" ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedKey === "modal_num" ? "কপি!" : "কপি"}</span>
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Transaction ID (TrxID)
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  placeholder="যেমন: BH94K2L8P1"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs md:text-sm font-mono uppercase text-white focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  যে নম্বর থেকে পাঠিয়েছেন (পূর্ণ নম্বর বা শেষ ৪ ডিজিট)
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="যেমন: 017XXXXXXXX বা 1234"
                  value={senderPhoneLast}
                  onChange={(e) => setSenderPhoneLast(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs md:text-sm font-mono text-white focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1.5">
                  পেমেন্ট স্ক্রিনশট (Screenshot)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-cyan-500/40 bg-black/40 p-2">
                    <img
                      src={previewUrl}
                      alt="Payment Screenshot Preview"
                      className="w-full max-h-44 object-contain rounded-xl"
                    />
                    <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-gray-400">
                      <span>
                        সাইজ: {compressedFile ? `${Math.round(compressedFile.size / 1024)} KB` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-cyan-400 font-bold hover:underline"
                      >
                        ছবি বদলান
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={compressing}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-2xl py-5 px-4 flex flex-col items-center gap-1.5 text-xs text-cyan-300 font-bold transition"
                  >
                    <ImagePlus size={22} />
                    <span>{compressing ? "ছবি প্রস্তুত হচ্ছে..." : "গ্যালারি থেকে স্ক্রিনশট সিলেক্ট করুন"}</span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      সর্বোচ্চ ৫ MB (স্বয়ংক্রিয়ভাবে কম্প্রেস হবে)
                    </span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || compressing}
                data-card-surface="custom"
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-45 text-black font-black py-3.5 rounded-2xl text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Upload size={15} />
                <span>{submitting ? "সাবমিট হচ্ছে..." : "পেমেন্ট সাবমিট করুন"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* My Screenshot Viewer Modal */}
      {viewingShotUrl && (
        <div
          onClick={() => {
            URL.revokeObjectURL(viewingShotUrl);
            setViewingShotUrl(null);
          }}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-[#121218] border border-white/15 rounded-3xl p-3"
          >
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(viewingShotUrl);
                setViewingShotUrl(null);
              }}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X size={16} />
            </button>
            <img
              src={viewingShotUrl}
              alt="Submitted Screenshot"
              className="w-full max-h-[75vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}