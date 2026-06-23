// src/App.jsx v24 (perf pass)
// Routes are lazy-loaded so the first paint on cheap Android ships a smaller
// bundle. Home + Auth load eagerly (first screens); everything else is split.
// Auth gate + admin config route from prior packages are preserved.

import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useApp } from "./contexts/AppContext";
import { useAuth } from "./contexts/AuthContext";
import AppShell from "./components/AppShell";
import MetaPixel from "./components/MetaPixel";
import WelcomeTour from "./components/WelcomeTour";
import FeedbackPrompt from "./components/FeedbackPrompt";
import InstallPrompt from "./components/InstallPrompt";
import Home from "./pages/Home";       // eager: first screen
import Auth from "./pages/Auth";       // eager: gate

// Lazy (code-split) — loaded on demand
const ScanSolve     = lazy(() => import("./pages/ScanSolve"));
const Classroom     = lazy(() => import("./pages/Classroom"));
const Reviser       = lazy(() => import("./pages/Reviser"));
const ReviserExam   = lazy(() => import("./pages/ReviserExam"));
const ReviserQuiz   = lazy(() => import("./pages/ReviserQuiz"));
const Cours         = lazy(() => import("./pages/Cours"));
const CoursSubject  = lazy(() => import("./pages/CoursSubject"));
const CoursEvent    = lazy(() => import("./pages/CoursEvent"));
const Profile       = lazy(() => import("./pages/Profile"));
const Onboarding    = lazy(() => import("./pages/Onboarding"));
const AdminDashboard= lazy(() => import("./pages/AdminDashboard"));
const AdminConfig   = lazy(() => import("./pages/AdminConfig"));
const AdminExams    = lazy(() => import("./pages/AdminExams"));
const Paywall       = lazy(() => import("./pages/Paywall"));
const Share         = lazy(() => import("./pages/Share"));

function PageFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <Suspense fallback={<PageFallback />}>
        <Routes>
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
            <Route path="admin/config" element={<AdminConfig />} />
            <Route path="admin/exams" element={<AdminExams />} />

            {/* Backward compat */}
            <Route path="quiz" element={<Navigate to="/reviser" replace />} />
            <Route path="matieres" element={<Navigate to="/cours" replace />} />
            <Route path="vault" element={<Navigate to="/cours" replace />} />
          </Route>
        </Routes>
      </Suspense>
      <InstallPrompt />
      <FeedbackPrompt />
      <MetaPixel />
      <WelcomeTour />
    </>
  );
}

function ProtectedShell() {
  const { onboardingComplete } = useApp();
  const { isConfigured, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isConfigured) {
    if (loading) return <div className="min-h-screen bg-slate-950" />;
    if (!isAuthenticated) return <Auth />;
  }

  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }
  return <AppShell />;
}
