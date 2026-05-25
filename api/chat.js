// api/chat.js
// Interactive tutor chat with personality, language preference, and step-by-step mode.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      sessionId,
      context,
      messages,
      userMessage,
      preferences,
      teachingMode,
      currentStep,
      failCount,
    } = req.body || {};

    if (!userMessage) return res.status(400).json({ error: "Missing userMessage" });

    const KEY = process.env.OPENROUTER_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Server misconfigured" });

    const prefs = preferences || { language: "mix", personality: "patient", name: "" };

    // Language strategy with escalation: if user keeps not understanding, push toward Kreyòl
    let languageStrategy;
    if (prefs.language === "fr") {
      languageStrategy =
        failCount >= 3
          ? "Tu parles français principalement, mais comme l'élève a du mal, glisse quelques phrases-clés en kreyòl pour l'aider."
          : "Réponds en français.";
    } else if (prefs.language === "kr") {
      languageStrategy = "Reponn nan kreyòl. Itilize mo teknik fransè kote ki nesesè.";
    } else {
      // mix (recommended)
      languageStrategy =
        failCount >= 2
          ? "L'élève a du mal — bascule en KREYÒL pour cette explication. Termes techniques en français OK, mais explication en kreyòl."
          : "Mélange français et kreyòl naturellement. Kreyòl pour l'aspect humain/encouragement, français pour les termes techniques.";
    }

    const personalityPrompt = {
      classique: "Tu es un professeur HAÏTIEN CLASSIQUE: rigoureux, méthodique, exigeant. Tu insistes sur la rigueur des démonstrations. Tu félicites brièvement et tu attends de l'effort.",
      patient: "Tu es un professeur PATIENT: tu prends ton temps, tu utilises beaucoup d'exemples concrets de la vie haïtienne, tu rassures, tu ne juges jamais.",
      ami: "Tu es un PROFESSEUR-AMI: chaleureux, casual, tu fais des blagues légères, tu utilises le kreyòl souvent, tu donnes des high-fives virtuels.",
      efficace: "Tu es un professeur EFFICACE: direct, sans fluff, tu vas droit au but. Tu réponds court mais clair. Pas de longs discours.",
    };

    const personality = personalityPrompt[prefs.personality] || personalityPrompt.patient;
    const studentName = prefs.name ? `L'élève s'appelle ${prefs.name}.` : "";

    // Build system prompt based on teaching mode
    let systemPrompt = `${personality}

${studentName}

${languageStrategy}

RÈGLES GÉNÉRALES:
- Réponses courtes (2-4 phrases max) sauf si l'élève demande un développement
- Décimales avec virgule (9,8 pas 9.8)
- Unités SI
- Format Donnée/Formule/Substitution/Résultat encadré quand tu écris une solution
- Pose toujours une question de vérification après une explication`;

    if (teachingMode === "step-by-step" && context?.exercise) {
      systemPrompt += `

MODE TEACHING ÉTAPE-PAR-ÉTAPE:
Tu guides l'élève à travers l'exercice étape par étape. L'exercice est:
${JSON.stringify(context.exercise, null, 2)}

Étape actuelle: ${currentStep || "introduction"}
Nombre d'échecs sur cette étape: ${failCount || 0}

À chaque réponse, tu DOIS:
1. Expliquer UNE étape clairement
2. Si tu dois écrire quelque chose au tableau (formule, conversion, calcul), inclure dans boardUpdate
3. Demander "Eske w konprann?" / "Tu comprends?"
4. Attendre la confirmation avant de passer à la suivante

Si l'élève dit qu'il ne comprend pas:
- Tentative 1: réexplique avec d'autres mots
- Tentative 2: utilise une analogie/exemple concret
- Tentative 3: bascule en kreyòl et fais un diagramme
- Tentative 4: ajoute "Pou m kapab ede w konprann pi byen, ki sa egzakteman ou pa konprann?" et demande où exactement l'élève se perd`;
    }

    systemPrompt += `

FORMAT DE RÉPONSE JSON STRICT:
{
  "reply": "ta réponse conversationnelle",
  "speakable": "version épurée pour la voix (sans formules complexes, juste le sens)",
  "boardUpdate": {
    "action": "add" | "highlight" | "none",
    "target": "donnees" | "solution" | "diagram",
    "content": "ce qu'il faut ajouter au tableau"
  },
  "stepComplete": true | false,
  "needsConfirmation": true | false,
  "shouldDrawDiagram": true | false,
  "diagramDescription": "description du diagramme à dessiner si pertinent"
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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        "HTTP-Referer": "https://laureatai.com",
        "X-Title": "Laureat AI",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: apiMessages,
        response_format: { type: "json_object" },
        max_tokens: 1800,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", errText);
      return res.status(502).json({ error: "AI service error" });
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return res.status(502).json({ error: "Empty response" });

    let parsed;
    try {
      const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        reply: raw,
        speakable: raw,
        boardUpdate: { action: "none" },
        stepComplete: false,
        needsConfirmation: false,
        shouldDrawDiagram: false,
      };
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
