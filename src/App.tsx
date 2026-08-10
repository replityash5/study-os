import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthLoading } from './components/auth/AuthLoading';
import { AuthScreen } from './components/auth/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { AuthProvider, useAuth } from './auth/useAuth';
import { useCloudSync } from './hooks/useCloudSync';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { AnalyticsPage } from './pages/AnalyticsPage';

function AuthenticatedApp() {
  const { loading, user, localOnly } = useAuth();

  if (loading) return <AuthLoading />;
  if (!user && !localOnly) return <AuthScreen />;

  return <StudyRouter />;
}

function StudyRouter() {
  useCloudSync();
  return (
    <BrowserRouter>
      <Sidebar />
      <Routes>
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/practice" element={<ComingSoonPage label="Practice" />} />
        <Route path="/bookmarks" element={<ComingSoonPage label="Bookmarks" />} />
        <Route path="/settings" element={<ComingSoonPage label="Settings" />} />
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
