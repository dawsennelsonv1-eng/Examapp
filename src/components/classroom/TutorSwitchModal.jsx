// src/components/classroom/TutorSwitchModal.jsx
// Modal to switch tutors mid-session. Shown after 3 failed attempts.
// New tutor inherits full context.

import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import TutorAvatar from "../shared/TutorAvatar";
import { PERSONALITIES } from "../../utils/constants";

export default function TutorSwitchModal({ isOpen, currentPersonaId, onClose, onSwitch }) {
  if (!isOpen) return null;

  const otherPersonas = PERSONALITIES.filter((p) => p.id !== currentPersonaId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Eseye yon lòt pwofesè ?
            </h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <X size={16} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Yon lòt pwofesè ka eksplike sa nan yon lòt jan. Tout sa nou te diskite ap rete.
          </p>
          <div className="space-y-2">
            {otherPersonas.map((p) => (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSwitch(p.id)}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 text-left transition-colors"
              >
                <TutorAvatar personaId={p.id} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{p.title}</div>
                </div>
                <ArrowRight size={16} className="text-slate-400 flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
