// src/components/classroom/MultiBoard.jsx
// Swipeable multi-board system. Up to 6 boards.
// Default: Énoncé / Solution / Visuel. Dynamic boards added by tutor.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BOARD_TYPES, HIGHLIGHT_COLORS } from "../../utils/constants";

export default function MultiBoard({
  boards,
  activeBoardId,
  onChangeBoard,
  tutorWritingOn,
  exercise,
}) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0];
  const activeIdx = boards.findIndex((b) => b.id === activeBoardId);

  const goToBoard = (idx) => {
    if (idx < 0 || idx >= boards.length) return;
    onChangeBoard(boards[idx].id);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeIdx < boards.length - 1) {
      goToBoard(activeIdx + 1);
    }
    if (isRightSwipe && activeIdx > 0) {
      goToBoard(activeIdx - 1);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Board tabs / dots indicator */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 backdrop-blur-sm border-b border-white/10 rounded-t-xl">
        <button
          onClick={() => goToBoard(activeIdx - 1)}
          disabled={activeIdx === 0}
          className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/80 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="text-base">
            {BOARD_TYPES[activeBoard?.type]?.icon || "📋"}
          </span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {activeBoard?.name || "Tablo"}
          </span>
          {tutorWritingOn === activeBoardId && (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="ml-1 text-[10px] text-amber-300 font-semibold"
            >
              ● écrit
            </motion.span>
          )}
        </div>

        <button
          onClick={() => goToBoard(activeIdx + 1)}
          disabled={activeIdx >= boards.length - 1}
          className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/80 disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Dots indicator */}
      <div className="flex gap-1 justify-center py-1 bg-slate-900/60">
        {boards.map((b, i) => (
          <button
            key={b.id}
            onClick={() => goToBoard(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIdx ? "w-6 bg-amber-400" : "w-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Board content */}
      <div
        className="flex-1 relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeBoardId}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            <BoardContent board={activeBoard} exercise={exercise} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function BoardContent({ board, exercise }) {
  if (!board) return null;

  if (board.type === "enonce") {
    return <EnonceBoard board={board} exercise={exercise} />;
  }
  if (board.type === "solution") {
    return <SolutionBoard board={board} />;
  }
  if (board.type === "visuel") {
    return <VisuelBoard board={board} />;
  }
  return <GenericBoard board={board} />;
}

function EnonceBoard({ board, exercise }) {
  const donnees = board.donnees || [];
  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 overflow-y-auto">
      {exercise?.enonce && (
        <div className="mb-4 pb-3 border-b border-white/10">
          <div className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold mb-1">
            Énoncé
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{exercise.enonce}</p>
        </div>
      )}
      <div className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold mb-2">
        Données
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {donnees.map((d, i) => (
            <motion.div
              key={`${d.symbol}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <DonneeItem donnee={d} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SolutionBoard({ board }) {
  const items = board.items || [];
  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 overflow-y-auto">
      <div className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold mb-2">
        Solution
      </div>
      <div className="space-y-2 font-mono">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={`${item.type}-${i}`}
              initial={{ opacity: 0, x: -10, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <SolutionItem item={item} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function VisuelBoard({ board }) {
  const svg = board.svg;
  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center overflow-auto">
      {svg ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-full text-white"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="text-center">
          <div className="text-4xl mb-2 opacity-40">📐</div>
          <p className="text-sm text-white/40 font-sans">Le prof dessinera ici</p>
        </div>
      )}
    </div>
  );
}

function GenericBoard({ board }) {
  const items = board.items || [];
  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 overflow-y-auto">
      <div className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold mb-2">
        {board.name || "Annexe"}
      </div>
      <div className="space-y-2 font-sans text-sm">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="text-white"
          >
            {typeof item === "string" ? item : item.content}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DonneeItem({ donnee }) {
  const hl = donnee.highlight ? HIGHLIGHT_COLORS[donnee.highlight] : null;
  const baseText = "font-sans text-base leading-tight";

  if (donnee.isQuestion) {
    return (
      <div className={`${baseText} text-white`}>
        <span className="text-amber-200 font-bold">{donnee.symbol}</span>
        <span className="text-white/60"> = </span>
        <span className="text-amber-400 font-bold">?</span>
      </div>
    );
  }

  const content = (
    <div className={`${baseText} text-white inline-block`}>
      <span className="text-amber-200 font-bold">{donnee.symbol}</span>
      <span className="text-white/60"> = </span>
      <span className="font-bold">{donnee.value}</span>
      {donnee.unit && <span className="text-white/80 ml-1">{donnee.unit}</span>}
    </div>
  );

  if (hl) {
    return (
      <div className={`${hl.bg} ${hl.text} px-2 py-0.5 rounded inline-block`}>
        {content}
      </div>
    );
  }

  return content;
}

function SolutionItem({ item }) {
  const hl = item.highlight ? HIGHLIGHT_COLORS[item.highlight] : null;
  const baseText = "font-sans text-sm leading-relaxed";

  if (item.type === "result" && item.boxed) {
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="my-2 inline-block px-3 py-1.5 border-2 border-emerald-400 rounded-md bg-emerald-400/10"
      >
        <span className="text-emerald-300 font-bold">{item.content}</span>
      </motion.div>
    );
  }

  if (item.type === "conversion") {
    return (
      <div className={`${baseText} text-cyan-300 italic flex items-start gap-1`}>
        <span>⤳</span>
        <span>{item.content}</span>
      </div>
    );
  }

  if (item.type === "formula") {
    const content = <div className={`${baseText} text-white font-bold`}>{item.content}</div>;
    if (hl) {
      return <div className={`${hl.bg} ${hl.text} px-2 py-0.5 rounded inline-block`}>{content}</div>;
    }
    return content;
  }

  if (item.type === "substitution") {
    return <div className={`${baseText} text-white/90`}>{item.content}</div>;
  }

  if (item.type === "deduction") {
    return (
      <div className={`${baseText} text-white`}>
        <span className="text-amber-300 italic">→ </span>
        {item.content}
      </div>
    );
  }

  if (item.type === "note") {
    return <div className={`${baseText} text-white/60 italic`}>{item.content}</div>;
  }

  // donnee on solution board
  if (item.type === "donnee") {
    return <DonneeItem donnee={item} />;
  }

  return <div className={`${baseText} text-white`}>{item.content}</div>;
}
