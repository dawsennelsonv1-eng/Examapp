// src/components/OfflineBanner.jsx — v24
// Thin banner that appears when the device is offline, reassuring the user that
// already-opened lessons still work. Mount it once in AppShell.

import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="sticky top-0 z-40 bg-amber-500 text-slate-950 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-bold"
        >
          <WifiOff size={14} />
          Hors ligne — tes leçons déjà ouvertes restent disponibles
        </motion.div>
      )}
    </AnimatePresence>
  );
}
