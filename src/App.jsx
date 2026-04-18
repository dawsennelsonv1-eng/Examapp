// src/App.jsx
// Root component: header, routes, bottom tab bar.

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useApp } from "./contexts/AppContext";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import ScanSolve from "./pages/ScanSolve";
import Quizzes from "./pages/Quizzes";
import ExamVault from "./pages/ExamVault";
import Matieres from "./pages/Matieres";
import Profile from "./pages/Profile";
import BottomTabBar from "./components/BottomTabBar";
import TopHeader from "./components/TopHeader";

export default function App() {
  const { isTrackSelected } = useApp();
  const location = useLocation();

  if (!isTrackSelected) {
    return <Onboarding />;
  }

  // Hide header on fullscreen scan view — it manages its own chrome
  const hideHeader = location.pathname === "/scan";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {!hideHeader && <TopHeader />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<ScanSolve />} />
        <Route path="/quiz" element={<Quizzes />} />
        <Route path="/vault" element={<ExamVault />} />
        <Route path="/matieres" element={<Matieres />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BottomTabBar />
    </div>
  );
}
