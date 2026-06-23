// src/utils/metaTrack.js
// Fires a Meta event from BOTH the browser Pixel and the server (CAPI) with one
// shared eventId, so Meta deduplicates them. Safe no-op if the pixel isn't set up.

export async function trackMetaEvent(eventName, { email, phone, value, currency } = {}) {
  const eventId =
    (typeof window !== "undefined" && window.crypto?.randomUUID?.()) ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const url = typeof window !== "undefined" ? window.location.href : "";

  // 1) Browser Pixel (note: fbq dedup key is `eventID`, capital ID).
  if (typeof window !== "undefined" && window.fbq) {
    const customData = value != null ? { value, currency: currency || "HTG" } : {};
    window.fbq("track", eventName, customData, { eventID: eventId });
  }

  // 2) Server CAPI (same eventId → dedup). keepalive lets it complete even if
  // the page navigates away (e.g. tapping a WhatsApp link on mobile).
  try {
    await fetch("/api/capi", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, eventId, url, email, phone, value, currency }),
    });
  } catch {
    /* ignore — tracking must never break the app */
  }
}
