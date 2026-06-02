import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginView } from './components/authentication/Login';
import { ProfileView } from './components/profile/Profile';
import { ScoreboardsList } from './components/scoreboards/ScoreboardsList';
import { CreateScoreboard } from './components/scoreboards/CreateScoreboard';
import { ScoreboardsView } from './components/scoreboards/ScoreboardView';
import { EditScoreboard } from './components/scoreboards/EditScoreboard';
import { AddScores } from './components/scoreboards/AddScores';
import { useAccessTokenManager } from './hooks/useAccessTokenManager';
import { RootRedirect } from './components/authentication/RootRedirect';
import ProtectedRoute from './components/authentication/ProtectedRoute';
import { useAuth0 } from '@auth0/auth0-react';
import { setupAxiosInterceptors } from './api/Interceptor';

function App() {
  const { getAccessTokenSilently } = useAuth0();

  useAccessTokenManager();
  setupAxiosInterceptors(getAccessTokenSilently);

  return (
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
            <ScoreboardsList />
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
            <ScoreboardsView />
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
        path="/sessions/:sessionId/add-scores"
        element={
          <ProtectedRoute>
            <AddScores />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
