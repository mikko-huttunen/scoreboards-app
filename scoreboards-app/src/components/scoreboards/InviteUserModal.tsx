import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { InvitationService } from '../../services/InvitationService.ts';
import type { Invitation } from '../../types/Invitation.ts';

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

  const handleSendInvitation = async () => {
    if (!scoreboardId || !inviteEmail.trim()) {
      setInviteError('Please enter an email address');
      return;
    }

    try {
      setInviteLoading(true);
      setInviteError(null);
      setInviteSuccess(false);

      const createdInvitation = await InvitationService.createInvitation(
        inviteEmail.trim(),
        scoreboardId
      );

      setInviteSuccess(true);
      setInviteEmail('');
      setTimeout(() => {
        onClose(createdInvitation);
      }, 1500);
    } catch (err) {
      console.error('Error sending invitation:', err);
      setInviteError(
        err instanceof Error ? err.message : 'Failed to send invitation'
      );
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(null)} maxWidth="sm" fullWidth>
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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(null)} disabled={inviteLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSendInvitation}
          variant="contained"
          disabled={inviteLoading || !inviteEmail.trim()}
          sx={{ backgroundColor: '#38a14f', color: '#ffffff' }}
        >
          {inviteLoading ? <CircularProgress size={20} /> : 'Send Invitation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
