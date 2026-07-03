import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { InvitationService } from '../../services/InvitationService.ts';
import type { Invitation } from '../../types/Invitation.ts';
import { PERMISSIONS } from '../../constants.ts';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';
type InviteUserModalProps = {
  open: boolean;
  onClose: (invitation: Invitation | null) => void;
  scoreboardId: string;
};

export const InviteUserModal = ({
  open,
  onClose,
  scoreboardId,
}: InviteUserModalProps) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [sessionsPermission, setSessionsPermission] = useState(false);

  const handleSendInvitation = async () => {
    if (!scoreboardId || !inviteEmail.trim()) {
      setInviteError('Please enter an email address');
      return;
    }

    try {
      setInviteLoading(true);
      setInviteSuccess(false);
      setInviteError(null);

      const permissions: (typeof PERMISSIONS)[keyof typeof PERMISSIONS][] = [];
      if (sessionsPermission) permissions.push(PERMISSIONS.SESSIONS);

      const createdInvitation = await InvitationService.createInvitation(
        inviteEmail.trim(),
        scoreboardId,
        permissions
      );

      setInviteSuccess(true);
      setTimeout(() => {
        handleClose(createdInvitation);
      }, 1500);
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : 'Failed to send invitation'
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const handleClose = (invitation: Invitation | null) => {
    setInviteSuccess(false);
    setInviteError(null);
    setInviteEmail('');
    setSessionsPermission(false);
    onClose(invitation);
  };

  return (
    <Dialog
      open={open}
      onClose={() => handleClose(null)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Invite User to Scoreboard</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {inviteSuccess && (
            <Alert severity="success">Invitation sent successfully!</Alert>
          )}
          {inviteError && <Alert severity="error">{inviteError}</Alert>}
          <TextField
            label="Email Address"
            type="email"
            fullWidth
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            disabled={inviteLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !inviteLoading) {
                handleSendInvitation();
              }
            }}
          />

          <Stack spacing={0.5}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={sessionsPermission}
                  onChange={(e) => setSessionsPermission(e.target.checked)}
                  disabled={inviteLoading}
                />
              }
              label="Sessions permission"
            />
            <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>
              User can create new and delete their sessions
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose(null)} disabled={inviteLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSendInvitation}
          variant="contained"
          disabled={inviteLoading || !inviteEmail.trim()}
          sx={{ backgroundColor: '#38a14f', color: '#ffffff' }}
        >
          {inviteLoading ? <LoadingSpinner size={20} /> : 'Send Invitation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
