import React, { useMemo } from 'react';
import { DataTable } from '../common/table/DataTable.tsx';
import type { User } from '../../types/User';
import { Avatar, Stack } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import { hasMembersPermission, isOwner } from '../../utils/Utils.ts';

type ScoreboardUsersProps = {
  scoreboard: Scoreboard;
  users: User[];
  handleOpenInviteModal: () => void;
  handleRemoveUserClick: (user: User) => void;
};

export const ScoreboardMembers: React.FC<ScoreboardUsersProps> = ({
  scoreboard,
  users,
  handleOpenInviteModal,
  handleRemoveUserClick,
}) => {
  const { user } = useCurrentUser();
  const currentUserHasPermissions = hasMembersPermission(
    scoreboard.members,
    user?.id
  );

  const canDelete = (rowUser: User) => {
    if (isOwner(scoreboard.members, rowUser.id)) return false;

    const userIsSelf = rowUser.id === user?.id;
    if (userIsSelf) return false;

    if (currentUserHasPermissions) return true;

    return false;
  };

  const renderUsername = (user: User) => {
    const isCreator = user.id === scoreboard?.createdBy;

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar src={user?.avatar ?? undefined} sx={{ width: 28, height: 28 }}>
          {user.name && user.name.length > 0
            ? user.name.charAt(0).toUpperCase()
            : user.email && user.email.length > 0
              ? user.email.charAt(0).toUpperCase()
              : '?'}
        </Avatar>
        <span>{user.name || user.email || 'Unknown User'}</span>
        {isCreator && <StarIcon sx={{ color: '#ffa726', fontSize: 20 }} />}
      </Stack>
    );
  };

  const data = useMemo(
    () =>
      users.map((user) => ({
        id: user.id,
        Name: renderUsername(user),
        user,
      })),
    [users]
  );

  return (
    <DataTable
      title="Users"
      headers={['Name']}
      data={data}
      canDelete={(row) => canDelete(row.user)}
      onDelete={(row) => handleRemoveUserClick(row.user)}
      canAdd={currentUserHasPermissions}
      onAdd={handleOpenInviteModal}
      emptyText="No users"
      pageSize={10}
    />
  );
};
