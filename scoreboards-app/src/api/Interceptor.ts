import axios, { type AxiosInstance } from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useRef } from 'react';

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function useAxiosInterceptors() {
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const installedRef = useRef(false);

  useEffect(() => {
    if (installedRef.current) return;
    installedRef.current = true;

    apiClient.interceptors.request.use(
      async (config) => {
        try {
          const token = await getAccessTokenSilently();
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${token}`;
        } catch {
          await loginWithRedirect({
            authorizationParams: {
              prompt: 'login',
            },
          });
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }, [getAccessTokenSilently, loginWithRedirect]);
}

export default apiClient;
