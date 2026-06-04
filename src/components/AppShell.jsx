// src/components/AppShell.jsx — v24
// Adds the offline banner (top) and the floating WhatsApp support button.

import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import BottomTabBar from "./BottomTabBar";
import OfflineBanner from "./OfflineBanner";
import WhatsAppSupport from "./WhatsAppSupport";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950">
      <OfflineBanner />
      <TopBar />
      <main className="relative">
        <Outlet />
      </main>
      <WhatsAppSupport />
      <BottomTabBar />
    </div>
  );
}
