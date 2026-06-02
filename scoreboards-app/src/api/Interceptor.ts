import axios, { type AxiosInstance } from 'axios';

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setupAxiosInterceptors = (
  getAccessTokenSilently: () => Promise<string>
) => {
  apiClient.interceptors.request.use(
    async (config) => {
      try {
        const token = await getAccessTokenSilently();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error fetching access token:', error);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};

export default apiClient;
