import React, { useMemo, useState } from 'react';
import type { Session } from '../../types/Session.ts';
import { DataTable } from '../common/table/DataTable.tsx';
import {
  hasSessionsPermission,
  isOwner,
  useDateFormat,
} from '../../utils/Utils.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import AddScores from './AddScores.tsx';
import type { PointCategory } from '../../types/PointCategory.ts';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';
import { SessionService } from '../../services/SessionService.ts';
import { useNavigate } from 'react-router-dom';
import type { ResultEntry } from '../../types/ResultEntry.ts';
import type { User } from '../../types/User.ts';
import { SessionForm } from './SessionForm.tsx';
import { TaskAlt } from '@mui/icons-material';

type PendingSessionsProps = {
  pendingSessions: Session[];
  scoreboard: Scoreboard;
  users: User[];
  pointCategories: PointCategory[];
  onCreateSession: (session: Session) => void;
  onCancelSession: (sessionId: string) => void;
  onScoreSubmit: (resultEntry: ResultEntry) => void;
  isLoading?: boolean;
  onRefresh?: () => Promise<void> | void;
};

export const PendingSessions: React.FC<PendingSessionsProps> = ({
  pendingSessions,
  scoreboard,
  users,
  pointCategories,
  onCreateSession,
  onCancelSession,
  onScoreSubmit,
  isLoading = false,
  onRefresh,
}) => {
  const { format_date } = useDateFormat();
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [addScoresModalOpen, setAddScoresModalOpen] = useState(false);
  const [createSessionModalOpen, setCreateSessionModalOpen] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();
  const [cancelSessionDialogOpen, setCancelSessionDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const isCreator = isOwner(scoreboard.memberships, user?.id);
  const hasPermissions = hasSessionsPermission(
    scoreboard.memberships,
    user?.id
  );

  const canDelete = (session: Session) => {
    if (isCreator) return true;
    if (session.createdBy === user?.id) return true;

    return false;
  };

  const openAddScoresModal = (session: Session) => {
    if (!Array.from(session.participants).includes(user!.id)) {
      showErrorMessage('You are not a participant in this session');
      return;
    }
    setSelectedSession(session);
    setAddScoresModalOpen(true);
  };

  const handleCloseAddScores = () => {
    setSelectedSession(null);
    setAddScoresModalOpen(false);
  };

  const openCreateSessionModal = () => {
    setCreateSessionModalOpen(true);
  };

  const handleSessionCreated = async (session: Session) => {
    onCreateSession(session);
    setCreateSessionModalOpen(false);
  };

  const openCancelSessionModal = (session: Session) => {
    setSelectedSession(session);
    setCancelSessionDialogOpen(true);
  };

  const handleCancelSession = async () => {
    if (!selectedSession) return;

    setIsProcessing(true);
    try {
      await SessionService.deleteSession(selectedSession.id);
      onCancelSession(selectedSession.id);
      showSuccessMessage('Session cancelled');
    } catch (err) {
      showErrorMessage('Failed to cancel session');
    } finally {
      setCancelSessionDialogOpen(false);
      setSelectedSession(null);
      setIsProcessing(false);
    }
  };

  const handleFinishSession = async (sessionId: string) => {
    setIsProcessing(true);

    try {
      const finishedSession = await SessionService.finishSession(sessionId);

      if (finishedSession) {
        showSuccessMessage('Session finished');
        navigate(
          `/scoreboards/${scoreboard.id}/session/${finishedSession.id}/results`
        );
      }
    } catch (err) {
      showErrorMessage(
        err instanceof Error ? err.message : 'Failed to finish session'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resolvePendingResultEntries = (session: Session) => {
    return `${Array.from(session.resultEntries).length}/${Array.from(session.participants).length}`;
  };

  const data = useMemo(
    () =>
      pendingSessions.map((session) => ({
        id: session.id,
        Name: session.name,
        Date: format_date(session.created),
        'Created By': session.createdByName,
        Results: resolvePendingResultEntries(session),
        session,
      })),
    [pendingSessions]
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
        open={cancelSessionDialogOpen}
        onCancel={() => {
          if (!isProcessing) setCancelSessionDialogOpen(false);
        }}
        title="Cancel Session"
        text={`Are you sure you want to cancel this session? This will
           permanently delete the session and all associated data. This action
           cannot be undone.`}
        confirmLabel="Cancel Session"
        loading={isProcessing}
        confirmDisabled={isProcessing}
        onConfirm={handleCancelSession}
      />
      {selectedSession && (
        <AddScores
          open={addScoresModalOpen}
          onClose={handleCloseAddScores}
          onScoreSubmit={(resultEntry) => onScoreSubmit(resultEntry)}
          session={selectedSession}
          pointCategories={pointCategories}
        />
      )}
      <DataTable
        title="Pending Sessions"
        headers={['Name', 'Date', 'Created By', 'Results']}
        showHighlight
        data={data}
        pageSize={10}
        onRowClick={(row) => openAddScoresModal(row.session)}
        onCreate={openCreateSessionModal}
        canCreate={hasPermissions}
        onDelete={(row) => openCancelSessionModal(row.session)}
        canDelete={(row) => canDelete(row.session)}
        onCustom={(row) => handleFinishSession(row.id)}
        canCustom={() => hasPermissions}
        onCustomIcon={<TaskAlt fontSize="small" />}
        customTooltip={'Finish'}
        isLoading={isLoading}
        refresh={onRefresh}
        emptyText={'No pending sessions'}
      />
    </>
  );
};
