import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BlogLayout } from './layouts/BlogLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Minimal branded placeholder — no spinners, no animation, instant feel
const PageLoader = () => (
  <div className="min-h-screen bg-[#f8faf9]" />
);

// Lazy loaded pages to optimize bundle size and TTI
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Signup = lazy(() => import('./pages/Signup').then(module => ({ default: module.Signup })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(module => ({ default: module.ResetPassword })));
const Articles = lazy(() => import('./pages/Articles').then(module => ({ default: module.Articles })));
const Plans = lazy(() => import('./pages/Plans').then(module => ({ default: module.Plans })));
const Leaderboard = lazy(() => import('./pages/Leaderboard').then(module => ({ default: module.Leaderboard })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Promotional = lazy(() => import('./pages/Promotional').then(module => ({ default: module.Promotional })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const PublicProfile = lazy(() => import('./pages/PublicProfile').then(module => ({ default: module.PublicProfile })));
const PublicArticle = lazy(() => import('./pages/PublicArticle').then(module => ({ default: module.PublicArticle })));
const CreateArticle = lazy(() => import('./pages/CreateArticle').then(module => ({ default: module.CreateArticle })));
const Earn = lazy(() => import('./pages/Earn').then(module => ({ default: module.Earn })));
const Wallet = lazy(() => import('./pages/Wallet').then(module => ({ default: module.Wallet })));
const Swap = lazy(() => import('./pages/Swap').then(module => ({ default: module.Swap })));
const Referral = lazy(() => import('./pages/Referral').then(module => ({ default: module.Referral })));

const MyStories = lazy(() => import('./pages/MyStories').then(module => ({ default: module.MyStories })));
const CreateStory = lazy(() => import('./pages/CreateStory').then(module => ({ default: module.CreateStory })));

const StoriesHub = lazy(() => import('./pages/StoriesHub').then(module => ({ default: module.StoriesHub })));
const StoryDetail = lazy(() => import('./pages/StoryDetail').then(module => ({ default: module.StoryDetail })));
const StoryReader = lazy(() => import('./pages/StoryReader').then(module => ({ default: module.StoryReader })));

const Analytics = lazy(() => import('./pages/Analytics').then(module => ({ default: module.Analytics })));
const Transactions = lazy(() => import('./pages/Transactions').then(module => ({ default: module.Transactions })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(module => ({ default: module.TermsOfService })));
const AdminManagement = lazy(() => import('./pages/AdminManagement').then(module => ({ default: module.AdminManagement })));
const AdminUsers = lazy(() => import('./pages/AdminUsers').then(module => ({ default: module.AdminUsers })));
const AdminTransactions = lazy(() => import('./pages/AdminTransactions').then(module => ({ default: module.AdminTransactions })));
const AdminContent = lazy(() => import('./pages/AdminContent').then(module => ({ default: module.AdminContent })));
const AdminSettings = lazy(() => import('./pages/AdminSettings').then(module => ({ default: module.AdminSettings })));
const AdminPromotions = lazy(() => import('./pages/AdminPromotions').then(module => ({ default: module.AdminPromotions })));
const AdminTasks = lazy(() => import('./pages/AdminTasks').then(module => ({ default: module.AdminTasks })));
const AdminCategories = lazy(() => import('./pages/AdminCategories').then(module => ({ default: module.AdminCategories })));
const AdminReferrals = lazy(() => import('./pages/AdminReferrals').then(module => ({ default: module.AdminReferrals })));
const AdminNotifications = lazy(() => import('./pages/AdminNotifications').then(module => ({ default: module.AdminNotifications })));
const AdminStories = lazy(() => import('./pages/AdminStories').then(module => ({ default: module.AdminStories })));
const AdminWithdrawals = lazy(() => import('./pages/AdminWithdrawals').then(module => ({ default: module.AdminWithdrawals })));
const EmailConfirmation = lazy(() => import('./pages/EmailConfirmation').then(module => ({ default: module.EmailConfirmation })));
const EmailVerified = lazy(() => import('./pages/EmailVerified').then(module => ({ default: module.EmailVerified })));
const AdminLogin = lazy(() => import('./pages/AdminLogin').then(module => ({ default: module.AdminLogin })));

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/email-verified" element={<EmailVerified />} />
        
        {/* PUBLIC BLOG LAYOUT */}
        <Route path="/" element={<BlogLayout />}>
          <Route index element={<Home />} />
          <Route path="author/:username" element={<PublicProfile />} />
          <Route path="stories" element={<StoriesHub />} />
          <Route path="stories/:slug" element={<StoryDetail />} />
          <Route path="stories/read/:slug/:chapterNum" element={<StoryReader />} />
          <Route path=":slug" element={<Home />} />
          <Route path=":categorySlug/:slug" element={<PublicArticle />} />
          <Route path="promotional" element={<Promotional />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="terms-of-service" element={<TermsOfService />} />
        </Route>

        {/* SECURE DASHBOARD LAYOUT */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboard/mystories" element={<MyStories />} />
            <Route path="stories/create" element={<CreateStory />} />
            <Route path="plans" element={<Plans />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="articles" element={<Articles />} />
            <Route path="earn" element={<Earn />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="swap" element={<Swap />} />
            <Route path="referral" element={<Referral />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="/create-article" element={<CreateArticle />} />
            <Route path="/edit-article/:id" element={<CreateArticle />} />
          </Route>

          {/* SECURE ADMIN LAYOUT */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminManagement />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="moderation" element={<AdminContent />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="articles" element={<AdminContent />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="promotions" element={<AdminPromotions />} />
            <Route path="tasks" element={<AdminTasks />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="referrals" element={<AdminReferrals />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="stories" element={<AdminStories />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
