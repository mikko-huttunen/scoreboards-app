import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigationSpacing } from '../navigation/Navigation';
import { UserService } from '../../services/UserService';
import './Profile.css';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';

export const ProfileView: React.FC = () => {
  const { user: auth0User, logout } = useAuth0();
  const navigationSpacing = useNavigationSpacing();
  const [username, setUsername] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user, isLoadingUser } = useCurrentUser();
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();

  const avatarUrl = useMemo(() => {
    return auth0User?.picture ?? undefined;
  }, [avatarFile, user?.avatar, auth0User?.picture]);

  const handleSave = async () => {
    if (saving || !user) return;
    setSaving(true);
    try {
      await UserService.updateCurrentUser(username);
      showSuccessMessage('User updated successfully');
    } catch (err) {
      showErrorMessage('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || !user) return;
    setDeleting(true);
    try {
      await UserService.deleteCurrentUser();
      setConfirmOpen(false);
      await logout({ logoutParams: { returnTo: window.location.origin } });
    } catch (err) {
      showErrorMessage('Failed to delete user');
      setDeleting(false);
    }
  };

  useEffect(() => {
    setUsername(user?.name || '');
  }, [user]);

  if (isLoadingUser) {
    return (
      <LoadingSpinner label={'Loading user'} size={64} screenCentered={true} />
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        position: 'relative',
      }}
    >
      <Box sx={{ px: 2, py: 4, ...navigationSpacing }}>
        <Stack spacing={4} alignItems="flex-start">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: '100%' }}
          >
            <Typography variant="h4" sx={{ color: '#1b5e20' }}>
              Profile
            </Typography>
            <Button
              variant="contained"
              onClick={() =>
                logout({
                  logoutParams: { returnTo: `${window.location.origin}/login` },
                })
              }
              sx={{
                backgroundColor: '#ffffff',
                color: '#38a14f',
                ':hover': { backgroundColor: '#f7f7f7' },
              }}
            >
              Log Out
            </Button>
          </Stack>
          <Stack
            spacing={2}
            alignItems="center"
            sx={{ width: 'min(1200px, 100%)', alignSelf: 'center' }}
          >
            <Avatar src={avatarUrl} sx={{ width: 112, height: 112 }} />
          </Stack>

          <Stack
            spacing={2}
            sx={{ width: 'min(300px, 100%)', alignSelf: 'center' }}
          >
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { color: '#1b5e20' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#1b5e20' },
              }}
              helperText={' '}
            />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="flex-end"
            >
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{
                  backgroundColor: '#ffffff',
                  color: '#38a14f',
                  ':hover': { backgroundColor: '#f7f7f7' },
                }}
              >
                {saving ? <LoadingSpinner size={24} /> : 'Save Changes'}
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setConfirmOpen(true)}
              >
                Delete Account
              </Button>
            </Stack>
          </Stack>
        </Stack>

        <ConfirmDialog
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          title={'Confirm Delete Account'}
          text={
            'This will permanently delete your account and its data. This action cannot be undone.'
          }
          onConfirm={handleDelete}
          confirmLabel={'Delete'}
          confirmDisabled={deleting}
        />
      </Box>
    </Box>
  );
};
