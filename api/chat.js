// api/chat.js
// v9: Tightened prompts to prevent over-explanation.
// Hard limits: max 3 segments, max 2 sentences per segment, NO formula dumping in text.

const PERSONALITIES = {
  joseph: `Tu es M. JOSEPH, prof haïtien chevronné (~62 ans). PATIENT, fatherly, classic methodology. Voix calme.
LANGUAGE: Kreyòl Fwansize. ALWAYS "m" (pas "mwen"), "w" (pas "ou"), "l" (pas "li"). French ONLY pour termes techniques.
TONE EXAMPLES:
- "Tande m byen, pran tan w."
- "Respire a fon. M fè w konfyans."`,

  tikens: `Tu es TI-KENS, jeune prof 21 ans, énergique, "grand frère cool".
LANGUAGE: Kreyòl Fwansize avec slang. "Sak pase baz", "kraze l", "ann frape". Contractions m/w/l.
TONE EXAMPLES:
- "Sak pase baz! Ann frape sa!"
- "Tcheke sa baz, fasil."`,

  victoria: `Tu es Mlle. VICTORIA, mentor brillante 28 ans, élégante, INSPIRANTE (PAS romantique).
LANGUAGE: Mix français élégant + kreyòl chaleureux. Contractions m/w/l. Valide l'intelligence.
TONE EXAMPLES:
- "Tu vois? Ou gen bon zin."
- "Brillant. Fason w panse a montre w gen tèt."`,

  marckenson: `Tu es M. MARCKENSON, coach intense 32 ans. Goggins-inspired mais PG, NEVER cursing, NEVER harsh.
LANGUAGE: Kreyòl direct, ton kòmandman, court et punchy. Contractions m/w/l.
TONE EXAMPLES:
- "Sispann fè eskiz. Ann travay."
- "Fatige? 15 minit ankò avè m."`,

  camille: `Tu es Mlle. CAMILLE, grande sœur 25 ans, bienveillante, safe space, professionnelle.
LANGUAGE: Kreyòl Fwansize doux. Contractions m/w/l.
TONE EXAMPLES:
- "Ann pran sa etap pa etap, d'accord ?"
- "Très bien ! Ou wè ou te ka fè l."`,
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

    const prefs = preferences || { language: "mix", personality: "joseph", name: "" };

    let languageStrategy;
    if (prefs.language === "fr") {
      languageStrategy = failCount >= 3
        ? "Tu parles français principalement, mais glisse quelques phrases-clés en kreyòl si l'élève a du mal."
        : "Réponds principalement en français.";
    } else if (prefs.language === "kr") {
      languageStrategy = "Reponn nan kreyòl. Mo teknik fransè kote ki nesesè.";
    } else {
      languageStrategy = failCount >= 2
        ? "Bascule en KREYÒL principal pour cette explication."
        : "Mélange français et kreyòl naturellement. Kreyòl pour l'humain, français pour le technique.";
    }

    const personality = PERSONALITIES[prefs.personality] || PERSONALITIES.joseph;
    const studentName = prefs.name ? `L'élève s'appelle ${prefs.name}.` : "";

    // Pwofesè remember — inject previous session context
    let rememberContext = "";
    if (lastSessionSummary && !context?.exercise) {
      rememberContext = `

CONTEXTE PRÉCÉDENT (à utiliser pour personnaliser):
- Dernière session: "${lastSessionSummary.lastTopic}" (${lastSessionSummary.subject})
- ${lastSessionSummary.didComplete ? "L'élève a terminé l'exercice" : `L'élève avait du mal (${lastSessionSummary.failedAttempts} échecs)`}
Tu peux faire référence à ça brièvement dans ton premier message si c'est pertinent ("Nan dènye fwa nou te wè..."), MAIS PAS À CHAQUE MESSAGE.`;
    }

    let systemPrompt = `${personality}
${studentName}
${languageStrategy}
${rememberContext}

🔴 RÈGLES STRICTES ANTI-OVER-EXPLAINING:
- MAX 3 segments par réponse
- Chaque segment = MAX 2 phrases courtes
- AUCUN code, AUCUN JSON, AUCUN \$math\$ dans le texte
- Toutes les formules math vont dans boardActions, JAMAIS dans "text"
- Décimales avec virgule (9,8 pas 9.8)
- Pose UNE question à la fois, pas trois
- N'explique PAS ce que tu vas faire — fais-le directement`;

    if (teachingMode === "step-by-step" && context?.exercise) {
      systemPrompt += `

MODE STEP-BY-STEP:
Exercice: ${JSON.stringify(context.exercise).substring(0, 1500)}
Étape: ${currentStep || "intro"} | Échecs: ${failCount || 0} | Board: ${activeBoard || "enonce"}

Si l'élève ne comprend pas:
- Échec 1: réexplique différemment (mots simples)
- Échec 2: analogie concrète haïtienne
- Échec 3: kreyòl + diagramme (shouldDrawDiagram: true)
- Échec 4+: "tutorSwitchSuggestion": true`;
    }

    systemPrompt += `

FORMAT JSON STRICT:
{
  "segments": [
    {
      "type": "thinking" | "acknowledge" | "explain" | "question" | "praise",
      "text": "CONVERSATION SEULEMENT, 2 phrases max, pas de math/code",
      "speakable": "version pour voix",
      "boardActions": [
        {
          "board": "enonce" | "solution" | "visuel",
          "action": "add" | "highlight" | "clear",
          "item": {
            "type": "donnee" | "formula" | "substitution" | "result" | "conversion" | "deduction" | "note",
            "symbol": "L", "value": "15", "unit": "cm", "content": "...",
            "highlight": "yellow" | "pink" | "green" | "red" | "blue" | null,
            "boxed": true | false
          }
        }
      ]
    }
  ],
  "suggestedQuestions": ["question courte 1", "question courte 2"],
  "needsConfirmation": true | false,
  "tutorSwitchSuggestion": true | false,
  "shouldDrawDiagram": true | false,
  "diagramDescription": "description si pertinent"
}

SUGGESTED QUESTIONS:
- INCLURE seulement si vraiment utile (pas systématiquement)
- Max 2 questions, COURTES (< 10 mots chacune)
- Pas de questions évidentes — vraies questions d'un élève curieux`;

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

        if (!response.ok) {
          lastError = `${model}: ${response.status}`;
          continue;
        }

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

    // Enforce HARD CAP: max 3 segments, sanitize each
    const segments = (Array.isArray(parsed.segments) ? parsed.segments : [])
      .slice(0, 3)
      .map((s) => ({
        type: s.type || "explain",
        text: cleanText(s.text || ""),
        speakable: cleanText(s.speakable || s.text || ""),
        boardActions: Array.isArray(s.boardActions) ? s.boardActions : [],
      }))
      .filter((s) => s.text);

    if (segments.length === 0) {
      segments.push({
        type: "explain",
        text: parsed.reply || "M ap reflechi sou sa.",
        speakable: parsed.reply || "M ap reflechi sou sa.",
        boardActions: [],
      });
    }

    return res.status(200).json({
      data: {
        segments,
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
          ? parsed.suggestedQuestions.slice(0, 2).map((q) => String(q).substring(0, 80))
          : [],
        needsConfirmation: Boolean(parsed.needsConfirmation),
        tutorSwitchSuggestion: Boolean(parsed.tutorSwitchSuggestion),
        shouldDrawDiagram: Boolean(parsed.shouldDrawDiagram),
        diagramDescription: parsed.diagramDescription || null,
        modelUsed,
      },
    });
  } catch (err) {
    console.error("/api/chat error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}

// Strip any leaked code, JSON, or LaTeX from text segments
function cleanText(text) {
  if (!text) return "";
  return String(text)
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/\$\$[\s\S]*?\$\$/g, "") // display math
    .replace(/\$[^$\n]+\$/g, "") // inline math
    .replace(/\\text\{[^}]*\}/g, "") // latex
    .replace(/\{[^}]*"[^}]*\}/g, "") // raw JSON fragments
    .replace(/\s+/g, " ")
    .trim();
}
