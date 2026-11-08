import React, { useMemo, useState } from 'react';
import { Stack, Tooltip } from '@mui/material';
import BalanceIcon from '@mui/icons-material/Balance';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { DataTable } from '../common/table/DataTable.tsx';
import {
  hasSessionsPermission,
  isOwner,
  useDateFormat,
} from '../../utils/Utils.ts';
import type { Session } from '../../types/Session.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import { useNavigate } from 'react-router-dom';
import { Leaderboard } from '@mui/icons-material';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';
import type { User } from '../../types/User.ts';
import type { PointCategory } from '../../types/PointCategory.ts';
import {
  type SessionData,
  SessionService,
} from '../../services/SessionService.ts';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import { SessionDetailsModal } from './SessionDetailsModal.tsx';
import type { ResultEntry } from '../../types/ResultEntry.ts';
import { EditSession } from './EditSession.tsx';
import type { Comment } from '../../types/Comment.ts';
import { hasUnresolvedTie } from '../../utils/TieBreaker.ts';

// Small markers rendered after a session's name in the table.
type SessionBadge = {
  key: string;
  title: string;
  icon: React.ReactElement;
};

type SessionsProps = {
  sessions: Session[];
  scoreboard: Scoreboard;
  users: User[];
  pointCategories: PointCategory[];
  resultEntries: ResultEntry[];
  comments: Comment[];
  onCreateComment: (sessionId: string, comment: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onRefreshComments?: () => Promise<void> | void;
  onDeleteSession: (sessionId: string) => void;
  isLoading?: boolean;
  onRefresh?: () => Promise<void> | void;
  onUpdateSession?: (updatedSession: SessionData) => void | Promise<void>;
};

export const Sessions: React.FC<SessionsProps> = ({
  sessions,
  scoreboard,
  users,
  pointCategories,
  resultEntries,
  comments,
  onCreateComment,
  onDeleteComment,
  onRefreshComments,
  onDeleteSession,
  isLoading = false,
  onRefresh,
  onUpdateSession,
}) => {
  const navigate = useNavigate();
  const { format_date } = useDateFormat();
  const { user } = useCurrentUser();
  const hasPermissions = hasSessionsPermission(
    scoreboard.memberships,
    user?.id
  );
  const isCreator = isOwner(scoreboard.memberships, user?.id);
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();
  const [sessionDetailsModalOpen, setSessionDetailsModalOpen] = useState(false);
  const [editSessionModalOpen, setEditSessionModalOpen] = useState(false);
  const [deleteSessionDialogOpen, setDeleteSessionDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const canDelete = (session: Session) => {
    if (isCreator) return true;
    return hasPermissions && session.createdBy === user?.id;
  };

  const canEdit = (_session: Session) => {
    if (!user?.id) return false;
    if (isCreator) return true;
    if (_session.createdBy === user?.id) return true;
    return Array.from(_session.participants ?? []).includes(user.id);
  };

  const goToSessionResults = (sessionId: string) => {
    navigate(`/scoreboards/${scoreboard.id}/session/${sessionId}/results`);
  };

  const openSessionDetailsModal = (session: Session) => {
    setSelectedSession(session);
    setSessionDetailsModalOpen(true);
  };

  const openEditSessionModal = (session: Session) => {
    setSelectedSession(session);
    setEditSessionModalOpen(true);
  };

  const openDeleteSessionModal = (session: Session) => {
    setSelectedSession(session);
    setDeleteSessionDialogOpen(true);
  };

  const handleDeleteSessionConfirm = async () => {
    if (!selectedSession) return;

    setIsProcessing(true);
    try {
      await SessionService.deleteSession(selectedSession.id);
      onDeleteSession(selectedSession.id);
      showSuccessMessage('Session deleted');
    } catch (err) {
      showErrorMessage('Failed to delete session');
    } finally {
      setDeleteSessionDialogOpen(false);
      setSelectedSession(null);
      setIsProcessing(false);
    }
  };

  const handleSessionUpdated = async (updatedSession: SessionData) => {
    await onUpdateSession?.(updatedSession);
    setEditSessionModalOpen(false);
    setSelectedSession(null);
  };

  const selectedSessionComments = useMemo(
    () => comments.filter((item) => item.sessionId === selectedSession?.id),
    [comments, selectedSession]
  );

  const commentedSessionIds = useMemo(
    () =>
      new Set(
        comments
          .map((item) => item.sessionId)
          .filter((sessionId): sessionId is string => !!sessionId)
      ),
    [comments]
  );

  const data = useMemo(
    () =>
      sessions.map((session) => {
        const badges: SessionBadge[] = [];

        if (hasUnresolvedTie(session, resultEntries, session.id)) {
          badges.push({
            key: 'tie',
            title: 'Unresolved tie breaker',
            icon: <BalanceIcon sx={{ fontSize: 16, color: '#ed6c02' }} />,
          });
        }

        if (commentedSessionIds.has(session.id)) {
          badges.push({
            key: 'comments',
            title: 'Has comments',
            icon: (
              <ChatBubbleOutlineIcon sx={{ fontSize: 16, color: '#38a14f' }} />
            ),
          });
        }

        if (session.editedAt) {
          badges.push({
            key: 'edited',
            title: `Session was edited on ${format_date(session.editedAt)}`,
            icon: <EditNoteIcon sx={{ fontSize: 18, color: '#757575' }} />,
          });
        }

        return {
          id: session.id,
          Name:
            badges.length > 0 ? (
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <span>{session.name}</span>
                {badges.map((badge) => (
                  <Tooltip key={badge.key} title={badge.title}>
                    {badge.icon}
                  </Tooltip>
                ))}
              </Stack>
            ) : (
              session.name
            ),
          Date: format_date(session.created),
          'Created By': session.createdByName,
          session,
        };
      }),
    [sessions, resultEntries, commentedSessionIds]
  );

  return (
    <>
      <ConfirmDialog
        open={deleteSessionDialogOpen}
        onCancel={() => {
          if (!isProcessing) setDeleteSessionDialogOpen(false);
        }}
        title="Delete Session"
        text={`Are you sure you want to delete this session? This will
           permanently delete the session and all associated data. This action
           cannot be undone.`}
        confirmLabel="Delete"
        loading={isProcessing}
        confirmDisabled={isProcessing}
        onConfirm={handleDeleteSessionConfirm}
      />
      {selectedSession && (
        <SessionDetailsModal
          open={sessionDetailsModalOpen}
          onClose={() => setSessionDetailsModalOpen(false)}
          session={selectedSession}
          resultEntries={resultEntries}
          users={users}
          pointCategories={pointCategories}
          comments={selectedSessionComments}
          onCreateComment={onCreateComment}
          onDeleteComment={onDeleteComment}
          onRefreshComments={onRefreshComments}
          isScoreboardOwner={user?.id === scoreboard.createdBy}
        />
      )}
      {selectedSession && (
        <EditSession
          open={editSessionModalOpen}
          onClose={() => {
            setEditSessionModalOpen(false);
            setSelectedSession(null);
          }}
          session={selectedSession}
          scoreboard={scoreboard}
          users={users}
          pointCategories={pointCategories}
          resultEntries={resultEntries}
          onSuccess={handleSessionUpdated}
        />
      )}
      <DataTable
        title="Past Sessions"
        headers={['Name', 'Date', 'Created By']}
        data={data}
        onDelete={(row) => openDeleteSessionModal(row.session)}
        canDelete={(row) => canDelete(row.session)}
        onEdit={(row) => openEditSessionModal(row.session)}
        canEdit={(row) => canEdit(row.session)}
        editTooltip="Edit session"
        canCustom
        onCustom={(row) => goToSessionResults(row.session.id)}
        onCustomIcon={<Leaderboard />}
        customTooltip={'Watch results'}
        emptyText="No sessions"
        pageSize={10}
        onRowClick={(row) => openSessionDetailsModal(row.session)}
        isLoading={isLoading}
        refresh={onRefresh}
      />
    </>
  );
};
