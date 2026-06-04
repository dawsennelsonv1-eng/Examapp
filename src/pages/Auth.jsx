// src/pages/Auth.jsx — v24
// Sign-up / Login. Dark, warm, on-brand for Laureat AI. Shown before the app when
// the user isn't authenticated (and Supabase is configured). Falls through to the
// app automatically in local-only mode.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, GraduationCap, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Auth() {
  const { signUp, signIn, signInWithMagicLink } = useAuth();
  const [mode, setMode] = useState("signup"); // signup | login
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [magicSent, setMagicSent] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setError("Remplis tous les champs.");
      return;
    }
    if (password.length < 6) { setError("Le mot de passe doit avoir au moins 6 caractères."); return; }
    setBusy(true);
    const fn = mode === "signup"
      ? signUp({ email: email.trim(), password, name: name.trim() })
      : signIn({ email: email.trim(), password });
    const { error: err } = await fn;
    setBusy(false);
    if (err) {
      setError(translateAuthError(err.message));
      return;
    }
    // On success, AuthContext flips isAuthenticated and the app renders.
  };

  const sendMagic = async () => {
    setError(null);
    if (!email.trim()) { setError("Entre ton email d'abord."); return; }
    setBusy(true);
    const { error: err } = await signInWithMagicLink(email.trim());
    setBusy(false);
    if (err) setError(translateAuthError(err.message));
    else setMagicSent(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex flex-col">
      {/* Atmospheric background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-violet-600/30 blur-3xl" />
        <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-fuchsia-600/15 blur-3xl" />
      </div>

      {/* Hero */}
      <div className="px-6 pt-16 pb-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15 mb-5">
            <Sparkles size={13} className="text-amber-300" />
            <span className="text-[11px] font-bold text-white/80 tracking-wide">Prépare ton examen national</span>
          </div>
          <h1 className="text-4xl font-black text-white leading-[1.05] tracking-tight">
            Laureat <span className="bg-gradient-to-br from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">AI</span>
          </h1>
          <p className="mt-3 text-sm text-white/60 leading-relaxed max-w-xs">
            Ton prof particulier dans ta poche. Scanne, comprends, réussis — du 9ème AF au NS4.
          </p>
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-auto rounded-t-[2rem] bg-slate-900/80 backdrop-blur-xl ring-1 ring-white/10 px-6 pt-6 pb-10 shadow-2xl"
      >
        {/* Tabs */}
        <div className="flex p-1 rounded-2xl bg-slate-800/70 mb-6">
          {[["signup", "Créer un compte"], ["login", "Se connecter"]].map(([key, label]) => (
            <button key={key} onClick={() => { setMode(key); setError(null); setMagicSent(false); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                mode === key ? "bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-md" : "text-white/55"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {magicSent ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={26} className="text-emerald-400" />
            </div>
            <h3 className="text-white font-bold mb-1">Vérifie ton email</h3>
            <p className="text-sm text-white/60">On t'a envoyé un lien de connexion à <span className="text-white/80">{email}</span>.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {mode === "signup" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <Field icon={User} placeholder="Ton prénom" value={name} onChange={setName} />
                </motion.div>
              )}
            </AnimatePresence>
            <Field icon={Mail} placeholder="Email" type="email" value={email} onChange={setEmail} />
            <Field icon={Lock} placeholder="Mot de passe" type="password" value={password} onChange={setPassword}
              onEnter={submit} />

            {error && <p className="text-xs text-red-400 px-1">{error}</p>}

            <motion.button whileTap={{ scale: 0.98 }} onClick={submit} disabled={busy}
              className="w-full py-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30 disabled:opacity-60">
              {busy ? <Loader2 size={18} className="animate-spin" /> : (
                <>{mode === "signup" ? "Commencer" : "Se connecter"} <ArrowRight size={18} /></>
              )}
            </motion.button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-white/40 font-medium">ou</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button onClick={sendMagic} disabled={busy}
              className="w-full py-3 rounded-2xl bg-white/5 ring-1 ring-white/10 text-white/80 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              <Mail size={15} /> Recevoir un lien magique
            </button>

            <p className="text-center text-[11px] text-white/40 pt-2 flex items-center justify-center gap-1.5">
              <GraduationCap size={13} /> Rejoins les élèves qui se préparent avec Laureat AI
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Field({ icon: Icon, placeholder, type = "text", value, onChange, onEnter }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-800/70 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-violet-500 transition">
      <Icon size={17} className="text-white/40 flex-shrink-0" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-white placeholder:text-white/35 text-sm focus:outline-none"
      />
    </div>
  );
}

function translateAuthError(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) return "Cet email a déjà un compte. Connecte-toi.";
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Confirme ton email d'abord (vérifie ta boîte mail).";
  if (m.includes("rate limit")) return "Trop d'essais. Attends une minute.";
  return "Une erreur est survenue. Réessaie.";
}
