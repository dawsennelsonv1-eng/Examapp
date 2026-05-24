// src/App.jsx
// Routes for Laureat AI.

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import Layout from "./components/Layout";
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
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Standalone pages (no bottom tab bar) */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/paywall" element={<Paywall />} />

          {/* Main app with bottom tabs */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="quiz" element={<Quizzes />} />
            <Route path="scan" element={<ScanSolve />} />
            <Route path="classe" element={<Classroom />} />
            <Route path="reviser" element={<Reviser />} />
            <Route path="profile" element={<Profile />} />

            {/* Redirects from old paths */}
            <Route path="matieres" element={<Navigate to="/reviser" replace />} />
            <Route path="vault" element={<Navigate to="/reviser" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
