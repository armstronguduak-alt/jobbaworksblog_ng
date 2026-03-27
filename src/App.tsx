import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BlogLayout } from './layouts/BlogLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy loaded pages to optimize bundle size and TTI
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Signup = lazy(() => import('./pages/Signup').then(module => ({ default: module.Signup })));
const Articles = lazy(() => import('./pages/Articles').then(module => ({ default: module.Articles })));
const Plans = lazy(() => import('./pages/Plans').then(module => ({ default: module.Plans })));
const Leaderboard = lazy(() => import('./pages/Leaderboard').then(module => ({ default: module.Leaderboard })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Promotional = lazy(() => import('./pages/Promotional').then(module => ({ default: module.Promotional })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const CreateArticle = lazy(() => import('./pages/CreateArticle').then(module => ({ default: module.CreateArticle })));
const Earn = lazy(() => import('./pages/Earn').then(module => ({ default: module.Earn })));
const Wallet = lazy(() => import('./pages/Wallet').then(module => ({ default: module.Wallet })));
const Swap = lazy(() => import('./pages/Swap').then(module => ({ default: module.Swap })));
const Referral = lazy(() => import('./pages/Referral').then(module => ({ default: module.Referral })));
const Analytics = lazy(() => import('./pages/Analytics').then(module => ({ default: module.Analytics })));
const AdminManagement = lazy(() => import('./pages/AdminManagement').then(module => ({ default: module.AdminManagement })));
const AdminUsers = lazy(() => import('./pages/AdminUsers').then(module => ({ default: module.AdminUsers })));
const AdminTransactions = lazy(() => import('./pages/AdminTransactions').then(module => ({ default: module.AdminTransactions })));
const AdminContent = lazy(() => import('./pages/AdminContent').then(module => ({ default: module.AdminContent })));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-surface"><div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* PUBLIC BLOG LAYOUT */}
        <Route path="/" element={<BlogLayout />}>
          <Route index element={<Home />} />
          <Route path="promotional" element={<Promotional />} />
        </Route>

        {/* SECURE DASHBOARD LAYOUT */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="plans" element={<Plans />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="articles" element={<Articles />} />
            <Route path="earn" element={<Earn />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="swap" element={<Swap />} />
            <Route path="referral" element={<Referral />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="/create-article" element={<CreateArticle />} />
          </Route>

          {/* SECURE ADMIN LAYOUT */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminManagement />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="content" element={<AdminContent />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
