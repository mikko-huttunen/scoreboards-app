import React, { useCallback } from 'react';
import { Button, CircularProgress, Stack } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import './Login.css';
import logo from '../../resources/scoreboards_logo_white.png';

export type LoginViewProps = {
  onLogin?: () => void | Promise<void>;
};

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const { isLoading, loginWithRedirect } = useAuth0();

  const handleLogin = useCallback(async () => {
    if (onLogin) {
      await onLogin();
    } else {
      await loginWithRedirect();
    }
  }, [onLogin, loginWithRedirect]);

  return (
    <div className="container">
      <div className="center-content">
        <img src={logo} alt="Scoreboards" className="logo" />
      </div>
      <div className="center-content">
        <Stack spacing={2} sx={{ width: 'min(520px, 92vw)' }}>
          {isLoading && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
            >
              <CircularProgress size={20} sx={{ color: '#ffffff' }} />
            </Stack>
          )}
          <Button
            variant="contained"
            onClick={handleLogin}
            disabled={isLoading}
            sx={{
              backgroundColor: '#ffffff',
              color: '#38a14f',
              ':hover': { backgroundColor: '#f7f7f7' },
              alignSelf: 'center',
              width: { xs: '100%', sm: '320px' },
              maxWidth: { xs: '100%', sm: '90vw' },
              position: { xs: 'fixed', sm: 'absolute' },
              bottom: { xs: 0, sm: '25%' },
              left: { xs: 0, sm: '50%' },
              right: { xs: 0, sm: 'auto' },
              transform: { xs: 'none', sm: 'translateX(-50%)' },
              height: { xs: '15vh', sm: 'auto' },
              borderRadius: { xs: 0, sm: 1 },
              zIndex: { xs: 1000, sm: 'auto' },
            }}
          >
            Enter
          </Button>
        </Stack>
      </div>
    </div>
  );
};
