# Laureat Glue Zip — Wire Up Missing Connections

## The Real Problem (Diagnosis)

✅ **ALL 20 components are in your repo** (verified via GitHub).

❌ **But the "wrapper" pages that USE them weren't updated to v9.**

The components (MultiBoard, MessageBubble, ShareButton, FirstLaunchTutorial, etc.) exist but the pages that mount them — ScanSolve, Classroom, Home, AppShell, App — were never updated to the v9 versions that ACTUALLY IMPORT them.

That's why you see scan results without the Explique-moi button, classroom without multi-board, etc.

## What This Zip Does

Replaces 6 "wrapper" files with their final v9 versions that wire up all the existing components.

| File | Path | Action |
|------|------|--------|
| `ScanSolve.jsx` | `src/pages/ScanSolve.jsx` | REPLACE — top-right Explique-moi + Share + PDF + scan history save |
| `Classroom.jsx` | `src/pages/Classroom.jsx` | REPLACE — uses new ClassroomSession with multi-board |
| `Home.jsx` | `src/pages/Home.jsx` | REPLACE — Pwofesè remember banner + scan history section |
| `AppShell.jsx` | `src/components/AppShell.jsx` | REPLACE — mounts FirstLaunchTutorial |
| `App.jsx` | `src/App.jsx` | REPLACE — adds /share/:shareId route |
| `chat.js` | `api/chat.js` | REPLACE — tightened prompts, no over-explain, JSON cleanup |

## Upload Sequence

1. `api/chat.js`
2. `src/App.jsx`
3. `src/components/AppShell.jsx`
4. `src/pages/Home.jsx`
5. `src/pages/ScanSolve.jsx`
6. `src/pages/Classroom.jsx`

Commit message: `Wire up v7-v9 features into pages`

## After Upload, Test This Order

1. **Clear browser cache / use incognito** (very important — old JS will block new features)
2. Open app → if fresh user, tutorial popup appears ✓
3. Scan an exercise → top-right has the orange "Explique-moi" button ✓
4. Solution page has Share + PDF buttons ✓
5. Tap Explique-moi → lands in classroom with multi-board + tutor avatar ✓
6. Swipe between Énoncé / Solution / Visuel boards ✓
7. Voice input mic button next to send ✓
8. Reload home → see scan in "Récents" + tutor remember banner ✓

## If Something Still Doesn't Work

The most common cause: **browser cache**. Hard reload (Ctrl+Shift+R or use incognito tab).

If you still don't see a feature after that, screenshot it and send. We'll fix the specific wire.

🚀 Almost there.
