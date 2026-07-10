import React, { useMemo, useState } from 'react';
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
import { PlayArrow } from '@mui/icons-material';
import { SessionForm } from './SessionForm.tsx';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';
import type { User } from '../../types/User.ts';
import type { PointCategory } from '../../types/PointCategory.ts';
import { SessionService } from '../../services/SessionService.ts';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import { SessionDetailsModal } from './SessionDetailsModal.tsx';
import type { ResultEntry } from '../../types/ResultEntry.ts';

type SessionsProps = {
  sessions: Session[];
  scoreboard: Scoreboard;
  users: User[];
  pointCategories: PointCategory[];
  resultEntries: ResultEntry[];
  onCreateSession: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading?: boolean;
};

export const Sessions: React.FC<SessionsProps> = ({
  sessions,
  scoreboard,
  users,
  pointCategories,
  resultEntries,
  onCreateSession,
  onDeleteSession,
  isLoading = false,
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
  const [createSessionModalOpen, setCreateSessionModalOpen] = useState(false);
  const [deleteSessionDialogOpen, setDeleteSessionDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const canDelete = (session: Session) => {
    if (isCreator) return true;
    if (hasPermissions && session.createdBy === user?.id) return true;

    return false;
  };

  const goToSessionResults = (sessionId: string) => {
    navigate(`/scoreboards/${scoreboard.id}/session/${sessionId}/results`);
  };

  const openSessionDetailsModal = (session: Session) => {
    setSelectedSession(session);
    setSessionDetailsModalOpen(true);
  };

  const openCreateSessionModal = () => {
    setCreateSessionModalOpen(true);
  };

  const handleSessionCreated = async (session: Session) => {
    onCreateSession(session);
    setCreateSessionModalOpen(false);
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

  const data = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        Name: session.name,
        Date: format_date(session.created),
        'Created By': session.createdByName,
        session,
      })),
    [sessions]
  );

  return (
    <>
      {scoreboard && (
        <SessionForm
          open={createSessionModalOpen}
          onClose={() => setCreateSessionModalOpen(false)}
          scoreboard={scoreboard}
          users={users}
          pointCategories={pointCategories}
          onSuccess={(session) => handleSessionCreated(session)}
        />
      )}
      <ConfirmDialog
        open={deleteSessionDialogOpen}
        onCancel={() => {
          if (!isProcessing) setDeleteSessionDialogOpen(false);
        }}
        title="Delete Session"
        text={`Are you sure you want to delete this session? This will
           permanently delete the session and all associated data. This action
           cannot be undone.`}
        confirmLabel="Delete Session"
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
        />
      )}
      <DataTable
        title="Latest Sessions"
        headers={['Name', 'Date', 'Created By']}
        data={data}
        onCreate={openCreateSessionModal}
        canCreate={hasPermissions}
        onDelete={(row) => openDeleteSessionModal(row.session)}
        canDelete={(row) => canDelete(row.session)}
        canCustom
        onCustom={(row) => goToSessionResults(row.session.id)}
        onCustomIcon={<PlayArrow />}
        customTooltip={'Play results'}
        emptyText="No sessions"
        pageSize={10}
        onRowClick={(row) => openSessionDetailsModal(row.session)}
        isLoading={isLoading}
      />
    </>
  );
};
