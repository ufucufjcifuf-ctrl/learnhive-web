"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { fetchUserProfile, getCachedUserProfile, UserProfile } from "@/lib/authService";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setProfile(null);
      return null;
    }
    const fresh = await fetchUserProfile(current.uid);
    setProfile(fresh);
    return fresh;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        const cached = getCachedUserProfile();
        if (cached && cached.uid === fbUser.uid) {
          setProfile(cached);
        }
        const p = await fetchUserProfile(fbUser.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const isPro = Boolean(
    profile && !profile.isBanned && (profile.isPremium || (profile.premiumExpiry && profile.premiumExpiry > Date.now()))
  );

  return { user, profile, isPro, loading, refreshProfile };
}