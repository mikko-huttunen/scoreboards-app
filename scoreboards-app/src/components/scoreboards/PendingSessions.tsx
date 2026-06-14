// src/components/scoreboards/PendingSessions.tsx
import React, { useMemo } from 'react';
import { Badge, Stack, Typography } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import type { Session } from '../../types/Session';
import { DataTable } from '../common/table/DataTable.tsx';
import { useDateFormat } from '../../utils/useDateFormat';

type PendingSessionsProps = {
  pendingSessions: Session[];
  onAddScores: (sessionId: string) => void;
  onCancelSession: (session: string) => void;
  onFinishSession: (sessionId: string) => void;
};

export const PendingSessions: React.FC<PendingSessionsProps> = ({
  pendingSessions,
  onAddScores,
  onCancelSession,
  onFinishSession,
}) => {
  const { format_date } = useDateFormat();

  const data = useMemo(
    () =>
      pendingSessions.map((session) => ({
        id: session.id,
        Date: format_date(session.created),
        'Created By': session.createdByName,
        session,
      })),
    [pendingSessions]
  );

  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h6" sx={{ color: '#1b5e20' }}>
          Pending Sessions
        </Typography>
        {pendingSessions.length > 0 && (
          <Badge
            badgeContent={pendingSessions.length}
            color="success"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#38a14f',
                color: '#fff',
              },
            }}
          />
        )}
      </Stack>
      <DataTable
        title="Pending Sessions"
        headers={['Date', 'Created By']}
        showBadge
        data={data}
        permissions={['Delete', 'Edit', 'Author']}
        emptyText="No pending sessions"
        pageSize={10}
        onEdit={(row) => onAddScores(row.id)}
        onDelete={(row) => onCancelSession(row.id)}
        onCustom={(row) => onFinishSession(row.id)}
        onCustomIcon={<DoneIcon fontSize="small" />}
        onCustomPermissions={['Author']}
      />
    </Stack>
  );
};
