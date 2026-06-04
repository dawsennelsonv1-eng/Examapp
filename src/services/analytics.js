// src/services/analytics.js — v24
// Fire-and-forget telemetry. Writes usage_events DIRECTLY to Supabase via the
// client (no new Vercel serverless function — we're near the 12-function cap).
//
// Design rules (from the strategic plan):
//  - NEVER block a user action. Every call returns immediately.
//  - NEVER throw. A dropped analytics event is fine; a broken scan is not.
//  - Offline-safe: events buffer in localStorage and flush on reconnect / next call.
//
// Usage:
//   import { logEvent, setAnalyticsContext } from "../services/analytics";
//   setAnalyticsContext({ userId, track, planTier });  // call when these change
//   logEvent("scan_complete", { subject: "Physique", model_used, fallback_used, total_ms });

import { supabase } from "../lib/supabase";

const BUFFER_KEY = "laureat.analyticsBuffer";
const MAX_BUFFER = 200; // cap so a long offline stretch can't bloat storage

let ctx = { userId: null, track: null, planTier: "free", sessionId: null };

export function setAnalyticsContext(partial) {
  ctx = { ...ctx, ...partial };
}

export function startAnalyticsSession() {
  ctx.sessionId =
    (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
    `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return ctx.sessionId;
}

function readBuffer() {
  try { return JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]"); } catch { return []; }
}
function writeBuffer(arr) {
  try { localStorage.setItem(BUFFER_KEY, JSON.stringify(arr.slice(-MAX_BUFFER))); } catch {}
}

function buildRow(eventType, metadata) {
  return {
    user_id: ctx.userId || null,
    event_type: eventType,
    session_id: ctx.sessionId || null,
    track: ctx.track || null,
    plan_tier: ctx.planTier || null,
    metadata: {
      ...(metadata || {}),
      // repeat a few common fields at top level of metadata for easy grouping
      track: ctx.track || metadata?.track || null,
      plan_tier: ctx.planTier || metadata?.plan_tier || null,
    },
    created_at: new Date().toISOString(),
  };
}

// The public API. Always returns immediately, never throws.
export function logEvent(eventType, metadata = {}) {
  try {
    const row = buildRow(eventType, metadata);
    const buffer = readBuffer();
    buffer.push(row);
    writeBuffer(buffer);
    // Try to flush without awaiting — fire and forget.
    flush();
  } catch {
    /* swallow — telemetry must never break the app */
  }
}

let flushing = false;
export async function flush() {
  if (flushing) return;
  if (!supabase) return;            // local-only mode: keep buffering
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const buffer = readBuffer();
  if (buffer.length === 0) return;

  flushing = true;
  try {
    // Send in one batch; clear only what we successfully sent.
    const batch = buffer.slice(0, MAX_BUFFER);
    const { error } = await supabase.from("usage_events").insert(batch);
    if (!error) {
      const remaining = readBuffer().slice(batch.length);
      writeBuffer(remaining);
    }
    // On error we keep the buffer and retry next time — no throw.
  } catch {
    /* keep buffer, retry later */
  } finally {
    flushing = false;
  }
}

// Flush opportunistically when the network comes back or the tab is hidden.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flush(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
