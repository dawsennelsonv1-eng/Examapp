// src/pages/Share.jsx
// Public read-only page. Shows shared scan result OR classroom session.
// Ends with CTA: "Try the app yourself — Free Trial"

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, Sparkles, ArrowRight, BookOpen, MessageCircle,
  CheckCircle2, AlertCircle,
} from "lucide-react";

export default function Share() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/share?shareId=${shareId}`)
      .then((r) => r.json())
      .then((result) => {
        if (result.data) setData(result.data);
        else setError(result.error || "Not found");
      })
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3 text-violet-400" />
          <p className="text-sm text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-6">
        <div className="max-w-md text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-red-400" />
          <h1 className="text-xl font-bold mb-2">Ce lien n'est plus valide</h1>
          <p className="text-sm text-slate-400 mb-6">
            Le contenu partagé a peut-être expiré ou été supprimé.
          </p>
          <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white font-bold">
            Essayer Laureat AI <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 text-white pb-32">
      {/* Header banner */}
      <header className="bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 pb-8 text-white text-center">
        <img src="/icon-512.png" alt="Laureat AI" className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-lg" />
        <h1 className="text-2xl font-black mb-1">Quelqu'un t'a partagé ça</h1>
        <p className="text-sm text-white/80">Un exercice résolu par Laureat AI</p>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto">
        {data.type === "scan_result" && <SharedScan payload={data.payload} />}
        {data.type === "classroom_session" && <SharedClassroom payload={data.payload} />}

        {/* Big CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 p-6 text-white text-center shadow-2xl"
        >
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="text-xl font-black mb-2">Toi aussi tu peux scanner tes exos</h2>
          <p className="text-sm opacity-90 mb-4">
            Laureat AI résout tes exercices et t'explique étape par étape, pour réussir tes examens nationaux.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-orange-600 font-bold shadow-xl"
          >
            Essayer gratuitement <ArrowRight size={18} />
          </motion.button>
          <p className="text-xs opacity-75 mt-3">5 scans gratuits · Aucune carte requise · laureatai.app</p>
        </motion.div>

        <a href="https://laureatai.app" className="block text-center text-xs text-violet-300 font-semibold mt-8 underline">
          laureatai.app
        </a>
        <p className="text-center text-xs text-slate-500 mt-1">
          Laureat AI · Préparation aux examens nationaux pour les élèves haïtiens
        </p>
      </main>
    </div>
  );
}

function SharedScan({ payload }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-slate-900/80 backdrop-blur-sm p-4 border border-white/10">
        <h2 className="text-[10px] uppercase tracking-widest font-black text-violet-400 mb-2">Énoncé</h2>
        <p className="text-sm leading-relaxed">{payload.enonce}</p>
      </section>

      <div className="rounded-2xl bg-slate-900/80 backdrop-blur-sm overflow-hidden border border-white/10">
        <div className="grid grid-cols-12">
          <div className="col-span-4 p-4 bg-violet-950/40 border-r border-white/10">
            <h3 className="text-[10px] uppercase tracking-widest font-black text-violet-300 mb-3 border-b border-violet-500/30 pb-1.5">
              Données
            </h3>
            <div className="space-y-1.5 font-mono text-xs">
              {payload.donnees?.map((d, i) => (
                <div key={i}>
                  <span className="font-semibold text-amber-300">{d.symbol}</span>
                  <span className="text-white/60"> = </span>
                  <span className="font-bold">{d.value}</span>
                  {d.unit && <span className="text-white/80 ml-1">{d.unit}</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-8 p-4">
            {payload.sections?.map((section, i) => (
              <div key={i} className={i < payload.sections.length - 1 ? "pb-3 mb-3 border-b border-white/10" : ""}>
                <h4 className="text-xs font-bold mb-2 flex items-baseline gap-1.5">
                  <span className="text-violet-400">{section.number}-</span>
                  <span className="italic text-slate-300">{section.verb}</span>
                  <span className="text-slate-400 font-normal">{section.title}</span>
                </h4>
                <div className="space-y-1 pl-2 font-mono text-xs">
                  {section.steps?.map((step, j) => (
                    <StepView key={j} step={step} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepView({ step }) {
  if (step.type === "result" && step.boxed) {
    return (
      <div className="my-2 inline-block px-3 py-1 border-2 border-emerald-400 rounded-md bg-emerald-400/10">
        <span className="font-bold text-emerald-300">{step.content}</span>
      </div>
    );
  }
  if (step.type === "conversion") {
    return <div className="text-cyan-300 italic">⤳ {step.content}</div>;
  }
  return <div className="text-slate-200">{step.content}</div>;
}

function SharedClassroom({ payload }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-violet-400">{payload.title || "Session de classe"}</h2>
      {payload.messages?.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
            msg.role === "user" ? "bg-violet-600 rounded-br-sm" : "bg-slate-800 rounded-bl-sm"
          }`}>
            <p className="text-sm">{msg.content || msg.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
