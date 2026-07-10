import React, { useMemo, useState } from 'react';
import DoneIcon from '@mui/icons-material/Done';
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

type PendingSessionsProps = {
  pendingSessions: Session[];
  scoreboard: Scoreboard;
  pointCategories: PointCategory[];
  onCancelSession: (sessionId: string) => void;
  onScoreSubmit: (resultEntry: ResultEntry) => void;
  isLoading?: boolean;
};

export const PendingSessions: React.FC<PendingSessionsProps> = ({
  pendingSessions,
  scoreboard,
  pointCategories,
  onCancelSession,
  onScoreSubmit,
  isLoading = false,
}) => {
  const { format_date } = useDateFormat();
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [addScoresModalOpen, setAddScoresModalOpen] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();
  const [cancelSessionDialogOpen, setCancelSessionDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const isCreator = isOwner(scoreboard.memberships, user?.id);

  const canDelete = (session: Session) => {
    if (isCreator) return true;
    if (session.createdBy === user?.id) return true;

    return false;
  };

  const openAddScoresModal = (session: Session) => {
    setSelectedSession(session);
    setAddScoresModalOpen(true);
  };

  const handleCloseAddScores = () => {
    setSelectedSession(null);
    setAddScoresModalOpen(false);
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
        hasPermissions: hasSessionsPermission(scoreboard.memberships, user?.id),
        session,
      })),
    [pendingSessions]
  );

  return (
    <>
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
        onDelete={(row) => openCancelSessionModal(row.session)}
        canDelete={(row) => canDelete(row.session)}
        onCustom={(row) => handleFinishSession(row.id)}
        canCustom={(row) => row.session.createdBy === user?.id}
        onCustomIcon={<DoneIcon fontSize="small" />}
        customTooltip={'Finish'}
        isLoading={isLoading}
      />
    </>
  );
};
