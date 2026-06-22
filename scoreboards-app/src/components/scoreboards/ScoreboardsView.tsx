import React, { useState, useEffect } from 'react';
import { Box, Stack, CircularProgress, Alert } from '@mui/material';
import type { Scoreboard } from '../../types/Scoreboard';
import type { Invitation } from '../../types/Invitation';
import { useNavigationSpacing } from '../navigation/Navigation';
import { ScoreboardsService } from '../../services/ScoreboardService';
import { InvitationService } from '../../services/InvitationService';
import { ScoreboardsList } from './ScoreboardsList.tsx';
import { ReceivedInvitationsList } from '../invitations/ReceivedInvitationsList.tsx';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';

export const ScoreboardsView: React.FC = () => {
  const navigationSpacing = useNavigationSpacing();
  const [scoreboards, setScoreboards] = useState<Scoreboard[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteScoreboardConfirmOpen, setDeleteScoreboardConfirmOpen] =
    useState(false);
  const [deleteInvitationConfirmOpen, setDeleteInvitationConfirmOpen] =
    useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<Invitation | null>(null);
  const [selectedScoreboard, setSelectedScoreboard] =
    useState<Scoreboard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [processingInvitation, setProcessingInvitation] =
    useState<boolean>(false);
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch scoreboards
        const scoreboardsData =
          await ScoreboardsService.getScoreboardsByCurrentUser();
        setScoreboards(scoreboardsData);

        //Fetch invitations
        const fetchedInvitations = await InvitationService.getInvitations();
        setPendingInvitations(
          fetchedInvitations.filter(
            (inv) => inv.isPending && inv.receiverId === user.id
          )
        );
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleDeleteScoreboardClick = (scoreboard: Scoreboard) => {
    setSelectedScoreboard(scoreboard);
    setDeleteScoreboardConfirmOpen(true);
  };

  const handleDeleteScoreboardConfirm = async () => {
    if (!selectedScoreboard) {
      setDeleteScoreboardConfirmOpen(false);
      setSelectedScoreboard(null);
      return;
    }

    // Default implementation: call backend API
    try {
      setDeleting(true);
      await ScoreboardsService.deleteScoreboard(selectedScoreboard.id);
      // Remove from local state
      setScoreboards(
        scoreboards.filter((sb) => sb.id !== selectedScoreboard.id)
      );
    } catch (err) {
      console.error('Error deleting scoreboard:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete scoreboard'
      );
    } finally {
      setDeleting(false);
      setDeleteScoreboardConfirmOpen(false);
      setSelectedScoreboard(null);
    }
  };

  const handleLeaveClick = (scoreboard: Scoreboard) => {
    setSelectedScoreboard(scoreboard);
    setLeaveConfirmOpen(true);
  };

  const handleLeaveConfirm = async () => {
    if (!selectedScoreboard) {
      setLeaveConfirmOpen(false);
      setSelectedScoreboard(null);
      return;
    }

    try {
      setLeaving(true);
      await ScoreboardsService.leaveScoreboard(selectedScoreboard.id);

      // Remove from local state
      setScoreboards(
        scoreboards.filter((sb) => sb.id !== selectedScoreboard.id)
      );
    } catch (err) {
      console.error('Error leaving scoreboard:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to leave scoreboard'
      );
    } finally {
      setLeaving(false);
      setLeaveConfirmOpen(false);
      setSelectedScoreboard(null);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setProcessingInvitation(true);

      await InvitationService.acceptInvitation(invitationId);

      // Remove from pending invitations
      setPendingInvitations(
        pendingInvitations.filter((inv) => inv.id !== invitationId)
      );

      // Small delay to ensure backend has persisted the changes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh scoreboards list and user to include the newly joined scoreboard
      const updatedScoreboards =
        await ScoreboardsService.getScoreboardsByCurrentUser();
      setScoreboards(updatedScoreboards);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to accept invitation'
      );
    } finally {
      setProcessingInvitation(false);
    }
  };

  const handleDeleteInvitationClick = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setDeleteInvitationConfirmOpen(true);
  };

  const handleDeleteInvitationConfirm = async () => {
    if (!selectedInvitation) {
      setDeleteInvitationConfirmOpen(false);
      setSelectedInvitation(null);
      return;
    }

    try {
      setProcessingInvitation(true);

      await InvitationService.deleteInvitation(selectedInvitation.id);

      // Remove from pending invitations
      setPendingInvitations(
        pendingInvitations.filter((inv) => inv.id !== selectedInvitation.id)
      );
    } catch (err) {
      console.error('Error declining invitation:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to decline invitation'
      );
    } finally {
      setProcessingInvitation(false);
      setDeleteInvitationConfirmOpen(false);
      setSelectedInvitation(null);
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
            direction="column"
            alignItems="flex-start"
            justifyContent="space-between"
            sx={{ width: 'min(1200px, 100%)' }}
            spacing={2}
          >
            <Stack sx={{ width: '100%', alignItems: 'flex-start' }} spacing={2}>
              <ScoreboardsList
                scoreboards={scoreboards}
                onDelete={(scoreboard) =>
                  handleDeleteScoreboardClick(scoreboard)
                }
                onLeave={(scoreboard) => handleLeaveClick(scoreboard)}
              />
            </Stack>
            <Stack sx={{ width: '100%', alignItems: 'flex-start' }} spacing={2}>
              <ReceivedInvitationsList
                invitations={pendingInvitations}
                processingInvitation={false}
                onAcceptInvitation={(invitation) =>
                  handleAcceptInvitation(invitation.id)
                }
                onDeleteInvitation={(invitation) =>
                  handleDeleteInvitationClick(invitation)
                }
              />
            </Stack>
          </Stack>
        </Stack>
      </Box>

      {/* Delete Scoreboard Confirmation Dialog */}
      <ConfirmDialog
        open={deleteScoreboardConfirmOpen}
        onCancel={() => setDeleteScoreboardConfirmOpen(false)}
        title="Delete Scoreboard"
        text={`Are you sure you want to delete the scoreboard ${selectedScoreboard?.name}? This will
           permanently delete all data including sessions, result entries, and
           results. This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteScoreboardConfirm}
      />

      {/* Delete Invitation Confirm Dialog */}
      <ConfirmDialog
        open={deleteInvitationConfirmOpen}
        onCancel={() => setDeleteInvitationConfirmOpen(false)}
        title="Delete Invitation"
        text={`Are you sure you want to delete the invitation to ${selectedInvitation?.scoreboardName}?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteInvitationConfirm}
      />

      {/* Leave Scoreboard Confirm Dialog */}
      <ConfirmDialog
        open={leaveConfirmOpen}
        onCancel={() => !leaving && setLeaveConfirmOpen(false)}
        title="Leave Scoreboard"
        text={`Are you sure you want to leave the scoreboard ${selectedScoreboard?.name}? You will no longer
           have access to it.`}
        confirmLabel="Leave"
        confirmColor="warning"
        loading={leaving}
        onConfirm={handleLeaveConfirm}
      />
    </Box>
  );
};
