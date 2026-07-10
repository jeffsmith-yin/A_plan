import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import NDAPage from "./pages/NDAPage";
import LoginPage from "./pages/LoginPage";
import NDASignPage from "./pages/NDASignPage";
import SettlementPage from "./pages/SettlementPage";
import OnboardingPage from "./pages/OnboardingPage";
import HubPage from "./pages/HubPage";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import SkillPacksPage from "./pages/SkillPacksPage";
import FilesPage from "./pages/FilesPage";
import MarketPage from "./pages/MarketPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import ProfilePage from "./pages/ProfilePage";
import MyPage from "./pages/MyPage";
import CirclesPage from "./pages/CirclesPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/nda" replace />} />
        <Route path="/nda" element={<NDAPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/nda-sign" element={<NDASignPage />} />
        <Route path="/settlement" element={<SettlementPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/hub" element={<HubPage />} />
        <Route path="/chat/:targetId" element={<ChatPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/skill-packs" element={<SkillPacksPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/circles" element={<CirclesPage />} />
      </Routes>
    </Router>
  );
}

export default App;
