import { useApp } from "../contexts/AppContext";

export default function Quizzes() {
  const { t, lang } = useApp();
  return (
    <div className="p-6 pb-24">
      <h1 className="text-2xl font-bold mb-4">{t("tab_quiz")}</h1>
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p className="text-slate-600 dark:text-slate-300">
          {lang === "ht"
            ? "Seksyon kwiz la ap vini nan pwochèn vèsyon an."
            : "La section quiz arrive dans la prochaine version."}
        </p>
      </div>
    </div>
  );
}
