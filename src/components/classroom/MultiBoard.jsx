// src/components/classroom/MultiBoard.jsx — v24
// v24 changes:
//  - Visuel board renders the SVG the AI brain PUSHES while the tutor explains
//    (board.svg is set by ClassroomSession.maybeAutoBoard). No "beg button".
//  - The empty Visuel state now says the prof will draw when it helps; the manual
//    "redessiner" request is demoted to a small, optional link.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, PencilRuler, Sparkles, Loader2 } from "lucide-react";

export default function MultiBoard({
  boards = [],
  activeBoardId,
  onChangeBoard,
  tutorWritingOn,
  exercise,
  onRequestDiagram,
}) {
  const activeIndex = boards.findIndex((b) => b.id === activeBoardId);
  const activeBoard = boards[activeIndex] || boards[0];

  const goPrev = () => { if (activeIndex > 0) onChangeBoard(boards[activeIndex - 1].id); };
  const goNext = () => { if (activeIndex < boards.length - 1) onChangeBoard(boards[activeIndex + 1].id); };

  return (
    <div className="h-full flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-md ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2">
        <button onClick={goPrev} disabled={activeIndex <= 0}
          className="w-8 h-8 flex items-center justify-center text-slate-500 disabled:opacity-30">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 flex justify-center gap-1 overflow-x-auto scrollbar-hide">
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => onChangeBoard(b.id)}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-2 transition-colors whitespace-nowrap ${
                b.id === activeBoardId
                  ? "text-violet-700 dark:text-violet-300 border-b-2 border-violet-600"
                  : "text-slate-500"
              }`}
            >
              {b.name}
              {tutorWritingOn === b.id && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />}
            </button>
          ))}
        </div>
        <button onClick={goNext} disabled={activeIndex >= boards.length - 1}
          className="w-8 h-8 flex items-center justify-center text-slate-500 disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Active board content */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          {activeBoard?.type === "enonce" && (
            <BoardEnonce key="enonce" board={activeBoard} exercise={exercise} />
          )}
          {activeBoard?.type === "solution" && (
            <BoardSolution key="solution" board={activeBoard} />
          )}
          {activeBoard?.type === "visuel" && (
            <BoardVisuel key="visuel" board={activeBoard} tutorWriting={tutorWritingOn === "board_visuel"} onRequestDiagram={onRequestDiagram} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BoardEnonce({ board, exercise }) {
  const donnees = board.donnees || [];
  const items = board.items || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-handwriting space-y-3">
      {exercise?.enonce && (
        <div className="text-base text-slate-900 dark:text-white leading-relaxed">{exercise.enonce}</div>
      )}

      {donnees.length > 0 && (
        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-3 mt-3">
          <div className="text-[10px] uppercase tracking-widest font-black text-violet-700 dark:text-violet-300 mb-2">Données</div>
          <div className="space-y-1.5 font-mono text-sm">
            {donnees.map((d, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i }}>
                {d.isQuestion ? (
                  <span className="text-violet-700 dark:text-violet-300 font-semibold">
                    {d.symbol} = <span className="text-amber-600 dark:text-amber-400">?</span>
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-slate-900 dark:text-white">{d.symbol}</span>
                    <span className="text-slate-500"> = </span>
                    <span className="font-bold text-slate-900 dark:text-white">{d.value}</span>
                    {d.unit && <span className="text-slate-600 dark:text-slate-400 ml-1">{d.unit}</span>}
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {items.map((item, i) => (
        <div key={i} className="text-sm text-slate-700 dark:text-slate-300">{item.content}</div>
      ))}
    </motion.div>
  );
}

function BoardSolution({ board }) {
  const items = board.items || [];

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="h-full flex items-center justify-center text-center">
        <div className="text-slate-400 dark:text-slate-500">
          <PencilRuler size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">Le prof écrira ici au fur et à mesure</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-handwriting space-y-2 font-mono">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * i }}
          className={
            item.type === "result" && item.boxed
              ? "inline-block px-3 py-1.5 my-2 border-2 border-emerald-500 dark:border-emerald-400 rounded-md bg-emerald-50 dark:bg-emerald-950/30 font-bold text-emerald-700 dark:text-emerald-300"
              : item.type === "conversion"
              ? "text-blue-700 dark:text-blue-400 italic text-sm"
              : item.type === "formula"
              ? "text-violet-700 dark:text-violet-300 font-bold text-sm"
              : "text-slate-700 dark:text-slate-300 text-sm"
          }
          style={item.highlight ? { backgroundColor: item.highlight } : undefined}
        >
          {item.content}
        </motion.div>
      ))}
    </motion.div>
  );
}

function BoardVisuel({ board, tutorWriting, onRequestDiagram }) {
  const [requesting, setRequesting] = useState(false);
  const [topic, setTopic] = useState("");
  const [showInput, setShowInput] = useState(false);

  const handleRequest = async () => {
    if (!topic.trim() || requesting) return;
    setRequesting(true);
    try {
      await onRequestDiagram?.(topic.trim());
      setTopic("");
      setShowInput(false);
    } finally {
      setRequesting(false);
    }
  };

  // AI is currently drawing (brain decided a schema helps)
  if (tutorWriting && !board.svg) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="h-full flex flex-col items-center justify-center text-center p-4">
        <Loader2 size={26} className="animate-spin text-violet-500 mb-3" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Le prof dessine un schéma...</p>
      </motion.div>
    );
  }

  // Has SVG → render it (pushed by the AI brain while explaining)
  if (board.svg) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-white rounded-lg overflow-hidden"
          dangerouslySetInnerHTML={{ __html: board.svg }} />
        <button onClick={() => setShowInput(true)}
          className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium self-center">
          Demander un autre schéma
        </button>
        {showInput && (
          <div className="mt-2 flex gap-2">
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRequest()}
              placeholder="Ex: schéma d'un circuit"
              className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none" />
            <button onClick={handleRequest} disabled={requesting || !topic.trim()}
              className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold disabled:opacity-50">
              {requesting ? <Loader2 size={12} className="animate-spin" /> : "Générer"}
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // Empty Visuel — calm message; the prof draws automatically when it helps.
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center text-center p-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center mb-3 shadow-lg shadow-violet-500/30">
        <Sparkles size={24} className="text-white" />
      </div>
      <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Visualisation</h3>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 max-w-xs">
        Le prof dessinera ici un schéma quand ça peut t'aider à comprendre.
      </p>
      {!showInput ? (
        <button onClick={() => setShowInput(true)}
          className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold underline">
          Ou demande-en un toi-même
        </button>
      ) : (
        <div className="w-full max-w-xs space-y-2">
          <input type="text" autoFocus value={topic} onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRequest()}
            placeholder="Ex: schéma d'un mouvement"
            className="w-full text-xs px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <div className="flex gap-2">
            <button onClick={() => setShowInput(false)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
              Annuler
            </button>
            <button onClick={handleRequest} disabled={requesting || !topic.trim()}
              className="flex-1 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1">
              {requesting ? <Loader2 size={12} className="animate-spin" /> : "Générer"}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
