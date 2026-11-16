import { auth, googleProvider } from "@/lib/firebase";
import {
  signInWithPopup,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { apiFetch, ApiError, getWebDeviceId } from "@/lib/apiClient";
import { UserProfile } from "@/types";

export type { UserProfile };

const PROFILE_CACHE_KEY = "mcqhub_user_profile";
const inflightSync = new Map<string, Promise<UserProfile | null>>();

export function clearCachedUserProfile(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  }
}

export function getCachedUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export async function syncUserWithBackend(extra?: {
  name?: string;
  username?: string;
  photoUrl?: string | null;
}): Promise<{ user: UserProfile | null; error: string | null }> {
  const fbUser = auth.currentUser;
  if (!fbUser) return { user: null, error: null };

  try {
    const token = await fbUser.getIdToken();
    const res = await apiFetch<{ success: boolean; user: UserProfile }>("/api/user/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: extra?.name || fbUser.displayName || "",
        username: extra?.username || "",
        photoUrl: extra?.photoUrl ?? fbUser.photoURL ?? null,
        deviceId: getWebDeviceId(),
      },
    });

    if (typeof window !== "undefined" && res.user) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(res.user));
    }
    return { user: res.user, error: null };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      await fbSignOut(auth);
      clearCachedUserProfile();
      return { user: null, error: err.message };
    }
    return { user: null, error: err instanceof Error ? err.message : "Sync failed" };
  }
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const fbUser = auth.currentUser;
  if (!fbUser || fbUser.uid !== uid) return null;

  const existingPromise = inflightSync.get(uid);
  if (existingPromise) return existingPromise;

  const promise = syncUserWithBackend()
    .then((r) => r.user)
    .finally(() => {
      inflightSync.delete(uid);
    });

  inflightSync.set(uid, promise);
  return promise;
}

export async function signInWithGoogle(): Promise<{ user: UserProfile | null; error: string | null }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const synced = await syncUserWithBackend({
      name: result.user.displayName || "Student",
      photoUrl: result.user.photoURL,
    });
    return synced;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "auth/unauthorized-domain") {
      return {
        user: null,
        error: "Firebase Console-এ ডোমেইনটি Authorized Domain হিসেবে যোগ করতে হবে।",
      };
    }
    return { user: null, error: err.message || "Google লগইন ব্যর্থ হয়েছে।" };
  }
}

export async function signUpWithEmail(
  name: string,
  email: string,
  pass: string,
  username?: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  try {
    const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    await updateProfile(res.user, { displayName: name.trim() });

    const synced = await syncUserWithBackend({
      name: name.trim(),
      username: (username || email.split("@")[0]).trim().toLowerCase(),
    });
    return synced;
  } catch (err: unknown) {
    const e = err as { code?: string };
    let msg = "সাইন-আপ ব্যর্থ হয়েছে।";
    if (e.code === "auth/email-already-in-use") msg = "এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে।";
    else if (e.code === "auth/weak-password") msg = "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।";
    return { user: null, error: msg };
  }
}

export async function signInWithEmail(
  identifier: string,
  pass: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  try {
    let loginEmail = identifier.trim().toLowerCase();

    if (!loginEmail.includes("@")) {
      const resolved = await apiFetch<{ success: boolean; email: string }>("/api/user/resolve-login", {
        method: "POST",
        body: { identifier: loginEmail },
      });
      loginEmail = resolved.email;
    }

    await signInWithEmailAndPassword(auth, loginEmail, pass);
    const synced = await syncUserWithBackend();
    return synced;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      return { user: null, error: err.message };
    }
    return { user: null, error: "ভুল ইউজারনেম/ইমেইল অথবা পাসওয়ার্ড প্রদান করেছেন!" };
  }
}

export async function resetPasswordEmail(
  email: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true, error: null };
  } catch {
    return { success: false, error: "ইমেইলটি সঠিক নয় অথবা অ্যাকাউন্ট নেই।" };
  }
}

export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
  clearCachedUserProfile();
}