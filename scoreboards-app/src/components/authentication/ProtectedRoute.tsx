import { useEffect, type JSX } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';

export default function ProtectedRoute({
  children,
}: {
  children: JSX.Element;
}) {
  const { isAuthenticated, isLoading, loginWithRedirect, user } = useAuth0();
  const location = useLocation();

  useEffect(() => {
    const checkAuthentication = async () => {
      if (!isLoading && !isAuthenticated) {
        await loginWithRedirect({ appState: { returnTo: location.pathname } });
      }
    };

    checkAuthentication();
  }, [isLoading, isAuthenticated, loginWithRedirect, location.pathname]);

  if (isLoading) {
    return <LoadingSpinner screenCentered={true} size={64} />;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Email verification gate for all protected routes
  if (!user?.email_verified) {
    return (
      <Navigate
        to="/verify-email"
        replace
        state={{ returnTo: location.pathname }}
      />
    );
  }

  return children;
}
