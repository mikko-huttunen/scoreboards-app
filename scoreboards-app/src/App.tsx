import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginView } from './components/authentication/Login';
import { ProfileView } from './components/profile/Profile';
import { ScoreboardsView } from './components/scoreboards/ScoreboardsView.tsx';
import { CreateScoreboard } from './components/scoreboards/CreateScoreboard';
import { ScoreboardView } from './components/scoreboards/ScoreboardView';
import { EditScoreboard } from './components/scoreboards/EditScoreboard';
import { useAccessTokenManager } from './hooks/useAccessTokenManager';
import { RootRedirect } from './components/authentication/RootRedirect';
import ProtectedRoute from './components/authentication/ProtectedRoute';
import { useAuth0 } from '@auth0/auth0-react';
import { setupAxiosInterceptors } from './api/Interceptor';
import { Navigation } from './components/navigation/Navigation.tsx';
import { SessionResultsView } from './components/sessions/SessionResultsView.tsx';

function App() {
  const { getAccessTokenSilently } = useAuth0();

  useAccessTokenManager();
  setupAxiosInterceptors(getAccessTokenSilently);

  const location = useLocation();
  const pathsWithNoNavigation = ['/login', '/'];
  const showNavigation = !pathsWithNoNavigation.includes(location.pathname);
  return (
    <>
      {showNavigation && <Navigation />}
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/login" element={<LoginView />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scoreboards"
          element={
            <ProtectedRoute>
              <ScoreboardsView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scoreboards/new"
          element={
            <ProtectedRoute>
              <CreateScoreboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scoreboards/:scoreboardId"
          element={
            <ProtectedRoute>
              <ScoreboardView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scoreboards/:scoreboardId/edit"
          element={
            <ProtectedRoute>
              <EditScoreboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/scoreboards/:scoreboardId/session/:sessionId/results"
          element={<SessionResultsView />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
