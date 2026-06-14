import React, { useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { Session } from '../../types/Session';
import type { User } from '../../types/User';
import type { Scoreboard } from '../../types/Scoreboard';
import type { Invitation } from '../../types/Invitation';
import type { PointCategory } from '../../types/PointCategory';
import { useNavigationSpacing } from '../navigation/Navigation';
import { ScoreboardsService } from '../../services/ScoreboardService';
import { UserService } from '../../services/UserService';
import { InvitationService } from '../../services/InvitationService';
import { PointCategoryService } from '../../services/PointCategoryService';
import { SessionForm } from './SessionForm';
import { SessionService } from '../../services/SessionService';
import { SessionDetailsModal } from './SessionDetailsModal';
import AddScores from './AddScores';
import { Leaderboard } from './Leaderboard.tsx';
import { Sessions } from './Sessions.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { PendingSessions } from './PendingSessions.tsx';
import { InviteUserModal } from './InviteUserModal.tsx';
import { ScoreboardUsers } from './ScoreboardUsers.tsx';
import { SentInvitationsList } from './SentInvitationsList.tsx';

export type ScoreboardsViewProps = {
  sessions?: Session[];
  onCreateSession?: (session: Session) => void | Promise<void>;
  users?: User[];
  onEdit?: () => void | Promise<void>;
};

export const ScoreboardView: React.FC<ScoreboardsViewProps> = () => {
  const navigate = useNavigate();
  const { scoreboardId } = useParams<{ scoreboardId: string }>();
  const navigationSpacing = useNavigationSpacing();

  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);
  const [pointCategories, setPointCategories] = useState<PointCategory[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [processingInvitation, setProcessingInvitation] =
    useState<boolean>(false);
  const [removeUserDialogOpen, setRemoveUserDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [invitationToDelete, setInvitationToDelete] =
    useState<Invitation | null>(null);
  const [removingUser, setRemovingUser] = useState(false);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [pendingSessions, setPendingSessions] = useState<Session[]>([]);
  const [cancellingSession, setCancellingSession] = useState<string | null>(
    null
  );
  const [finishingSession, setFinishingSession] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [addScoresOpen, setAddScoresOpen] = useState(false);
  const [sessionForAddScores, setSessionForAddScores] =
    useState<Session | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleteScoreboardDialogOpen, setDeleteScoreboardDialogOpen] =
    useState(false);
  const [deleteInvitationDialogOpen, setDeleteInvitationDialogOpen] =
    useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<string | null>(null);

  useEffect(() => {
    if (!scoreboardId) {
      setError('Scoreboard ID is missing');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch scoreboard
        const scoreboardData =
          await ScoreboardsService.getScoreboardById(scoreboardId);
        if (!scoreboardData) {
          setError('Scoreboard not found');
          setLoading(false);
          navigate('/scoreboards');
          return;
        }
        setScoreboard(scoreboardData);

        const userData = await UserService.getCurrentUser();
        if (!userData) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }
        setCurrentUser(userData);

        // Fetch users for scoreboard
        const usersData = await UserService.getUsersForScoreboard(scoreboardId);
        setUsers(usersData);

        // Fetch point categories
        const pointCategoriesData =
          await PointCategoryService.getPointCategoriesByScoreboard(
            scoreboardId
          );
        setPointCategories(pointCategoriesData);

        // Fetch sessions (non-pending only)
        const sessionsData = await SessionService.getSessionsByScoreboardId(
          scoreboardData.id
        );
        setSessions(sessionsData.filter((s) => !s.isPending));
        setPendingSessions(sessionsData.filter((s) => s.isPending));

        // Fetch sent invitations (only for the creator)
        if (scoreboardData.createdBy === userData?.id) {
          const invitations = await InvitationService.getInvitations();
          setSentInvitations(
            invitations.filter(
              (inv) =>
                inv.scoreboardId === scoreboardId &&
                inv.createdBy === userData.id
            )
          );
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load scoreboard'
        );
        navigate('/scoreboards');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [scoreboardId]);

  // Check access after scoreboard and users are loaded
  useEffect(() => {
    if (!scoreboard || !currentUser || loading) {
      setHasAccess(null);
      return;
    }

    // Check if user is the creator
    const isCreator = scoreboard.createdBy === currentUser.id;
    setIsOwner(isCreator);

    // Check if user is in the users list (either as creator or joined user)
    const isInUsersList = users.some((u) => u.id === currentUser.id);

    const userHasAccess = isCreator || isInUsersList;
    setHasAccess(userHasAccess);

    // Redirect if user doesn't have access
    if (!userHasAccess) {
      console.log(
        'User does not have access to this scoreboard, redirecting...'
      );
      navigate('/scoreboards');
    }
  }, [scoreboard, users, currentUser, loading]);

  const handleAddScores = (sessionId: string) => {
    const session = pendingSessions.find((s) => s.id === sessionId);
    if (session) {
      setSessionForAddScores(session);
      setAddScoresOpen(true);
    } else {
      setError('Session not found');
    }
  };

  const handleCloseAddScores = () => {
    setSessionForAddScores(null);
    setAddScoresOpen(false);
  };

  const handleFinishSession = async (sessionId: string) => {
    try {
      setFinishingSession(sessionId);
      const finishedSession = await SessionService.finishSession(sessionId);

      // Remove from pending sessions
      setPendingSessions(pendingSessions.filter((s) => s.id !== sessionId));

      // Add finished session to Latest Sessions table
      if (finishedSession) {
        const convertedFinishedSession = Session.create({
          id: finishedSession.id,
          scoreboardId: finishedSession.scoreboardId,
          scoreboardName: finishedSession.scoreboardName,
          createdByName: finishedSession.createdByName,
          isPending: finishedSession.isPending ?? false,
          participants: finishedSession.participants ?? new Set<string>(),
          pointCategories: finishedSession.pointCategories ?? new Set<string>(),
          resultEntries: finishedSession.resultEntries ?? new Set<string>(),
          created: new Date(finishedSession.created),
          lastModified: new Date(finishedSession.lastModified),
          createdBy: finishedSession.createdBy,
          isActive: finishedSession.isActive,
        });
        setSessions([convertedFinishedSession, ...sessions]);
      }
    } catch (err) {
      console.error('Error finishing session:', err);
      setError(err instanceof Error ? err.message : 'Failed to finish session');
    } finally {
      setFinishingSession(null);
    }
  };

  const handleCancelSessionClick = (sessionId: string) => {
    setSessionToCancel(sessionId);
    setCancelDialogOpen(true);
  };

  const handleCancelSession = async () => {
    if (!sessionToCancel) return;
    try {
      setCancellingSession(sessionToCancel);
      await SessionService.deleteSession(sessionToCancel);
      setPendingSessions(
        pendingSessions.filter((s) => s.id !== sessionToCancel)
      );
      setCancelDialogOpen(false);
      setSessionToCancel(null);
    } catch (err) {
      console.error('Error cancelling session:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel session');
    } finally {
      setCancellingSession(null);
    }
  };

  const handleSessionCreated = async () => {
    // Refresh pending sessions immediately
    const fetchPendingSessions = async () => {
      if (!scoreboardId) return;
      try {
        const sessions =
          await SessionService.getSessionsByScoreboardId(scoreboardId);
        const pendingSessions = sessions
          .filter((s) => s.isPending)
          .map((s: Session) =>
            Session.create({
              id: s.id,
              scoreboardId: s.scoreboardId,
              scoreboardName: s.scoreboardName,
              createdByName: s.createdByName,
              isPending: s.isPending ?? true,
              participants: s.participants ?? new Set<string>(),
              pointCategories: s.pointCategories ?? new Set<string>(),
              resultEntries: s.resultEntries ?? new Set<string>(),
              created: new Date(s.created),
              lastModified: new Date(s.lastModified),
              createdBy: s.createdBy,
              isActive: s.isActive,
            })
          );

        setPendingSessions(pendingSessions);
      } catch (err) {
        console.error('Error fetching pending sessions:', err);
      }
    };
    await fetchPendingSessions();
    setSessionFormOpen(false);
  };

  const handleOpenInviteModal = () => {
    setInviteModalOpen(true);
  };

  const handleCloseInviteModal = (invitation: Invitation | null) => {
    if (invitation) {
      setSentInvitations([...sentInvitations, invitation]);
    }
    setInviteModalOpen(false);
  };

  const handleDeleteInvitationClick = (invitation: Invitation) => {
    setInvitationToDelete(invitation);
    setDeleteInvitationDialogOpen(true);
  };

  const handleDeleteInvitationConfirm = async () => {
    if (!invitationToDelete) return;

    try {
      setProcessingInvitation(true);
      await InvitationService.deleteInvitation(invitationToDelete.id);
      setSentInvitations(
        sentInvitations.filter((inv) => inv.id !== invitationToDelete.id)
      );
      setDeleteInvitationDialogOpen(false);
      setInvitationToDelete(null);
    } catch (err) {
      console.error('Error deleting invitation:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete invitation'
      );
    } finally {
      setProcessingInvitation(false);
    }
  };

  const handleEditClick = () => {
    if (!scoreboardId) return;
    navigate(`/scoreboards/${scoreboardId}/edit`);
  };

  const handleLeaveClick = () => {
    // Check if user has pending sessions
    const userPendingSessions = pendingSessions.filter((s: Session) => {
      // Check if user is the creator (creators can't leave, but check anyway)
      if (s.createdBy === currentUser?.id) {
        return true;
      }
      // Check if user is a participant in the session
      // Participants are stored as Set<string> (user IDs) in the frontend
      if (s.participants) {
        const participantsArray = Array.from(s.participants);
        return participantsArray.some((p: string) => p === currentUser?.id);
      }
      return false;
    });

    if (userPendingSessions.length > 0) {
      setError(
        'Cannot leave scoreboard while you have pending sessions. Please wait for sessions to be finished.'
      );
      return;
    }

    setLeaveDialogOpen(true);
  };

  const handleLeaveConfirm = async () => {
    if (!scoreboardId) return;
    try {
      setLeaving(true);
      await ScoreboardsService.leaveScoreboard(scoreboardId);
      setLeaveDialogOpen(false);
      navigate('/scoreboards');
    } catch (err) {
      console.error('Error leaving scoreboard:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to leave scoreboard'
      );
      setLeaving(false);
    }
  };

  const handleDeleteScoreboardConfirm = async () => {
    if (!scoreboardId) return;
    try {
      setDeleting(true);
      await ScoreboardsService.deleteScoreboard(scoreboardId);
      setDeleteScoreboardDialogOpen(false);
      navigate('/scoreboards');
    } catch (err) {
      console.error('Error deleting scoreboard:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete scoreboard'
      );
      setDeleting(false);
    }
  };

  const handleRemoveUserClick = (user: User) => {
    // Check if user has pending sessions
    const userPendingSessions = pendingSessions.filter((s) => {
      // Check if user is the creator
      if (s.createdBy === user.id) {
        return true;
      }
      // Check if user is a participant in the session
      if (s.participants) {
        const participantsArray = Array.from(s.participants);
        return participantsArray.some((p: string) => p === user.id);
      }
      return false;
    });

    if (userPendingSessions.length > 0) {
      setError(
        `Cannot remove user while they have ${userPendingSessions.length} pending session(s). Please wait for sessions to be finished.`
      );
      return;
    }

    setUserToRemove(user);
    setRemoveUserDialogOpen(true);
  };

  const handleRemoveUserConfirm = async () => {
    if (!scoreboardId || !userToRemove) return;

    setRemovingUser(true);
    try {
      await ScoreboardsService.removeUserFromScoreboard(
        scoreboardId,
        userToRemove.id
      );

      setUsers(users.filter((u) => u.id !== userToRemove.id));
      setRemoveUserDialogOpen(false);
      setUserToRemove(null);
    } catch (err) {
      console.error('Error removing user:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    } finally {
      setRemovingUser(false);
    }
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    setSessionModalOpen(true);
  };

  // If access check is complete and user doesn't have access, show nothing (redirect is happening)
  if (!hasAccess) {
    return null;
  }

  if (error || !scoreboard) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          position: 'relative',
        }}
      >
        <Box sx={{ px: 2, py: 4, ...navigationSpacing }}>
          <Alert severity="error">{error || 'Scoreboard not found'}</Alert>
          <Button onClick={() => navigate('/scoreboards')} sx={{ mt: 2 }}>
            Back to Scoreboards
          </Button>
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
        <Stack
          spacing={4}
          alignItems="flex-start"
          sx={{ width: 'min(1200px, 100%)' }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            sx={{ width: '100%' }}
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton
                onClick={() => navigate('/scoreboards')}
                sx={{ color: '#1b5e20' }}
                aria-label="back to scoreboards"
              >
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h4" sx={{ color: '#1b5e20' }}>
                {scoreboard.name}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              {isOwner && (
                <>
                  <Tooltip
                    title={
                      pendingSessions.length > 0
                        ? 'Cannot edit scoreboard while there are pending sessions'
                        : ''
                    }
                  >
                    <span>
                      <Button
                        variant="contained"
                        onClick={handleEditClick}
                        disabled={pendingSessions.length > 0}
                        sx={{
                          backgroundColor: '#ffffff',
                          color: '#38a14f',
                          ':hover': { backgroundColor: '#f7f7f7' },
                        }}
                      >
                        Edit
                      </Button>
                    </span>
                  </Tooltip>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => setDeleteScoreboardDialogOpen(true)}
                    disabled={pendingSessions.length > 0}
                    sx={{ ':hover': { backgroundColor: '#d32f2f' } }}
                  >
                    Delete
                  </Button>
                </>
              )}
              {!isOwner && (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleLeaveClick}
                  disabled={pendingSessions.length > 0}
                  sx={{ ':hover': { backgroundColor: '#ed6c02' } }}
                >
                  Leave
                </Button>
              )}
            </Stack>
          </Stack>

          <>
            {/* Leaderboard Section */}
            {
              <Stack sx={{ width: '100%' }} spacing={2}>
                <Leaderboard
                  sessions={sessions}
                  users={users}
                  pointCategories={pointCategories}
                  emptyText="No scores recorded yet"
                  chartTitle="Leaderboard"
                />
              </Stack>
            }

            {/* Pending Sessions Section */}
            {pendingSessions.length > 0 && (
              <PendingSessions
                pendingSessions={pendingSessions}
                onAddScores={(sessionId) => handleAddScores(sessionId)}
                onCancelSession={(sessionId) =>
                  handleCancelSessionClick(sessionId)
                }
                onFinishSession={(sessionId) => handleFinishSession(sessionId)}
              />
            )}
            {/* Sessions Section */}
            <Sessions
              sessions={sessions}
              users={users}
              onCreateSession={() => setSessionFormOpen(true)}
              onSessionClick={(session) => handleSessionClick(session)}
            />

            <ScoreboardUsers
              scoreboard={scoreboard}
              currentUser={currentUser}
              users={users}
              handleOpenInviteModal={handleOpenInviteModal}
              handleRemoveUserClick={(user) => handleRemoveUserClick(user)}
            />
            {sentInvitations.length > 0 && (
              <SentInvitationsList
                invitations={sentInvitations}
                processingInvitation={processingInvitation}
                onDeleteInvitation={(invitation) =>
                  handleDeleteInvitationClick(invitation)
                }
              />
            )}
          </>
        </Stack>
      </Box>

      {sessionForAddScores && pointCategories && currentUser && (
        <AddScores
          open={addScoresOpen}
          onClose={handleCloseAddScores}
          session={sessionForAddScores}
          pointCategories={pointCategories}
          user={currentUser}
        />
      )}

      {/* Invite Modal */}
      {scoreboardId && (
        <InviteUserModal
          open={inviteModalOpen}
          onClose={(invitation: Invitation | null) =>
            handleCloseInviteModal(invitation)
          }
          scoreboardId={scoreboardId}
        />
      )}

      {/* Session Form */}
      {scoreboard && currentUser && (
        <SessionForm
          open={sessionFormOpen}
          onClose={() => setSessionFormOpen(false)}
          scoreboard={scoreboard}
          currentUser={currentUser}
          users={users}
          pointCategories={pointCategories}
          onSuccess={handleSessionCreated}
        />
      )}

      {/* Kick User Confirmation Dialog */}
      <ConfirmDialog
        open={removeUserDialogOpen}
        title="Confirm Remove User"
        text={`Are you sure you want to remove
            ${userToRemove?.name} from the
            scoreboard? They will lose access to this scoreboard and will need
            to be invited again to rejoin.`}
        confirmLabel="Remove User"
        loading={removingUser}
        confirmDisabled={removingUser}
        onCancel={() => setRemoveUserDialogOpen(false)}
        onConfirm={handleRemoveUserConfirm}
      />

      {/* Leave Confirmation Dialog */}
      <ConfirmDialog
        open={leaveDialogOpen}
        onCancel={() => {
          if (!leaving) setLeaveDialogOpen(false);
        }}
        title="Leave Scoreboard"
        text={`Are you sure you want to leave the scoreboard ${scoreboard?.name}? You will no longer
           have access to it.`}
        confirmLabel="Leave"
        confirmColor="warning"
        loading={leaving}
        onConfirm={handleLeaveConfirm}
      />

      {/* Delete Scoreboard Confirmation Dialog */}
      <ConfirmDialog
        open={deleteScoreboardDialogOpen}
        onCancel={() => setDeleteScoreboardDialogOpen(false)}
        title="Delete Scoreboard"
        text={`Are you sure you want to delete the scoreboard ${scoreboard.name}? This will
           permanently delete all data including sessions, result entries, and
           results. This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteScoreboardConfirm}
      />

      {/* Delete Invitation Confirmation Dialog */}
      <ConfirmDialog
        open={deleteInvitationDialogOpen}
        onCancel={() => setDeleteInvitationDialogOpen(false)}
        title="Delete Invitation"
        text={`Are you sure you want to delete the invitation to ${invitationToDelete?.receiverName}?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDeleteInvitationConfirm}
      />

      {/* Cancel Session Confirmation Dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onCancel={() => {
          if (cancellingSession === null) setCancelDialogOpen(false);
        }}
        title="Cancel Session"
        text={`Are you sure you want to cancel this session? This will
           permanently delete the session and all associated data. This action
           cannot be undone.`}
        confirmLabel="Cancel Session"
        loading={cancellingSession !== null}
        confirmDisabled={cancellingSession !== null}
        onConfirm={handleCancelSession}
      />

      {/* Session Details Modal */}
      {selectedSession && (
        <SessionDetailsModal
          open={sessionModalOpen}
          onClose={() => setSessionModalOpen(false)}
          session={selectedSession}
          users={users}
          pointCategories={pointCategories}
        />
      )}
    </Box>
  );
};
