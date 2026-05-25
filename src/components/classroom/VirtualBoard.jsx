// src/components/classroom/VirtualBoard.jsx
// Black chalkboard. Données on left, Solution on right.
// Content grows as the teacher reveals it during the session.
// Uses handwriting-style font for authentic feel.

import { motion, AnimatePresence } from "framer-motion";

export default function VirtualBoard({ boardState, exercise, currentSectionNumber }) {
  const revealedDonnees = boardState?.donnees || [];
  const activeSteps = boardState?.activeSteps || [];
  const diagramSvg = boardState?.diagramSvg;
  const allSections = exercise?.sections || [];

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden rounded-xl">
      {/* Chalkboard texture overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 50%, rgba(255,255,255,0.05) 0%, transparent 60%),
                            radial-gradient(circle at 70% 80%, rgba(255,255,255,0.04) 0%, transparent 50%)`,
        }}
      />

      {/* Wood frame at top */}
      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-b from-amber-900 to-amber-800 shadow-md" />

      <div className="relative h-full p-4 pt-6 overflow-y-auto">
        {/* If diagram present, show it at top */}
        {diagramSvg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 flex justify-center"
          >
            <div
              className="max-w-sm text-white"
              dangerouslySetInnerHTML={{ __html: diagramSvg }}
            />
          </motion.div>
        )}

        {/* If no exercise yet, show waiting message */}
        {!exercise && !diagramSvg && (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <div className="text-4xl mb-3 opacity-50">✏️</div>
              <p className="text-amber-200 font-handwriting text-lg">
                Le tableau est prêt
              </p>
              <p className="text-amber-200/60 text-sm mt-1 font-handwriting">
                Pose une question au prof
              </p>
            </div>
          </div>
        )}

        {/* Exercise board: two columns */}
        {exercise && (
          <div className="grid grid-cols-12 gap-3 min-h-full">
            {/* Données column */}
            <div className="col-span-4 border-r-2 border-white/20 pr-3">
              <h3 className="text-[11px] uppercase tracking-widest text-amber-300 font-bold mb-3 pb-1 border-b border-amber-300/30 font-handwriting">
                Données
              </h3>
              <div className="space-y-2">
                <AnimatePresence>
                  {revealedDonnees.map((d, i) => (
                    <motion.div
                      key={`${d.symbol}-${i}`}
                      initial={{ opacity: 0, x: -10, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: i * 0.1, duration: 0.4 }}
                      className="font-handwriting text-white text-base leading-tight"
                    >
                      <DonneeOnBoard donnee={d} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Solution column */}
            <div className="col-span-8 pl-1">
              {allSections.slice(0, currentSectionNumber).map((section, i) => {
                const isActiveSection = i === currentSectionNumber - 1;
                const stepsToShow = isActiveSection
                  ? activeSteps
                  : section.steps; // previous sections fully shown

                return (
                  <SectionOnBoard
                    key={i}
                    section={section}
                    steps={stepsToShow}
                    isActive={isActiveSection}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DonneeOnBoard({ donnee }) {
  if (donnee.isQuestion) {
    return (
      <>
        <span className="text-amber-200">{donnee.symbol}</span>
        <span className="text-white/60"> = </span>
        <span className="text-amber-300 font-bold">?</span>
      </>
    );
  }
  return (
    <>
      <span className="text-amber-200">{donnee.symbol}</span>
      <span className="text-white/60"> = </span>
      <span className="text-white font-bold">{donnee.value}</span>
      {donnee.unit && (
        <span className="text-white/80 ml-1">{donnee.unit}</span>
      )}
      {donnee.converted && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-cyan-300 text-sm mt-0.5 ml-2 italic"
        >
          = {donnee.converted}
        </motion.div>
      )}
    </>
  );
}

function SectionOnBoard({ section, steps, isActive }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <h4 className="font-handwriting text-amber-200 text-base mb-1.5 leading-tight">
        <span className="font-bold">{section.number}- </span>
        <span className="italic">{section.verb}</span>{" "}
        <span className="text-white/80">{section.title}</span>
      </h4>
      <div className="space-y-1 pl-3 font-handwriting">
        <AnimatePresence>
          {(steps || []).map((step, i) => (
            <motion.div
              key={`${section.number}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
            >
              <StepOnBoard step={step} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StepOnBoard({ step }) {
  if (step.type === "result" && step.boxed) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="my-2 inline-block px-3 py-1.5 border-2 border-emerald-400 rounded-md bg-emerald-400/10"
      >
        <span className="text-emerald-300 font-bold text-base">
          {step.content}
        </span>
      </motion.div>
    );
  }
  if (step.type === "conversion") {
    return (
      <div className="text-cyan-300 italic text-sm flex items-start gap-1">
        <span className="text-cyan-400">⤳</span>
        <span>{step.content}</span>
      </div>
    );
  }
  if (step.type === "deduction") {
    return (
      <div className="text-white">
        <span className="text-amber-300 italic">→ </span>
        <span>{step.content}</span>
      </div>
    );
  }
  if (step.type === "note") {
    return (
      <div className="text-white/60 italic text-sm">{step.content}</div>
    );
  }
  return <div className="text-white text-base">{step.content}</div>;
}
