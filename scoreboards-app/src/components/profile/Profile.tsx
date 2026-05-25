import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigation, useNavigationSpacing } from '../navigation/Navigation';
import { UserService } from '../../services/UserService';
import type { User } from '../../types/User';
import './Profile.css';

export const ProfileView: React.FC = () => {
  const { user: auth0User, getAccessTokenSilently, logout } = useAuth0();
  const navigationSpacing = useNavigationSpacing();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getAccessTokenSilently();
        const userData = await UserService.getCurrentUser(token);
        setUser(userData);
        setUsername(userData.name || '');
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load user profile'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [getAccessTokenSilently]);

  const avatarUrl = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }

    return auth0User?.picture ?? undefined;
  }, [avatarFile, user?.avatar, auth0User?.picture]);

  const isPasswordMatch =
    newPassword.length > 0 && newPassword === confirmPassword;

  const handlePickAvatar = () => fileInputRef.current?.click();

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
  };

  const handleSave = async () => {
    if (saving || !user) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const updatedUser = await UserService.updateCurrentUser(
        username,
        undefined,
        token
      );
      setUser(updatedUser);
      // Refresh user data to ensure avatar is properly loaded
      // const refreshedUser = await UserService.getCurrentUser(token);
      // setUser(refreshedUser);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isPasswordMatch || changingPassword) return;
    setChangingPassword(true);
    try {
      const token = await getAccessTokenSilently();
      await fetch('/api/profile/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error changing password:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to change password'
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || !user) return;
    setDeleting(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      await UserService.deleteCurrentUser(token);
      setConfirmOpen(false);
      logout({ logoutParams: { returnTo: window.location.origin } });
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          position: 'relative',
        }}
      >
        <Navigation />
        <Box
          sx={{
            px: 2,
            py: 4,
            ...navigationSpacing,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          position: 'relative',
        }}
      >
        <Navigation />
        <Box sx={{ px: 2, py: 4, ...navigationSpacing }}>
          <Alert severity="error">
            {error || 'Failed to load user profile'}
          </Alert>
        </Box>
      </Box>
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
      <Navigation />
      <Box sx={{ px: 2, py: 4, ...navigationSpacing }}>
        <Stack spacing={4} alignItems="flex-start">
          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{ width: 'min(1200px, 100%)' }}
            >
              {error}
            </Alert>
          )}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: 'min(1200px, 100%)' }}
          >
            <Typography variant="h4" sx={{ color: '#1b5e20' }}>
              Profile
            </Typography>
            <Button
              variant="contained"
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
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
            sx={{ width: 'min(1200px, 100%)', alignSelf: 'flex-start' }}
          >
            <Avatar src={avatarUrl} sx={{ width: 112, height: 112 }} />
            <input
              id="avatar-file-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="file-input-hidden"
            />
            <Button
              variant="contained"
              onClick={handlePickAvatar}
              sx={{
                backgroundColor: '#ffffff',
                color: '#38a14f',
                ':hover': { backgroundColor: '#f7f7f7' },
              }}
            >
              Change Avatar
            </Button>
          </Stack>

          <Stack spacing={2} sx={{ width: 'min(1200px, 100%)' }}>
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                helperText={
                  newPassword && !isPasswordMatch ? 'Passwords must match' : ' '
                }
                error={Boolean(newPassword) && !isPasswordMatch}
                sx={{
                  '& .MuiInputLabel-root': { color: '#1b5e20' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#1b5e20' },
                }}
              />
              <TextField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                helperText={
                  confirmPassword && !isPasswordMatch
                    ? 'Passwords must match'
                    : ' '
                }
                error={Boolean(confirmPassword) && !isPasswordMatch}
                sx={{
                  '& .MuiInputLabel-root': { color: '#1b5e20' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#1b5e20' },
                }}
              />
            </Stack>
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
                {saving ? <CircularProgress size={24} /> : 'Save Changes'}
              </Button>
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={
                  !isPasswordMatch ||
                  newPassword.length === 0 ||
                  changingPassword
                }
                sx={{
                  backgroundColor: '#ffffff',
                  color: '#38a14f',
                  ':hover': { backgroundColor: '#f7f7f7' },
                }}
              >
                {changingPassword ? 'Changing…' : 'Change Password'}
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

        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will permanently delete your account and its data. This
              action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              color="error"
              onClick={handleDelete}
              autoFocus
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};
