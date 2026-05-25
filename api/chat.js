// api/chat.js
// Tutor chat with personality + language + step-by-step teaching mode.
// Updated for May 2026 model availability with cascade fallback.

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
    } = req.body || {};

    if (!userMessage) return res.status(400).json({ error: "Missing userMessage" });

    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const prefs = preferences || { language: "mix", personality: "patient", name: "" };

    // Language strategy with escalation
    let languageStrategy;
    if (prefs.language === "fr") {
      languageStrategy = failCount >= 3
        ? "Tu parles français principalement, mais comme l'élève a du mal, glisse quelques phrases-clés en kreyòl pour l'aider."
        : "Réponds en français.";
    } else if (prefs.language === "kr") {
      languageStrategy = "Reponn nan kreyòl. Itilize mo teknik fransè kote ki nesesè.";
    } else {
      languageStrategy = failCount >= 2
        ? "L'élève a du mal — bascule en KREYÒL pour cette explication. Termes techniques en français OK, mais explication en kreyòl."
        : "Mélange français et kreyòl naturellement. Kreyòl pour l'aspect humain/encouragement, français pour les termes techniques.";
    }

    const personalityPrompt = {
      classique: "Tu es un professeur HAÏTIEN CLASSIQUE: rigoureux, méthodique, exigeant.",
      patient: "Tu es un professeur PATIENT: tu prends ton temps, utilises des exemples haïtiens concrets, rassures.",
      ami: "Tu es un PROFESSEUR-AMI: chaleureux, casual, blagues légères, kreyòl souvent.",
      efficace: "Tu es un professeur EFFICACE: direct, sans fluff, droit au but.",
    };

    const personality = personalityPrompt[prefs.personality] || personalityPrompt.patient;
    const studentName = prefs.name ? `L'élève s'appelle ${prefs.name}.` : "";

    let systemPrompt = `${personality}
${studentName}
${languageStrategy}

RÈGLES:
- Réponses courtes (2-4 phrases max) sauf si demande développement
- Décimales avec virgule (9,8 pas 9.8)
- Unités SI
- Format Donnée/Formule/Substitution/Résultat encadré pour les solutions
- Pose une question de vérification après une explication`;

    if (teachingMode === "step-by-step" && context?.exercise) {
      systemPrompt += `

MODE TEACHING ÉTAPE-PAR-ÉTAPE:
Tu guides l'élève dans cet exercice étape par étape:
${JSON.stringify(context.exercise, null, 2)}

Étape actuelle: ${currentStep || "introduction"}
Échecs sur cette étape: ${failCount || 0}

Si l'élève ne comprend pas:
- Échec 1: réexplique avec d'autres mots
- Échec 2: utilise une analogie/exemple concret
- Échec 3: bascule en kreyòl + fais un diagramme
- Échec 4: "Pou m kapab ede w konprann pi byen, di m egzakteman ki sa w pa konprann ?"`;
    }

    systemPrompt += `

FORMAT JSON STRICT:
{
  "reply": "ta réponse",
  "speakable": "version épurée pour voix (sans formules)",
  "boardUpdate": {"action": "add"|"highlight"|"none", "target": "donnees"|"solution"|"diagram", "content": "..."},
  "stepComplete": true|false,
  "needsConfirmation": true|false,
  "shouldDrawDiagram": true|false,
  "diagramDescription": "description si pertinent"
}`;

    const conversationHistory = (messages || []).slice(-12).map((m) => ({
      role: m.role === "tutor" || m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    // Cascade through 2026 models
    const models = [
      "google/gemini-3-pro-preview",
      "google/gemini-3.5-flash",
      "anthropic/claude-opus-4.7",
      "openai/gpt-5.5",
      "openai/gpt-5.4",
      "google/gemini-3-flash-preview",
    ];

    let parsed = null;
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
            max_tokens: 1800,
          }),
        });

        if (!response.ok) {
          lastError = `${model}: ${response.status}`;
          console.warn(`Chat model ${model} returned ${response.status}`);
          continue;
        }

        const data = await response.json();
        const raw = data?.choices?.[0]?.message?.content;
        if (!raw) continue;

        try {
          const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
          parsed = JSON.parse(cleaned);
          break;
        } catch {
          parsed = {
            reply: raw,
            speakable: raw,
            boardUpdate: { action: "none" },
            stepComplete: false,
            needsConfirmation: false,
            shouldDrawDiagram: false,
          };
          break;
        }
      } catch (err) {
        lastError = `${model}: ${err.message}`;
        continue;
      }
    }

    if (!parsed) {
      console.error("All chat models failed:", lastError);
      return res.status(502).json({ error: "AI service error", details: lastError });
    }

    return res.status(200).json({
      data: {
        reply: parsed.reply || "M ap reflechi...",
        speakable: parsed.speakable || parsed.reply,
        boardUpdate: parsed.boardUpdate || { action: "none" },
        stepComplete: Boolean(parsed.stepComplete),
        needsConfirmation: Boolean(parsed.needsConfirmation),
        shouldDrawDiagram: Boolean(parsed.shouldDrawDiagram),
        diagramDescription: parsed.diagramDescription || null,
      },
    });
  } catch (err) {
    console.error("/api/chat error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
