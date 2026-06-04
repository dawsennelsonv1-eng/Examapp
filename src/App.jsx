// src/App.jsx v24
// Adds the auth gate: when Supabase is configured and the user isn't signed in,
// the Auth (sign-up/login) page shows before anything else. In local-only mode
// (no Supabase env vars) the gate is a no-op and the old flow is unchanged.

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useApp } from "./contexts/AppContext";
import { useAuth } from "./contexts/AuthContext";
import AppShell from "./components/AppShell";
import Home from "./pages/Home";
import ScanSolve from "./pages/ScanSolve";
import Classroom from "./pages/Classroom";
import Reviser from "./pages/Reviser";
import ReviserExam from "./pages/ReviserExam";
import ReviserQuiz from "./pages/ReviserQuiz";
import Cours from "./pages/Cours";
import CoursSubject from "./pages/CoursSubject";
import CoursEvent from "./pages/CoursEvent";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import AdminDashboard from "./pages/AdminDashboard";
import Paywall from "./pages/Paywall";
import Share from "./pages/Share";
import Auth from "./pages/Auth";

export default function App() {
  return (
    <Routes>
      {/* Public share links never require auth */}
      <Route path="/share/:shareId" element={<Share />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/paywall" element={<Paywall />} />

      <Route path="/" element={<ProtectedShell />}>
        <Route index element={<Home />} />
        <Route path="reviser" element={<Reviser />} />
        <Route path="reviser/exam/:year/:track" element={<ReviserExam />} />
        <Route path="reviser/quiz/:quizId" element={<ReviserQuiz />} />
        <Route path="cours" element={<Cours />} />
        <Route path="cours/:subjectId" element={<CoursSubject />} />
        <Route path="cours/:subjectId/:chapterId/:eventId" element={<CoursEvent />} />
        <Route path="scan" element={<ScanSolve />} />
        <Route path="classe" element={<Classroom />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<AdminDashboard />} />

        {/* Backward compat */}
        <Route path="quiz" element={<Navigate to="/reviser" replace />} />
        <Route path="matieres" element={<Navigate to="/cours" replace />} />
        <Route path="vault" element={<Navigate to="/cours" replace />} />
      </Route>
    </Routes>
  );
}

function ProtectedShell() {
  const { onboardingComplete } = useApp();
  const { isConfigured, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Auth gate (only when Supabase is wired). While the session loads, show nothing
  // to avoid a flash of the auth screen for already-signed-in users.
  if (isConfigured) {
    if (loading) return <div className="min-h-screen bg-slate-950" />;
    if (!isAuthenticated) return <Auth />;
  }

  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }
  return <AppShell />;
}
