import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import LoginView from './views/LoginView';
import Dashboard from './pages/Dashboard';
import Arena from './pages/Arena';
import ProfileView from './views/ProfileView';
import NavigationHeader from './components/NavigationHeader';

// Active Match Route Enforcer: restricts outer routing when in battle or waiting lobby
const CombatNavigationLock = ({ children }) => {
  const { currentMatch } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If active or waiting private match, lock navigation into the arena room
    if (currentMatch && (currentMatch.status === 'ACTIVE' || currentMatch.status === 'OPEN')) {
      const targetRoomPath = `/arena/${currentMatch.roomId}`;
      if (location.pathname !== targetRoomPath) {
        navigate(targetRoomPath, { replace: true });
      }
    }
  }, [currentMatch, location.pathname, navigate]);

  return <>{children}</>;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#F9FAFB] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider text-blue-500 animate-pulse">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const ProtectedLayout = ({ children }) => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-[#000000] bg-dot-grid">
        <NavigationHeader />
        {children}
      </div>
    </ProtectedRoute>
  );
};

const AnonymousRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#F9FAFB] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider text-blue-500 animate-pulse">Loading...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <CombatNavigationLock>
      <Routes>
        <Route path="/login" element={
          <AnonymousRoute>
            <LoginView />
          </AnonymousRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        } />
        <Route path="/profile" element={
          <ProtectedLayout>
            <ProfileView />
          </ProtectedLayout>
        } />
        <Route path="/arena/:roomId" element={
          <ProtectedLayout>
            <Arena />
          </ProtectedLayout>
        } />
        {/* Default routes fallback to Dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </CombatNavigationLock>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <GameProvider>
        <Router>
          <AppRoutes />
        </Router>
      </GameProvider>
    </AuthProvider>
  );
};

export default App;
