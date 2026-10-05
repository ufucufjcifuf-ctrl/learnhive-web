"use client";

import React, { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Video, ExternalLink } from "lucide-react";

export default function VideoPlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id ? decodeURIComponent(String(params.id)) : "";
  const title = searchParams.get("title") || "Video Class";

  // ইউটিউব আইডি বের করার সহজ লজিক (Android YoutubeUrlParser এর মতো)
  const extractVideoId = (urlOrId: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrId.match(regExp);
    return match && match[2].length === 11 ? match[2] : urlOrId;
  };

  const videoId = extractVideoId(id);

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white flex flex-col items-center selection:bg-cyan-500 selection:text-black">
      {/* হেডার */}
      <header className="w-full max-w-4xl flex justify-between items-center px-4 md:px-8 py-3.5 border-b border-white/10 bg-[#121218]/90 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-bold text-sm md:text-base text-white line-clamp-1">{title}</h1>
            <p className="text-[11px] text-red-400 font-semibold flex items-center gap-1">
              <Video size={12} /> ভিডিও ক্লাস
            </p>
          </div>
        </div>

        <a
          href={`https://youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10"
        >
          YouTube <ExternalLink size={12} />
        </a>
      </header>

      {/* প্লেয়ার কন্টেইনার */}
      <main className="w-full max-w-4xl p-4 md:p-6 flex flex-col gap-6">
        <div className="w-full aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>

        <div className="bg-[#121218] border border-white/5 rounded-3xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            মনোযোগ দিয়ে ক্লাসটি উপভোগ করুন। কোনো প্রশ্নের সমাধান বুঝতে অসুবিধা হলে এই বিষয়ের উপর কাস্টম মডেল টেস্ট দিয়ে প্রস্তুতি যাচাই করতে পারেন।
          </p>
        </div>
      </main>
    </div>
  );
}