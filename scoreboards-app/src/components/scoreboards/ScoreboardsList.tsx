import React, { useMemo } from 'react';
import { DataTable } from '../common/table/DataTable.tsx';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useNavigate } from 'react-router-dom';
import { isOwner } from '../../utils/Utils.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import StarIcon from '@mui/icons-material/Star';
import { Stack } from '@mui/material';

type ScoreboardsListProps = {
  scoreboards: Scoreboard[];
  onDelete: (scoreboard: Scoreboard) => void;
  onLeave: (scoreboard: Scoreboard) => void;
  isLoading: boolean;
  onRefresh?: () => Promise<void> | void;
};

export const ScoreboardsList: React.FC<ScoreboardsListProps> = ({
  scoreboards,
  onDelete,
  onLeave,
  isLoading,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const handleRowClick = (scoreboardId: string) => {
    navigate(`/scoreboards/${scoreboardId}`);
  };

  const handleCreateNew = () => {
    navigate('/scoreboards/new');
  };

  const canDelete = (scoreboard: Scoreboard) => {
    return isOwner(scoreboard.memberships, user?.id);
  };

  const disableDelete = (scoreboard: Scoreboard) => {
    const hasPendingSessions = scoreboard.sessions.some((s) => s.isPending);
    return hasPendingSessions || false;
  };

  const canLeave = (scoreboard: Scoreboard) => {
    const isCreator = isOwner(scoreboard.memberships, user?.id);
    const hasPendingSessions = scoreboard.sessions.find((s) => s.isPending);

    return !isCreator && !hasPendingSessions;
  };

  const renderScoreboardName = (scoreboard: Scoreboard) => {
    if (!user) return;
    const isCreator = isOwner(scoreboard.memberships, user.id);

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <span>{scoreboard.name}</span>
        {isCreator && <StarIcon sx={{ color: '#ffa726', fontSize: 20 }} />}
      </Stack>
    );
  };

  const data = useMemo(
    () =>
      scoreboards.map((scoreboard) => {
        return {
          id: scoreboard.id,
          Name: renderScoreboardName(scoreboard),
          scoreboard,
        };
      }),
    [scoreboards]
  );

  return (
    <DataTable
      title={'Scoreboards'}
      headers={['Name']}
      data={data}
      pageSize={10}
      onRowClick={(row) => handleRowClick(row.id)}
      onCreate={handleCreateNew}
      canCreate
      onDelete={(row) => onDelete(row.scoreboard)}
      disableDelete={(row) => disableDelete(row.scoreboard)}
      canDelete={(row) => canDelete(row.scoreboard)}
      onCustom={(row) => onLeave(row.scoreboard)}
      canCustom={(row) => canLeave(row.scoreboard)}
      onCustomIcon={<ExitToAppIcon />}
      customTooltip={'Leave'}
      isLoading={isLoading}
      refresh={onRefresh}
      emptyText="No scoreboards"
    />
  );
};
