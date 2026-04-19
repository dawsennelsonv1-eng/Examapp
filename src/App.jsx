// src/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useApp } from "./contexts/AppContext";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import ScanSolve from "./pages/ScanSolve";
import Quizzes from "./pages/Quizzes";
import Reviser from "./pages/Reviser";
import Classroom from "./pages/Classroom";
import Profile from "./pages/Profile";
import BottomTabBar from "./components/BottomTabBar";
import TopHeader from "./components/TopHeader";

export default function App() {
  const { isTrackSelected } = useApp();
  const location = useLocation();

  if (!isTrackSelected) {
    return <Onboarding />;
  }

  // Hide header on fullscreen views
  const hideHeader =
    location.pathname === "/scan" ||
    (location.pathname === "/classe" && location.search.includes("session="));

  // Hide tab bar when inside a classroom session (it's fullscreen)
  const hideTabBar =
    location.pathname === "/classe" && location.search.includes("session=");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {!hideHeader && <TopHeader />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<ScanSolve />} />
        <Route path="/quiz" element={<Quizzes />} />
        <Route path="/classe" element={<Classroom />} />
        <Route path="/reviser" element={<Reviser />} />
        <Route path="/profile" element={<Profile />} />
        {/* Redirects from old routes */}
        <Route path="/matieres" element={<Navigate to="/reviser" replace />} />
        <Route path="/vault" element={<Navigate to="/reviser" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!hideTabBar && <BottomTabBar />}
    </div>
  );
}
