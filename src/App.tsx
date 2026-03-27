import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BlogLayout } from './layouts/BlogLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Articles } from './pages/Articles';
import { Plans } from './pages/Plans';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { CreateArticle } from './pages/CreateArticle';
import { Earn } from './pages/Earn';
import { Wallet } from './pages/Wallet';
import { Swap } from './pages/Swap';
import { Referral } from './pages/Referral';
import { Analytics } from './pages/Analytics';
import { AdminManagement } from './pages/AdminManagement';
import { AdminUsers } from './pages/AdminUsers';
import { AdminTransactions } from './pages/AdminTransactions';
import { AdminContent } from './pages/AdminContent';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/create-article" element={<CreateArticle />} />
        
        {/* PUBLIC BLOG LAYOUT */}
        <Route path="/" element={<BlogLayout />}>
          <Route index element={<Home />} />
          <Route path="articles" element={<Articles />} />
          <Route path="plans" element={<Plans />} />
        </Route>

        {/* SECURE DASHBOARD LAYOUT */}
        <Route path="/" element={<DashboardLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leaderboard" element={<Dashboard />} />
          <Route path="earn" element={<Earn />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="swap" element={<Swap />} />
          <Route path="referral" element={<Referral />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<AdminManagement />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/transactions" element={<AdminTransactions />} />
          <Route path="admin/content" element={<AdminContent />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
