import { useEffect, useRef, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useAuth0 } from '@auth0/auth0-react';

type JwtPayload = { exp?: number };

export function useAccessTokenManager() {
  const { isAuthenticated, getAccessTokenSilently, logout, isLoading } =
    useAuth0();
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const doLogout = useCallback(() => {
    clearTimer();
    logout({
      logoutParams: {
        returnTo: `${window.location.origin}/login`,
      },
    });
  }, [logout]);

  useEffect(() => {
    if (isLoading) return;
    clearTimer();

    if (!isAuthenticated) return;

    let mounted = true;

    (async () => {
      try {
        const token = await getAccessTokenSilently();
        if (!mounted) return;

        const payload = jwtDecode<JwtPayload>(token);
        if (!payload?.exp) {
          doLogout();
          return;
        }

        const expiresAt = payload.exp * 1000;
        const msUntilExpiry = expiresAt - Date.now();

        if (msUntilExpiry <= 0) {
          doLogout();
          return;
        }

        timeoutRef.current = window.setTimeout(() => {
          doLogout();
        }, msUntilExpiry + 500);

        const onVisibility = () => {
          if (document.visibilityState === 'visible') {
            // re-run effect by calling getAccessTokenSilently again (will trigger logout if expired)
            (async () => {
              try {
                await getAccessTokenSilently();
              } catch {
                doLogout();
              }
            })();
          }
        };
        window.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('focus', onVisibility);

        return () => {
          mounted = false;
          clearTimer();
          window.removeEventListener('visibilitychange', onVisibility);
          window.removeEventListener('focus', onVisibility);
        };
      } catch (err) {
        doLogout();
      }
    })();

    return () => {
      mounted = false;
      clearTimer();
    };
  }, [isAuthenticated, isLoading, getAccessTokenSilently, doLogout]);
}
