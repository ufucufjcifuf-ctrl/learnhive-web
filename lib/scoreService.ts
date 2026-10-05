import { db, auth } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";

// শিক্ষার্থীর গ্লোবাল স্কোর বৃদ্ধি করার ফাংশন (Android incrementUserScore এর সমতুল্য)
export async function syncUserGlobalScore(score: number): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || score <= 0) return;

  try {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      totalScore: increment(score),
      lastActiveTimestamp: Date.now(),
    });
  } catch (error) {
    console.error("Failed to sync global score:", error);
  }
}