// src/hooks/useOrientation.js
// v19: Tracks viewport orientation for landscape-aware layouts (Twitch-style split).

import { useState, useEffect } from "react";

export function useOrientation() {
  const [orientation, setOrientation] = useState(() => detect());

  useEffect(() => {
    const handler = () => setOrientation(detect());
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }, []);

  return orientation;
}

function detect() {
  if (typeof window === "undefined") return { isLandscape: false, isPortrait: true, width: 0, height: 0 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    isLandscape: w > h,
    isPortrait: w <= h,
    width: w,
    height: h,
  };
}
