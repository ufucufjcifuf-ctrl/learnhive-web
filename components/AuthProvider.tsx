"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  fetchUserProfile,
  getCachedUserProfile,
  getPendingManualAuth,
  UserProfile,
} from "@/lib/authService";

export interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isPro: boolean;
  loading: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  isPro: false,
  loading: true,
  refreshProfile: async () => null,
});

export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
        const pending = getPendingManualAuth();
        if (pending) {
          await pending.catch(() => {});
          if (auth.currentUser?.uid !== fbUser.uid) return;
          const syncedCache = getCachedUserProfile();
          if (syncedCache && syncedCache.uid === fbUser.uid) {
            setProfile(syncedCache);
            setLoading(false);
            return;
          }
        }

        const cached = getCachedUserProfile();
        if (cached && cached.uid === fbUser.uid) {
          setProfile(cached);
        }
        const p = await fetchUserProfile(fbUser.uid);
        if (auth.currentUser?.uid === fbUser.uid) {
          setProfile(p);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const isPro = Boolean(
    profile &&
      !profile.isBanned &&
      (profile.isPremium || (profile.premiumExpiry && profile.premiumExpiry > Date.now()))
  );

  const value = useMemo(
    () => ({ user, profile, isPro, loading, refreshProfile }),
    [user, profile, isPro, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};