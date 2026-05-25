// src/services/quizService.js
// Quiz cache management. Quizzes are generated weekly via /admin and cached for 7 days.

const QUIZ_CACHE_KEY = "laureat.quizCache";
const ADMIN_TOKEN_KEY = "laureat.adminToken";

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(QUIZ_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(QUIZ_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export function getQuizzesForSubject(subject) {
  const cache = loadCache();
  const cached = cache[subject];
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) return null;
  return cached.questions || [];
}

export function getAllCachedSubjects() {
  const cache = loadCache();
  const now = Date.now();
  return Object.entries(cache)
    .filter(([_, data]) => data.expiresAt > now)
    .map(([subject, data]) => ({
      subject,
      count: data.questions?.length || 0,
      expiresAt: data.expiresAt,
      generatedAt: data.generatedAt,
    }));
}

export async function generateQuizzesForSubject({ subject, track = "NS4", pastExamsText, count = 50, onProgress }) {
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  if (!adminToken) throw new Error("Token admin manquant");

  onProgress?.(`Génération de ${count} questions pour ${subject}...`);

  const response = await fetch("/api/generate-quizzes", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
    body: JSON.stringify({ subject, track, pastExamsText, count }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${response.status}`);
  }

  const result = await response.json();
  const quizData = result.data;
  const cache = loadCache();
  cache[subject] = quizData;
  saveCache(cache);
  return quizData;
}

export function clearQuizCache() {
  localStorage.removeItem(QUIZ_CACHE_KEY);
}

export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
