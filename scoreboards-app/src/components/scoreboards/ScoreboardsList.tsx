import React, { useState, useEffect } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import type { Scoreboard } from '../../types/Scoreboard';
import type { Invitation } from '../../types/Invitation';
import { Navigation, useNavigationSpacing } from '../navigation/Navigation';
import { ScoreboardsService } from '../../services/ScoreboardsService';
import { InvitationService } from '../../services/InvitationService';
import { UserService } from '../../services/UserService';
import type { User } from '../../types/User';

export const ScoreboardsList: React.FC = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const navigationSpacing = useNavigationSpacing();
  const [user, setUser] = useState<User | null>(null);
  const [scoreboards, setScoreboards] = useState<Scoreboard[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [selectedScoreboardId, setSelectedScoreboardId] = useState<
    string | null
  >(null);
  const [selectedScoreboardName, setSelectedScoreboardName] = useState<
    string | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<
    string | null
  >(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = await getAccessTokenSilently();

        //Fetch user
        const userData = await UserService.getCurrentUser(token);
        setUser(userData);

        // Fetch scoreboards
        const scoreboardsData =
          await ScoreboardsService.getScoreboardsByUser(token);
        setScoreboards(scoreboardsData);

        //Fetch invitations
        const fetchedInvitations =
          await InvitationService.getPendingInvitations(token);
        setPendingInvitations(fetchedInvitations);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getAccessTokenSilently]);

  const handleDeleteClick = (scoreboardId: string, scoreboardName: string) => {
    setSelectedScoreboardId(scoreboardId);
    setSelectedScoreboardName(scoreboardName);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedScoreboardId) {
      setDeleteConfirmOpen(false);
      setSelectedScoreboardId(null);
      setSelectedScoreboardName(null);
      return;
    }

    // Default implementation: call backend API
    try {
      setDeleting(true);
      const token = await getAccessTokenSilently();
      await ScoreboardsService.deleteScoreboard(selectedScoreboardId, token);
      // Remove from local state
      setScoreboards(
        scoreboards.filter((sb) => sb.id !== selectedScoreboardId)
      );
    } catch (err) {
      console.error('Error deleting scoreboard:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete scoreboard'
      );
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setSelectedScoreboardId(null);
      setSelectedScoreboardName(null);
    }
  };

  const handleLeaveClick = (scoreboardId: string, scoreboardName: string) => {
    setSelectedScoreboardId(scoreboardId);
    setSelectedScoreboardName(scoreboardName);
    setLeaveConfirmOpen(true);
  };

  const handleLeaveConfirm = async () => {
    if (!selectedScoreboardId) {
      setLeaveConfirmOpen(false);
      setSelectedScoreboardName(null);
      return;
    }

    try {
      setLeaving(true);
      const token = await getAccessTokenSilently();
      await ScoreboardsService.leaveScoreboard(selectedScoreboardId, token);

      // Remove from local state
      setScoreboards(
        scoreboards.filter((sb) => sb.id !== selectedScoreboardId)
      );
    } catch (err) {
      console.error('Error leaving scoreboard:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to leave scoreboard'
      );
    } finally {
      setLeaving(false);
      setLeaveConfirmOpen(false);
      setSelectedScoreboardId(null);
      setSelectedScoreboardName(null);
    }
  };

  const handleRowClick = (scoreboardId: string) => {
    navigate(`/scoreboards/${scoreboardId}`);
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setProcessingInvitation(invitationId);
      const token = await getAccessTokenSilently();

      await InvitationService.acceptInvitation(invitationId, token);

      // Remove from pending invitations
      setPendingInvitations(
        pendingInvitations.filter((inv) => inv.id !== invitationId)
      );

      // Small delay to ensure backend has persisted the changes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh scoreboards list and user to include the newly joined scoreboard
      const updatedScoreboards =
        await ScoreboardsService.getScoreboardsByUser(token);
      setScoreboards(updatedScoreboards);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to accept invitation'
      );
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setProcessingInvitation(invitationId);
      const token = await getAccessTokenSilently();

      await InvitationService.declineInvitation(invitationId, token);

      // Remove from pending invitations
      setPendingInvitations(
        pendingInvitations.filter((inv) => inv.id !== invitationId)
      );
    } catch (err) {
      console.error('Error declining invitation:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to decline invitation'
      );
    } finally {
      setProcessingInvitation(null);
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
              Your Scoreboards
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/scoreboards/new')}
              sx={{
                backgroundColor: '#38a14f',
                color: '#ffffff',
                ':hover': { backgroundColor: '#2d7f3d' },
              }}
            >
              Create new
            </Button>
          </Stack>

          <Stack sx={{ width: 'min(1200px, 100%)' }} spacing={2}>
            <TableContainer component={Paper} elevation={1}>
              <Table size="small" aria-label="scoreboards table">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scoreboards.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        sx={{ color: '#666', textAlign: 'center' }}
                      >
                        No scoreboards
                      </TableCell>
                    </TableRow>
                  ) : (
                    scoreboards.map((scoreboard) => {
                      const isCreator =
                        user && scoreboard.createdBy === user.id;
                      const isJoined =
                        user &&
                        !isCreator &&
                        user.scoreboards.includes(scoreboard.id);

                      return (
                        <TableRow
                          key={scoreboard.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => handleRowClick(scoreboard.id)}
                        >
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              {isCreator && (
                                <Tooltip title="Created by you">
                                  <StarIcon
                                    sx={{ color: '#ffa726', fontSize: 20 }}
                                  />
                                </Tooltip>
                              )}
                              <span>{scoreboard.name}</span>
                            </Stack>
                          </TableCell>
                          <TableCell
                            align="right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="flex-end"
                            >
                              {isCreator && (
                                <Tooltip title="Delete scoreboard">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      handleDeleteClick(
                                        scoreboard.id,
                                        scoreboard.name
                                      )
                                    }
                                    aria-label="delete scoreboard"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {isJoined && (
                                <Tooltip title="Leave scoreboard">
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() =>
                                      handleLeaveClick(
                                        scoreboard.id,
                                        scoreboard.name
                                      )
                                    }
                                    aria-label="leave scoreboard"
                                  >
                                    <ExitToAppIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>

          <Stack sx={{ width: 'min(1200px, 100%)' }} spacing={2}>
            <Box
              sx={{
                ...(pendingInvitations.length > 0
                  ? {
                      border: '2px solid #38a14f',
                      backgroundColor: '#f1f8f4',
                      borderRadius: 1,
                      p: 2,
                      animation:
                        'pulse 2s ease-in-out infinite, lightPulse 3s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': {
                          opacity: 1,
                        },
                        '50%': {
                          opacity: 0.95,
                        },
                      },
                      '@keyframes lightPulse': {
                        '0%, 100%': {
                          backgroundColor: '#f1f8f4',
                          borderColor: '#38a14f',
                        },
                        '50%': {
                          backgroundColor: '#e8f5e9',
                          borderColor: '#4caf50',
                        },
                      },
                    }
                  : {}),
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: '#1b5e20',
                  ...(pendingInvitations.length > 0
                    ? {
                        animation: 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%, 100%': {
                            backgroundColor: 'transparent',
                          },
                          '50%': {
                            backgroundColor: '#f1f8f4',
                          },
                        },
                      }
                    : {}),
                }}
              >
                Pending Invitations
              </Typography>
              <TableContainer
                component={Paper}
                elevation={pendingInvitations.length > 0 ? 0 : 1}
                sx={{
                  ...(pendingInvitations.length > 0
                    ? {
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                      }
                    : {}),
                }}
              >
                <Table size="small" aria-label="pending invitations table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell
                        sx={{ display: { xs: 'none', sm: 'table-cell' } }}
                      >
                        From
                      </TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingInvitations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          sx={{ color: '#666', textAlign: 'center' }}
                        >
                          No pending invitations
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingInvitations.map((invitation) => (
                        <TableRow key={invitation.id} hover>
                          <TableCell>{invitation.scoreboardName}</TableCell>
                          <TableCell
                            sx={{ display: { xs: 'none', sm: 'table-cell' } }}
                          >
                            {invitation.createdBy}
                          </TableCell>
                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="flex-end"
                            >
                              <Tooltip title="Accept">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() =>
                                    handleAcceptInvitation(invitation.id)
                                  }
                                  disabled={
                                    processingInvitation === invitation.id
                                  }
                                  aria-label="accept invitation"
                                >
                                  <CheckIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Decline">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    handleDeclineInvitation(invitation.id)
                                  }
                                  disabled={
                                    processingInvitation === invitation.id
                                  }
                                  aria-label="decline invitation"
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the scoreboard "
            {selectedScoreboardName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteConfirmOpen(false);
              setSelectedScoreboardId(null);
              setSelectedScoreboardName(null);
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            color="error"
            onClick={handleDeleteConfirm}
            autoFocus
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={leaveConfirmOpen}
        onClose={() => !leaving && setLeaveConfirmOpen(false)}
      >
        <DialogTitle>Confirm Leave</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to leave the scoreboard "
            {selectedScoreboardName}"? You will lose access to this scoreboard
            and will need to be invited again to rejoin.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setLeaveConfirmOpen(false);
              setSelectedScoreboardId(null);
              setSelectedScoreboardName(null);
            }}
            disabled={leaving}
          >
            Cancel
          </Button>
          <Button
            color="warning"
            onClick={handleLeaveConfirm}
            autoFocus
            disabled={leaving}
          >
            {leaving ? <CircularProgress size={24} /> : 'Leave'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
