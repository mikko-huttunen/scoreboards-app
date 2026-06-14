import React, { useMemo } from 'react';
import { DataTable } from '../common/table/DataTable.tsx';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useNavigate } from 'react-router-dom';

type ScoreboardsListProps = {
  scoreboards: Scoreboard[];
  onDelete: (scoreboard: Scoreboard) => void;
  onLeave: (scoreboard: Scoreboard) => void;
};

export const ScoreboardsList: React.FC<ScoreboardsListProps> = ({
  scoreboards,
  onDelete,
  onLeave,
}) => {
  const navigate = useNavigate();

  const handleRowClick = (scoreboardId: string) => {
    navigate(`/scoreboards/${scoreboardId}`);
  };

  const handleCreateNew = () => {
    navigate('/scoreboards/new');
  };

  const data = useMemo(
    () =>
      scoreboards.map((scoreboard) => ({
        id: scoreboard.id,
        Name: scoreboard.name,
        scoreboard,
      })),
    [scoreboards]
  );

  return (
    <DataTable
      title={'Your Scoreboards'}
      headers={['Name']}
      data={data}
      permissions={['Create', 'Delete']}
      pageSize={10}
      onRowClick={(row) => handleRowClick(row.id)}
      onCreate={handleCreateNew}
      onDelete={(row) => onDelete(row.scoreboard)}
      onCustom={(row) => onLeave(row.scoreboard)}
      onCustomIcon={<ExitToAppIcon />}
    />
  );
};
