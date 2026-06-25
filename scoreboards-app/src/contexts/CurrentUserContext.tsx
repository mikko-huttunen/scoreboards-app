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

type CurrentUserContextValue = {
  user: User | null;
  isLoadingUser: boolean;
  userError: string | null;
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
  const { isAuthenticated } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) {
      setUser(null);
      setUserError(null);
      setIsLoadingUser(true);
      return;
    }

    setIsLoadingUser(true);
    setUserError(null);

    try {
      const fetched = await UserService.getCurrentUser();
      setUser(fetched);
    } catch (e) {
      setUser(null);
      setUserError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoadingUser(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Only fetch once auth state flips to authenticated
    if (isAuthenticated) {
      void refreshUser();
    } else {
      // When not authenticated yet, wait (don’t show error)
      setUser(null);
      setUserError(null);
      setIsLoadingUser(true);
    }
  }, [isAuthenticated, refreshUser]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      user,
      isLoadingUser,
      userError,
      refreshUser,
      setUser,
    }),
    [user, isLoadingUser, userError, refreshUser]
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
