// src/utils/logUsage.js
// Records how a client uses the app (scan, quiz, lesson, tutor, …) into the
// usage_events table. Also flips the "first time" flags used by the
// getting-started goals. Safe no-op on failure — never blocks the UI.

import { supabase } from "../lib/supabase";

const FIRST_FLAG = {
  scan: "laureat.firstScanDone",
  tutor: "laureat.firstTutorDone",
  quiz: "laureat.firstQuizDone",
  lesson: "laureat.firstLessonDone",
};

export async function logUsage(event) {
  // Mark the matching "first" goal as done (instant, local).
  try {
    const flag = FIRST_FLAG[event];
    if (flag) localStorage.setItem(flag, "1");
  } catch {}

  // Best-effort server log for admin analytics.
  try {
    let uid = null;
    try { const { data } = await supabase.auth.getUser(); uid = data?.user?.id || null; } catch {}
    await supabase.from("usage_events").insert({ user_id: uid, event });
  } catch {
    /* ignore */
  }
}
