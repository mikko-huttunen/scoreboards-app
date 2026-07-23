import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';
import { UserService } from '../../services/UserService.ts';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';

const EmailVerificationView = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth0();
  const email = user?.email;
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();

  const [isResending, setIsResending] = useState(false);
  const [resendTime, setResendTime] = useState<number | null>(null);

  const resendDeadlineMsRef = useRef<number | null>(null);
  const [isResendDisabled, setIsResendingDisabled] = useState(true);

  const updateFromServerSeconds = useCallback((seconds: number) => {
    const now = Date.now();
    const clamped = Math.max(0, Math.floor(seconds));
    resendDeadlineMsRef.current = now + clamped * 1000;
    setResendTime(clamped);
  }, []);

  const verifiedAndAuthed = useMemo(
    () => !isLoading && isAuthenticated && !!user?.email_verified,
    [isLoading, isAuthenticated, user?.email_verified]
  );

  useEffect(() => {
    if (verifiedAndAuthed || !user) return;

    const checkResendTimer = async () => {
      const time = await UserService.checkResendTimer(user.sub);
      if (time) updateFromServerSeconds(time);
      else {
        resendDeadlineMsRef.current = null;
        setResendTime(null);
      }
    };

    void checkResendTimer();
  }, [verifiedAndAuthed, user?.sub, updateFromServerSeconds, user]);

  useEffect(() => {
    if (verifiedAndAuthed) return;

    const intervalId = window.setInterval(() => {
      const deadline = resendDeadlineMsRef.current;
      if (!deadline) return;

      const remainingMs = deadline - Date.now();
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      setResendTime((prev) => {
        // avoid state churn: only update when value actually changes
        if (prev === remainingSeconds) return prev;
        return remainingSeconds;
      });

      if (remainingMs <= 0) {
        resendDeadlineMsRef.current = null;
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [verifiedAndAuthed]);

  useEffect(() => {
    setIsResendingDisabled(
      isResending || (resendTime !== null && resendTime > 0)
    );
  }, [isResending, resendTime != null, resendTime === 0]);

  const handleResend = useCallback(async () => {
    if (!email || !user) return;

    try {
      setIsResending(true);
      const time = await UserService.resendVerificationEmail(user.sub);

      if (time) updateFromServerSeconds(time);
      else {
        resendDeadlineMsRef.current = null;
        setResendTime(null);
      }

      showSuccessMessage('Verification email resent');
    } catch (e) {
      showErrorMessage('Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  }, [email, user, updateFromServerSeconds]);

  if (isLoading) {
    return <LoadingSpinner screenCentered={true} size={64} />;
  }

  if (verifiedAndAuthed) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 4 },
      }}
    >
      <Stack spacing={2} sx={{ width: 'min(520px, 92vw)' }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 0.5,
            textAlign: 'center',
            fontSize: { xs: '1.6rem', sm: '2.125rem' },
          }}
        >
          Verify your email
        </Typography>

        <Typography sx={{ textAlign: 'center' }} variant="body1">
          We sent a verification link to{' '}
          <strong>{email ?? 'your inbox'}</strong>.
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', textAlign: 'center' }}
        >
          Please check your inbox (and spam/junk folder). After verifying, login
          again to continue.
        </Typography>

        {resendTime !== null && resendTime > 0 && (
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', textAlign: 'center' }}
          >
            Please wait {resendTime}s before resending the email.
          </Typography>
        )}

        <Stack
          direction="column"
          spacing={1}
          sx={{
            pt: 1,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Button
            variant="contained"
            onClick={handleResend}
            disabled={isResendDisabled}
            sx={{
              backgroundColor: '#ffffff',
              color: '#38a14f',
              ':hover': { backgroundColor: '#f7f7f7' },
              width: 'auto',
            }}
          >
            Resend verification email
          </Button>

          <Button
            variant="contained"
            onClick={async () =>
              await logout({
                logoutParams: { returnTo: `${window.location.origin}/login` },
              })
            }
            sx={{ width: 'auto' }}
          >
            Logout
          </Button>
        </Stack>

        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', textAlign: 'center' }}
        >
          Didn’t receive it? Try “Resend verification email”, then check your
          inbox again.
        </Typography>
      </Stack>
    </Box>
  );
};

export default EmailVerificationView;
