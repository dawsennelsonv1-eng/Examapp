// src/App.jsx
// Routes for Laureat AI.
// BrowserRouter + AppProvider are in main.jsx — don't wrap again here.

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useApp } from "./contexts/AppContext";
import AppShell from "./components/AppShell";
import Home from "./pages/Home";
import ScanSolve from "./pages/ScanSolve";
import Classroom from "./pages/Classroom";
import Quizzes from "./pages/Quizzes";
import Reviser from "./pages/Reviser";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import Admin from "./pages/Admin";
import Paywall from "./pages/Paywall";

export default function App() {
  return (
    <Routes>
      {/* Standalone (no tab bar) */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/paywall" element={<Paywall />} />

      {/* Main app */}
      <Route path="/" element={<ProtectedShell />}>
        <Route index element={<Home />} />
        <Route path="quiz" element={<Quizzes />} />
        <Route path="scan" element={<ScanSolve />} />
        <Route path="classe" element={<Classroom />} />
        <Route path="reviser" element={<Reviser />} />
        <Route path="profile" element={<Profile />} />
        <Route path="matieres" element={<Navigate to="/reviser" replace />} />
        <Route path="vault" element={<Navigate to="/reviser" replace />} />
      </Route>
    </Routes>
  );
}

// Redirect to onboarding if user hasn't completed it
function ProtectedShell() {
  const { onboardingComplete } = useApp();
  const location = useLocation();

  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }
  return <AppShell />;
}
