export interface StreakData {
  count: number;
  lastActiveDate: string; // YYYY-MM-DD
}

const STREAK_KEY = "mcqhub_daily_streak";

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// স্ট্রিক আপডেট করা (পরীক্ষা শেষ হলে কল করতে হবে)
export function recordDailyActivity(): number {
  if (typeof window === "undefined") return 1;

  const today = getTodayString();
  const yesterday = getYesterdayString();
  const stored = localStorage.getItem(STREAK_KEY);

  let current: StreakData = stored ? JSON.parse(stored) : { count: 0, lastActiveDate: "" };

  if (current.lastActiveDate === today) {
    // আজ অলরেডি একবার কাউন্ট হয়েছে
    return current.count;
  }

  if (current.lastActiveDate === yesterday) {
    // গতকাল পড়েছে, তাই স্ট্রিক ১ বাড়ল
    current.count += 1;
  } else {
    // একদিনের বেশি গ্যাপ পড়েছে, তাই স্ট্রিক আবার ১ থেকে শুরু
    current.count = 1;
  }

  current.lastActiveDate = today;
  localStorage.setItem(STREAK_KEY, JSON.stringify(current));
  return current.count;
}

// বর্তমান স্ট্রিক জানা
export function getCurrentStreak(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(STREAK_KEY);
  if (!stored) return 0;

  const current: StreakData = JSON.parse(stored);
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (current.lastActiveDate === today || current.lastActiveDate === yesterday) {
    return current.count;
  }

  return 0; // মিস করেছে
}