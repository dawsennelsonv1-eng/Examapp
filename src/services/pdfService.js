// src/services/pdfService.js
// Generate a clean PDF of solved exercise or classroom session.
// Uses browser print API with custom styling — no extra dependencies.

export function exportSolutionToPDF(solution) {
  const html = generateSolutionHTML(solution);
  openPrintWindow(html, `Exercice-${Date.now()}`);
}

export function exportSessionToPDF(session, messages) {
  const html = generateSessionHTML(session, messages);
  openPrintWindow(html, `Session-${Date.now()}`);
}

function openPrintWindow(html, title) {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) {
    alert("Autorise les pop-ups pour télécharger le PDF");
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>${getStyles()}</head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}

function getStyles() {
  return `<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; padding: 32px; color: #0f172a; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 3px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 8px; }
    .logo { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #7c3aed, #6366f1); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; }
    h1 { font-size: 18px; font-weight: 800; }
    .subtitle { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #7c3aed; font-weight: 800; margin-bottom: 8px; }
    .enonce { padding: 16px; background: #f5f3ff; border-radius: 12px; font-size: 14px; line-height: 1.6; }
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
    .traps { background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 12px; }
    .traps-title { font-size: 10px; text-transform: uppercase; font-weight: 800; color: #b45309; margin-bottom: 8px; }
    .traps ul { padding-left: 20px; }
    .traps li { font-size: 12px; color: #92400e; margin-bottom: 4px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
    .message { margin-bottom: 12px; padding: 8px 12px; border-radius: 12px; max-width: 80%; }
    .message.tutor { background: #f1f5f9; }
    .message.user { background: #ddd6fe; margin-left: auto; }
    .message-role { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 2px; }
    @media print {
      body { padding: 16px; }
      .section { page-break-inside: avoid; }
    }
  </style>`;
}

function generateSolutionHTML(solution) {
  return `
    <div class="header">
      <div class="brand">
        <div class="logo">L</div>
        <div>
          <h1>Laureat AI</h1>
          <div class="subtitle">Solution d'exercice MENFP</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Énoncé</div>
      <div class="enonce">${escapeHtml(solution.enonce || "")}</div>
    </div>

    <div class="section">
      <div class="solution-grid">
        <div class="donnees">
          <div class="donnees-title">Données</div>
          ${(solution.donnees || []).map((d) => d.isQuestion
            ? `<div class="donnee"><b>${escapeHtml(d.symbol)}</b> = <span style="color:#d97706">?</span></div>`
            : `<div class="donnee"><b>${escapeHtml(d.symbol)}</b> = <b>${escapeHtml(d.value)}</b> ${escapeHtml(d.unit || "")}</div>`
          ).join("")}
        </div>
        <div class="solution">
          ${(solution.sections || []).map((sec) => `
            <div style="margin-bottom: 16px;">
              <h4 style="font-size: 13px; margin-bottom: 8px;">
                <span class="section-num">${sec.number}-</span>
                <span class="section-verb">${escapeHtml(sec.verb)}</span>
                <span>${escapeHtml(sec.title)}</span>
              </h4>
              ${(sec.steps || []).map((step) => {
                if (step.type === "result" && step.boxed) {
                  return `<div style="margin: 6px 0;"><span class="step result">${escapeHtml(step.content)}</span></div>`;
                }
                if (step.type === "conversion") {
                  return `<div class="step conversion">⤳ ${escapeHtml(step.content)}</div>`;
                }
                return `<div class="step">${escapeHtml(step.content)}</div>`;
              }).join("")}
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    ${(solution.traps && solution.traps.length > 0) ? `
      <div class="traps">
        <div class="traps-title">⚠️ Pièges courants</div>
        <ul>
          ${solution.traps.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}
        </ul>
      </div>
    ` : ""}

    <div class="footer">
      Généré par Laureat AI · laureatai.com
    </div>
  `;
}

function generateSessionHTML(session, messages) {
  return `
    <div class="header">
      <div class="brand">
        <div class="logo">L</div>
        <div>
          <h1>${escapeHtml(session.title || "Session")}</h1>
          <div class="subtitle">${escapeHtml(session.subject || "")} · Laureat AI</div>
        </div>
      </div>
    </div>

    <div class="section">
      ${(messages || []).map((m) => `
        <div class="message ${m.role}">
          <div class="message-role">${m.role === "user" ? "Toi" : "Prof"}</div>
          <div>${escapeHtml(m.content || m.text || "")}</div>
        </div>
      `).join("")}
    </div>

    <div class="footer">
      Généré par Laureat AI · ${new Date().toLocaleDateString("fr-FR")}
    </div>
  `;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}
