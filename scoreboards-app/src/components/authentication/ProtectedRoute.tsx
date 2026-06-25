import { useEffect, type JSX } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  useEffect(() => {
    const checkAuthentication = async () => {
      if (!isLoading && !isAuthenticated) {
        await loginWithRedirect({ appState: { returnTo: location.pathname } });
      }
    };

    checkAuthentication();
  }, [isLoading, isAuthenticated, loginWithRedirect, location.pathname]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
