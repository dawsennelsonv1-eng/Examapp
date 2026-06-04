// src/components/scan/CrossMultiplyStep.jsx — v24 (Package 1)
// "Produits en croix" rendered LOWKEY as part of the solution: two stacked
// proportions joined by long diagonal arrows (not an equals sign), the way
// Haitian teachers draw it for conversions like 1 min = 60 s.
//
// Expects a step like:
//   { type:"crossmultiply", leftTop:"1 min", leftBottom:"10 min",
//     rightTop:"60 s", rightBottom:"x", content:"x = 600 s" }

import { motion } from "framer-motion";

export default function CrossMultiplyStep({ step, index = 0 }) {
  if (!step) return null;
  const { leftTop, leftBottom, rightTop, rightBottom, content } = step;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="my-2 inline-flex flex-col gap-1"
    >
      <div className="relative inline-grid grid-cols-2 gap-x-7 gap-y-1 font-mono text-xs text-slate-800 dark:text-slate-200">
        {/* long crossing arrows */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <defs>
            <marker id="cmArrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0,0 L6,3.5 L0,7 Z" className="fill-violet-500/70" />
            </marker>
          </defs>
          <line x1="6%" y1="22%" x2="94%" y2="82%" className="stroke-violet-500/60" strokeWidth="1.4" markerEnd="url(#cmArrow)" />
          <line x1="94%" y1="22%" x2="6%" y2="82%" className="stroke-violet-500/60" strokeWidth="1.4" markerEnd="url(#cmArrow)" />
        </svg>
        <span className="relative z-10 font-semibold">{leftTop}</span>
        <span className="relative z-10 font-semibold text-right">{rightTop}</span>
        <span className="relative z-10 font-semibold">{leftBottom}</span>
        <span className="relative z-10 font-semibold text-right text-amber-600 dark:text-amber-400">{rightBottom}</span>
      </div>
      {content && (
        <div className="text-xs font-bold text-violet-700 dark:text-violet-300">{content}</div>
      )}
    </motion.div>
  );
}
