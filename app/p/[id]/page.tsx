import { Metadata } from "next";
import { getExamSeoData } from "@/lib/serverExamService";
import { AppRedirectButton } from "@/components/AppRedirectButton";
import { MathText } from "@/components/MathText";
import { ShieldCheck, Target, Clock, AlertTriangle, BookOpen, Star } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

// 🔥 1. Dynamic SEO & OG Image Generator (Next.js 16 Async Params Handled)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params; // 👈 Next.js 16 Breaking Change Fixed
  const data = await getExamSeoData(id);
  
  const ogImageUrl = `https://learnhive.vercel.app/api/og?title=${encodeURIComponent(
    data.seoTitle
  )}&q=${data.totalQuestions}&t=${data.durationMinutes}`;

  return {
    title: data.seoTitle,
    description: data.seoDescription,
    openGraph: {
      title: data.seoTitle,
      description: data.seoDescription,
      url: `https://learnhive.vercel.app/p/${data.slug}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: "website",
      siteName: "Learn Hive",
    },
    twitter: {
      card: "summary_large_image",
      title: data.seoTitle,
      description: data.seoDescription,
      images: [ogImageUrl],
    },
  };
}

// 🔥 2. Server Component Page (Next.js 16 Async Params Handled)
export default async function ExamLandingPage({ params }: PageProps) {
  const { id } = await params; // 👈 Next.js 16 Breaking Change Fixed
  const data = await getExamSeoData(id);
  const teaserQuestions = data.questions.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white selection:bg-cyan-500 selection:text-black pb-24">
      {/* Top Banner */}
      <div className="w-full bg-cyan-950/60 border-b border-cyan-500/20 text-cyan-300 text-xs py-2.5 px-4 flex justify-center items-center gap-2 sticky top-0 z-50 backdrop-blur-md">
        <Star size={14} className="text-cyan-400 fill-cyan-400" />
        <span className="font-bold text-center">
          Take this exam in the Learn Hive Android App for zero lag and global ranking!
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-12">
        <div className="text-center mb-10">
          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest inline-block mb-4">
            Free Model Test
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4">
            <MathText text={data.title} />
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed">
            {data.seoDescription}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <div className="bg-[#121218] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
            <Target size={24} className="text-emerald-400 mb-2" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Questions</span>
            <span className="text-lg font-black text-white">{data.totalQuestions}</span>
          </div>
          <div className="bg-[#121218] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
            <Clock size={24} className="text-amber-400 mb-2" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Duration</span>
            <span className="text-lg font-black text-white">{data.durationMinutes} Min</span>
          </div>
          <div className="bg-[#121218] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
            <ShieldCheck size={24} className="text-cyan-400 mb-2" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Negative Mark</span>
            <span className="text-lg font-black text-white">Yes</span>
          </div>
          <div className="bg-[#121218] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
            <BookOpen size={24} className="text-purple-400 mb-2" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">Platform</span>
            <span className="text-sm font-black text-white">App & Web</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-12">
          <AppRedirectButton examId={id} examTitle={data.title} />
        </div>

        {/* Teaser Content (To trick Google Bot into reading text) */}
        {teaserQuestions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm">💡</span>
              Exam Preview (Teaser)
            </h2>

            <div className="flex flex-col gap-4">
              {teaserQuestions.map((q, idx) => (
                <div key={idx} className="bg-[#121218] border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
                  {idx === 2 && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121218] via-[#121218]/80 to-transparent z-10 flex flex-col items-center justify-end pb-8">
                      <p className="text-cyan-400 font-bold text-sm mb-3">
                        View remaining {data.totalQuestions - 3} questions...
                      </p>
                    </div>
                  )}

                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-2">
                    Question {idx + 1}
                  </span>
                  <div className="text-gray-200 font-semibold text-base mb-4 line-clamp-3">
                    <MathText text={q.text} />
                  </div>
                  
                  <div className="flex flex-col gap-2 opacity-60">
                    {q.options.slice(0, 4).map((opt, oIdx) => (
                      <div key={oIdx} className="bg-white/5 border border-white/5 p-3 rounded-xl text-sm text-gray-400 flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold">
                          {String.fromCharCode(65 + oIdx)}
                        </div>
                        <MathText text={opt} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl">
              <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3" />
              <h3 className="font-bold text-white text-lg">Want to view solutions?</h3>
              <p className="text-sm text-gray-400 mt-2">
                Start the exam to view full questions, detailed step-by-step explanations, and your position on the global leaderboard.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}