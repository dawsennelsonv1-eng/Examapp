// src/components/scan/SolutionStep.jsx
// Each step has: blur/unlock, TTS button, text explanation, and transfer-to-classroom.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Eye, Loader2, GraduationCap, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AudioButton from "./AudioButton";
import { useClassroomSessions } from "../../hooks/useClassroom";

export default function SolutionStep({ step, index, locked, onUnlock, problemStatement }) {
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const navigate = useNavigate();
  const { createSession } = useClassroomSessions();

  const handleExplain = async () => {
    setExplaining(true);
    await new Promise((r) => setTimeout(r, 1200));
    setExplanation(
      `Cette étape consiste à ${step.title.toLowerCase()}. L'idée : on applique le principe vu précédemment en remplaçant chaque variable par sa valeur numérique. Vérifie toujours que les unités sont cohérentes.`
    );
    setExplaining(false);
  };

  const handleOpenInClassroom = () => {
    const session = createSession({
      subject: "Physique",
      title: `${step.title} — ${problemStatement?.slice(0, 40) || "Problème"}...`,
      context: {
        fromStep: step.content,
        stepTitle: step.title,
        problem: problemStatement,
      },
    });
    navigate(`/classe?session=${session.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      className="relative"
    >
      <div
        className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-5 shadow-sm transition-all duration-500 ${
          locked ? "pointer-events-none select-none" : ""
        }`}
      >
        <motion.div
          animate={{
            filter: locked ? "blur(10px)" : "blur(0px)",
            opacity: locked ? 0.6 : 1,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          aria-hidden={locked}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold">
                {index + 1}
              </span>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                {step.title}
              </h4>
            </div>
            {!locked && <AudioButton text={`${step.title}. ${step.content}`} />}
          </div>

          <p
            className={`text-slate-700 dark:text-slate-200 leading-relaxed ${
              step.isFormula ? "font-mono text-[15px] tracking-tight" : ""
            }`}
          >
            {step.content}
          </p>

          {!locked && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              {!explanation && !explaining && (
                <button
                  onClick={handleExplain}
                  className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400"
                >
                  <HelpCircle size={14} />
                  Je ne comprends pas, explique-moi
                </button>
              )}

              {explaining && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  Le professeur t'explique...
                </div>
              )}

              <AnimatePresence>
                {explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-500/30 p-3 text-xs leading-relaxed text-slate-700 dark:text-slate-200 mb-2">
                      <div className="flex items-center gap-1.5 mb-1.5 text-violet-700 dark:text-violet-400 font-bold">
                        <HelpCircle size={12} />
                        Explication
                      </div>
                      {explanation}
                      <div className="mt-2">
                        <AudioButton text={explanation} />
                      </div>
                    </div>

                    {/* Transfer to classroom */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleOpenInClassroom}
                      className="w-full flex items-center justify-between gap-2 p-3 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white text-xs font-bold shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap size={16} />
                        <span>Toujours pas clair ? Ouvre dans la Classe</span>
                      </div>
                      <ChevronRight size={16} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onUnlock}
              className="pointer-events-auto px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/30 flex items-center gap-2"
            >
              <Eye size={16} />
              Voir l'étape {index + 1}
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
