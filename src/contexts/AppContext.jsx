// src/contexts/AppContext.jsx
// Global state for Laureat AI.
// MVP: French only (Haitian Creole coming in v2).
// Default: dark mode (user can toggle in Profile).

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

  // Force French for MVP
  const lang = "fr";

  // Default to dark unless user has chosen otherwise
  const [theme, setThemeState] = useState(() => getInitial(STORAGE_KEYS.THEME, "dark"));

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem(STORAGE_KEYS.THEME, theme); } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", "fr");
  }, []);

  const setTrack = useCallback((value) => {
    setTrackState(value);
    try { localStorage.setItem(STORAGE_KEYS.TRACK, value); } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      const raw = translations.fr?.[key] ?? key;
      if (!params || typeof raw !== "string") return raw;
      return Object.keys(params).reduce(
        (acc, p) => acc.replaceAll(`{${p}}`, String(params[p])),
        raw
      );
    },
    []
  );

  const value = useMemo(
    () => ({
      track, setTrack, isTrackSelected: Boolean(track),
      lang,
      theme, toggleTheme,
      t,
      TRACKS,
    }),
    [track, setTrack, theme, toggleTheme, t]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
