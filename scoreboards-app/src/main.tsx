import ReactDOM from 'react-dom/client';
import './main.css';
import App from './App';
import { Auth0Provider } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <Auth0Provider
    domain={import.meta.env.VITE_AUTH_DOMAIN}
    clientId={import.meta.env.VITE_AUTH_CLIENT_ID}
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: `https://${import.meta.env.VITE_AUTH_DOMAIN}/api/v2/`,
      scope:
        'openid profile email read:current_user update:current_user_metadata',
    }}
    useRefreshTokens={true}
    cacheLocation="localstorage"
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Auth0Provider>
);
