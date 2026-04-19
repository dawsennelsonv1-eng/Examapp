// src/components/Logo.jsx
// Temporary text-based logo for Laureat AI.
// Uses a distinctive letterform + gradient for brand recognition.

export default function Logo({ size = 32, showText = true, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="laureatGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        {/* Rounded square */}
        <rect width="40" height="40" rx="10" fill="url(#laureatGrad)" />
        {/* Stylized L with laurel hint */}
        <path
          d="M12 10 L12 30 L28 30"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Small dot — AI accent */}
        <circle cx="28" cy="12" r="2.5" fill="#fbbf24" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className="font-black text-slate-900 dark:text-white tracking-tight"
            style={{ fontSize: size * 0.55 }}
          >
            Laureat<span className="text-violet-500">·</span>AI
          </span>
        </div>
      )}
    </div>
  );
}
