import React, { useMemo } from 'react';
import { Stack } from '@mui/material';
import { DataTable } from '../common/table/DataTable.tsx';
import { useDateFormat } from '../../utils/useDateFormat';
import type { Session } from '../../types/Session';
import type { User } from '../../types/User';

type SessionsProps = {
  sessions: Session[];
  users: User[];
  onCreateSession: () => void;
  onSessionClick: (session: Session) => void;
};

export const Sessions: React.FC<SessionsProps> = ({
  sessions,
  onCreateSession,
  onSessionClick,
}) => {
  const { format_date } = useDateFormat();

  const data = useMemo(
    () =>
      sessions.map((session) => ({
        id: session.id,
        Date: format_date(session.created),
        session,
      })),
    [sessions]
  );

  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      <DataTable
        title="Latest Sessions"
        headers={['Date']}
        data={data}
        permissions={['Create']}
        onCreate={onCreateSession}
        emptyText="No sessions"
        pageSize={10}
        onRowClick={(row) => onSessionClick(row.session)}
      />
    </Stack>
  );
};
