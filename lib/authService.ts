import { auth, db, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  referralCode: string;
  isPremium: boolean;
  premiumExpiry: number;
  totalScore: number;
  badges: string[];
  isReferralClaimed: boolean;
}

export function generateReferralCode(name: string): string {
  const prefix = name.replace(/\s+/g, "").slice(0, 3).toUpperCase() || "USR";
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNum}`;
}

// ১. গুগল দিয়ে সাইন-ইন
export async function signInWithGoogle(): Promise<UserProfile | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser: FirebaseUser = result.user;

    const userRef = doc(db, "users", fbUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      await updateDoc(userRef, { lastLoginTimestamp: Date.now() });
      return data;
    } else {
      const newUser: UserProfile = {
        uid: fbUser.uid,
        name: fbUser.displayName || "Student",
        email: fbUser.email || "",
        photoUrl: fbUser.photoURL,
        referralCode: generateReferralCode(fbUser.displayName || "User"),
        isPremium: false,
        premiumExpiry: 0,
        totalScore: 0,
        badges: ["newbie"],
        isReferralClaimed: false,
      };
      await setDoc(userRef, newUser);
      return newUser;
    }
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    return null;
  }
}

// ২. ইমেইল ও পাসওয়ার্ড দিয়ে সাইন-আপ
export async function signUpWithEmail(
  name: string,
  email: string,
  pass: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  try {
    const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = res.user;

    await updateProfile(fbUser, { displayName: name.trim() });

    const newUser: UserProfile = {
      uid: fbUser.uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      photoUrl: null,
      referralCode: generateReferralCode(name),
      isPremium: false,
      premiumExpiry: 0,
      totalScore: 0,
      badges: ["newbie"],
      isReferralClaimed: false,
    };

    await setDoc(doc(db, "users", fbUser.uid), newUser);
    return { user: newUser, error: null };
  } catch (err: any) {
    let msg = "সাইন-আপ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।";
    if (err.code === "auth/email-already-in-use") msg = "এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে।";
    else if (err.code === "auth/weak-password") msg = "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।";
    else if (err.code === "auth/invalid-email") msg = "ইমেইল অ্যাড্রেসটি সঠিক নয়।";
    return { user: null, error: msg };
  }
}

// ৩. ইমেইল ও পাসওয়ার্ড দিয়ে লগইন
export async function signInWithEmail(
  email: string,
  pass: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  try {
    const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = res.user;

    const userRef = doc(db, "users", fbUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      await updateDoc(userRef, { lastLoginTimestamp: Date.now() });
      return { user: snap.data() as UserProfile, error: null };
    } else {
      const fallbackUser: UserProfile = {
        uid: fbUser.uid,
        name: fbUser.displayName || "Student",
        email: fbUser.email || "",
        photoUrl: null,
        referralCode: generateReferralCode(fbUser.displayName || "User"),
        isPremium: false,
        premiumExpiry: 0,
        totalScore: 0,
        badges: ["newbie"],
        isReferralClaimed: false,
      };
      await setDoc(userRef, fallbackUser);
      return { user: fallbackUser, error: null };
    }
  } catch (err: any) {
    let msg = "লগইন ব্যর্থ হয়েছে। ইমেইল ও পাসওয়ার্ড যাচাই করুন।";
    if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
      msg = "ভুল ইমেইল অথবা পাসওয়ার্ড প্রদান করেছেন!";
    }
    return { user: null, error: msg };
  }
}

// ৪. পাসওয়ার্ড রিসেট ইমেইল পাঠানো
export async function resetPasswordEmail(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true, error: null };
  } catch (err: any) {
    let msg = "পাসওয়ার্ড রিসেট ইমেইল পাঠানো যায়নি।";
    if (err.code === "auth/user-not-found") msg = "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট খোলা নেই।";
    else if (err.code === "auth/invalid-email") msg = "ইমেইল অ্যাড্রেসটি সঠিক নয়।";
    return { success: false, error: msg };
  }
}

// ৫. লগআউট
export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
  if (typeof window !== "undefined") {
    localStorage.removeItem("mcqhub_user_profile");
  }
}

// ৬. প্রোফাইল লোড
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}