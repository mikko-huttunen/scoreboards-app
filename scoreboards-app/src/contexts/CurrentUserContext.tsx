import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import type { User } from '../types/User';
import { UserService } from '../services/UserService';
import { useAuth0 } from '@auth0/auth0-react';
import { useMessageSnackbar } from '../components/common/snackbar/MessageSnackbar.tsx';

type CurrentUserContextValue = {
  user: User | null;
  isLoadingUser: boolean;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(
  undefined
);

export function CurrentUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user: auth0User, logout } = useAuth0();
  const { showErrorMessage } = useMessageSnackbar();

  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) {
      setUser(null);
      setIsLoadingUser(true);
      return;
    }

    setIsLoadingUser(true);

    try {
      const fetched = await UserService.getCurrentUser();
      setUser(fetched);
    } catch (e) {
      setUser(null);
      showErrorMessage('Failed to load user');
      await logout({
        logoutParams: { returnTo: `${window.location.origin}/login` },
      });
    } finally {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated, showErrorMessage]);

  useEffect(() => {
    // Only fetch once auth state flips to authenticated (and email is verified)
    if (isAuthenticated && auth0User?.email_verified) {
      void refreshUser();
      return;
    }

    // When not authenticated or not verified, don't keep stale user loaded
    setUser(null);
    setIsLoadingUser(true);
  }, [isAuthenticated, auth0User?.email_verified, refreshUser]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      user,
      isLoadingUser,
      refreshUser,
      setUser,
    }),
    [user, isLoadingUser, refreshUser]
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider');
  }
  return ctx;
}
