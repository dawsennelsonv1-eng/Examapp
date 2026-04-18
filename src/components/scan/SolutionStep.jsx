// src/components/scan/SolutionStep.jsx
import { motion } from "framer-motion";
import AudioButton from "./AudioButton";

/**
 * A single solution step. When `locked` is true, it's visually blurred and
 * non-interactive. When unlocked, content animates into focus.
 */
export default function SolutionStep({ step, index, locked, onUnlock }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      className="relative"
    >
      <div
        className={`rounded-2xl border border-slate-200 dark:border-slate-700
          bg-white dark:bg-slate-800/60 p-5 shadow-sm
          transition-all duration-500 ${
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
              <span className="flex items-center justify-center w-7 h-7 rounded-full
                bg-indigo-600 text-white text-xs font-bold">
                {index + 1}
              </span>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                {step.title}
              </h4>
            </div>
            {!locked && (
              <AudioButton text={`${step.title}. ${step.content}`} />
            )}
          </div>
          <p
            className={`text-slate-700 dark:text-slate-200 leading-relaxed ${
              step.isFormula ? "font-mono text-[15px] tracking-tight" : ""
            }`}
          >
            {step.content}
          </p>
        </motion.div>

        {/* Unlock overlay */}
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
              className="pointer-events-auto px-5 py-2.5 rounded-full
                bg-gradient-to-r from-indigo-600 to-violet-600
                text-white text-sm font-semibold shadow-lg shadow-indigo-500/30
                hover:shadow-indigo-500/50 transition-shadow
                flex items-center gap-2"
            >
              <span>🔓</span>
              <span>Débloquer</span>
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
