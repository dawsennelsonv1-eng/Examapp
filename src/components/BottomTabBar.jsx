import { NavLink } from "react-router-dom";
import { useApp } from "../contexts/AppContext";

export default function BottomTabBar() {
  const { t } = useApp();

  const tabs = [
    { to: "/",       icon: "🏠", label: t("tab_home") },
    { to: "/scan",   icon: "📷", label: t("tab_scan") },
    { to: "/quiz",   icon: "✍️", label: t("tab_quiz") },
    { to: "/vault",  icon: "📚", label: t("tab_vault") },
    { to: "/social", icon: "🏛", label: t("tab_social") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-20">
      <div className="flex justify-around items-center max-w-3xl mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 px-3 min-w-[60px] transition-colors ${
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 dark:text-slate-400"
              }`
            }
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
