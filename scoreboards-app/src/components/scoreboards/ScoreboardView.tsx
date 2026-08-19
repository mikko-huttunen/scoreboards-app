import React, { useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Button,
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
import { InvitationService } from '../../services/InvitationService';
import { Leaderboard } from './Leaderboard.tsx';
import { Sessions } from '../sessions/Sessions.tsx';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';
import { PendingSessions } from '../sessions/PendingSessions.tsx';
import { ScoreboardMembers } from './ScoreboardMembers.tsx';
import { SentInvitationsList } from '../invitations/SentInvitationsList.tsx';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import type { ResultEntry } from '../../types/ResultEntry.ts';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import { UserService } from '../../services/UserService.ts';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';
import { PerformanceChart } from './PerformanceChart.tsx';
import { SessionService } from '../../services/SessionService.ts';

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
  const [resultEntries, setResultEntries] = useState<ResultEntry[]>([]);
  const [loadingScoreboard, setLoadingScoreboard] = useState(true);
  const [pendingSessions, setPendingSessions] = useState<Session[]>([]);
  const [leaveScoreboardDialogOpen, setLeaveScoreboardDialogOpen] =
    useState(false);
  const [deleteScoreboardDialogOpen, setDeleteScoreboardDialogOpen] =
    useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const { user } = useCurrentUser();
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();

  useEffect(() => {
    if (!scoreboardId || !user) return;

    const loadAllData = async () => {
      try {
        const [scoreboardData, usersData] = await Promise.all([
          ScoreboardsService.getScoreboardById(scoreboardId),
          UserService.getScoreboardUsers(scoreboardId),
        ]);

        setScoreboard(scoreboardData);
        setPointCategories(scoreboardData!.pointCategories);
        setSessions(scoreboardData!.sessions.filter((s) => !s.isPending));
        setPendingSessions(
          scoreboardData!.sessions.filter(
            (s) =>
              s.isPending &&
              (Array.from(s.participants).includes(user.id) ||
                s.createdBy === user.id)
          )
        );
        setResultEntries(scoreboardData!.resultEntries);
        setUsers(usersData);

        if (scoreboardData?.createdBy === user.id) {
          const invitations = await InvitationService.getInvitations();
          setSentInvitations(
            invitations.filter((inv) => inv.scoreboardId === scoreboardId)
          );
        }
      } catch (err) {
        showErrorMessage('Failed to load scoreboard');
        navigate('/scoreboards');
      } finally {
        setLoadingScoreboard(false);
      }
    };

    loadAllData();
  }, [scoreboardId, user]);

  //Check access after scoreboard and users are loaded
  useEffect(() => {
    if (!scoreboard || users.length <= 0 || !user) {
      return;
    }

    // Check if user is the creator
    const isCreator = scoreboard.createdBy === user.id;
    setIsOwner(isCreator);

    const isInUsersList = users.some((u) => u.id === user.id);

    const userHasAccess = isCreator || isInUsersList;
    setHasAccess(userHasAccess);

    if (!userHasAccess) {
      navigate('/scoreboards');
    }
  }, [scoreboard, users, user]);

  const handleRefreshPendingSessions = async () => {
    if (!scoreboardId || !user) return;

    try {
      const updated = await SessionService.getSessionsByScoreboardId(
        scoreboardId,
        true
      );

      const filtered = updated.filter(
        (s) =>
          Array.from(s.participants).includes(user.id) ||
          s.createdBy === user.id
      );
      setPendingSessions(filtered);
      showSuccessMessage('Pending sessions refreshed');
    } catch {
      showErrorMessage('Failed to load pending sessions');
    }
  };

  const handleRefreshSessions = async () => {
    if (!scoreboardId) return;

    try {
      const updated = await SessionService.getSessionsByScoreboardId(
        scoreboardId,
        false
      );

      setSessions(updated);
      showSuccessMessage('Sessions refreshed');
    } catch {
      showErrorMessage('Failed to load sessions');
    }
  };

  const handleRefreshUsers = async () => {
    if (!scoreboardId) return;

    try {
      const updatedUsers = await UserService.getScoreboardUsers(scoreboardId);
      setUsers(updatedUsers);
      showSuccessMessage('Users refreshed');
    } catch {
      showErrorMessage('Failed to load users');
    }
  };

  const handleRefreshSentInvitations = async () => {
    if (!scoreboardId) return;

    try {
      const invitations = await InvitationService.getInvitations();
      setSentInvitations(
        invitations.filter((inv) => inv.scoreboardId === scoreboardId)
      );
      showSuccessMessage('Sent invitations refreshed');
    } catch {
      showErrorMessage('Failed to load invitations');
    }
  };

  const handleInvitationSent = (invitation: Invitation) => {
    setSentInvitations([...sentInvitations, invitation]);
  };

  const handleRemoveUser = (userId: string) => {
    setUsers((prevUsers) => prevUsers.filter((u) => u.id !== userId));

    setScoreboard((prevScoreboard) => {
      if (!prevScoreboard) return prevScoreboard;

      return {
        ...prevScoreboard,
        memberships: prevScoreboard.memberships.filter(
          (m) => m.userId !== userId
        ),
      };
    });
  };

  const handleRemovePendingSession = (sessionId: string) => {
    setPendingSessions((prevSessions) =>
      prevSessions.filter((s) => s.id !== sessionId)
    );
  };

  const handleSessionCreated = (session: Session) => {
    setPendingSessions([...pendingSessions, session]);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prevSessions) =>
      prevSessions.filter((s) => s.id !== sessionId)
    );
  };

  const handleScoreSubmitted = (resultEntry: ResultEntry) => {
    const session = pendingSessions.find((s) => s.id === resultEntry.sessionId);

    if (!session) return;

    const updatedSessions = pendingSessions.map((s) => {
      if (s.id !== session.id) return s;

      const prev = s.resultEntries ?? new Set<string>();
      const next = new Set<string>(prev);
      next.add(resultEntry.id);

      return { ...s, resultEntries: next };
    });

    setPendingSessions(updatedSessions);
  };

  const handleEditClick = () => {
    if (!scoreboardId) return;
    navigate(`/scoreboards/${scoreboardId}/edit`);
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    setSentInvitations((prevInvitations) =>
      prevInvitations.filter((i) => i.id !== invitationId)
    );
  };

  const openLeaveScoreboardModal = () => {
    // Check if user has pending sessions
    const userPendingSessions = pendingSessions.filter((s: Session) => {
      if (s.participants) {
        const participantsArray = Array.from(s.participants);
        return participantsArray.some((p: string) => p === user?.id);
      }
      return false;
    });

    if (userPendingSessions.length > 0) {
      showErrorMessage('You have pending sessions');
      return;
    }

    setLeaveScoreboardDialogOpen(true);
  };

  const handleLeaveScoreboardConfirm = async () => {
    if (!scoreboardId) return;

    setIsProcessing(true);
    try {
      await ScoreboardsService.leaveScoreboard(scoreboardId);
      showSuccessMessage('Left the scoreboard');
      navigate('/scoreboards');
    } catch (err) {
      showErrorMessage('Failed to leave scoreboard');
    } finally {
      setIsProcessing(false);
      setLeaveScoreboardDialogOpen(false);
    }
  };

  const handleDeleteScoreboardConfirm = async () => {
    if (!scoreboardId) return;

    setIsProcessing(true);
    try {
      await ScoreboardsService.deleteScoreboard(scoreboardId);
      showSuccessMessage('Scoreboard deleted');
      navigate('/scoreboards');
    } catch (err) {
      showErrorMessage('Failed to delete scoreboard');
    } finally {
      setIsProcessing(false);
      setDeleteScoreboardDialogOpen(false);
    }
  };

  const renderConfirmDialog = () => {
    if (leaveScoreboardDialogOpen) {
      return (
        <ConfirmDialog
          open={leaveScoreboardDialogOpen}
          onCancel={() => setLeaveScoreboardDialogOpen(false)}
          title="Leave Scoreboard"
          text={`Are you sure you want to leave the scoreboard ${scoreboard?.name}? You will no longer
           have access to it.`}
          confirmLabel="Leave"
          loading={isProcessing}
          onConfirm={handleLeaveScoreboardConfirm}
        />
      );
    }

    if (deleteScoreboardDialogOpen) {
      return (
        <ConfirmDialog
          open={deleteScoreboardDialogOpen}
          onCancel={() => setDeleteScoreboardDialogOpen(false)}
          title="Delete Scoreboard"
          text={`Are you sure you want to delete the scoreboard ${scoreboard?.name}? This will
           permanently delete all data including sessions, result entries, and
           results. This action cannot be undone.`}
          confirmLabel="Delete"
          loading={isProcessing}
          onConfirm={handleDeleteScoreboardConfirm}
        />
      );
    }

    return null;
  };

  // If access check is complete, and user doesn't have access (redirect is in progress)
  if (!scoreboard || !hasAccess) {
    return <LoadingSpinner size={64} screenCentered />;
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
        <Stack spacing={4} alignItems="flex-start" sx={{ width: '100%' }}>
          <Stack
            direction="row"
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
              <Typography
                variant="h4"
                sx={{
                  color: '#1b5e20',
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                }}
              >
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
                  <Tooltip
                    title={
                      pendingSessions.length > 0
                        ? 'Cannot delete scoreboard while there are pending sessions'
                        : ''
                    }
                  >
                    <span>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setDeleteScoreboardDialogOpen(true)}
                        disabled={pendingSessions.length > 0}
                        sx={{ ':hover': { backgroundColor: '#d32f2f' } }}
                      >
                        Delete
                      </Button>
                    </span>
                  </Tooltip>
                </>
              )}
              {!isOwner && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={openLeaveScoreboardModal}
                  disabled={pendingSessions.length > 0}
                  sx={{ ':hover': { backgroundColor: '#ed6c02' } }}
                >
                  Leave
                </Button>
              )}
            </Stack>
          </Stack>

          <>
            {renderConfirmDialog()}
            <Leaderboard
              isLoading={loadingScoreboard}
              sessions={sessions}
              users={users}
              pointCategories={pointCategories}
              resultEntries={resultEntries}
              emptyText="No data. Create sessions to generate data"
              chartTitle="Leaderboard"
            />
            {sessions.length >= 2 && (
              <PerformanceChart
                isLoading={loadingScoreboard}
                sessions={sessions}
                users={users}
                resultEntries={resultEntries}
                emptyText="No data. Create sessions to generate data"
                chartTitle={'Performance'}
              />
            )}

            <PendingSessions
              isLoading={loadingScoreboard}
              pendingSessions={pendingSessions}
              scoreboard={scoreboard}
              pointCategories={pointCategories}
              onCancelSession={(sessionId) =>
                handleRemovePendingSession(sessionId)
              }
              onScoreSubmit={(resultEntry) => handleScoreSubmitted(resultEntry)}
              onRefresh={handleRefreshPendingSessions}
            />

            <Sessions
              isLoading={loadingScoreboard}
              sessions={sessions}
              scoreboard={scoreboard}
              users={users}
              pointCategories={pointCategories}
              resultEntries={resultEntries}
              onCreateSession={(session) => handleSessionCreated(session)}
              onDeleteSession={(sessionId) => handleDeleteSession(sessionId)}
              onRefresh={handleRefreshSessions}
            />

            <ScoreboardMembers
              isLoading={loadingScoreboard}
              scoreboard={scoreboard}
              users={users}
              onInvitationSent={(invitation) =>
                handleInvitationSent(invitation)
              }
              onRemoveUser={(userId) => handleRemoveUser(userId)}
              disableActions={pendingSessions.length > 0}
              onRefresh={handleRefreshUsers}
            />

            {isOwner && (
              <SentInvitationsList
                isLoading={loadingScoreboard}
                invitations={sentInvitations}
                onDeleteInvitation={(invitationId) =>
                  handleDeleteInvitation(invitationId)
                }
                onRefresh={handleRefreshSentInvitations}
              />
            )}
          </>
        </Stack>
      </Box>
    </Box>
  );
};
