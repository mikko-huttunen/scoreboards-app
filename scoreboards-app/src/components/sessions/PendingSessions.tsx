import React, { useMemo } from 'react';
import DoneIcon from '@mui/icons-material/Done';
import type { Session } from '../../types/Session.ts';
import { DataTable } from '../common/table/DataTable.tsx';
import { hasSessionsPermission, useDateFormat } from '../../utils/Utils.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import type { Scoreboard } from '../../types/Scoreboard.ts';

type PendingSessionsProps = {
  pendingSessions: Session[];
  scoreboard: Scoreboard;
  onAddScores: (sessionId: string) => void;
  onCancelSession: (session: string) => void;
  onFinishSession: (sessionId: string) => void;
};

export const PendingSessions: React.FC<PendingSessionsProps> = ({
  pendingSessions,
  scoreboard,
  onAddScores,
  onCancelSession,
  onFinishSession,
}) => {
  const { format_date } = useDateFormat();
  const { user } = useCurrentUser();

  const data = useMemo(
    () =>
      pendingSessions.map((session) => ({
        id: session.id,
        Date: format_date(session.created),
        'Created By': session.createdByName,
        hasPermissions: hasSessionsPermission(scoreboard.members, user?.id),
        session,
      })),
    [pendingSessions]
  );

  return (
    <DataTable
      title="Pending Sessions"
      headers={['Date', 'Created By']}
      showBadge
      data={data}
      pageSize={10}
      onEdit={(row) => onAddScores(row.id)}
      canEdit
      onDelete={(row) => onCancelSession(row.id)}
      canDelete={(row) => row.hasPermissions}
      onCustom={(row) => onFinishSession(row.id)}
      canCustom={(row) => row.hasPermissions}
      onCustomIcon={<DoneIcon fontSize="small" />}
    />
  );
};
