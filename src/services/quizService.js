// src/services/quizService.js
// Manages quiz generation from past exams.
// Caches generated quizzes for 1 week per subject.

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
  } catch (err) {
    console.warn("Failed to save quiz cache:", err);
  }
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

export async function generateQuizzesForSubject({
  subject,
  track = "NS4",
  pastExamsText,
  count = 50,
  onProgress,
}) {
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || "laureat-admin-2026";

  onProgress?.("Génération de 50 questions...");

  const response = await fetch("/api/generate-quizzes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": adminToken,
    },
    body: JSON.stringify({ subject, track, pastExamsText, count }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Génération échouée");
  }

  const result = await response.json();
  const quizData = result.data;

  // Cache it
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
