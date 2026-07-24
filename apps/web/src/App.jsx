
import React, { useEffect } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { LanguageProvider } from '@/contexts/LanguageContext.jsx';
import { AnalyticsProvider } from '@/contexts/AnalyticsProvider.jsx';
import { usePageTracking } from '@/hooks/usePageTracking.js';

import ScrollToTop from '@/components/ScrollToTop.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import CookieConsent from '@/components/CookieConsent.jsx';
import CookiePreferencesModal from '@/components/CookiePreferencesModal.jsx';
import AdSenseAutoAds from '@/components/AdSenseAutoAds.jsx';
import SeasonalTheme from '@/components/SeasonalTheme.jsx';
import { Toaster } from '@/components/ui/sonner';

import HomePage from '@/pages/HomePage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import SignupPage from '@/pages/SignupPage.jsx';
import DashboardPage from '@/pages/DashboardPage.jsx';
import UserProfilePage from '@/pages/UserProfilePage.jsx';
import BotsPage from '@/pages/BotsPage.jsx';
import AdminPage from '@/pages/AdminPage.jsx';
import AdminStatisticsPage from '@/pages/AdminStatisticsPage.jsx';
import CreatorPage from '@/pages/CreatorPage.jsx';
import TranslationsPage from '@/pages/TranslationsPage.jsx';
import OnionWebManagement from '@/pages/OnionWebManagement.jsx';
import BlogPage from '@/pages/BlogPage.jsx';
import BlogPostPage from '@/pages/BlogPostPage.jsx';
import BlogAdminPage from '@/pages/BlogAdminPage.jsx';
import BlogArticleFormPage from '@/pages/BlogArticleFormPage.jsx';
import ProxiesPanel from '@/pages/ProxiesPanel.jsx';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage.jsx';
import SettingsPage from '@/pages/SettingsPage.jsx';

// Component to handle route-change analytics
const PageTracker = () => {
  usePageTracking();
  return null;
};

const ThemePreference = () => {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (theme = localStorage.getItem('selectedTheme') || 'system') => {
      const useDarkTheme = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      document.documentElement.classList.toggle('dark', useDarkTheme);
      document.documentElement.style.colorScheme = useDarkTheme ? 'dark' : 'light';
    };
    const handlePreferenceUpdate = (event) => applyTheme(event.detail);
    const handleSystemThemeChange = () => applyTheme();

    applyTheme();
    window.addEventListener('themePreferenceUpdate', handlePreferenceUpdate);
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      window.removeEventListener('themePreferenceUpdate', handlePreferenceUpdate);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  return null;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <AnalyticsProvider>
            <PageTracker />
            <ThemePreference />
            <AdSenseAutoAds />
            <ScrollToTop />
            <div className="flex flex-col min-h-screen relative">
              <SeasonalTheme />
              <Header />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />
                  <Route path="/proxies" element={<ProxiesPanel />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <UserProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/bots"
                    element={
                      <ProtectedRoute>
                        <BotsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'creator']}>
                        <AdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/statistics"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'creator']}>
                        <AdminStatisticsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/onion-webs"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'creator']}>
                        <OnionWebManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/creator"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'creator']}>
                        <CreatorPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/translations"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'creator']}>
                        <TranslationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/creator/blog"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'creator']}>
                        <BlogAdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/creator/blog/new"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'creator']}>
                        <BlogArticleFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/creator/blog/:id/edit"
                    element={
                      <ProtectedRoute requiredRole={['admin', 'creator']}>
                        <BlogArticleFormPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Catch-all route */}
                  <Route path="*" element={
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
                      <h2 className="text-2xl font-semibold mb-6">Página no encontrada</h2>
                      <p className="text-muted-foreground mb-8 max-w-md">La página que buscas no existe o ha sido movida.</p>
                      <a href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                        Volver al inicio
                      </a>
                    </div>
                  } />
                </Routes>
              </main>
              <Footer />
              
              {/* Analytics & Cookie Components */}
              <CookieConsent />
              <CookiePreferencesModal />
            </div>
            <Toaster position="top-right" />
          </AnalyticsProvider>
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
