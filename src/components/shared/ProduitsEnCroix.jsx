// src/components/shared/ProduitsEnCroix.jsx
// v19: Renders "produits en croix" — the cross-multiplication layout Haitian
// teachers use heavily for proportions/règle de trois.
//
// Example data:
//   { leftTop: "1 min", leftBottom: "10 min",
//     rightTop: "60 s",  rightBottom: "x s",
//     result: "x = 600 s" }
//
// Renders:
//   1 min  ─── 60 s
//      ╲  ╱
//       ╳
//      ╱  ╲
//  10 min ─── x s
//   → x = 600 s

import { motion } from "framer-motion";

export default function ProduitsEnCroix({ data }) {
  if (!data) return null;
  const items = Array.isArray(data) ? data : [data];

  return (
    <div className="space-y-4">
      {items.map((rel, i) => (
        <ProduitsEnCroixCard key={i} data={rel} index={i} />
      ))}
    </div>
  );
}

function ProduitsEnCroixCard({ data, index }) {
  const { leftTop, leftBottom, rightTop, rightBottom, result, label } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 p-4 ring-1 ring-violet-200 dark:ring-violet-700/40"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-widest font-black text-violet-700 dark:text-violet-300">
          Produits en croix
        </div>
        {label && <div className="text-[10px] text-slate-500 dark:text-slate-400">{label}</div>}
      </div>

      <svg viewBox="0 0 320 140" className="w-full max-w-md mx-auto">
        {/* Top row */}
        <text x="80" y="32" textAnchor="middle" className="fill-slate-900 dark:fill-white" style={{ fontSize: 16, fontWeight: 600 }}>
          {leftTop}
        </text>
        <text x="240" y="32" textAnchor="middle" className="fill-slate-900 dark:fill-white" style={{ fontSize: 16, fontWeight: 600 }}>
          {rightTop}
        </text>

        {/* Bottom row */}
        <text x="80" y="120" textAnchor="middle" className="fill-slate-900 dark:fill-white" style={{ fontSize: 16, fontWeight: 600 }}>
          {leftBottom}
        </text>
        <text x="240" y="120" textAnchor="middle" className="fill-slate-900 dark:fill-white" style={{ fontSize: 16, fontWeight: 600 }}>
          {rightBottom}
        </text>

        {/* The CROSS — animated draw-in */}
        <motion.line
          x1="100" y1="42" x2="220" y2="100"
          stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        />
        <motion.line
          x1="220" y1="42" x2="100" y2="100"
          stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        />

        {/* Cross center dot */}
        <motion.circle
          cx="160" cy="71" r="4"
          fill="#f59e0b"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 300 }}
        />
      </svg>

      {/* Result line */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-3 flex justify-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 ring-1 ring-emerald-300 dark:ring-emerald-700">
            <span className="text-amber-500 font-bold">→</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{result}</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
