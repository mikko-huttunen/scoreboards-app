import React, { useMemo } from 'react';
import { DataTable } from '../common/table/DataTable.tsx';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useNavigate } from 'react-router-dom';
import { isOwner } from '../../utils/Utils.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';

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
  const { user } = useCurrentUser();

  const handleRowClick = (scoreboardId: string) => {
    navigate(`/scoreboards/${scoreboardId}`);
  };

  const handleCreateNew = () => {
    navigate('/scoreboards/new');
  };

  const data = useMemo(
    () =>
      scoreboards.map((scoreboard) => {
        return {
          id: scoreboard.id,
          Name: scoreboard.name,
          scoreboard,
          canDelete: isOwner(scoreboard.memberships, user?.id),
          canLeave: !isOwner(scoreboard.memberships, user?.id),
        };
      }),
    [scoreboards]
  );

  return (
    <DataTable
      title={'Your Scoreboards'}
      headers={['Name']}
      data={data}
      pageSize={10}
      onRowClick={(row) => handleRowClick(row.id)}
      onCreate={handleCreateNew}
      canCreate
      onDelete={(row) => onDelete(row.scoreboard)}
      canDelete={(row) => row.canDelete}
      onCustom={(row) => onLeave(row.scoreboard)}
      canCustom={(row) => row.canLeave}
      onCustomIcon={<ExitToAppIcon />}
    />
  );
};
