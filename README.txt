# LAUREAT AI — Definitive Upload Manifest (v24)

Your live GitHub is on **v23**. You uploaded only 2 stray files so far
(BottomTabBar + share.js). Everything else below is new.

**The golden rule:** if a file is in more than one package, ONLY upload the
version from the package listed here. The list already picks the newest. Ignore
that file inside any other zip.

---

## PART A — UPLOAD ORDER (phase by phase)

### PHASE 1 — Core app (no Supabase needed). Deploy + test after this phase.
1. Package 1  — scan engine
2. Package 2  — classroom
3. Package 2b — call camera + board
4. Package 3  — cours / réviser / home
5. Package 3b — quiz formats
6. Package 4b — vercel.json + main.jsx   ← fixes the refresh-404

**STOP. Deploy. Walk the app.** (All of the above runs without Supabase.)

### PHASE 2 — Supabase backend
Setup BEFORE uploading Package 4:
  - `npm install @supabase/supabase-js` (add to package.json dependencies)
  - Vercel env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Run `sql/foundation.sql` in Supabase
7. Package 4  — foundation (auth + telemetry base + trackConfig)
8. Package 6  — telemetry wiring
9. Package 7  — admin config + immersion + notifications  → run `sql/admin_config.sql`
10. Package 8  — Tier 3 (offline, progress, perf, WhatsApp)  → set `VITE_SUPPORT_WHATSAPP`
11. Package 8b — cloud progress sync  → run `sql/progress.sql`

### PHASE 3 — Payments (last; needs your real SMS samples to finish)
Setup: run `sql/payments.sql`; set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SMS_INBOUND_TOKEN`, `VITE_MONCASH_NUMBER`, `VITE_NATCASH_NUMBER`; wire the SMS forwarder.
12. Package 5 — payments

---

## PART B — EVERY FILE → WHICH PACKAGE TO PULL IT FROM

When a file appears in several zips, the package below is the ONLY one to use.

### Package 1 — scan
- api/solve.js
- src/pages/ScanSolve.jsx ........... ⚠️ DO NOT use this one — see Package 6 (newer)
- src/components/scan/CameraCapture.jsx
- src/components/scan/CrossMultiplyStep.jsx
- src/components/scan/ChoiceSolution.jsx

### Package 2 — classroom
- src/components/BottomTabBar.jsx   (already uploaded — fine to re-upload)
- src/components/shared/ShareButton.jsx
- api/share.js                       (already uploaded — fine to re-upload)
- src/components/classroom/MessageBubble.jsx   ← USE THIS (the v24/MESSAGE_TYPE_INFO one)
- src/components/classroom/MultiBoard.jsx
- src/components/shared/TutorAvatar.jsx
- src/services/ttsService.js
- src/utils/constants.js ............ ⚠️ DO NOT use this one — see Package 4 (newer)
- src/components/classroom/ClassroomSession.jsx ... ⚠️ DO NOT use — see Package 6 (newer)
- src/pages/ScanSolve.jsx ........... ⚠️ DO NOT use — see Package 6 (newer)

### Package 2b — call
- src/services/liveService.js
- src/components/classroom/CallTutorSession.jsx   ← USE THIS (overrides Package 2's)

### Package 3 — cours/réviser/home
- src/pages/Home.jsx ................ ⚠️ DO NOT use — see Package 8 (newer)
- src/pages/CoursEvent.jsx .......... ⚠️ DO NOT use — see Package 8 (newer)

### Package 3b — quiz formats
- src/components/quiz/QuizPlayer.jsx . ⚠️ DO NOT use — see Package 6 (newer)
- src/pages/ReviserQuiz.jsx ......... ⚠️ DO NOT use — see Package 8 (newer)

### Package 4b — SPA fix
- vercel.json   (REPO ROOT, next to package.json — NOT in src/)
- src/main.jsx

### Package 4 — foundation
- sql/foundation.sql
- src/lib/supabase.js
- src/services/analytics.js
- src/utils/trackConfig.js
- src/utils/version.js
- src/utils/constants.js            ← USE THIS (trackConfig-sourced dates)
- src/contexts/AppContext.jsx
- src/contexts/AuthContext.jsx ...... ⚠️ DO NOT use — see Package 7 (newer)
- src/pages/Auth.jsx
- src/pages/Cours.jsx
- src/pages/Home.jsx ................ ⚠️ DO NOT use — see Package 8 (newer)
- src/App.jsx ....................... ⚠️ DO NOT use — see Package 8 (newer)

### Package 6 — telemetry wiring   (these are the NEWEST of these 3 files)
- src/pages/ScanSolve.jsx           ← FINAL ScanSolve
- src/components/classroom/ClassroomSession.jsx  ← FINAL ClassroomSession
- src/components/quiz/QuizPlayer.jsx ← FINAL QuizPlayer

### Package 7 — admin
- sql/admin_config.sql
- src/hooks/useAdminAccess.js
- src/hooks/useAppConfig.js
- src/components/admin/PlanSwitcher.jsx
- src/components/TopBar.jsx
- src/components/NotificationsBell.jsx
- src/pages/AdminConfig.jsx
- src/contexts/AuthContext.jsx      ← FINAL AuthContext (has profile migration)
- src/App.jsx ....................... ⚠️ DO NOT use — see Package 8 (newer)

### Package 8 — Tier 3
- public/sw.js   (replaces your current service worker)
- src/components/AppShell.jsx
- src/components/OfflineBanner.jsx
- src/components/WhatsAppSupport.jsx
- src/components/ProgressCard.jsx ... ⚠️ DO NOT use — see Package 8b (newer)
- src/hooks/useOnlineStatus.js
- src/hooks/useProgress.js .......... ⚠️ DO NOT use — see Package 8b (newer)
- src/App.jsx                       ← FINAL App.jsx (lazy routes + all routes)
- src/pages/Home.jsx               ← FINAL Home (ProgressCard mounted)
- src/pages/CoursEvent.jsx         ← FINAL CoursEvent (progress wired)
- src/pages/ReviserQuiz.jsx        ← FINAL ReviserQuiz (progress wired)

### Package 8b — progress sync
- sql/progress.sql
- src/utils/coursData.js
- src/components/ProgressCard.jsx   ← FINAL ProgressCard (denominator)
- src/hooks/useProgress.js          ← FINAL useProgress (cloud sync)

### Package 5 — payments
- sql/payments.sql
- api/_supabaseAdmin.js
- api/sms-inbound.js
- api/verify-payment.js
- src/pages/Paywall.jsx

---

## PART C — THE "WHICH VERSION WINS" CHEAT SHEET
For the files that show up in multiple zips, here is the ONE to keep:

| File | Pull from |
|------|-----------|
| ScanSolve.jsx | Package 6 |
| ClassroomSession.jsx | Package 6 |
| QuizPlayer.jsx | Package 6 |
| MessageBubble.jsx | Package 2 |
| constants.js | Package 4 |
| Home.jsx | Package 8 |
| CoursEvent.jsx | Package 8 |
| ReviserQuiz.jsx | Package 8 |
| App.jsx | Package 8 |
| AuthContext.jsx | Package 7 |
| CallTutorSession.jsx | Package 2b |
| ProgressCard.jsx | Package 8b |
| useProgress.js | Package 8b |

---

## PART D — ENV VARS (set in Vercel before the phase that needs them)
Phase 2:
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
  VITE_SUPPORT_WHATSAPP            (509 + number, digits only; for the WhatsApp button)
Phase 3 (payments — server-side, keep secret, NO VITE_ prefix):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY        ⚠️ never client-side, never VITE_
  SMS_INBOUND_TOKEN                (a long random string you pick)
  VITE_MONCASH_NUMBER              (client-safe)
  VITE_NATCASH_NUMBER             (client-safe)
  OPENROUTER_API_KEY               (already set)

## PART E — SQL TO RUN (Supabase SQL editor, in this order)
1. sql/foundation.sql     (Package 4)
2. sql/admin_config.sql   (Package 7)
3. sql/progress.sql       (Package 8b)
4. sql/payments.sql       (Package 5)
Then make yourself admin:
  update profiles set statut='admin' where email='YOUR_EMAIL';

## PART F — GOTCHAS
- vercel.json goes at the REPO ROOT, not in src/.
- After EACH file upload from your phone, open its GitHub blob URL and eyeball it
  — mobile uploads can silently drop a file.
- Vercel 12-function cap: api/ files now = content, solve, share, tts (existing) +
  sms-inbound, verify-payment (new) + _supabaseAdmin (NOT counted, starts with _).
  If the deploy errors on function count, tell me and I'll merge verify-payment
  into content.js.
- Bump version.js notes whenever you want; it's currently set to 24.0.0 in Package 4.
