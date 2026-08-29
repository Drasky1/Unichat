import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import CommunitiesPage from './pages/CommunitiesPage';
import FindFriendsPage from './pages/FindFriendsPage';
import ProjectsPage from './pages/ProjectsPage';
import GradesPage from './pages/GradesPage';
import ProfilePage from './pages/ProfilePage';
import ModerationPage from './pages/ModerationPage';

function ProtectedApp() {
  const { isLoggedIn, user } = useApp();

  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<HomePage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="/friends"     element={<FindFriendsPage />} />
        <Route path="/projects"    element={<ProjectsPage />} />
        <Route path="/grades"      element={<GradesPage />} />
        <Route path="/profile"     element={<ProfilePage />} />
        <Route path="/moderation" element={user.role === 'moderator' ? <ModerationPage /> : <Navigate to="/" replace />} />
        <Route path="/admin/moderation" element={<Navigate to="/moderation" replace />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ProtectedApp />
      </AppProvider>
    </BrowserRouter>
  );
}
