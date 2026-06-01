// src/hooks/useLessonCache.js
// Hits the merged /api/content?task=lesson endpoint (was /api/lesson).

const STORAGE_KEY = "laureat.lessonCache.v1";
const MAX_ENTRIES = 80;

function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeCache(obj) {
  try {
    const entries = Object.entries(obj).sort((a, b) => (b[1].cachedAt || 0) - (a[1].cachedAt || 0));
    const trimmed = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn("Lesson cache write failed:", err);
  }
}

export function getCachedLesson(eventId) {
  const cache = readCache();
  return cache[eventId]?.lesson || null;
}

export function setCachedLesson(eventId, lesson) {
  const cache = readCache();
  cache[eventId] = { lesson, cachedAt: Date.now() };
  writeCache(cache);
}

export function clearLessonCache() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export async function fetchLesson({ subject, chapter, event, track, language }) {
  const cached = getCachedLesson(event.id);
  if (cached) return { lesson: cached, fromCache: true };

  // Now hits the merged content endpoint
  const response = await fetch("/api/content?task=lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, chapter, event, track, language }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const { data } = await response.json();
  setCachedLesson(event.id, data);
  return { lesson: data, fromCache: false };
}
