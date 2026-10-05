import { getExamHistory } from "@/lib/historyService";
import { UserProfile } from "@/lib/authService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const ALL_BADGES: Record<string, BadgeDefinition> = {
  newbie: {
    id: "newbie",
    name: "নতুন যোদ্ধা",
    description: "Learn Hive প্ল্যাটফর্মে যাত্রা শুরু করেছেন",
    icon: "🌱",
    color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  },
  sharpshooter: {
    id: "sharpshooter",
    name: "শার্পশুটার 🎯",
    description: "যেকোনো পরীক্ষায় ১০০% নির্ভুল স্কোর অর্জন করেছেন",
    icon: "🎯",
    color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
  },
  exam_conqueror: {
    id: "exam_conqueror",
    name: "এক্সাম বিজয়ী ⚔️",
    description: "কমপক্ষে ৫টি পূর্ণাঙ্গ পরীক্ষায় সফলভাবে অংশ নিয়েছেন",
    icon: "⚔️",
    color: "border-purple-500/40 text-purple-400 bg-purple-500/10",
  },
  scholar: {
    id: "scholar",
    name: "স্কলার 🧠",
    description: "সর্বমোট ১০০ বা তার বেশি গ্লোবাল পয়েন্ট অর্জন করেছেন",
    icon: "🧠",
    color: "border-blue-500/40 text-blue-400 bg-blue-500/10",
  },
  pro_member: {
    id: "pro_member",
    name: "প্রো মেম্বার 👑",
    description: "প্রিমিয়াম ভিআইপি মেম্বারশিপ সক্রিয় রয়েছে",
    icon: "👑",
    color: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  },
};

// ব্যাজ মূল্যায়ন ও আনলক করা
export async function evaluateAndAwardBadges(profile: UserProfile | null): Promise<string[]> {
  const currentBadges = new Set(profile?.badges || ["newbie"]);
  const history = getExamHistory();

  // ১. শার্পশুটার চেক (কোনো পরীক্ষায় ১০০% সঠিক কি না)
  if (history.some((h) => h.totalQuestions > 0 && h.correctAnswers === h.totalQuestions)) {
    currentBadges.add("sharpshooter");
  }

  // ২. এক্সাম বিজয়ী চেক (৫টির বেশি পরীক্ষা দিয়েছে কি না)
  if (history.length >= 5) {
    currentBadges.add("exam_conqueror");
  }

  // ৩. স্কলার চেক (১০০ এর বেশি স্কোর)
  if ((profile?.totalScore || 0) >= 100) {
    currentBadges.add("scholar");
  }

  // ৪. প্রো মেম্বার চেক
  if (profile?.isPremium || (profile?.premiumExpiry && profile.premiumExpiry > Date.now())) {
    currentBadges.add("pro_member");
  }

  const updatedList = Array.from(currentBadges);

  // ফায়ারবেসে সিঙ্ক
  if (profile?.uid && updatedList.length !== (profile.badges || []).length) {
    try {
      await updateDoc(doc(db, "users", profile.uid), { badges: updatedList });
    } catch (e) {}
  }

  return updatedList;
}