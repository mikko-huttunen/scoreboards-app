import React from 'react';
import { DataTable } from '../common/table/DataTable.tsx';
import { useAuth0 } from '@auth0/auth0-react';
import type { User } from '../../types/User';
import { Avatar, Stack } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import type { Scoreboard } from '../../types/Scoreboard.ts';

type ScoreboardUsersProps = {
  scoreboard: Scoreboard;
  currentUser: User | null;
  users: User[];
  handleOpenInviteModal: () => void;
  handleRemoveUserClick: (user: User) => void;
};

export const ScoreboardUsers: React.FC<ScoreboardUsersProps> = ({
  scoreboard,
  currentUser,
  users,
  handleOpenInviteModal,
  handleRemoveUserClick,
}) => {
  const isUserTheCreator = (row: User) => {
    if (!currentUser) return false;
    return row.id === currentUser.id;
  };

  const renderUsername = (user: User) => {
    const { user: auth0User } = useAuth0();
    const isCreator = user.id === scoreboard?.createdBy;

    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar
          src={auth0User?.picture ?? undefined}
          sx={{ width: 28, height: 28 }}
        >
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
  return (
    <DataTable
      title="Users"
      headers={['Name', 'Email']}
      data={users.map((user) => ({
        id: user.id,
        Name: renderUsername(user),
        Email: user.email,
        user,
      }))}
      permissions={['Delete', 'Add']}
      disableDelete={(row) => isUserTheCreator(row.user)}
      onAdd={handleOpenInviteModal}
      emptyText="No users"
      pageSize={10}
      onDelete={(row) => handleRemoveUserClick(row.user)}
    />
  );
};
