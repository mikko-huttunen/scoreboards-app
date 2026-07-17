import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginView } from './components/authentication/Login';
import { ProfileView } from './components/profile/Profile';
import { ScoreboardsView } from './components/scoreboards/ScoreboardsView.tsx';
import { CreateScoreboard } from './components/scoreboards/CreateScoreboard';
import { ScoreboardView } from './components/scoreboards/ScoreboardView';
import { EditScoreboard } from './components/scoreboards/EditScoreboard';
import { RootRedirect } from './components/authentication/RootRedirect';
import ProtectedRoute from './components/authentication/ProtectedRoute';
import { useAxiosInterceptors } from './api/Interceptor';
import { Navigation } from './components/navigation/Navigation.tsx';
import { SessionResultsView } from './components/sessions/SessionResultsView.tsx';
import EmailVerificationView from './components/authentication/EmailVerificationView.tsx';

function App() {
  useAxiosInterceptors();

  const location = useLocation();
  const pathsWithNoNavigation = ['/login', '/', '/verify-email'];
  const showNavigation = !pathsWithNoNavigation.includes(location.pathname);
  return (
    <>
      {showNavigation && <Navigation />}
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/login" element={<LoginView />} />

        <Route path="/verify-email" element={<EmailVerificationView />} />

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
          element={
            <ProtectedRoute>
              <SessionResultsView />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
