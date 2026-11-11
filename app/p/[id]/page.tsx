import { Metadata } from "next";
import { getExamSeoData } from "@/lib/serverExamService";
import { AppRedirectButton } from "@/components/AppRedirectButton";
import { MathText } from "@/components/MathText";
import Link from "next/link";
import {
  ShieldCheck,
  Target,
  Clock,
  BookOpen,
  Star,
  Award,
  ChevronRight,
  HelpCircle,
  Play,
  ArrowLeft
} from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

// এসইও স্কিমার জন্য টেক্সট থেকে অপ্রয়োজনীয় HTML ও LaTeX চিহ্ন বাদ দেওয়ার হেল্পার
function sanitizeTextForSchema(text: string): string {
  if (!text) return "";
  return text
    .replace(/%%/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getExamSeoData(id);

  const ogImageUrl = `https://learnhive-web.vercel.app/api/og?title=${encodeURIComponent(
    data.title
  )}&q=${data.totalQuestions}&t=${data.durationMinutes}`;

  return {
    title: data.seoTitle,
    description: data.seoDescription,
    alternates: {
      canonical: `https://learnhive-web.vercel.app/p/${encodeURIComponent(data.slug)}`,
    },
    openGraph: {
      title: data.seoTitle,
      description: data.seoDescription,
      url: `https://learnhive-web.vercel.app/p/${encodeURIComponent(data.slug)}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: data.title }],
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

export default async function ExamLandingPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getExamSeoData(id);
  const teaserQuestions = data.questions.slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Quiz",
        "name": sanitizeTextForSchema(data.title),
        "description": sanitizeTextForSchema(data.seoDescription),
        "educationalLevel": "Intermediate",
        "timeRequired": `PT${data.durationMinutes}M`,
        "typicalAgeRange": "15-30",
        "hasPart": data.questions.slice(0, 5).map((q) => ({
          "@type": "Question",
          "name": sanitizeTextForSchema(q.text),
          "suggestedAnswer": q.options.map((opt) => ({
            "@type": "Answer",
            "text": sanitizeTextForSchema(opt),
          })),
        })),
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": `এই ${sanitizeTextForSchema(data.title)} মডেল টেস্টে অংশ নিতে কি কোনো ফি দিতে হবে?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "না, Learn Hive প্ল্যাটফর্মে এই মডেল টেস্টটি সম্পূর্ণ বিনামূল্যে অনলাইনে এবং অ্যান্ড্রয়েড অ্যাপে দেওয়া যায়।",
            },
          },
          {
            "@type": "Question",
            "name": "পরীক্ষা শেষে কি সঠিক উত্তর ও ব্যাখ্যা দেখা যাবে?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "হ্যাঁ, পরীক্ষা সাবমিট করার সাথে সাথেই প্রতিটি প্রশ্নের নির্ভুল সমাধান, বিস্তারিত ব্যাখ্যা এবং মেধা তালিকা দেখতে পাবেন।",
            },
          },
          {
            "@type": "Question",
            "name": "পরীক্ষাটিতে কি নেগেটিভ মার্কিং আছে?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": data.hasNegativeMark
                ? `হ্যাঁ, প্রতিটি সঠিক উত্তরের জন্য +${data.positiveMark} নম্বর এবং প্রতিটি ভুল উত্তরের জন্য -${data.negativeMark} নম্বর কর্তন করা হবে।`
                : "না, এই পরীক্ষায় কোনো নেগেটিভ মার্কিং নেই।",
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://learnhive-web.vercel.app",
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Exams",
            "item": "https://learnhive-web.vercel.app/search",
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": sanitizeTextForSchema(data.title),
            "item": `https://learnhive-web.vercel.app/p/${encodeURIComponent(data.slug)}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-white selection:bg-cyan-500 selection:text-black pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="w-full bg-[#121218]/80 border-b border-white/5 py-3.5 px-4 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={16} /> হোমপেজে ফিরুন
          </Link>
          <span className="text-xs font-black tracking-widest text-cyan-400">LEARN HIVE</span>
        </div>
      </header>

      <div className="w-full bg-cyan-950/40 border-b border-cyan-500/20 text-cyan-300 text-xs py-2.5 px-4 flex justify-center items-center gap-2">
        <Star size={14} className="text-cyan-400 fill-cyan-400 flex-shrink-0" />
        <span className="font-bold text-center">
          ল্যাগ-ফ্রি এক্সাম ও লাইভ মেধা তালিকার জন্য Learn Hive অ্যাপ ব্যবহার করুন!
        </span>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 overflow-x-auto no-scrollbar">
          <Link href="/" className="hover:text-cyan-400">হোম</Link>
          <ChevronRight size={12} />
          <Link href="/search" className="hover:text-cyan-400">মডেল টেস্ট</Link>
          <ChevronRight size={12} />
          <span className="text-gray-300 font-semibold line-clamp-1">{data.title}</span>
        </nav>

        <div className="text-center mb-8">
          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest inline-block mb-3">
            ফ্রি অনলাইন মডেল টেস্ট
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-3">
            <MathText text={data.title} />
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            {data.seoDescription}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-[#121218] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
            <Target size={22} className="text-emerald-400 mb-1.5" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">মোট প্রশ্ন</span>
            <span className="text-base font-black text-white">{data.totalQuestions > 0 ? data.totalQuestions : "২০+"} টি</span>
          </div>
          <div className="bg-[#121218] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
            <Clock size={22} className="text-amber-400 mb-1.5" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">সময়সীমা</span>
            <span className="text-base font-black text-white">{data.durationMinutes} মিনিট</span>
          </div>
          <div className="bg-[#121218] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
            <ShieldCheck size={22} className="text-cyan-400 mb-1.5" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">নেগেটিভ মার্কিং</span>
            <span className="text-base font-black text-white">{data.hasNegativeMark ? `-${data.negativeMark}` : "নেই"}</span>
          </div>
          <div className="bg-[#121218] border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg">
            <Award size={22} className="text-purple-400 mb-1.5" />
            <span className="text-[10px] text-gray-500 font-bold uppercase">মেধা তালিকা</span>
            <span className="text-base font-black text-white">লাইভ র‍্যাঙ্কিং</span>
          </div>
        </div>

        <div className="mb-10">
          <AppRedirectButton examId={data.command} examTitle={data.title} />
        </div>

        {data.syllabusNote && (
          <div className="mb-8 bg-[#121218] border border-white/5 p-6 rounded-3xl shadow-xl">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2 mb-2 text-amber-400">
              <BookOpen size={16} /> পরীক্ষার সিলেবাস ও নির্দেশিকা
            </h3>
            <div className="text-gray-300 text-xs leading-relaxed">
              <MathText text={data.syllabusNote} />
            </div>
          </div>
        )}

        {teaserQuestions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xs text-cyan-400">
                📝
              </span>
              প্রশ্নপত্রের নমুনা প্রিভিউ
            </h2>

            <div className="flex flex-col gap-4">
              {teaserQuestions.map((q, idx) => (
                <div key={idx} className="bg-[#121218] border border-white/5 p-5 rounded-3xl shadow-xl relative overflow-hidden">
                  {idx === 2 && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121218] via-[#121218]/90 to-transparent z-10 flex flex-col items-center justify-end pb-6">
                      <p className="text-cyan-400 font-bold text-xs mb-2">
                        বাকি {data.totalQuestions - 2}টি প্রশ্ন ও ব্যাখ্যা দেখতে পরীক্ষা শুরু করুন
                      </p>
                      <Link
                        href={`/exam/${encodeURIComponent(data.slug || data.command)}?title=${encodeURIComponent(data.title)}`}
                        className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
                      >
                        <Play size={14} className="fill-black" /> পরীক্ষা দিন
                      </Link>
                    </div>
                  )}

                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-1.5">
                    প্রশ্ন নম্বর #{idx + 1}
                  </span>
                  <div className="text-gray-200 font-bold text-sm mb-3">
                    <MathText text={q.text} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 opacity-70">
                    {q.options.slice(0, 4).map((opt, oIdx) => (
                      <div key={oIdx} className="bg-white/5 border border-white/5 p-2.5 rounded-xl text-xs text-gray-300 flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-400">
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <MathText text={opt} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 bg-[#121218] border border-white/5 p-6 rounded-3xl shadow-xl">
          <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
            <HelpCircle size={18} className="text-amber-400" /> সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)
          </h2>

          <div className="flex flex-col gap-3 text-xs">
            <div className="bg-white/5 p-3.5 rounded-2xl">
              <h4 className="font-bold text-cyan-300 mb-1">এই পরীক্ষাটি কি সম্পূর্ণ ফ্রি?</h4>
              <p className="text-gray-400 leading-relaxed">
                হ্যাঁ, Learn Hive প্ল্যাটফর্মে এই মডেল টেস্টে অংশ নিতে কোনো ফি দিতে হয় না। আপনি সরাসরি ওয়েবসাইট বা অ্যান্ড্রয়েড অ্যাপ থেকে পরীক্ষা দিতে পারবেন।
              </p>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl">
              <h4 className="font-bold text-cyan-300 mb-1">পরীক্ষা শেষে কি সমাধান ও ব্যাখ্যা পাওয়া যাবে?</h4>
              <p className="text-gray-400 leading-relaxed">
                হ্যাঁ, খাতা জমা দেওয়ার সাথে সাথে আপনি সম্পূর্ণ নির্ভুল সমাধান, বিস্তারিত ব্যাখ্যা এবং গ্লোবাল মেধা তালিকায় আপনার অবস্থান দেখতে পাবেন।
              </p>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl">
              <h4 className="font-bold text-cyan-300 mb-1">ভুল উত্তরের জন্য কি নম্বর কাটা যাবে?</h4>
              <p className="text-gray-400 leading-relaxed">
                {data.hasNegativeMark
                  ? `হ্যাঁ, প্রতিটি ভুল উত্তরের জন্য ${data.negativeMark} নম্বর কর্তন করা হবে।`
                  : "না, এই মডেল টেস্টে কোনো নেগেটিভ মার্কিং নেই।"}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}