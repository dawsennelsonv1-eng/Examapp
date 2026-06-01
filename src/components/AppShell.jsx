// src/components/AppShell.jsx — v23
// Restores the proper sticky TopBar from v18 instead of the floating buttons I had before.

import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import BottomTabBar from "./BottomTabBar";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950">
      <TopBar />
      <main className="relative">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
