// api/chat.js
// v17:
//  - When preferences.language === "fr", AI replies in French ONLY (no kreyòl mix)
//  - Removed MENFP wording from system prompts
//  - 5 personas with tightened anti-overexplain rules

const PERSONALITIES = {
  joseph: `Tu es M. JOSEPH, professeur expérimenté (~62 ans). PATIENT, fatherly, méthodique. Voix calme.`,
  tikens: `Tu es TI-KENS, jeune prof 21 ans, énergique, "grand frère cool".`,
  victoria: `Tu es Mlle. VICTORIA, mentore brillante 28 ans, élégante, INSPIRANTE (PAS romantique).`,
  marckenson: `Tu es M. MARCKENSON, coach intense 32 ans. Direct, motivant, PG (jamais grossier).`,
  camille: `Tu es Mlle. CAMILLE, grande sœur 25 ans, bienveillante, safe space.`,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      sessionId, context, messages, userMessage,
      preferences, teachingMode, currentStep, failCount,
      activeBoard, lastSessionSummary,
    } = req.body || {};

    if (!userMessage) return res.status(400).json({ error: "Missing userMessage" });
    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const prefs = preferences || { language: "fr", personality: "joseph", name: "" };

    // ENFORCED language rules
    let languageStrategy;
    if (prefs.language === "fr") {
      // STRICT French only — no kreyòl mixing
      languageStrategy = `🔴 LANGUE STRICTE: réponds EN FRANÇAIS UNIQUEMENT.
Pas de kreyòl. Pas de mots créoles ("mwen", "w", "l", "ann", "ki sa", etc.).
Si l'élève écrit en kreyòl, comprends-le, mais réponds toujours en français standard.`;
    } else if (prefs.language === "kr") {
      languageStrategy = `Reponn nan kreyòl sèlman. Itilize kontraksyon "m", "w", "l".
Mo teknik fransè kote ki nesesè (formules math, termes scientifiques).`;
    } else {
      // mix
      languageStrategy = failCount >= 2
        ? "Bascule en KREYÒL principal pour cette explication."
        : "Mélange français et kreyòl naturellement. Kreyòl pour l'humain, français pour le technique. Utilise 'm', 'w', 'l'.";
    }

    const personality = PERSONALITIES[prefs.personality] || PERSONALITIES.joseph;
    const studentName = prefs.name ? `L'élève s'appelle ${prefs.name}.` : "";

    let rememberContext = "";
    if (lastSessionSummary && !context?.exercise) {
      rememberContext = `

CONTEXTE PRÉCÉDENT:
- Dernière session: "${lastSessionSummary.lastTopic}" (${lastSessionSummary.subject})
- ${lastSessionSummary.didComplete ? "L'élève a terminé" : `Difficile (${lastSessionSummary.failedAttempts} échecs)`}
Tu peux y faire référence brièvement dans ton premier message si c'est pertinent.`;
    }

    let systemPrompt = `${personality}
${studentName}
${languageStrategy}
${rememberContext}

🔴 RÈGLES STRICTES:
- MAX 3 segments par réponse
- Chaque segment = MAX 2 phrases courtes
- AUCUN code, AUCUN JSON, AUCUN $math$ dans le texte
- Toutes formules math vont dans boardActions, JAMAIS dans "text"
- Décimales avec virgule (9,8 pas 9.8)
- Pose UNE question à la fois
- N'explique PAS ce que tu vas faire — fais-le directement
- Tu prépares un élève haïtien à son examen national. N'utilise PAS l'acronyme "MENFP" — dis simplement "ton examen" ou "l'examen national".`;

    if (teachingMode === "step-by-step" && context?.exercise) {
      systemPrompt += `

MODE STEP-BY-STEP:
Exercice: ${JSON.stringify(context.exercise).substring(0, 1500)}
Étape: ${currentStep || "intro"} | Échecs: ${failCount || 0} | Board: ${activeBoard || "enonce"}

Si échec:
- 1: réexplique différemment
- 2: analogie haïtienne concrète
- 3: ${prefs.language === "fr" ? "explique avec un schéma" : "kreyòl + diagramme"} (mets une courte description dans boardActions.visual)
- 4+: tutorSwitchSuggestion: true`;
    }

    systemPrompt += `

🔴 LE TABLEAU (TRÈS IMPORTANT):
Tu écris au tableau via "boardActions". Le texte parlé ("text") reste court et SANS
math; TOUTES les formules, calculs et résultats vont dans boardActions.solution.
- boardActions.solution = la liste ORDONNÉE des étapes à écrire sur le tableau Solution.
  Chaque étape: { "type": "...", "content": "..." }
  types: "formula" (une formule), "substitution" (remplacement des valeurs),
         "conversion" (changement d'unité), "result" (résultat — ajoute "boxed": true),
         "step" (courte phrase explicative).
- boardActions.visual = courte description d'un schéma SEULEMENT si un dessin aide
  vraiment à comprendre, sinon null. Ne demande PAS de schéma à chaque tour.
- boardActions.focus = "solution" | "visuel" | "enonce" (le tableau à montrer).
Quand tu résous un exercice, remplis boardActions.solution et VA JUSQU'AU BOUT
(jusqu'au résultat encadré).

FORMAT JSON STRICT:
{
  "segments": [
    { "type": "acknowledge|explain|question|praise|thinking",
      "text": "2 phrases max, AUCUNE math",
      "speakable": "version pour la voix" }
  ],
  "boardActions": {
    "solution": [
      { "type": "formula", "content": "v = d / t" },
      { "type": "substitution", "content": "v = 100 / 20" },
      { "type": "result", "content": "v = 5 m/s", "boxed": true }
    ],
    "visual": null,
    "focus": "solution"
  },
  "suggestedQuestions": ["question courte 1", "question courte 2"],
  "needsConfirmation": false,
  "tutorSwitchSuggestion": false
}`;

    const conversationHistory = (messages || []).slice(-10).map((m) => ({
      role: m.role === "tutor" || m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    const models = [
      "google/gemini-3-pro-preview",
      "anthropic/claude-opus-4.7",
      "openai/gpt-5.5",
      "google/gemini-3.5-flash",
      "openai/gpt-5.4",
    ];

    let parsed = null;
    let modelUsed = null;
    let lastError = null;

    for (const model of models) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${KEY}`,
            "HTTP-Referer": "https://laureatai.com",
            "X-Title": "Laureat AI",
          },
          body: JSON.stringify({
            model,
            messages: apiMessages,
            response_format: { type: "json_object" },
            max_tokens: 2000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) { lastError = `${model}: ${response.status}`; continue; }
        const data = await response.json();
        const raw = data?.choices?.[0]?.message?.content;
        if (!raw) continue;

        try {
          const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
          parsed = JSON.parse(cleaned);
          modelUsed = model;
          break;
        } catch {
          parsed = {
            segments: [{ type: "explain", text: raw.substring(0, 200), speakable: raw.substring(0, 200), boardActions: [] }],
            suggestedQuestions: [],
            needsConfirmation: false,
          };
          modelUsed = model;
          break;
        }
      } catch (err) {
        lastError = `${model}: ${err.message}`;
        continue;
      }
    }

    if (!parsed) {
      return res.status(502).json({ error: "AI service error", details: lastError });
    }

    const segments = (Array.isArray(parsed.segments) ? parsed.segments : [])
      .slice(0, 3)
      .map((s) => ({
        type: s.type || "explain",
        text: cleanText(s.text || ""),
        speakable: cleanText(s.speakable || s.text || ""),
      }))
      .filter((s) => s.text);

    if (segments.length === 0) {
      segments.push({
        type: "explain",
        text: parsed.reply || "Je réfléchis à ta question.",
        speakable: parsed.reply || "Je réfléchis à ta question.",
      });
    }

    // Build ONE top-level boardActions object: { solution:[{type,content,boxed?}],
    // visual:string|null, focus:string|null } — exactly what ClassroomSession reads.
    const ba = (parsed.boardActions && typeof parsed.boardActions === "object" && !Array.isArray(parsed.boardActions))
      ? parsed.boardActions : {};

    // Back-compat: older outputs sometimes nested step strings under segment.boardActions.
    let rawSteps = Array.isArray(ba.solution) ? ba.solution : [];
    if (rawSteps.length === 0) {
      rawSteps = (Array.isArray(parsed.segments) ? parsed.segments : [])
        .flatMap((s) => (Array.isArray(s.boardActions) ? s.boardActions : []));
    }
    const solution = rawSteps
      .map((step) =>
        typeof step === "string"
          ? { type: "step", content: cleanText(step) }
          : {
              type: step.type || "step",
              content: cleanText(step.content || step.text || ""),
              ...(step.boxed ? { boxed: true } : {}),
            }
      )
      .filter((s) => s.content);

    const visual =
      ba.visual ||
      (parsed.shouldDrawDiagram ? (parsed.diagramDescription || "schéma explicatif") : null);
    const validFocus = ["solution", "visuel", "enonce"];
    const focus = validFocus.includes(ba.focus) ? ba.focus : (solution.length ? "solution" : null);
    const boardActions = { solution, visual: visual || null, focus };

    return res.status(200).json({
      data: {
        segments,
        boardActions,
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
          ? parsed.suggestedQuestions.slice(0, 2).map((q) => String(q).substring(0, 80))
          : [],
        needsConfirmation: Boolean(parsed.needsConfirmation),
        tutorSwitchSuggestion: Boolean(parsed.tutorSwitchSuggestion),
        modelUsed,
      },
    });
  } catch (err) {
    console.error("/api/chat error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

function cleanText(text) {
  if (!text) return "";
  return String(text)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$[^$\n]+\$/g, "")
    .replace(/\\text\{[^}]*\}/g, "")
    .replace(/\{[^}]*"[^}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
