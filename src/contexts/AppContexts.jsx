// src/contexts/AppContext.jsx
// Global state: track (9AF/NS4), language (fr/ht), theme (dark/light).
// Persists to localStorage, applies theme class to <html>, and exposes t() translator.

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { translations } from "../utils/translations";
import { STORAGE_KEYS, TRACKS } from "../utils/constants";

const AppContext = createContext(null);

const getInitial = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

export function AppProvider({ children }) {
  const [track, setTrackState] = useState(() => getInitial(STORAGE_KEYS.TRACK, null));
  const [lang, setLangState] = useState(() => getInitial(STORAGE_KEYS.LANG, "fr"));
  const [theme, setThemeState] = useState(() => {
    const saved = getInitial(STORAGE_KEYS.THEME, null);
    if (saved) return saved;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  // Apply theme class to <html> so Tailwind dark: variants work
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {}
  }, [theme]);

  // Apply lang attribute for screen readers & TTS
  useEffect(() => {
    document.documentElement.setAttribute("lang", lang === "ht" ? "ht" : "fr");
  }, [lang]);

  const setTrack = useCallback((value) => {
    setTrackState(value);
    try {
      localStorage.setItem(STORAGE_KEYS.TRACK, value);
    } catch {}
  }, []);

  const setLang = useCallback((value) => {
    setLangState(value);
    try {
      localStorage.setItem(STORAGE_KEYS.LANG, value);
    } catch {}
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "fr" ? "ht" : "fr");
  }, [lang, setLang]);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // Translator: t("key") → string in current language. Falls back to French, then the key itself.
  const t = useCallback(
    (key, params = {}) => {
      const raw = translations[lang]?.[key] ?? translations.fr?.[key] ?? key;
      if (!params || typeof raw !== "string") return raw;
      return Object.keys(params).reduce(
        (acc, p) => acc.replaceAll(`{${p}}`, String(params[p])),
        raw
      );
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      track,
      setTrack,
      isTrackSelected: Boolean(track),
      lang,
      setLang,
      toggleLang,
      theme,
      toggleTheme,
      t,
      // Helpers consumers frequently need
      TRACKS,
    }),
    [track, setTrack, lang, setLang, toggleLang, theme, toggleTheme, t]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
