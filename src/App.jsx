// src/App.jsx v21
// New routes:
//   /cours/:subjectId/:chapterId/:eventId → lesson detail (CoursEvent)
//   /reviser/exam/:year/:track → past exam viewer (ReviserExam)
//   /reviser/quiz/:quizId → weekly quiz player (ReviserQuiz)

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useApp } from "./contexts/AppContext";
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
import Admin from "./pages/Admin";
import Paywall from "./pages/Paywall";
import Share from "./pages/Share";

export default function App() {
  return (
    <Routes>
      <Route path="/share/:shareId" element={<Share />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/admin" element={<Admin />} />
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
  const location = useLocation();
  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }
  return <AppShell />;
}
