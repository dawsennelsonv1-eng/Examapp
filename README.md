# MENFP Prep — Virtual Haitian Professor PWA

A React + Vite + Tailwind + Framer Motion PWA for 9AF / NS4 students preparing for MENFP state exams.

## Running locally

You need **Node.js 18 or newer** installed ([download here](https://nodejs.org/)).

```bash
# 1. Install dependencies (only needed once)
npm install

# 2. Start the dev server
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`) in your browser. You should see the onboarding screen asking "9AF or NS4?".

## Deploying to Netlify

### Option A — Drag & drop the built folder (simplest)

```bash
npm install
npm run build
```

This creates a `dist/` folder. Drag **that folder** (not the whole project) into Netlify's drop zone at https://app.netlify.com/drop.

### Option B — Connect a GitHub repo (recommended)

1. Push this whole project to a GitHub repository
2. In Netlify: **Add new site → Import an existing project → GitHub**
3. Select your repo. Netlify will read `netlify.toml` automatically and use:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Click deploy.

The `netlify.toml` file also sets up SPA routing — without it, refreshing on `/scan` or `/quiz` would give you a 404.

## What's implemented

| Tab | Status |
|-----|--------|
| Onboarding (9AF / NS4 selector, FR/HT toggle) | ✅ Full |
| Tab 1 — Home (countdown, missions, leaderboard) | ✅ Full |
| Tab 2 — Scan & Solve (camera mock, blur/unblur, TTS, Hypothèse/Formule/Résolution) | ✅ Full |
| Tab 3 — Quizzes | 🟡 Placeholder |
| Tab 4 — Exam Vault | 🟡 Placeholder |
| Tab 5 — Sciences Sociales (presidential timeline) | ✅ Minimal working version |
| Service worker (offline + push) | ✅ Full |
| FR/HT language toggle | ✅ Full |
| Dark/light mode | ✅ Full |

## Wiring up the real Claude AI backend

The `src/services/webhookClient.js` file has mock data built in, so the Scan & Solve tab works without a backend. When you're ready to connect real Claude AI:

1. Create Make.com or n8n scenarios that accept POST webhooks and forward the `system` + `input` payload to Claude's API
2. Replace the URLs in `src/utils/constants.js`:

```js
export const WEBHOOKS = {
  SOLVE: "https://hook.make.com/YOUR-REAL-WEBHOOK-ID",
  // etc
};
```

The Haitian professor system prompt (strict persona, Hypothèse/Formule/Résolution formatting) is already baked into the payload — your webhook just needs to pass it to Claude's `system` parameter.

## Project structure

```
├── index.html              ← Vite entry point
├── package.json            ← Dependencies
├── vite.config.js          ← Build config
├── netlify.toml            ← Netlify build + SPA redirects
├── tailwind.config.js
├── postcss.config.js
├── public/
│   ├── sw.js               ← Service worker (offline + push)
│   ├── manifest.json       ← PWA manifest
│   ├── offline.html        ← Fallback when offline
│   └── favicon.svg
└── src/
    ├── main.jsx            ← React entry
    ├── App.jsx             ← Router + tab shell
    ├── index.css           ← Tailwind directives
    ├── contexts/
    │   └── AppContext.jsx  ← Global state (track, lang, theme)
    ├── pages/              ← The 5 tabs + onboarding
    ├── components/
    │   ├── BottomTabBar.jsx
    │   └── scan/           ← SolutionStep, AudioButton
    ├── services/
    │   ├── webhookClient.js ← Claude AI webhook calls
    │   └── ttsService.js    ← "Eksplike m sa" audio
    └── utils/
        ├── translations.js  ← FR + HT dictionaries
        └── constants.js
```

## Troubleshooting

**"Page not found" on Netlify**
→ You deployed the source files instead of the built output. Run `npm run build` first, then deploy the `dist/` folder — or connect via GitHub so Netlify builds it for you.

**Blank white screen**
→ Open browser DevTools → Console. Any red errors? Most likely a missing dependency — re-run `npm install`.

**Service worker not registering**
→ SWs only work on `https://` or `http://localhost`. They won't register from a file:// URL or on HTTP in production.

**TTS audio doesn't work**
→ The Web Speech API requires a user interaction before the first `.speak()` call. Tap the 🔊 button yourself; auto-play on load is blocked by browsers.
