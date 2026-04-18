import { Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./contexts/AppContext";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import ScanSolve from "./pages/ScanSolve";
import Quizzes from "./pages/Quizzes";
import ExamVault from "./pages/ExamVault";
import SciencesSociales from "./pages/SciencesSociales";
import BottomTabBar from "./components/BottomTabBar";

export default function App() {
  const { isTrackSelected } = useApp();

  if (!isTrackSelected) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<ScanSolve />} />
        <Route path="/quiz" element={<Quizzes />} />
        <Route path="/vault" element={<ExamVault />} />
        <Route path="/social" element={<SciencesSociales />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomTabBar />
    </div>
  );
}
