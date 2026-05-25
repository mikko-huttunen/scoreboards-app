import './App.css';
import { useAuth0 } from '@auth0/auth0-react';
import { LoginView } from './components/authentication/Login';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfileView } from './components/profile/Profile';
import { ScoreboardsView } from './components/scoreboards/ScoreboardView';
import { ScoreboardsList } from './components/scoreboards/ScoreboardsList';
import { CreateScoreboard } from './components/scoreboards/CreateScoreboard';
import { EditScoreboard } from './components/scoreboards/EditScoreboard';
import { AddScores } from './components/scoreboards/AddScores';

function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/profile" replace /> : <LoginView />
        }
      />
      <Route
        path="/profile"
        element={
          isLoading ? (
            <div>Loading...</div>
          ) : isAuthenticated ? (
            <ProfileView />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/scoreboards"
        element={
          isLoading ? (
            <div>Loading...</div>
          ) : isAuthenticated ? (
            <ScoreboardsList />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/scoreboards/new"
        element={
          isLoading ? (
            <div>Loading...</div>
          ) : isAuthenticated ? (
            <CreateScoreboard />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/scoreboards/:scoreboardId"
        element={
          isLoading ? (
            <div>Loading...</div>
          ) : isAuthenticated ? (
            <ScoreboardsView />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/scoreboards/:scoreboardId/edit"
        element={
          isLoading ? (
            <div>Loading...</div>
          ) : isAuthenticated ? (
            <EditScoreboard />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/sessions/:sessionId/add-scores"
        element={
          isLoading ? (
            <div>Loading...</div>
          ) : isAuthenticated ? (
            <AddScores />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? '/scoreboards' : '/'} replace />
        }
      />
    </Routes>
  );
}

export default App;
