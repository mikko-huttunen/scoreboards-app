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
  const { user: auth0User, logout } = useAuth0();
  const navigationSpacing = useNavigationSpacing();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const userData = await UserService.getCurrentUser();
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
  }, []);

  const avatarUrl = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }

    return auth0User?.picture ?? undefined;
  }, [avatarFile, user?.avatar, auth0User?.picture]);

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
      const updatedUser = await UserService.updateCurrentUser();
      setUser(updatedUser);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || !user) return;
    setDeleting(true);
    setError(null);
    try {
      await UserService.deleteCurrentUser();
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
