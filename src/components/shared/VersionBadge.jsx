// src/components/shared/VersionBadge.jsx
// Shows the current app version. Drop into Profile so you can confirm deploys.
// Tap it 5 times quickly to reveal build details (easter egg / debug).

import { useState } from "react";
import { Info } from "lucide-react";
import { APP_VERSION, BUILD_DATE, BUILD_NOTES } from "../../utils/version";

export default function VersionBadge() {
  const [taps, setTaps] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const handleTap = () => {
    const next = taps + 1;
    setTaps(next);
    if (next >= 5) {
      setShowDetails(true);
      setTaps(0);
    }
  };

  return (
    <div className="px-4 py-3">
      <button
        onClick={handleTap}
        className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500"
      >
        <Info size={12} />
        <span>Laureat AI · v{APP_VERSION}</span>
      </button>

      {showDetails && (
        <div className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          <div><b>Version:</b> {APP_VERSION}</div>
          <div><b>Build:</b> {BUILD_DATE}</div>
          <div><b>Notes:</b> {BUILD_NOTES}</div>
          <button
            onClick={() => setShowDetails(false)}
            className="text-violet-500 mt-1"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
