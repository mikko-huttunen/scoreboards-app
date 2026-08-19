import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user, isLoadingUser, setUser } = useCurrentUser();
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentUsername = useMemo(() => user?.name || '', [user?.name]);

  const avatarUrl = useMemo(() => {
    return avatarPreviewUrl ?? user?.avatar ?? auth0User?.picture ?? undefined;
  }, [avatarPreviewUrl, user?.avatar, auth0User?.picture]);

  const isUsernameTooLong = username.length > 15;

  const handleSelectAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif']);

    const isAllowedType = allowedMimeTypes.has(file.type);
    if (!isAllowedType) {
      showErrorMessage(
        'Invalid file type. Please upload a PNG, JPG, JPEG, or GIF image.'
      );
      e.target.value = '';
      return;
    }

    if (file.size > maxSizeBytes) {
      showErrorMessage('File is too large. Max allowed size is 5MB.');
      e.target.value = '';
      return;
    }

    setAvatarFile(file);

    const nextPreviewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextPreviewUrl;
    });

    // allow selecting the same file again later
    e.target.value = '';
  };

  const handleSave = async () => {
    if (saving || !user) return;
    if (isUsernameTooLong) return;
    setSaving(true);
    try {
      const updated = await UserService.updateCurrentUser(username, avatarFile);

      setUser(updated);
      setAvatarFile(null);
      setAvatarPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });

      if (updated?.name !== undefined) setUsername(updated.name);

      showSuccessMessage('User updated');
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
      await logout({
        logoutParams: { returnTo: `${window.location.origin}/login` },
      });
    } catch (err) {
      showErrorMessage('Failed to delete user');
      setDeleting(false);
    }
  };

  const renderHelperText = () => {
    if (isUsernameTooLong) {
      return 'Username cannot be longer than 15 characters.';
    }

    if (hasUnsavedChanges) {
      return 'Save changes to update your profile.';
    }

    return '';
  };

  const hasUnsavedUsernameChange = username !== currentUsername;
  const hasUnsavedAvatarChange =
    avatarFile !== null || avatarPreviewUrl !== null;
  const hasUnsavedChanges = hasUnsavedUsernameChange || hasUnsavedAvatarChange;

  useEffect(() => {
    setUsername(user?.name || '');
  }, [user]);

  useEffect(() => {
    return () => {
      setAvatarPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  if (isLoadingUser) {
    return <LoadingSpinner size={64} screenCentered={true} />;
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
              variant="outlined"
              color="error"
              onClick={() => setConfirmOpen(true)}
            >
              Delete Account
            </Button>
          </Stack>

          <Stack
            spacing={2}
            alignItems="center"
            sx={{ width: 'min(1200px, 100%)', alignSelf: 'center' }}
          >
            <Avatar src={avatarUrl} sx={{ width: 112, height: 112 }} />

            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpeg,.jpg,.gif"
              style={{ display: 'none' }}
              onChange={handleAvatarFileChange}
            />
            <Button
              variant="contained"
              onClick={handleSelectAvatarClick}
              disabled={saving}
              sx={{
                backgroundColor: '#ffffff',
                color: '#38a14f',
                borderColor: '#38a14f',
                ':hover': {
                  backgroundColor: '#f7f7f7',
                  borderColor: '#38a14f',
                },
              }}
            >
              Change Picture
            </Button>
          </Stack>

          <Stack
            spacing={2}
            sx={{ width: 'min(300px, 100%)', alignSelf: 'center' }}
          >
            <TextField
              label="Username"
              value={username}
              error={isUsernameTooLong}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { color: '#1b5e20' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#1b5e20' },
              }}
              helperText={renderHelperText()}
            />

            <Stack spacing={2} justifyContent="center" alignItems="center">
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || isUsernameTooLong || !hasUnsavedChanges}
                sx={{
                  backgroundColor: '#38a14f',
                  color: '#ffffff',
                  ':hover': { backgroundColor: '#2d7f3d' },
                  minWidth: '100%',
                }}
              >
                {saving ? <LoadingSpinner size={24} /> : 'Save Changes'}
              </Button>

              <Button
                variant="contained"
                onClick={() =>
                  logout({
                    logoutParams: {
                      returnTo: `${window.location.origin}/login`,
                    },
                  })
                }
                sx={{
                  backgroundColor: '#ffffff',
                  color: '#38a14f',
                  ':hover': { backgroundColor: '#f7f7f7' },
                  minWidth: '100%',
                }}
              >
                Log Out
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
