import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';

export function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth0();

  if (isLoading)
    return (
      <LoadingSpinner label={'Loading user'} size={64} screenCentered={true} />
    );

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!user?.email_verified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <Navigate to="/profile" replace />;
}
