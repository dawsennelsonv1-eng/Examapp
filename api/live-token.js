// api/live-token.js v20
// CRITICAL CHANGE: Skips ephemeral token endpoint entirely (404s on AQ.A keys).
// Instead returns the API key + a working model so the frontend connects directly
// to wss://...v1beta...BidiGenerateContent?key={API_KEY}.
//
// SECURITY NOTE: This exposes your Gemini key to the browser. Acceptable risk for
// MVP because the key is rate-limited and you'd rotate periodically. For
// production at scale, swap to a backend WebSocket proxy (architecture below).
//
// Your diag confirmed these Live models ARE on your key:
//   - gemini-3.1-flash-live-preview          (the 3.1 one — try first)
//   - gemini-2.5-flash-native-audio-latest   (the canonical "latest" 2.5)
//   - gemini-2.5-flash-native-audio-preview-12-2025  (specific dec preview)

const PERSONA_VOICES = {
  joseph: { gemini: "Iapetus", systemBase: "Tu es M. JOSEPH, prof haïtien chevronné de 62 ans, patient, fatherly." },
  tikens: { gemini: "Puck", systemBase: "Tu es TI-KENS, jeune prof 21 ans, énergique." },
  victoria: { gemini: "Aoede", systemBase: "Tu es Mlle. VICTORIA, mentor brillante 28 ans, élégante, inspirante." },
  marckenson: { gemini: "Charon", systemBase: "Tu es M. MARCKENSON, coach intense 32 ans, pousse fort mais PG." },
  camille: { gemini: "Leda", systemBase: "Tu es Mlle. CAMILLE, grande sœur 25 ans, bienveillante." },
};

// Models confirmed available to your key (per /api/diag?test=live)
const CANDIDATE_MODELS = [
  "gemini-2.5-flash-native-audio-latest",       // try this first — confirmed on your key
  "gemini-2.5-flash-native-audio-preview-12-2025",
  "gemini-3.1-flash-live-preview",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { persona = "joseph", language = "fr", exerciseContext = null, studentName = "" } = req.body || {};
    const KEY = process.env.GEMINI_API_KEY;
    if (!KEY) return res.status(500).json({ error: "Gemini API key not configured" });

    const voice = PERSONA_VOICES[persona] || PERSONA_VOICES.joseph;

    const langInstruction =
      language === "fr" ? "Parle français uniquement."
      : language === "kr" ? "Pale kreyòl prensipalman."
      : "Mélange français et kreyòl naturellement.";

    let systemPrompt = `${voice.systemBase}
${studentName ? `L'élève s'appelle ${studentName}.` : ""}
${langInstruction}
Tu es en appel vocal avec un élève haïtien préparant son examen national.
Réponses COURTES et conversationnelles (1-3 phrases). Encourage. Si l'élève montre sa caméra, commente ce que tu vois.
TABLEAU: tu disposes de l'outil draw_board(description) pour dessiner un schéma au tableau. Appelle-le dès qu'un visuel aide vraiment (figure, circuit, forces, graphique, anatomie...) et ANNONCE à voix haute ce que tu dessines ("Regarde, je te dessine ça au tableau..."). Donne une description claire et complète dans l'appel.`;

    if (exerciseContext) {
      systemPrompt += `\n\nEXERCICE: ${JSON.stringify(exerciseContext).substring(0, 1200)}`;
    }

    // Return the API key + a candidate model. Frontend will try them in order.
    return res.status(200).json({
      data: {
        apiKey: KEY,
        models: CANDIDATE_MODELS,
        voiceName: voice.gemini,
        systemPrompt,
        persona,
      },
    });
  } catch (err) {
    console.error("/api/live-token error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
