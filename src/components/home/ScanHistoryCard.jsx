// src/components/home/ScanHistoryCard.jsx
// Recent scans section on home. Tap → revisit solution.

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight, Scan, X } from "lucide-react";
import { useScanHistory } from "../../hooks/useScanHistory";

export default function ScanHistoryCard() {
  const navigate = useNavigate();
  const { history, removeScan } = useScanHistory();

  if (!history.length) return null;

  const handleOpen = (scan) => {
    // Store the scan in sessionStorage and redirect to scan page in solution mode
    sessionStorage.setItem("laureat.scanReplay", JSON.stringify(scan));
    navigate("/scan?replay=1");
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-violet-600 dark:text-violet-400" />
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
            Récents
          </h2>
        </div>
        {history.length > 3 && (
          <span className="text-xs text-slate-500">{history.length} exercices</span>
        )}
      </div>

      <div className="space-y-2">
        {history.slice(0, 3).map((scan, i) => (
          <motion.button
            key={scan.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleOpen(scan)}
            className="w-full rounded-2xl bg-white dark:bg-slate-800 p-3 shadow-sm flex items-center gap-3 text-left ring-1 ring-slate-100 dark:ring-slate-700 relative group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Scan size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                {scan.enonce || "Exercice sans titre"}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {scan.subject} · {formatRelativeTime(scan.timestamp)}
              </div>
            </div>
            <span
              onClick={(e) => {
                e.stopPropagation();
                removeScan(scan.id);
              }}
              className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} className="text-slate-500" />
            </span>
            <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function formatRelativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "hier";
  return `il y a ${d}j`;
}
