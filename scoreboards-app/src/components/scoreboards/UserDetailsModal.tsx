import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import type { User } from '../../types/User.ts';
import { useDateFormat } from '../../utils/Utils.ts';
import { useFullScreenDialog } from '../common/dialog/useFullScreenDialog.ts';

type UserDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  user: User | null;
  scoreboard: Scoreboard;
};

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  open,
  onClose,
  user,
  scoreboard,
}) => {
  const { format_date } = useDateFormat();
  const fullScreen = useFullScreenDialog();

  // The backend stamps a join date on the membership, but it is not part of the shared type yet.
  const membership = user
    ? (scoreboard?.memberships?.find((ms) => ms.userId === user.id) as
        | (Scoreboard['memberships'][number] & { created?: Date | string })
        | undefined)
    : undefined;

  const permissions = membership?.permissions ?? [];
  const isScoreboardCreator = !!user && user.id === scoreboard?.createdBy;

  const joined = (() => {
    const created = membership?.created;
    if (!created) return null;

    const date = typeof created === 'string' ? new Date(created) : created;
    return Number.isNaN(date?.getTime?.()) ? null : date;
  })();

  const initial =
    user?.name?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    '?';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle>
        User details
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Access & membership information
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2.5}
          sx={{ mt: 1 }}
        >
          <Stack alignItems="center" sx={{ width: { xs: '100%', sm: 170 } }}>
            <Avatar
              src={user?.avatar || undefined}
              alt={user?.name || user?.email || 'Unknown User'}
              sx={{
                width: { xs: 96, sm: 120 },
                height: { xs: 96, sm: 120 },
                fontSize: { xs: '2.4rem', sm: '3rem' },
                bgcolor: '#38a14f',
                border: '4px solid #fff',
                boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
              }}
            >
              {initial}
            </Avatar>

            {isScoreboardCreator && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mt: 1.5 }}
              >
                <StarIcon sx={{ color: '#ffa726', fontSize: 22 }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Scoreboard creator
                </Typography>
              </Stack>
            )}
          </Stack>

          <Stack spacing={1.5} sx={{ flex: 1 }}>
            <InfoRow
              label="Display name"
              value={user?.name || user?.email || 'Unknown User'}
            />
            <InfoRow label="User ID" value={user?.id ?? '-'} />
            <InfoRow
              label="Joined"
              value={joined ? format_date(joined, 'DATE') : '-'}
            />

            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                p: 2,
                mt: 0.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Scoreboard permissions
              </Typography>

              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                {permissions.length > 0 ? (
                  permissions.map((permission) => (
                    <Chip
                      key={permission}
                      label={permission}
                      size="small"
                      sx={{
                        backgroundColor: '#e8f5e9',
                        color: '#1b5e20',
                        fontWeight: 700,
                      }}
                    />
                  ))
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No permissions found
                  </Typography>
                )}
              </Stack>

              {!isScoreboardCreator && permissions.includes('OWNER') && (
                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary', mt: 1 }}
                >
                  Note: This membership includes OWNER permission, but the
                  scoreboard creator is different.
                </Typography>
              )}
            </Box>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
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
      sx={{ color: 'text.secondary', fontWeight: 700 }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ textAlign: 'right', fontWeight: 600, wordBreak: 'break-word' }}
    >
      {value}
    </Typography>
  </Stack>
);
