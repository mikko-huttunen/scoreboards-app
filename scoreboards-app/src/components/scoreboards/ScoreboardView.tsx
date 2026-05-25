import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Avatar,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StarIcon from '@mui/icons-material/Star';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Session } from '../../types/Session';
import type { User } from '../../types/User';
import type { Scoreboard } from '../../types/Scoreboard';
import type { Invitation } from '../../types/Invitation';
import type { PointCategory } from '../../types/PointCategory';
import type { ResultEntry } from '../../types/ResultEntry';
import { Navigation, useNavigationSpacing } from '../navigation/Navigation';
import { ScoreboardsService } from '../../services/ScoreboardsService';
import { UserService } from '../../services/UserService';
import { InvitationService } from '../../services/InvitationService';
import { PointCategoryService } from '../../services/PointCategoryService';
import { SessionForm } from './SessionForm';
import { SessionService } from '../../services/SessionService';
import { ResultEntryService } from '../../services/ResultEntryService';
import { AnimatedBarChart, type BarData } from './AnimatedBarChart';
import { SessionDetailsModal } from './SessionDetailsModal';

export type ScoreboardsViewProps = {
  sessions?: Session[];
  onCreateSession?: (session: Session) => void | Promise<void>;
  users?: User[];
  onEdit?: () => void | Promise<void>;
};

export const ScoreboardsView: React.FC<ScoreboardsViewProps> = ({
  sessions: propSessions = [],
  onCreateSession,
  users: propUsers = [],
  onEdit,
}) => {
  const navigate = useNavigate();
  const { scoreboardId } = useParams<{ scoreboardId: string }>();
  const { getAccessTokenSilently, user: auth0User } = useAuth0();
  const navigationSpacing = useNavigationSpacing();

  const [scoreboard, setScoreboard] = useState<Scoreboard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>(
    []
  );
  const [pointCategories, setPointCategories] = useState<PointCategory[]>([]);
  const [sessions, setSessions] = useState<Session[]>(propSessions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<
    string | null
  >(null);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [userToKick, setUserToKick] = useState<User | null>(null);
  const [kicking, setKicking] = useState(false);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<BarData[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>(''); // empty string = total points
  const [pendingSessions, setPendingSessions] = useState<Session[]>([]);
  const [sessionUsers, setSessionUsers] = useState<Map<string, User>>(
    new Map()
  );
  const [cancellingSession, setCancellingSession] = useState<string | null>(
    null
  );
  const [finishingSession, setFinishingSession] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasFetchedRef = useRef(false);
  const currentScoreboardIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Reset fetch flag if scoreboardId changes
    if (currentScoreboardIdRef.current !== scoreboardId) {
      hasFetchedRef.current = false;
      currentScoreboardIdRef.current = scoreboardId;
    }

    // Only fetch if we haven't fetched for this scoreboardId yet
    if (hasFetchedRef.current || !scoreboardId) {
      if (!scoreboardId) {
        setError('Scoreboard ID is missing');
        setLoading(false);
      }
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        hasFetchedRef.current = true;
        const token = await getAccessTokenSilently();

        // Fetch scoreboard
        const scoreboardData = await ScoreboardsService.getScoreboardById(
          scoreboardId,
          token
        );
        if (!scoreboardData) {
          setError('Scoreboard not found');
          setLoading(false);
          return;
        }
        setScoreboard(scoreboardData);

        // Fetch users for scoreboard (always fetch, don't rely on propUsers)
        const usersData = await UserService.getUsersForScoreboard(
          scoreboardId,
          token
        );
        setUsers(usersData);

        // Fetch point categories
        const categories =
          await PointCategoryService.getPointCategoriesByScoreboard(
            scoreboardId,
            token
          );
        setPointCategories(categories);

        // Fetch sessions (non-pending only)
        if (scoreboardData.name) {
          try {
            const sessionsData = await SessionService.getSessionsByScoreboardId(
              scoreboardData.id,
              token
            );
            // Convert backend sessions to frontend format
            const convertedSessions = sessionsData.map((s: any) =>
              Session.create({
                id: s.id,
                created: new Date(s.created),
                createdById: s.createdById,
                scoreboardId: s.scoreboardId,
                scoreboardName: s.scoreboardName,
                isPending: s.isPending ?? false,
                participants: new Set<User>(),
                pointCategories: new Set<PointCategory>(),
                resultEntries: new Set<ResultEntry>(), // Will be populated when needed
                isActive: s.isActive,
              })
            );
            setSessions(convertedSessions);
          } catch (err) {
            console.error('Error fetching sessions:', err);
            // Don't fail the whole page if sessions fail
            // Use prop sessions if available
            if (propSessions.length > 0) {
              setSessions(propSessions);
            }
          }
        } else if (propSessions.length > 0) {
          // Use prop sessions if scoreboard name is not available
          setSessions(propSessions);
        }

        // Fetch pending invitations
        const invitations =
          await InvitationService.getPendingInvitations(token);
        setPendingInvitations(
          invitations.filter((inv) => inv.scoreboardId === scoreboardId)
        );

        // Fetch leaderboard data (will be called after users and pointCategories are set)
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load scoreboard'
        );
        hasFetchedRef.current = false; // Allow retry on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [scoreboardId, getAccessTokenSilently]);

  // Fetch leaderboard data when sessions, users, and pointCategories are available
  useEffect(() => {
    const loadLeaderboard = async () => {
      if (
        !scoreboardId ||
        sessions.length === 0 ||
        users.length === 0 ||
        pointCategories.length === 0
      ) {
        setLeaderboardData([]);
        return;
      }

      try {
        setLoadingLeaderboard(true);
        const token = await getAccessTokenSilently();

        // Fetch all resultEntries for all sessions
        const allResultEntries: ResultEntry[] = [];
        for (const session of sessions) {
          try {
            const entries = await ResultEntryService.getResultEntriesBySession(
              session.id,
              token
            );
            allResultEntries.push(...entries);
          } catch (err) {
            console.error(
              `Error fetching result entries for session ${session.id}:`,
              err
            );
            // Continue with other sessions
          }
        }

        // Create a map of user ID to user name
        const userMap = new Map<string, User>();
        users.forEach((u) => userMap.set(u.id, u));

        // Create a map of point category ID to point category
        const categoryMap = new Map<string, PointCategory>();
        pointCategories.forEach((cat) => categoryMap.set(cat.id, cat));

        // Aggregate points by user and point category
        // Map: userId -> Map: pointCategoryId -> total points
        const userPointsMap = new Map<string, Map<string, number>>();

        for (const entry of allResultEntries) {
          const userId = entry.userId;
          if (!userPointsMap.has(userId)) {
            userPointsMap.set(userId, new Map<string, number>());
          }
          const categoryPointsMap = userPointsMap.get(userId)!;

          // Process results from the entry
          // Handle both cases: results as Set<Result> or as array (from backend)
          const results = entry.results;
          if (results) {
            let resultsArray: any[] = [];
            if (results instanceof Set) {
              resultsArray = Array.from(results);
            } else if (Array.isArray(results)) {
              resultsArray = results;
            }

            resultsArray.forEach((item: any) => {
              if (
                typeof item === 'object' &&
                item.pointCategoryId &&
                item.points !== undefined
              ) {
                // It's a Result object
                const categoryId = item.pointCategoryId;
                const currentPoints = categoryPointsMap.get(categoryId) || 0;
                categoryPointsMap.set(categoryId, currentPoints + item.points);
              }
            });
          }

          // If we couldn't get category breakdown from results, use totalPoints
          // and distribute evenly (this is a fallback - ideally we'd fetch Results)
          if (
            categoryPointsMap.size === 0 &&
            entry.totalPoints > 0 &&
            pointCategories.length > 0
          ) {
            // Distribute totalPoints evenly across all point categories
            // This is not ideal but works as a fallback
            const pointsPerCategory =
              entry.totalPoints / pointCategories.length;
            pointCategories.forEach((cat) => {
              categoryPointsMap.set(cat.id, pointsPerCategory);
            });
          }
        }

        // Convert to BarData format
        const barData: BarData[] = Array.from(userPointsMap.entries()).map(
          ([userId, categoryPoints]) => {
            const user = userMap.get(userId);
            const userName = user?.name || user?.email || 'Unknown User';

            const segments = Array.from(categoryPoints.entries())
              .map(([categoryId, points]) => {
                const category = categoryMap.get(categoryId);
                return {
                  categoryId,
                  categoryName: category?.name || 'Unknown',
                  value: points,
                  color: category?.color || '#38a14f',
                };
              })
              .sort((a, b) => b.value - a.value); // Sort by points descending

            const total = Array.from(categoryPoints.values()).reduce(
              (sum, points) => sum + points,
              0
            );

            return {
              label: userName,
              total,
              userId: userId,
              avatar: user ? (auth0User?.picture ?? undefined) : undefined,
              segments,
            };
          }
        );

        // Sort by total points descending
        barData.sort((a, b) => b.total - a.total);

        setLeaderboardData(barData);
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        setLeaderboardData([]);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    loadLeaderboard();
  }, [sessions, users, pointCategories, scoreboardId, getAccessTokenSilently]);

  // Fetch pending sessions for this scoreboard
  useEffect(() => {
    const fetchPendingSessions = async () => {
      if (!scoreboardId || !auth0User?.sub) {
        setPendingSessions([]);
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        const allPendingSessions =
          await SessionService.getPendingSessions(token);

        // Filter to only sessions for this scoreboard
        const scoreboardSessions = allPendingSessions
          .filter((s: any) => s.scoreboardId === scoreboardId)
          .map((s: any) => {
            // Convert participants from array to Set if needed
            // Backend returns participants as List<String> (array of user IDs)
            let participantsSet: Set<string> = new Set();
            if (s.participants) {
              if (Array.isArray(s.participants)) {
                participantsSet = new Set(s.participants);
              } else if (s.participants instanceof Set) {
                participantsSet = s.participants;
              }
            }

            return Session.create({
              id: s.id,
              created: new Date(s.created),
              createdById: s.createdById,
              scoreboardId: s.scoreboardId,
              scoreboardName: s.scoreboardName,
              isPending: s.isPending ?? true,
              participants: participantsSet as any, // Store as Set of IDs for checking
              pointCategories: new Set<PointCategory>(),
              resultEntries: new Set<ResultEntry>(),
              isActive: s.isActive,
            });
          });

        setPendingSessions(scoreboardSessions);

        // Fetch user info for unique createdByIds
        const uniqueUserIds = Array.from(
          new Set(scoreboardSessions.map((s) => s.createdById))
        );
        const usersMap = new Map<string, User>();
        for (const userId of uniqueUserIds) {
          try {
            const user = await UserService.getUserById(userId, token);
            if (user) {
              usersMap.set(userId, user);
            }
          } catch (err) {
            console.error(`Error fetching user ${userId}:`, err);
          }
        }
        setSessionUsers(usersMap);
      } catch (err) {
        console.error('Error fetching pending sessions:', err);
      }
    };

    fetchPendingSessions();
  }, [scoreboardId, auth0User?.sub, getAccessTokenSilently]);

  const handleAddScores = (sessionId: string) => {
    navigate(`/sessions/${sessionId}/add-scores`);
  };

  const handleFinishSession = async (sessionId: string) => {
    try {
      setFinishingSession(sessionId);
      const token = await getAccessTokenSilently();
      const finishedSession = await SessionService.finishSession(
        sessionId,
        token
      );

      // Remove from pending sessions
      setPendingSessions(pendingSessions.filter((s) => s.id !== sessionId));

      // Add finished session to Latest Sessions table
      if (finishedSession) {
        const convertedFinishedSession = Session.create({
          id: finishedSession.id,
          created: new Date(finishedSession.created),
          createdById: finishedSession.createdById,
          scoreboardId: finishedSession.scoreboardId,
          scoreboardName: finishedSession.scoreboardName,
          isPending: finishedSession.isPending ?? false,
          participants: new Set<User>(),
          pointCategories: new Set<PointCategory>(),
          resultEntries: new Set<ResultEntry>(),
          isActive: finishedSession.isActive,
        });
        setSessions([convertedFinishedSession, ...sessions]);
      }

      // Refresh pending sessions to ensure we have the latest state
      const updatedSessions = await SessionService.getPendingSessions(token);
      const convertedSessions = updatedSessions
        .filter((s: any) => s.scoreboardId === scoreboardId)
        .map((s: any) =>
          Session.create({
            id: s.id,
            created: new Date(s.created),
            createdById: s.createdById,
            scoreboardId: s.scoreboardId,
            scoreboardName: s.scoreboardName,
            isPending: s.isPending ?? true,
            participants: new Set<User>(),
            pointCategories: new Set<PointCategory>(),
            resultEntries: new Set<ResultEntry>(),
            isActive: s.isActive,
          })
        );
      setPendingSessions(convertedSessions);
    } catch (err) {
      console.error('Error finishing session:', err);
      setError(err instanceof Error ? err.message : 'Failed to finish session');
    } finally {
      setFinishingSession(null);
    }
  };

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<string | null>(null);

  const handleCancelSessionClick = (sessionId: string) => {
    setSessionToCancel(sessionId);
    setCancelDialogOpen(true);
  };

  const handleCancelSession = async () => {
    if (!sessionToCancel) return;
    try {
      setCancellingSession(sessionToCancel);
      const token = await getAccessTokenSilently();
      await SessionService.deleteSession(sessionToCancel, token);
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

  const handleCreateSession = () => {
    setSessionFormOpen(true);
  };

  const handleSessionFormClose = () => {
    setSessionFormOpen(false);
  };

  const handleSessionCreated = async (session: Session) => {
    if (onCreateSession) {
      await onCreateSession(session);
    }
    // Refresh pending sessions immediately
    const fetchPendingSessions = async () => {
      if (!scoreboardId || !auth0User?.sub) return;
      try {
        const token = await getAccessTokenSilently();
        const allPendingSessions =
          await SessionService.getPendingSessions(token);

        // Filter to only sessions for this scoreboard
        const scoreboardSessions = allPendingSessions
          .filter((s: any) => s.scoreboardId === scoreboardId)
          .map((s: any) =>
            Session.create({
              id: s.id,
              created: new Date(s.created),
              createdById: s.createdById,
              scoreboardId: s.scoreboardId,
              scoreboardName: s.scoreboardName,
              isPending: s.isPending ?? true,
              participants: new Set<User>(),
              pointCategories: new Set<PointCategory>(),
              resultEntries: new Set<ResultEntry>(),
              isActive: s.isActive,
            })
          );

        setPendingSessions(scoreboardSessions);

        // Fetch user info for unique createdByIds
        const uniqueUserIds = Array.from(
          new Set(scoreboardSessions.map((s) => s.createdById))
        );
        const usersMap = new Map<string, User>();
        for (const userId of uniqueUserIds) {
          try {
            const user = await UserService.getUserById(userId, token);
            if (user) {
              usersMap.set(userId, user);
            }
          } catch (err) {
            console.error(`Error fetching user ${userId}:`, err);
          }
        }
        setSessionUsers(usersMap);
      } catch (err) {
        console.error('Error fetching pending sessions:', err);
      }
    };
    await fetchPendingSessions();
    setSessionFormOpen(false);
  };

  const handleOpenInviteModal = () => {
    setInviteModalOpen(true);
    setInviteEmail('');
    setInviteError(null);
    setInviteSuccess(false);
  };

  const handleCloseInviteModal = () => {
    setInviteModalOpen(false);
    setInviteEmail('');
    setInviteError(null);
    setInviteSuccess(false);
  };

  const handleSendInvitation = async () => {
    if (!scoreboardId || !inviteEmail.trim()) {
      setInviteError('Please enter an email address');
      return;
    }

    try {
      setInviteLoading(true);
      setInviteError(null);
      setInviteSuccess(false);
      const token = await getAccessTokenSilently();

      await InvitationService.createInvitation(
        inviteEmail.trim(),
        scoreboardId,
        token
      );

      setInviteSuccess(true);
      setInviteEmail('');
      setTimeout(() => {
        handleCloseInviteModal();
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

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!scoreboardId) return;

    try {
      setProcessingInvitation(invitationId);
      const token = await getAccessTokenSilently();

      await InvitationService.acceptInvitation(invitationId, token);

      // Refresh users and invitations
      const usersData = await UserService.getUsersForScoreboard(
        scoreboardId,
        token
      );
      setUsers(usersData);

      const invitations = await InvitationService.getPendingInvitations(token);
      setPendingInvitations(
        invitations.filter((inv) => inv.scoreboardId === scoreboardId)
      );
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
    if (!scoreboardId) return;

    try {
      setProcessingInvitation(invitationId);
      const token = await getAccessTokenSilently();

      await InvitationService.declineInvitation(invitationId, token);

      // Refresh invitations
      const invitations = await InvitationService.getPendingInvitations(token);
      setPendingInvitations(
        invitations.filter((inv) => inv.scoreboardId === scoreboardId)
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

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null); // null = checking, true = has access, false = no access

  const isOwner = scoreboard && auth0User?.sub === scoreboard.createdBy;
  const isJoined =
    currentUser &&
    !isOwner &&
    currentUser.joinedScoreboardIds?.includes(scoreboardId || '');

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = await getAccessTokenSilently();
        const user = await UserService.getCurrentUser(token);
        setCurrentUser(user);
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };
    if (auth0User?.sub) {
      fetchCurrentUser();
    }
  }, [auth0User?.sub, getAccessTokenSilently]);

  // Check access after scoreboard and users are loaded
  useEffect(() => {
    if (!scoreboard || !auth0User?.sub || loading) {
      setHasAccess(null);
      return;
    }

    // Check if user is the creator
    const isCreator = scoreboard.createdBy === auth0User.sub;

    // Check if user is in the users list (either as creator or joined user)
    const isInUsersList = users.some((u) => u.id === auth0User.sub);

    const userHasAccess = isCreator || isInUsersList;
    setHasAccess(userHasAccess);

    // Redirect if user doesn't have access
    if (!userHasAccess) {
      console.log(
        'User does not have access to this scoreboard, redirecting...'
      );
      navigate('/scoreboards');
    }
  }, [scoreboard, users, auth0User?.sub, loading, navigate]);

  const handleEditClick = () => {
    if (!scoreboardId) return;
    navigate(`/scoreboards/${scoreboardId}/edit`);
  };

  const handleLeaveClick = () => {
    // Check if user has pending sessions
    const userPendingSessions = pendingSessions.filter((s) => {
      // Check if user is the creator (creators can't leave, but check anyway)
      if (s.createdById === auth0User?.sub) {
        return true;
      }
      // Check if user is a participant in the session
      // Participants are stored as Set<string> (user IDs) in the frontend
      if (s.participants) {
        const participantsArray = Array.from(s.participants);
        return participantsArray.some((p: any) => {
          // p is a string (user ID) when stored from backend
          const participantId =
            typeof p === 'string' ? p : (p as User)?.id || p;
          return participantId === auth0User?.sub;
        });
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
      const token = await getAccessTokenSilently();
      await ScoreboardsService.leaveScoreboard(scoreboardId, token);
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

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scoreboardId) return;
    try {
      setDeleting(true);
      const token = await getAccessTokenSilently();
      await ScoreboardsService.deleteScoreboard(scoreboardId, token);
      setDeleteDialogOpen(false);
      navigate('/scoreboards');
    } catch (err) {
      console.error('Error deleting scoreboard:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete scoreboard'
      );
      setDeleting(false);
    }
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    setSessionModalOpen(true);
  };

  const handleKickClick = (user: User) => {
    // Check if user has pending sessions
    const userPendingSessions = pendingSessions.filter((s) => {
      // Check if user is the creator
      if (s.createdById === user.id) {
        return true;
      }
      // Check if user is a participant in the session
      // Participants are stored as Set<string> (user IDs) in the frontend
      if (s.participants) {
        const participantsArray = Array.from(s.participants);
        return participantsArray.some((p: any) => {
          // p is a string (user ID) when stored from backend
          const participantId =
            typeof p === 'string' ? p : (p as User)?.id || p;
          return participantId === user.id;
        });
      }
      return false;
    });

    if (userPendingSessions.length > 0) {
      setError(
        `Cannot kick user while they have ${userPendingSessions.length} pending session(s). Please wait for sessions to be finished.`
      );
      return;
    }

    setUserToKick(user);
    setKickDialogOpen(true);
  };

  const handleKickConfirm = async () => {
    if (!scoreboardId || !userToKick) return;

    setKicking(true);
    try {
      const token = await getAccessTokenSilently();
      await ScoreboardsService.removeUserFromScoreboard(
        scoreboardId,
        userToKick.id,
        token
      );

      // Refresh users
      const usersData = await UserService.getUsersForScoreboard(
        scoreboardId,
        token
      );
      setUsers(usersData);

      setKickDialogOpen(false);
      setUserToKick(null);
    } catch (err) {
      console.error('Error kicking user:', err);
      setError(err instanceof Error ? err.message : 'Failed to kick user');
    } finally {
      setKicking(false);
    }
  };

  // Show loading while checking access or loading data
  if (loading || hasAccess === null) {
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

  // If access check is complete and user doesn't have access, show nothing (redirect is happening)
  if (hasAccess === false) {
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
        <Navigation />
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
      <Navigation />
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
                    onClick={handleDeleteClick}
                    sx={{ ':hover': { backgroundColor: '#d32f2f' } }}
                  >
                    Delete
                  </Button>
                </>
              )}
              {isJoined && (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleLeaveClick}
                  sx={{ ':hover': { backgroundColor: '#ed6c02' } }}
                >
                  Leave
                </Button>
              )}
            </Stack>
          </Stack>

          <>
            {/* Leaderboard Section */}
            {sessions.length > 0 && (
              <Stack sx={{ width: '100%' }} spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography variant="h6" sx={{ color: '#1b5e20' }}>
                    Leaderboard
                  </Typography>
                  {leaderboardData.length > 0 && pointCategories.length > 0 && (
                    <ToggleButtonGroup
                      value={selectedCategoryFilter}
                      exclusive
                      onChange={(_, value) =>
                        setSelectedCategoryFilter(value || '')
                      }
                      size="small"
                      sx={{ flexWrap: 'wrap', gap: 1 }}
                    >
                      <ToggleButton value="" aria-label="total points">
                        Total Points
                      </ToggleButton>
                      {pointCategories.map((category) => (
                        <ToggleButton
                          key={category.id}
                          value={category.id}
                          aria-label={category.name}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              backgroundColor: category.color,
                              borderRadius: 0.5,
                              mr: 0.5,
                            }}
                          />
                          {category.name}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  )}
                </Stack>
                {loadingLeaderboard ? (
                  <Box
                    sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
                  >
                    <CircularProgress />
                  </Box>
                ) : leaderboardData.length > 0 ? (
                  <Paper
                    elevation={1}
                    sx={{ p: { xs: 2, sm: 3 }, width: '100%' }}
                  >
                    <AnimatedBarChart
                      data={leaderboardData}
                      showLegend={true}
                      showCrown={true}
                      loading={loadingLeaderboard}
                      selectedCategoryId={selectedCategoryFilter || undefined}
                    />
                  </Paper>
                ) : (
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    No leaderboard data available yet. Complete some sessions to
                    see statistics.
                  </Typography>
                )}
              </Stack>
            )}

            {/* Pending Sessions Section */}
            {pendingSessions.length > 0 && (
              <Stack sx={{ width: '100%' }} spacing={2}>
                <Box
                  sx={{
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
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#1b5e20',
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': {
                          backgroundColor: 'transparent',
                        },
                        '50%': {
                          backgroundColor: '#f1f8f4',
                        },
                      },
                    }}
                  >
                    Pending Sessions
                  </Typography>
                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                      width: '100%',
                      overflowX: 'auto',
                      maxWidth: '100%',
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                    }}
                  >
                    <Table
                      size="small"
                      aria-label="pending sessions table"
                      sx={{
                        width: '100%',
                        tableLayout: { xs: 'fixed', sm: 'auto' },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell
                            sx={{
                              whiteSpace: 'nowrap',
                              width: { xs: '30%', sm: 'auto' },
                            }}
                          >
                            Date
                          </TableCell>
                          <TableCell
                            sx={{
                              whiteSpace: 'nowrap',
                              width: { xs: '40%', sm: 'auto' },
                            }}
                          >
                            Started By
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              whiteSpace: 'nowrap',
                              width: { xs: '30%', sm: 'auto' },
                            }}
                          >
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pendingSessions.map((session) => {
                          const isCreator =
                            auth0User?.sub &&
                            session.createdById === auth0User.sub;
                          const startedByUser = sessionUsers.get(
                            session.createdById
                          );
                          const startedByName =
                            startedByUser?.name ||
                            startedByUser?.email ||
                            'Unknown User';
                          return (
                            <TableRow key={session.id} hover>
                              <TableCell
                                sx={{
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {session.created instanceof Date
                                  ? session.created.toLocaleDateString()
                                  : new Date(
                                      session.created
                                    ).toLocaleDateString()}
                              </TableCell>
                              <TableCell
                                sx={{
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {startedByName}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{ whiteSpace: 'nowrap' }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  justifyContent="flex-end"
                                  flexWrap="nowrap"
                                >
                                  <Tooltip title="Add scores">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() =>
                                        handleAddScores(session.id)
                                      }
                                      aria-label="add scores"
                                      sx={{
                                        minWidth: 'auto',
                                        padding: { xs: 0.5, sm: 1 },
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  {isCreator && (
                                    <>
                                      <Tooltip title="Finish session">
                                        <IconButton
                                          size="small"
                                          color="success"
                                          onClick={() =>
                                            handleFinishSession(session.id)
                                          }
                                          disabled={
                                            finishingSession === session.id
                                          }
                                          aria-label="finish session"
                                          sx={{
                                            minWidth: 'auto',
                                            padding: { xs: 0.5, sm: 1 },
                                          }}
                                        >
                                          {finishingSession === session.id ? (
                                            <CircularProgress size={16} />
                                          ) : (
                                            <DoneIcon fontSize="small" />
                                          )}
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Cancel session">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            handleCancelSessionClick(session.id)
                                          }
                                          disabled={
                                            cancellingSession === session.id
                                          }
                                          aria-label="cancel session"
                                          sx={{
                                            minWidth: 'auto',
                                            padding: { xs: 0.5, sm: 1 },
                                          }}
                                        >
                                          {cancellingSession === session.id ? (
                                            <CircularProgress size={16} />
                                          ) : (
                                            <DeleteIcon fontSize="small" />
                                          )}
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Stack>
            )}

            <Stack sx={{ width: '100%' }} spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Typography variant="h6" sx={{ color: '#1b5e20' }}>
                  Latest Sessions
                </Typography>
                {isOwner && (
                  <Button
                    variant="contained"
                    onClick={handleCreateSession}
                    sx={{
                      backgroundColor: '#ffffff',
                      color: '#38a14f',
                      ':hover': { backgroundColor: '#f7f7f7' },
                    }}
                  >
                    New Session
                  </Button>
                )}
              </Stack>
              <TableContainer component={Paper} elevation={1}>
                <Table size="small" aria-label="latest sessions table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={1} sx={{ color: '#666' }}>
                          No sessions
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessions.map((s) => {
                        const createdAt =
                          s.created instanceof Date
                            ? s.created
                            : new Date(s.created);
                        return (
                          <TableRow
                            key={s.id}
                            hover
                            onClick={() => handleSessionClick(s)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell
                              sx={{
                                whiteSpace: { xs: 'normal', sm: 'nowrap' },
                              }}
                            >
                              {createdAt.toLocaleDateString()}{' '}
                              {createdAt.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>

            <Stack sx={{ width: '100%' }} spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
              >
                <Typography variant="h6" sx={{ color: '#1b5e20' }}>
                  Users
                </Typography>
                {isOwner && (
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={handleOpenInviteModal}
                    sx={{
                      backgroundColor: '#38a14f',
                      color: '#ffffff',
                      ':hover': { backgroundColor: '#2d7f3d' },
                    }}
                  >
                    Invite User
                  </Button>
                )}
              </Stack>
              <TableContainer component={Paper} elevation={1}>
                <Table size="small" aria-label="users table">
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell
                        sx={{ display: { xs: 'none', sm: 'table-cell' } }}
                      >
                        Email
                      </TableCell>
                      {isOwner && <TableCell align="right">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isOwner ? 3 : 2}
                          sx={{ color: '#666' }}
                        >
                          No users
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((u) => {
                        const isCreator = u.id === scoreboard.createdBy;
                        return (
                          <TableRow key={u.id} hover>
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Avatar
                                  src={auth0User?.picture ?? undefined}
                                  sx={{ width: 28, height: 28 }}
                                >
                                  {u.name && u.name.length > 0
                                    ? u.name.charAt(0).toUpperCase()
                                    : u.email && u.email.length > 0
                                      ? u.email.charAt(0).toUpperCase()
                                      : '?'}
                                </Avatar>
                                <span>
                                  {u.name || u.email || 'Unknown User'}
                                </span>
                                {isCreator && (
                                  <StarIcon
                                    sx={{ color: '#ffa726', fontSize: 20 }}
                                  />
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell
                              sx={{ display: { xs: 'none', sm: 'table-cell' } }}
                            >
                              {u.email || '—'}
                            </TableCell>
                            {isOwner && (
                              <TableCell align="right">
                                {!isCreator && (
                                  <Tooltip title="Kick user">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleKickClick(u)}
                                      aria-label="kick user"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>

            {pendingInvitations.length > 0 && (
              <Stack sx={{ width: '100%' }} spacing={2}>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#1b5e20',
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': {
                        backgroundColor: 'transparent',
                      },
                      '50%': {
                        backgroundColor: '#fff3e0',
                      },
                    },
                  }}
                >
                  Pending Invitations
                </Typography>
                <TableContainer
                  component={Paper}
                  elevation={1}
                  sx={{
                    border: '2px solid #ff9800',
                    backgroundColor: '#fff3e0',
                    animation: 'lightPulse 3s ease-in-out infinite',
                    '@keyframes lightPulse': {
                      '0%, 100%': {
                        backgroundColor: '#fff3e0',
                        borderColor: '#ff9800',
                      },
                      '50%': {
                        backgroundColor: '#ffe0b2',
                        borderColor: '#ffb74d',
                      },
                    },
                  }}
                >
                  <Table size="small" aria-label="pending invitations table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Scoreboard</TableCell>
                        <TableCell
                          sx={{ display: { xs: 'none', sm: 'table-cell' } }}
                        >
                          Date
                        </TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingInvitations.map((inv) => (
                        <TableRow key={inv.id} hover>
                          <TableCell>{inv.scoreboardName}</TableCell>
                          <TableCell
                            sx={{ display: { xs: 'none', sm: 'table-cell' } }}
                          >
                            {inv.created instanceof Date
                              ? inv.created.toLocaleDateString()
                              : new Date(inv.created).toLocaleDateString()}
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
                                  onClick={() => handleAcceptInvitation(inv.id)}
                                  disabled={processingInvitation === inv.id}
                                >
                                  <CheckIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Decline">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    handleDeclineInvitation(inv.id)
                                  }
                                  disabled={processingInvitation === inv.id}
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}
          </>
        </Stack>
      </Box>

      {/* Invite Modal */}
      <Dialog
        open={inviteModalOpen}
        onClose={handleCloseInviteModal}
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
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !inviteLoading) {
                  handleSendInvitation();
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInviteModal} disabled={inviteLoading}>
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

      {/* Session Form */}
      {scoreboard && (
        <SessionForm
          open={sessionFormOpen}
          onClose={handleSessionFormClose}
          scoreboardId={scoreboard.id}
          scoreboardName={scoreboard.name}
          users={users}
          onSuccess={handleSessionCreated}
        />
      )}

      {/* Kick User Confirmation Dialog */}
      <Dialog
        open={kickDialogOpen}
        onClose={() => !kicking && setKickDialogOpen(false)}
      >
        <DialogTitle>Confirm Kick User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to kick{' '}
            {userToKick?.name || userToKick?.email || 'this user'} from the
            scoreboard? They will lose access to this scoreboard and will need
            to be invited again to rejoin.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKickDialogOpen(false)} disabled={kicking}>
            Cancel
          </Button>
          <Button
            color="error"
            onClick={handleKickConfirm}
            autoFocus
            disabled={kicking}
          >
            {kicking ? <CircularProgress size={24} /> : 'Kick User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leave Confirmation Dialog */}
      <Dialog
        open={leaveDialogOpen}
        onClose={() => !leaving && setLeaveDialogOpen(false)}
      >
        <DialogTitle>Leave Scoreboard</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to leave this scoreboard? You will no longer
            have access to it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)} disabled={leaving}>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Scoreboard</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this scoreboard? This will
            permanently delete all data including sessions, result entries, and
            results. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
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

      {/* Cancel Session Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => !cancellingSession && setCancelDialogOpen(false)}
      >
        <DialogTitle>Cancel Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this session? This will permanently
            delete the session and all associated data. This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCancelDialogOpen(false)}
            disabled={cancellingSession !== null}
          >
            Cancel
          </Button>
          <Button
            color="error"
            onClick={handleCancelSession}
            autoFocus
            disabled={cancellingSession !== null}
          >
            {cancellingSession ? (
              <CircularProgress size={24} />
            ) : (
              'Cancel Session'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Details Modal */}
      <Dialog
        open={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Session Details - {selectedSession?.scoreboardName}
          {selectedSession?.created && (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              {selectedSession.created instanceof Date
                ? selectedSession.created.toLocaleDateString()
                : new Date(selectedSession.created).toLocaleDateString()}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedSession && (
            <SessionDetailsModal
              session={selectedSession}
              users={users}
              pointCategories={pointCategories}
              getAccessTokenSilently={getAccessTokenSilently}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
