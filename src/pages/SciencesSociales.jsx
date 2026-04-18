import { motion } from "framer-motion";
import { useApp } from "../contexts/AppContext";

const PRESIDENTS_SAMPLE = [
  { year: "1804", name: "Jean-Jacques Dessalines", note: "Père de l'indépendance" },
  { year: "1818", name: "Jean-Pierre Boyer", note: "Réunification de l'île" },
  { year: "1915", name: "Occupation américaine", note: "Contexte historique majeur" },
  { year: "1957", name: "François Duvalier", note: "Régime autoritaire" },
  { year: "1990", name: "Jean-Bertrand Aristide", note: "Première élection démocratique" },
];

export default function SciencesSociales() {
  const { t, lang } = useApp();
  return (
    <div className="p-6 pb-24">
      <h1 className="text-2xl font-bold mb-4">{t("tab_social")}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
        {lang === "ht"
          ? "Chronoloji prezidan Ayisyen yo"
          : "Chronologie des présidents haïtiens"}
      </p>

      <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-6">
        {PRESIDENTS_SAMPLE.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
          >
            <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-900" />
            <div className="rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                {p.year}
              </div>
              <div className="font-semibold mb-1">{p.name}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{p.note}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
