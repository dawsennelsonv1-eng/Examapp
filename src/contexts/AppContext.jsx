// src/contexts/AppContext.jsx
// Global state for Laureat AI.
// French-only UI. Tutor handles multilingual via prompts.

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

const getInitialJSON = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export function AppProvider({ children }) {
  const [track, setTrackState] = useState(() => getInitial(STORAGE_KEYS.TRACK, null));

  // Tutor preferences (set during conversational onboarding)
  const [preferences, setPreferencesState] = useState(() =>
    getInitialJSON(STORAGE_KEYS.PREFERENCES, null)
  );

  // Force French UI
  const lang = "fr";

  // Default dark
  const [theme, setThemeState] = useState(() => getInitial(STORAGE_KEYS.THEME, "dark"));

  // Explicit onboarding flag (Onboarding.jsx sets this). Kept alongside the
  // derived check below for robustness.
  const [onboardingFlag, setOnboardingFlag] = useState(() => getInitial("laureat.onboarding", null));

  const setOnboardingComplete = useCallback((val = true) => {
    setOnboardingFlag(val ? "1" : null);
    try {
      if (val) localStorage.setItem("laureat.onboarding", "1");
      else localStorage.removeItem("laureat.onboarding");
    } catch {}
  }, []);

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

  const setPreferences = useCallback((prefs) => {
    setPreferencesState(prefs);
    try { localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs)); } catch {}
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

  // Has the user completed onboarding fully? (track AND preferences, or explicit flag)
  const onboardingComplete = Boolean(
    (track && preferences?.language && preferences?.personality) || onboardingFlag
  );

  const value = useMemo(
    () => ({
      track, setTrack, isTrackSelected: Boolean(track),
      preferences, setPreferences, onboardingComplete, setOnboardingComplete,
      lang,
      theme, toggleTheme,
      t,
      TRACKS,
    }),
    [track, setTrack, preferences, setPreferences, onboardingComplete, setOnboardingComplete, theme, toggleTheme, t]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
