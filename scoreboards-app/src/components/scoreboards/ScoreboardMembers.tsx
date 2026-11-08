import React, { useMemo, useState } from 'react';
import { DataTable } from '../common/table/DataTable.tsx';
import type { User } from '../../types/User';
import { Avatar, Box, Chip, Dialog, Stack, Typography } from '@mui/material';
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
  onRefresh?: () => Promise<void> | void;
};

export const ScoreboardMembers: React.FC<ScoreboardUsersProps> = ({
  scoreboard,
  users,
  onInvitationSent,
  onRemoveUser,
  disableActions = false,
  isLoading = false,
  onRefresh,
}) => {
  const { user } = useCurrentUser();
  const [inviteUserModalOpen, setInviteUserModalOpen] = useState(false);
  const [removeUserDialogOpen, setRemoveUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedMemberOpen, setSelectedMemberOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();
  const isCreator = isOwner(scoreboard.memberships, user?.id);

  const canDelete = (rowUser: User) => {
    if (!isCreator) return false;
    //User is self
    return rowUser.id !== user?.id;
  };

  const canAdd = () => {
    return !disableActions || users.length < 20;
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

  const getMembershipForUser = (userId: string) => {
    const ms = scoreboard?.memberships?.find((m) => m.userId === userId);
    return ms as (typeof ms & { created?: Date | string }) | undefined;
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

  const selectedMembership = selectedUser
    ? getMembershipForUser(selectedUser.id)
    : undefined;

  const joinedValue = (() => {
    const created = (selectedMembership as any)?.created;
    if (!created) return null;
    const d = typeof created === 'string' ? new Date(created) : created;
    return Number.isNaN(d?.getTime?.()) ? null : d;
  })();

  const permissionsForSelected = selectedMembership?.permissions ?? [];
  const selectedIsScoreboardCreator = selectedUser
    ? selectedUser.id === scoreboard?.createdBy
    : false;

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
        confirmLabel="Remove"
        loading={isProcessing}
        confirmDisabled={isProcessing}
        onCancel={() => setRemoveUserDialogOpen(false)}
        onConfirm={handleRemoveUserConfirm}
      />
      <Dialog
        open={selectedMemberOpen}
        onClose={() => setSelectedMemberOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: { xs: 0, sm: 3 },
            m: { xs: 0, sm: 2 },
            background: 'rgba(255,255,255,0.98)',
          },
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{ color: '#1b5e20', fontWeight: 800, letterSpacing: 0.2 }}
              >
                User details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Access & membership information
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2.5}
            sx={{ mt: 2.5 }}
          >
            <Stack
              alignItems="center"
              sx={{
                width: { xs: '100%', sm: 170 },
              }}
            >
              <Avatar
                src={selectedUser?.avatar ?? undefined}
                sx={{
                  width: { xs: 96, sm: 120 },
                  height: { xs: 96, sm: 120 },
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  border: '4px solid',
                  borderColor: '#e8f5e9',
                }}
              >
                {selectedUser?.name && selectedUser.name.length > 0
                  ? selectedUser.name.charAt(0).toUpperCase()
                  : selectedUser?.email && selectedUser.email.length > 0
                    ? selectedUser.email.charAt(0).toUpperCase()
                    : '?'}
              </Avatar>

              {selectedIsScoreboardCreator && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mt: 1.5 }}
                >
                  <StarIcon sx={{ color: '#ffa726', fontSize: 22 }} />
                  <Typography sx={{ fontWeight: 800, color: '#b26a00' }}>
                    Scoreboard creator
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Stack spacing={1.5} sx={{ flex: 1 }}>
              <InfoRow label="User ID" value={selectedUser?.id ?? '-'} />
              <InfoRow
                label="Joined"
                value={joinedValue ? joinedValue.toLocaleDateString() : '-'}
              />
              <InfoRow
                label="Display name"
                value={
                  selectedUser?.name || selectedUser?.email || 'Unknown User'
                }
              />

              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: '#fafafa',
                  mt: 0.5,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 800, color: '#1b5e20' }}
                >
                  Scoreboard permissions
                </Typography>

                <Stack
                  direction="row"
                  flexWrap="wrap"
                  spacing={1}
                  sx={{ mt: 1 }}
                >
                  {permissionsForSelected.length > 0 ? (
                    permissionsForSelected.map((perm) => (
                      <Chip
                        key={perm}
                        label={perm}
                        sx={{
                          backgroundColor: '#e8f5e9',
                          color: '#1b5e20',
                          border: '1px solid',
                          borderColor: 'divider',
                          fontWeight: 700,
                        }}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No permissions found
                    </Typography>
                  )}
                </Stack>

                {!selectedIsScoreboardCreator &&
                  permissionsForSelected.includes('OWNER') && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      Note: This membership includes OWNER permission, but the
                      scoreboard creator is different.
                    </Typography>
                  )}
              </Box>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 } }}>
          <Stack direction="row" justifyContent="flex-end">
            <Box
              component="button"
              type="button"
              onClick={() => setSelectedMemberOpen(false)}
              aria-label="Close user details"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                background: '#fff',
                borderRadius: 2,
                px: 1.25,
                py: 0.75,
                cursor: 'pointer',
                fontWeight: 700,
                color: '#1b5e20',
              }}
            >
              Close
            </Box>
          </Stack>
        </Box>
      </Dialog>
      <DataTable
        title="Users"
        headers={['Name']}
        data={data}
        onRowClick={(row) => {
          setSelectedUser(row.user);
          setSelectedMemberOpen(true);
        }}
        canDelete={(row) => canDelete(row.user)}
        disableDelete={disableActions}
        deleteTooltip={
          disableActions
            ? 'Cannot remove user while there are pending sessions'
            : ''
        }
        onDelete={(row) => openRemoveUserModal(row.user)}
        canAdd={isOwner(scoreboard.memberships, user?.id) && canAdd}
        disableAdd={!canAdd}
        addTooltip={!canAdd ? 'Maximum number of users reached' : ''}
        onAdd={openInviteUserModal}
        emptyText="No users"
        pageSize={10}
        isLoading={isLoading}
        refresh={onRefresh}
      />
    </>
  );
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="flex-start"
    spacing={2}
  >
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontWeight: 800 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 700 }}>
      {value}
    </Typography>
  </Stack>
);
