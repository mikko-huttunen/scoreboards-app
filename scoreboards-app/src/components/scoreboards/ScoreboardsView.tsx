import React, { useState, useEffect } from 'react';
import { Box, Stack } from '@mui/material';
import type { Scoreboard } from '../../types/Scoreboard';
import type { Invitation } from '../../types/Invitation';
import { useNavigationSpacing } from '../navigation/Navigation';
import { ScoreboardsService } from '../../services/ScoreboardService';
import { InvitationService } from '../../services/InvitationService';
import { ScoreboardsList } from './ScoreboardsList.tsx';
import { ReceivedInvitationsList } from '../invitations/ReceivedInvitationsList.tsx';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';

export const ScoreboardsView: React.FC = () => {
  const navigationSpacing = useNavigationSpacing();
  const [scoreboards, setScoreboards] = useState<Scoreboard[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>(
    []
  );
  const [loadingScoreboards, setLoadingScoreboards] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [deleteScoreboardConfirmOpen, setDeleteScoreboardConfirmOpen] =
    useState(false);
  const [deleteInvitationConfirmOpen, setDeleteInvitationConfirmOpen] =
    useState(false);
  const [leaveScoreboardConfirmOpen, setLeaveScoreboardConfirmOpen] =
    useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<Invitation | null>(null);
  const [selectedScoreboard, setSelectedScoreboard] =
    useState<Scoreboard | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useCurrentUser();
  const { showErrorMessage, showSuccessMessage } = useMessageSnackbar();

  useEffect(() => {
    if (!user) return;

    const fetchScoreboards = async () => {
      if (!user) return;

      try {
        const scoreboardsData =
          await ScoreboardsService.getScoreboardsByCurrentUser();
        setScoreboards(scoreboardsData);
      } catch (err) {
        showErrorMessage('Failed loading scoreboards');
      } finally {
        setLoadingScoreboards(false);
      }
    };

    const fetchInvitations = async () => {
      try {
        const invitationsData = await InvitationService.getInvitations();
        setPendingInvitations(
          invitationsData.filter((inv) => inv.receiverId === user.id)
        );
      } catch (err) {
        showErrorMessage('Failed loading invitations');
      } finally {
        setLoadingInvitations(false);
      }
    };

    fetchScoreboards();
    fetchInvitations();
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

    try {
      setIsProcessing(true);
      await ScoreboardsService.deleteScoreboard(selectedScoreboard.id);
      setScoreboards(
        scoreboards.filter((sb) => sb.id !== selectedScoreboard.id)
      );
      showSuccessMessage('Scoreboard deleted');
    } catch (err) {
      showErrorMessage('Failed to delete scoreboard');
    } finally {
      setIsProcessing(false);
      setDeleteScoreboardConfirmOpen(false);
      setSelectedScoreboard(null);
    }
  };

  const handleLeaveScoreboardClick = (scoreboard: Scoreboard) => {
    setSelectedScoreboard(scoreboard);
    setLeaveScoreboardConfirmOpen(true);
  };

  const handleLeaveScoreboardConfirm = async () => {
    if (!selectedScoreboard) {
      setLeaveScoreboardConfirmOpen(false);
      setSelectedScoreboard(null);
      return;
    }

    try {
      setIsProcessing(true);
      await ScoreboardsService.leaveScoreboard(selectedScoreboard.id);
      setScoreboards(
        scoreboards.filter((sb) => sb.id !== selectedScoreboard.id)
      );
      showSuccessMessage('Left the scoreboard');
    } catch (err) {
      showErrorMessage('Failed to leave scoreboard');
    } finally {
      setIsProcessing(false);
      setLeaveScoreboardConfirmOpen(false);
      setSelectedScoreboard(null);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setIsProcessing(true);

      await InvitationService.acceptInvitation(invitationId);

      setPendingInvitations(
        pendingInvitations.filter((inv) => inv.id !== invitationId)
      );

      // Small delay to ensure backend has persisted the changes
      await new Promise((resolve) => setTimeout(resolve, 100));

      showSuccessMessage('Invitation accepted');
      const updatedScoreboards =
        await ScoreboardsService.getScoreboardsByCurrentUser();
      setScoreboards(updatedScoreboards);
    } catch (err) {
      showErrorMessage('Failed to accept invitation');
    } finally {
      setIsProcessing(false);
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
      setIsProcessing(true);

      await InvitationService.deleteInvitation(selectedInvitation.id);

      // Remove from pending invitations
      setPendingInvitations(
        pendingInvitations.filter((inv) => inv.id !== selectedInvitation.id)
      );
      showSuccessMessage('Invitation declined');
    } catch (err) {
      showErrorMessage('Failed to decline invitation');
    } finally {
      setIsProcessing(false);
      setDeleteInvitationConfirmOpen(false);
      setSelectedInvitation(null);
    }
  };

  const renderConfirmDialog = () => {
    if (deleteScoreboardConfirmOpen) {
      return (
        <ConfirmDialog
          open={deleteScoreboardConfirmOpen}
          onCancel={() => setDeleteScoreboardConfirmOpen(false)}
          title="Delete Scoreboard"
          text={`Are you sure you want to delete the scoreboard ${selectedScoreboard?.name}? This will
           permanently delete all data including sessions, result entries, and
           results. This action cannot be undone.`}
          confirmLabel="Delete"
          loading={isProcessing}
          onConfirm={handleDeleteScoreboardConfirm}
        />
      );
    }

    if (deleteInvitationConfirmOpen) {
      return (
        <ConfirmDialog
          open={deleteInvitationConfirmOpen}
          onCancel={() => setDeleteInvitationConfirmOpen(false)}
          title="Delete Invitation"
          text={`Are you sure you want to delete the invitation to ${selectedInvitation?.scoreboardName}?`}
          confirmLabel="Delete"
          loading={isProcessing}
          onConfirm={handleDeleteInvitationConfirm}
        />
      );
    }

    if (leaveScoreboardConfirmOpen) {
      return (
        <ConfirmDialog
          open={leaveScoreboardConfirmOpen}
          onCancel={() => !isProcessing && setLeaveScoreboardConfirmOpen(false)}
          title="Leave Scoreboard"
          text={`Are you sure you want to leave the scoreboard ${selectedScoreboard?.name}? You will no longer
           have access to it.`}
          confirmLabel="Leave"
          confirmColor="warning"
          loading={isProcessing}
          onConfirm={handleLeaveScoreboardConfirm}
        />
      );
    }

    return null;
  };

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
            direction="column"
            alignItems="flex-start"
            justifyContent="space-between"
            sx={{ width: '100%' }}
            spacing={2}
          >
            <Stack sx={{ width: '100%', alignItems: 'flex-start' }} spacing={2}>
              <ScoreboardsList
                isLoading={loadingScoreboards}
                scoreboards={scoreboards}
                onDelete={(scoreboard) =>
                  handleDeleteScoreboardClick(scoreboard)
                }
                onLeave={(scoreboard) => handleLeaveScoreboardClick(scoreboard)}
              />
            </Stack>
            <Stack sx={{ width: '100%', alignItems: 'flex-start' }} spacing={2}>
              <ReceivedInvitationsList
                isLoading={loadingInvitations}
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
      {renderConfirmDialog()}
    </Box>
  );
};
