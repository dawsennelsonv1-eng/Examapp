// src/components/shared/ImageExpandModal.jsx
// Fullscreen image viewer. Tap anywhere or X to close.

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function ImageExpandModal({ src, onClose }) {
  if (!src) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white z-10"
        >
          <X size={22} />
        </button>

        <motion.img
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          src={src}
          alt="Exercice"
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain rounded-lg"
          style={{ touchAction: "pinch-zoom" }}
        />

        <div className="absolute bottom-6 inset-x-0 text-center text-white/60 text-xs">
          Tape pou fèmen
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
