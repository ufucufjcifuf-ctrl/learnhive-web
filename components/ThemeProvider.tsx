"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { syncServerTime } from "@/lib/apiClient";

export type ThemeMode = "DARK" | "LIGHT" | "SYSTEM";

interface ThemeContextValue {
  themeMode: ThemeMode;
  resolvedTheme: "dark" | "light";
  setThemeMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = "learnhive_theme_mode";

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "DARK",
  resolvedTheme: "dark",
  setThemeMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("DARK");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  const applyHtmlTheme = useCallback((mode: ThemeMode) => {
    if (typeof window === "undefined") return;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const target: "dark" | "light" =
      mode === "SYSTEM" ? (prefersDark ? "dark" : "light") : mode === "LIGHT" ? "light" : "dark";

    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(target);
    setResolvedTheme(target);
  }, []);

  useEffect(() => {
    syncServerTime();

    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const initial: ThemeMode =
      saved === "LIGHT" || saved === "SYSTEM" || saved === "DARK" ? saved : "DARK";
    setThemeModeState(initial);
    applyHtmlTheme(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      const current = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null) || "DARK";
      if (current === "SYSTEM") {
        applyHtmlTheme("SYSTEM");
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [applyHtmlTheme]);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);
      if (typeof window !== "undefined") {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      }
      applyHtmlTheme(mode);
    },
    [applyHtmlTheme]
  );

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};