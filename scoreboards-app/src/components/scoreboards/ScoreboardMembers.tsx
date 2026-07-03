import React, { useMemo, useState } from 'react';
import { DataTable } from '../common/table/DataTable.tsx';
import type { User } from '../../types/User';
import { Avatar, Box, Stack } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import { isOwner } from '../../utils/Utils.ts';
import { InviteUserModal } from '../invitations/InviteUserModal.tsx';
import type { Invitation } from '../../types/Invitation.ts';
import { ScoreboardsService } from '../../services/ScoreboardService.ts';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import { ConfirmDialog } from '../common/dialog/ConfirmDialog.tsx';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';

type ScoreboardUsersProps = {
  scoreboard: Scoreboard;
  users: User[];
  onInvitationSent: (invitation: Invitation) => void;
  onRemoveUser: (userId: string) => void;
  disableActions?: boolean;
  isLoading?: boolean;
};

export const ScoreboardMembers: React.FC<ScoreboardUsersProps> = ({
  scoreboard,
  users,
  onInvitationSent,
  onRemoveUser,
  disableActions = false,
  isLoading = false,
}) => {
  const { user } = useCurrentUser();
  const [inviteUserModalOpen, setInviteUserModalOpen] = useState(false);
  const [removeUserDialogOpen, setRemoveUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();

  const canDelete = (rowUser: User) => {
    if (disableActions) return false;
    if (isOwner(scoreboard.memberships, rowUser.id)) return false;

    const userIsSelf = rowUser.id === user?.id;
    if (userIsSelf) return false;

    return true;
  };

  const openInviteUserModal = () => {
    setInviteUserModalOpen(true);
  };

  const closeInviteUserModal = (invitation: Invitation | null) => {
    if (invitation) {
      onInvitationSent(invitation);
    }
    setInviteUserModalOpen(false);
  };

  const openRemoveUserModal = (user: User) => {
    setSelectedUser(user);
    setRemoveUserDialogOpen(true);
  };

  const handleRemoveUserConfirm = async () => {
    if (!scoreboard || !selectedUser) return;

    setIsProcessing(true);
    try {
      await ScoreboardsService.removeUserFromScoreboard(
        scoreboard.id,
        selectedUser.id
      );
      onRemoveUser(selectedUser.id);
      showSuccessMessage('User removed');
    } catch (err) {
      showErrorMessage('Failed to remove user');
    } finally {
      setRemoveUserDialogOpen(false);
      setSelectedUser(null);
      setIsProcessing(false);
    }
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
        <LoadingSpinner />
      </Box>
    );
  }

  return (
    <>
      {scoreboard && (
        <InviteUserModal
          open={inviteUserModalOpen}
          onClose={(invitation: Invitation | null) =>
            closeInviteUserModal(invitation)
          }
          scoreboardId={scoreboard.id}
        />
      )}
      <ConfirmDialog
        open={removeUserDialogOpen}
        title="Confirm Remove User"
        text={`Are you sure you want to remove
            ${selectedUser?.name} from the
            scoreboard? They will lose access to this scoreboard and will need
            to be invited again to rejoin.`}
        confirmLabel="Remove User"
        loading={isProcessing}
        confirmDisabled={isProcessing}
        onCancel={() => setRemoveUserDialogOpen(false)}
        onConfirm={handleRemoveUserConfirm}
      />
      <DataTable
        title="Users"
        headers={['Name']}
        data={data}
        canDelete={(row) => canDelete(row.user)}
        onDelete={(row) => openRemoveUserModal(row.user)}
        canAdd={isOwner(scoreboard.memberships, user?.id)}
        onAdd={openInviteUserModal}
        emptyText="No users"
        pageSize={10}
        isLoading={isLoading}
      />
    </>
  );
};
