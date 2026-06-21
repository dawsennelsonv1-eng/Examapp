// src/utils/promo.js
// Single source of truth for the launch discount + WhatsApp payment link.
// Both the Paywall and the reusable WhatsAppPayButton use these helpers so the
// price a student sees and the price in the WhatsApp message can never disagree.

import {
  PLAN_PRICES,
  PLAN_ANCHOR_PRICES,
  DISCOUNT_WINDOW_DAYS,
  STORAGE_KEYS,
  WHATSAPP_NUMBER,
  APP_NAME,
} from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;

// First time the student opened the app. Set once, then stable — this anchors
// their personal 5-day discount countdown.
export function getFirstSeen() {
  try {
    let v = localStorage.getItem(STORAGE_KEYS.FIRST_SEEN);
    if (!v) {
      v = String(Date.now());
      localStorage.setItem(STORAGE_KEYS.FIRST_SEEN, v);
    }
    return Number(v) || Date.now();
  } catch {
    return Date.now();
  }
}

export function promoEndsAt() {
  return getFirstSeen() + DISCOUNT_WINDOW_DAYS * DAY_MS;
}

// Pricing for a plan right now. `livePrice` lets the live config override the
// constant (you already drive prices through useAppConfig).
export function getPlanPricing(planId, livePrice) {
  const anchor = PLAN_ANCHOR_PRICES[planId] ?? PLAN_PRICES[planId];
  const real = livePrice ?? PLAN_PRICES[planId];
  const endsAt = promoEndsAt();
  const active = Date.now() < endsAt && real < anchor;
  return {
    anchor,                       // struck-through "regular" price
    real,                         // discounted price
    active,                       // is the promo window still open?
    price: active ? real : anchor, // what they actually pay now
    savings: Math.max(0, anchor - real),
    endsAt,
  };
}

// Resolve the WhatsApp number (env first, constant fallback), digits only.
export function getWhatsAppNumber() {
  const raw =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_WHATSAPP_NUMBER) ||
    WHATSAPP_NUMBER ||
    "";
  return String(raw).replace(/[^\d]/g, "");
}

// Build the wa.me link with a prefilled Kreyòl message. Returns null if no
// number is configured (caller can then hide the button).
export function buildWhatsAppPayLink({ planName, price }) {
  const num = getWhatsAppNumber();
  if (!num) return null;
  const msg =
    `Bonjou! Mwen vle peye plan ${planName} (${price} HTG ${"jiska egzamen"}) ` +
    `pou ${APP_NAME}. Non mwen: `;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

// Format the time remaining in the promo window as a short Kreyòl string.
export function formatCountdown(ms) {
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}
