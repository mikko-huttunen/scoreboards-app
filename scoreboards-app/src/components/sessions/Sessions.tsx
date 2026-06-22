import React, { useMemo } from 'react';
import { Stack } from '@mui/material';
import { DataTable } from '../common/table/DataTable.tsx';
import { hasSessionsPermission, useDateFormat } from '../../utils/Utils.ts';
import type { Session } from '../../types/Session.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import { useNavigate } from 'react-router-dom';
import { PlayArrow } from '@mui/icons-material';

type SessionsProps = {
  sessions: Session[];
  scoreboard: Scoreboard;
  onCreateSession: () => void;
  onSessionClick: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
};

export const Sessions: React.FC<SessionsProps> = ({
  sessions,
  scoreboard,
  onCreateSession,
  onSessionClick,
  onDeleteSession,
}) => {
  const navigate = useNavigate();
  const { format_date } = useDateFormat();
  const { user } = useCurrentUser();
  const hasPermissions = hasSessionsPermission(scoreboard.members, user?.id);

  const goToSessionResults = (sessionId: string) => {
    navigate(`/scoreboards/${scoreboard.id}/session/${sessionId}/results`);
  };

  const data = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        Date: format_date(session.created),
        'Last Modified': format_date(session.lastModified),
        'Created By': session.createdByName,
        session,
      })),
    [sessions]
  );

  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      <DataTable
        title="Latest Sessions"
        headers={['Date', 'Last Modified', 'Created By']}
        data={data}
        onCreate={onCreateSession}
        canCreate={hasPermissions}
        onDelete={(row) => onDeleteSession(row.session.id)}
        canDelete={hasPermissions}
        canCustom
        onCustom={(row) => goToSessionResults(row.session.id)}
        onCustomIcon={<PlayArrow />}
        emptyText="No sessions"
        pageSize={10}
        onRowClick={(row) => onSessionClick(row.session)}
      />
    </Stack>
  );
};
