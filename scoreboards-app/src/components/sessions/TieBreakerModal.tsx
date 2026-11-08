import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';

export type TieBreakerPlayer = {
  id: string;
  name: string;
  avatar?: string;
};

type TieBreakerModalProps = {
  open: boolean;
  players: TieBreakerPlayer[];
  points: number;
  onSelect: (userId: string) => Promise<void> | void;
  onSplit: () => Promise<void> | void;
  onClose: () => void;
};

const SPLIT_ACTION = 'split';

export const TieBreakerModal: React.FC<TieBreakerModalProps> = ({
  open,
  players,
  points,
  onSelect,
  onSplit,
  onClose,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const isHeadToHead = players.length === 2;
  const submitting = pendingAction !== null;

  // Avatars shrink as the tie grows, so a four or six way tie still fits without scrolling.
  // Phones get a stacked layout, so they shrink a step further to leave room for the names.
  const avatarSize = isHeadToHead
    ? { xs: 104, sm: 132, md: 168 }
    : players.length <= 4
      ? { xs: 80, sm: 104, md: 128 }
      : { xs: 64, sm: 84, md: 100 };

  const avatarFontSize = isHeadToHead
    ? { xs: '2.6rem', sm: '3.3rem', md: '4.2rem' }
    : players.length <= 4
      ? { xs: '2rem', sm: '2.6rem', md: '3.2rem' }
      : { xs: '1.6rem', sm: '2.1rem', md: '2.5rem' };

  // Head to head keeps the full width duel; bigger ties fall back to a wrapping grid.
  const playerWidth = isHeadToHead
    ? { xs: '100%', sm: 'auto' }
    : { xs: 'calc(50% - 8px)', sm: 180, md: 208 };

  const runAction = async (action: string, run: () => Promise<void> | void) => {
    if (submitting) return;

    setPendingAction(action);
    try {
      await run();
    } finally {
      setPendingAction(null);
    }
  };

  const handleSelect = (userId: string) =>
    runAction(userId, () => onSelect(userId));

  const handleSplit = () => runAction(SPLIT_ACTION, () => onSplit());

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 0.5, px: { xs: 2, sm: 3 } }}>
        <Typography
          variant="h5"
          sx={{
            color: '#1b5e20',
            fontWeight: 800,
            fontSize: { xs: '1.35rem', sm: '1.5rem' },
          }}
        >
          It&apos;s a tie!
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {`${players.length} players scored ${points} points.`}
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          py: { xs: 1, sm: 3 },
          px: { xs: 1.5, sm: 3 },
        }}
      >
        {/*
          Auto margins instead of justifyContent, so the players sit in the middle of a tall phone
          screen but stay fully scrollable when a large tie overflows the available height.
        */}
        <Box sx={{ width: '100%', my: 'auto' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: isHeadToHead ? { xs: 'column', sm: 'row' } : 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              columnGap: {
                xs: isHeadToHead ? 1.5 : 1,
                sm: isHeadToHead ? 4 : 2,
              },
              rowGap: { xs: 1, sm: 2.5 },
            }}
          >
            {players.map((player, index) => (
              <React.Fragment key={player.id}>
                {isHeadToHead && index > 0 && (
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontStyle: 'italic',
                      fontSize: { xs: '1.25rem', sm: '2.25rem' },
                      color: '#ffb300',
                      textShadow: '0 2px 10px rgba(255,179,0,0.35)',
                      userSelect: 'none',
                    }}
                  >
                    V.S
                  </Typography>
                )}

                <Box
                  component="button"
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSelect(player.id)}
                  aria-label={`Choose ${player.name} as the winner`}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: { xs: 0.75, sm: 1.5 },
                    p: { xs: 0.75, sm: 1.5 },
                    width: playerWidth,
                    maxWidth: '100%',
                    border: 'none',
                    borderRadius: 4,
                    background: 'transparent',
                    cursor: submitting ? 'default' : 'pointer',
                    opacity:
                      submitting && pendingAction !== player.id ? 0.4 : 1,
                    transition: 'transform 160ms ease, opacity 160ms ease',
                    ':hover': submitting
                      ? undefined
                      : {
                          transform: 'translateY(-4px) scale(1.03)',
                        },
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    <Avatar
                      src={player.avatar || undefined}
                      alt={player.name}
                      sx={{
                        width: avatarSize,
                        height: avatarSize,
                        fontSize: avatarFontSize,
                        bgcolor: '#38a14f',
                        border: '4px solid #fff',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                      }}
                    >
                      {player.name.charAt(0).toUpperCase() || '?'}
                    </Avatar>

                    {pendingAction === player.id && (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.7)',
                        }}
                      >
                        <LoadingSpinner size={32} />
                      </Box>
                    )}
                  </Box>

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: '#1b5e20',
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      fontSize: isHeadToHead
                        ? { xs: '1rem', sm: '1.25rem' }
                        : { xs: '0.875rem', sm: '1.05rem' },
                      maxWidth: '100%',
                    }}
                  >
                    {player.name}
                  </Typography>
                </Box>
              </React.Fragment>
            ))}
          </Box>

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              color: 'text.secondary',
              mt: { xs: 1.5, sm: 3 },
            }}
          >
            Pick a player to crown them the winner, or split the win between
            them.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'center',
          gap: 1,
          px: { xs: 2, sm: 3 },
          pb: { xs: 2.5, sm: 2 },
          pt: 0,
        }}
      >
        <Button
          variant="outlined"
          size="large"
          fullWidth={fullScreen}
          disabled={submitting}
          onClick={handleSplit}
          sx={{
            m: 0,
            px: 3,
            fontWeight: 800,
            textTransform: 'none',
            borderColor: 'rgba(56, 161, 79, 0.32)',
            color: '#2e7d32',
            backgroundColor: '#fff',
            '&.Mui-disabled': { opacity: 0.55 },
          }}
        >
          {pendingAction === SPLIT_ACTION ? 'Splitting…' : 'Split the win'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
