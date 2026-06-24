// src/App.jsx v24 (perf pass)
// Routes are lazy-loaded so the first paint on cheap Android ships a smaller
// bundle. Home + Auth load eagerly (first screens); everything else is split.
// Auth gate + admin config route from prior packages are preserved.

import { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useApp } from "./contexts/AppContext";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import AppShell from "./components/AppShell";
import MetaPixel from "./components/MetaPixel";
import ReferralCapture from "./components/ReferralCapture";
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
      <ReferralCapture />
    </>
  );
}

function ProtectedShell() {
  const { onboardingComplete, setOnboardingComplete, setTrack, setPreferences } = useApp();
  const { isConfigured, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);

  // Cross-device onboarding: if this account already finished onboarding on
  // another device, pull it from the profile so we don't re-onboard here.
  useEffect(() => {
    if (!isAuthenticated || onboardingComplete || profileChecked) return;
    let alive = true;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (uid) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("onboarding_complete, track, display_name, personality, language")
            .eq("id", uid).single();
          if (alive && prof?.onboarding_complete) {
            setTrack?.(prof.track || "NS4");
            setPreferences?.({
              name: prof.display_name || "Élève",
              personality: prof.personality || "joseph",
              language: prof.language || "fr",
            });
            setOnboardingComplete?.(true);
          }
        }
      } catch { /* ignore — fall back to local onboarding */ }
      finally { if (alive) setProfileChecked(true); }
    })();
    return () => { alive = false; };
  }, [isAuthenticated, onboardingComplete, profileChecked, setOnboardingComplete, setTrack, setPreferences]);

  if (isConfigured) {
    if (loading) return <div className="min-h-screen bg-slate-950" />;
    if (!isAuthenticated) return <Auth />;
  }

  // While we check the profile for a returning user, hold (avoids an onboarding flash).
  if (isAuthenticated && !onboardingComplete && !profileChecked) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }
  return <AppShell />;
}
