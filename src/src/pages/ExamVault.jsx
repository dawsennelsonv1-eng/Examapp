import { useApp } from "../contexts/AppContext";

export default function ExamVault() {
  const { t, lang } = useApp();
  return (
    <div className="p-6 pb-24">
      <h1 className="text-2xl font-bold mb-4">{t("past_exams")}</h1>
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p className="text-slate-600 dark:text-slate-300">
          {lang === "ht"
            ? "Achiv egzamen yo ap vini nan pwochèn vèsyon an."
            : "Les archives d'examens arrivent dans la prochaine version."}
        </p>
      </div>
    </div>
  );
}
