// src/components/admin/MetricBlocks.jsx v22
// Reusable: MetricCard (number + label + sparkline), Sparkline (mini SVG chart),
// BarChart (horizontal bars for distributions), Donut (simple ring chart).

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { useState } from "react";

export function MetricCard({
  label, value, sublabel, hint, trend = null,
  series = null, color = "violet", icon: Icon,
}) {
  const [showHint, setShowHint] = useState(false);

  const trendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-emerald-500"
    : trend === "down" ? "text-red-500"
    : "text-slate-400";

  const accents = {
    violet: "from-violet-500 to-indigo-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-pink-600",
    blue: "from-blue-500 to-cyan-600",
    slate: "from-slate-500 to-slate-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 overflow-hidden"
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accents[color]} flex items-center justify-center shadow-sm flex-shrink-0`}>
            <Icon size={16} className="text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 truncate">
              {label}
            </span>
            {hint && (
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Info size={11} />
              </button>
            )}
          </div>
          <div className="font-black text-xl text-slate-900 dark:text-white truncate">{value}</div>
          {sublabel && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{sublabel}</div>
          )}
        </div>
        {trend && (
          <div className={`${trendColor} flex-shrink-0`}>
            {trendIcon === TrendingUp ? <TrendingUp size={14} /> :
             trendIcon === TrendingDown ? <TrendingDown size={14} /> :
             <Minus size={14} />}
          </div>
        )}
      </div>

      {series && series.length > 0 && (
        <div className="mt-3 -mx-1">
          <Sparkline data={series} color={accents[color]} />
        </div>
      )}

      {showHint && hint && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed"
        >
          {hint}
        </motion.div>
      )}
    </motion.div>
  );
}

export function Sparkline({ data = [], color = "from-violet-500 to-indigo-600", height = 40 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 30;
  const step = w / (data.length - 1 || 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`);
  const linePath = `M ${pts.join(" L ")}`;
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;

  // Extract colors for gradient
  const matches = color.match(/from-(\w+)-(\d+).*to-(\w+)-(\d+)/) || ["", "violet", "500", "indigo", "600"];
  const c1Name = matches[1] || "violet";
  const id = `sg-${c1Name}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: `${height}px` }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} className="text-violet-500" />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-600 dark:text-violet-400" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BarChart({ data = [], maxValue = null }) {
  if (!data || data.length === 0) return null;
  const max = maxValue ?? Math.max(...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">{item.displayValue || item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className={`h-full rounded-full bg-gradient-to-r ${item.color || "from-violet-500 to-indigo-600"}`}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function Donut({ segments = [], centerValue, centerLabel, size = 140 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          className="stroke-slate-100 dark:stroke-slate-700" strokeWidth="12" />
        {segments.map((seg, i) => {
          const length = (seg.value / total) * circumference;
          const segOffset = offset;
          offset += length;
          return (
            <motion.circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-segOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${length} ${circumference - length}` }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-black text-slate-900 dark:text-white leading-none">{centerValue}</div>
        {centerLabel && (
          <div className="text-[9px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mt-1">{centerLabel}</div>
        )}
      </div>
    </div>
  );
}
