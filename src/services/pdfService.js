// src/services/pdfService.js
// Generate a clean, branded PDF of one or many solved exercises, or a classroom
// session. Uses the browser print API with custom styling — no extra dependencies.
//
// Branding: the Laureat AI logo (embedded below as base64 so it always renders,
// even offline / in the print preview) + a laureatai.app footer on every page.

const SITE_URL = "laureatai.app";
const LOGO_DATA_URI = "data:image/png;base64,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";

// ---- Public API -------------------------------------------------------------

// Single solved exercise (kept for back-compat; delegates to the multi renderer).
export function exportSolutionToPDF(solution, meta = {}) {
  exportSolutionsToPDF([solution], meta);
}

// Multiple solved exercises from one scanned page.
export function exportSolutionsToPDF(solutions, meta = {}) {
  const list = (solutions || []).filter(Boolean);
  if (list.length === 0) return;
  const inner = list.map((sol, i) => solutionBlockHTML(sol, list.length > 1 ? i + 1 : null)).join("");
  const html = pageHTML({
    title: meta.subject ? `Solutions — ${meta.subject}` : "Solutions",
    subtitle: [meta.subject, meta.track ? `Niveau ${meta.track}` : null].filter(Boolean).join(" · ") || "Solution d'exercice",
    body: inner,
  });
  openPrintWindow(html, `Laureat-AI-${Date.now()}`);
}

export function exportSessionToPDF(session, messages) {
  const body = (messages || []).map((m) => `
    <div class="message ${m.role}">
      <div class="message-role">${m.role === "user" ? "Toi" : "Prof"}</div>
      <div>${escapeHtml(m.content || m.text || "")}</div>
    </div>
  `).join("");
  const html = pageHTML({
    title: escapeHtml(session.title || "Session"),
    subtitle: [escapeHtml(session.subject || ""), "Laureat AI"].filter(Boolean).join(" · "),
    body: `<div class="section">${body}</div>`,
  });
  openPrintWindow(html, `Laureat-Session-${Date.now()}`);
}

// ---- Rendering --------------------------------------------------------------

function openPrintWindow(html, title) {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) {
    alert("Autorise les pop-ups pour télécharger le PDF");
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>${getStyles()}</head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}

function pageHTML({ title, subtitle, body }) {
  return `
    <div class="header">
      <div class="brand">
        <img class="logo" src="${LOGO_DATA_URI}" alt="Laureat AI" />
        <div>
          <h1>${title}</h1>
          <div class="subtitle">${subtitle}</div>
        </div>
      </div>
    </div>
    ${body}
    <div class="footer">
      <img class="footer-logo" src="${LOGO_DATA_URI}" alt="" />
      <span>Généré par <b>Laureat AI</b> · ${SITE_URL}</span>
    </div>
  `;
}

// One solved exercise — branches on the solution format (sciences vs choice).
function solutionBlockHTML(solution, num) {
  const heading = num
    ? `<div class="ex-heading">Exercice ${escapeHtml(String(num))}</div>`
    : "";
  const enonce = solution.enonce
    ? `<div class="section"><div class="section-title">Énoncé</div><div class="enonce">${escapeHtml(solution.enonce)}</div></div>`
    : "";

  const isChoice = solution.subjectFamily === "choice" || solution.format === "choice"
    || (!solution.sections && Boolean(solution.correctAnswer));

  const core = isChoice ? choiceHTML(solution) : sciencesHTML(solution);

  const summary = solution.summary
    ? `<div class="section"><div class="section-title">À retenir</div><div class="summary">${escapeHtml(solution.summary)}</div></div>`
    : "";

  return `<div class="exercise">${heading}${enonce}${core}${summary}</div>`;
}

function sciencesHTML(solution) {
  const donnees = (solution.donnees || []).map((d) => d.isQuestion
    ? `<div class="donnee"><b>${escapeHtml(d.symbol)}</b> = <span style="color:#d97706">?</span></div>`
    : `<div class="donnee"><b>${escapeHtml(d.symbol)}</b> = <b>${escapeHtml(d.value)}</b> ${escapeHtml(d.unit || "")}</div>`
  ).join("");

  const sections = (solution.sections || []).map((sec) => `
    <div style="margin-bottom: 16px;">
      <h4 style="font-size: 13px; margin-bottom: 8px;">
        <span class="section-num">${escapeHtml(sec.number)}-</span>
        <span class="section-verb">${escapeHtml(sec.verb)}</span>
        <span>${escapeHtml(sec.title)}</span>
      </h4>
      ${(sec.steps || []).map((step) => {
        if (step.type === "result" && step.boxed) {
          return `<div style="margin: 6px 0;"><span class="step result">${escapeHtml(step.content)}</span></div>`;
        }
        if (step.type === "crossmultiply") {
          return `<div class="step conversion">⤳ ${escapeHtml(step.content || `${step.leftTop || ""}/${step.leftBottom || ""} = ${step.rightTop || ""}/${step.rightBottom || ""}`)}</div>`;
        }
        if (step.type === "conversion") {
          return `<div class="step conversion">⤳ ${escapeHtml(step.content)}</div>`;
        }
        return `<div class="step">${escapeHtml(step.content)}</div>`;
      }).join("")}
    </div>
  `).join("");

  const formulas = (solution.keyFormulas && solution.keyFormulas.length)
    ? `<div class="section"><div class="section-title">Formules clés</div>${
        solution.keyFormulas.map((f) => `<div class="formula"><b>${escapeHtml(f.name || "")}</b> : ${escapeHtml(f.expression || "")}${f.explanation ? ` — <span style="color:#64748b">${escapeHtml(f.explanation)}</span>` : ""}</div>`).join("")
      }</div>`
    : "";

  const grid = (solution.sections && solution.sections.length)
    ? `<div class="section"><div class="solution-grid">
        <div class="donnees"><div class="donnees-title">Données</div>${donnees}</div>
        <div class="solution">${sections}</div>
      </div></div>`
    : "";

  return `${grid}${formulas}${trapsHTML(solution)}`;
}

function choiceHTML(solution) {
  const correct = solution.correctAnswer
    ? `<div class="answer-box"><div class="answer-label">Bonne réponse</div><div class="answer-val">${escapeHtml(solution.correctAnswer)}</div>${solution.whyCorrect ? `<div class="answer-why">${escapeHtml(solution.whyCorrect)}</div>` : ""}</div>`
    : "";

  const others = (solution.otherOptions && solution.otherOptions.length)
    ? `<div class="section"><div class="section-title">Pourquoi pas les autres</div>${
        solution.otherOptions.map((o) => `<div class="wrong"><b>${escapeHtml(o.option || "")}</b> — ${escapeHtml(o.whyWrong || "")}</div>`).join("")
      }</div>`
    : "";

  const facts = (solution.keyFacts && solution.keyFacts.length)
    ? `<div class="section"><div class="section-title">À retenir</div><ul class="facts">${
        solution.keyFacts.map((f) => `<li>${escapeHtml(f)}</li>`).join("")
      }</ul></div>`
    : "";

  return `<div class="section">${correct}</div>${others}${facts}`;
}

function trapsHTML(solution) {
  if (!solution.traps || solution.traps.length === 0) return "";
  return `<div class="traps">
    <div class="traps-title">⚠️ Pièges courants</div>
    <ul>${solution.traps.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
  </div>`;
}

function getStyles() {
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; padding: 32px; color: #0f172a; max-width: 800px; margin: 0 auto; }
    .header { display: flex; align-items: center; border-bottom: 3px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo { width: 44px; height: 44px; border-radius: 10px; display: block; }
    h1 { font-size: 18px; font-weight: 800; }
    .subtitle { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
    .exercise { margin-bottom: 28px; }
    .ex-heading { font-size: 14px; font-weight: 800; color: #7c3aed; margin: 8px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #ede9fe; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #7c3aed; font-weight: 800; margin-bottom: 8px; }
    .enonce { padding: 16px; background: #f5f3ff; border-radius: 12px; font-size: 14px; line-height: 1.6; }
    .summary { padding: 14px 16px; background: #f8fafc; border-left: 3px solid #7c3aed; border-radius: 8px; font-size: 13px; line-height: 1.6; color: #334155; }
    .solution-grid { display: grid; grid-template-columns: 1fr 2.5fr; gap: 16px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .donnees { background: #f5f3ff; padding: 16px; border-right: 1px solid #e2e8f0; }
    .donnees-title { font-size: 10px; text-transform: uppercase; font-weight: 800; color: #6d28d9; border-bottom: 2px solid #ddd6fe; padding-bottom: 4px; margin-bottom: 8px; }
    .donnee { font-family: 'Inter', monospace; font-size: 13px; margin-bottom: 4px; }
    .solution { padding: 16px; }
    .section-num { font-weight: 800; color: #7c3aed; }
    .section-verb { font-style: italic; color: #475569; }
    .step { font-family: 'Inter', monospace; font-size: 12px; padding: 2px 4px; margin-bottom: 4px; }
    .step.result { display: inline-block; padding: 4px 10px; border: 2px solid #10b981; background: #ecfdf5; color: #047857; font-weight: 700; border-radius: 6px; }
    .step.conversion { color: #0369a1; font-style: italic; }
    .formula { font-size: 12px; margin-bottom: 6px; }
    .answer-box { padding: 16px; background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; }
    .answer-label { font-size: 10px; text-transform: uppercase; font-weight: 800; color: #047857; margin-bottom: 4px; }
    .answer-val { font-size: 15px; font-weight: 800; color: #065f46; margin-bottom: 6px; }
    .answer-why { font-size: 13px; color: #334155; line-height: 1.5; }
    .wrong { font-size: 12px; color: #475569; margin-bottom: 6px; padding-left: 12px; border-left: 2px solid #fecaca; }
    .facts { padding-left: 20px; } .facts li { font-size: 12px; color: #334155; margin-bottom: 4px; }
    .traps { background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 12px; }
    .traps-title { font-size: 10px; text-transform: uppercase; font-weight: 800; color: #b45309; margin-bottom: 8px; }
    .traps ul { padding-left: 20px; } .traps li { font-size: 12px; color: #92400e; margin-bottom: 4px; }
    .message { margin-bottom: 12px; padding: 8px 12px; border-radius: 12px; max-width: 80%; }
    .message.tutor { background: #f1f5f9; } .message.user { background: #ddd6fe; margin-left: auto; }
    .message-role { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 2px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 10px; color: #94a3b8; }
    .footer-logo { width: 16px; height: 16px; border-radius: 4px; }
    @media print {
      body { padding: 16px; }
      .exercise, .section { page-break-inside: avoid; }
    }
  </style>`;
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}
