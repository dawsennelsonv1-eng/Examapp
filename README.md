# Laureat AI v6 — Zip 3 of 3 (Polish & Bulletproofing)

This zip contains all the **supporting files** that prevent build failures and complete the app's polish. Upload this LAST, after Zip 1 and Zip 2.

## Files (8 files)

| File | Path | Why |
|------|------|-----|
| `main.jsx` | `src/main.jsx` | Fixes BrowserRouter double-wrap once and for all |
| `Profile.jsx` | `src/pages/Profile.jsx` | Lets user change personality, language, name, plan — full profile experience |
| `Reviser.jsx` | `src/pages/Reviser.jsx` | Subject grid — tap a subject to start a Classroom review session |
| `CameraCapture.jsx` | `src/components/scan/CameraCapture.jsx` | Camera + photo upload + text input fallback (covers all cases) |
| `SolutionStep.jsx` | `src/components/scan/SolutionStep.jsx` | Reusable step renderer (boxed results, conversions, deductions) |
| `translations.js` | `src/utils/translations.js` | All French keys defined — no undefined fallbacks crashing things |
| `index.css` | `src/index.css` | Adds Caveat handwriting font + shimmer animation + safe area insets |
| `tailwind.config.js` | `tailwind.config.js` (repo root) | Registers handwriting font family + shimmer keyframes |

## Critical fix in this zip

**`main.jsx` was wrapping App in BrowserRouter AND App.jsx was wrapping again.** This caused the white screen bug. The new `main.jsx` + the App.jsx from Zip 1 work together: routing wrappers live ONLY in main.jsx, App.jsx just exports `<Routes>`.

## What each file enables

### Profile.jsx
- See your avatar (first letter of your name)
- Edit your name inline
- Switch tutor personality on the fly (Patient / Classique / Ami / Efficace)
- Switch language preference (Mix / Français / Kreyòl)
- See your plan (Gratuit / Basic / Premium) with upgrade button
- Toggle dark/light theme
- "Reset everything" button (clears all data, restarts onboarding)

### Reviser.jsx
- Grid of subjects with subject-specific icons and colors
- Tap a subject → creates a new Classroom session focused on that subject
- Tutor opens conversation with "What do you want to review in [subject]?"

### CameraCapture.jsx (the missing piece)
- Camera mode (default, environment-facing camera)
- Photo upload mode (for existing images)
- **Text input mode** (for when camera doesn't work or you want to type)
- Cropping guide overlay
- Preview before submit ("Use" / "Retake")

### translations.js
Previous version had `t("onboarding_title")` calls that returned `undefined` when keys were missing — caused crashes in some browsers. This file defines EVERY key used anywhere. Fallback safety guaranteed.

### index.css + tailwind.config.js
The chalkboard in ClassroomSession uses `font-handwriting` class. Without this update, the font falls back to system default (Times New Roman style) and looks bad. Now uses Caveat from Google Fonts → looks like real chalk writing.

The shimmer animation on the "Je comprends pas" button needs the `animate-shimmer` class registered in Tailwind. Without it, the shimmer effect won't appear.

## Upload order

Upload these files AFTER Zip 1 and Zip 2 have been deployed and the build is green.

1. `main.jsx` first (fixes routing)
2. `index.css` + `tailwind.config.js` (visual foundation)
3. `translations.js`
4. `SolutionStep.jsx`
5. `CameraCapture.jsx`
6. `Profile.jsx`
7. `Reviser.jsx`

Or commit all 8 in one batch.

## After uploading all 3 zips

Your app is feature-complete. Test sequence:

1. Open in incognito → see new conversational onboarding (5 steps)
2. Land on home → personalized "Salut [name]" greeting, countdown, missions
3. Tap SCAN → camera or text → take photo of exercise
4. See Haitian textbook format result (Données | Solution columns)
5. Tap pulsing "Je comprends pas" → goes to Classroom with exercise pre-loaded
6. Teacher greets you by name, starts step-by-step teaching
7. Données appear on chalkboard one by one with voice
8. Tap "Oui je comprends" → moves to first section
9. Tap "Non" → cascade of re-explanations
10. After completing → "Bravo [name]!"
11. Go to /profile → see your avatar, change personality, see plan
12. Go to /quiz → if quizzes generated via /admin, take a quiz
13. Go to /reviser → tap a subject → opens new Classroom session
14. Go to /paywall → see plans, payment flow

## Total file count delivered across all 3 zips

- **6 API endpoints** (solve, chat, board, tts, generate-quizzes, payment-webhook)
- **3 context/hook files** (AppContext, useClassroom, useUsage)
- **3 services** (ttsService, quizService, [no webhookClient — replaced by direct fetches])
- **3 utilities** (constants, translations, css)
- **2 components** (AppShell, CameraCapture, SolutionStep, VirtualBoard, ClassroomSession)
- **8 pages** (Home, Onboarding, ScanSolve, Classroom, Quizzes, Profile, Reviser, Admin, Paywall)
- **2 root files** (main.jsx, App.jsx, tailwind.config.js)

## What's NOT included (post-launch additions)

- Vercel KV for persistent transaction storage
- Push notifications
- Custom domain wire-up
- Real PDF generation
- Sentry error tracking
- Analytics (Plausible / PostHog)

These are not needed to ship the MVP and start earning.

🚀 You're complete. Ship and start the TikTok grind.
