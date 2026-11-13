import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Checkbox,
  FormControlLabel,
  Alert,
  Box,
  TextField,
} from '@mui/material';
import {
  SessionService,
  type CreateSessionData,
} from '../../services/SessionService.ts';
import type { User } from '../../types/User.ts';
import type { PointCategory } from '../../types/PointCategory.ts';
import type { Session } from '../../types/Session.ts';
import { Session as SessionType } from '../../types/Session.ts';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';
import {
  MAX_SESSION_DESCRIPTION_LENGTH,
  MAX_SESSION_NAME_LENGTH,
  MAX_SESSION_PARTICIPANTS,
  MIN_SESSION_PARTICIPANTS,
} from '../../constants.ts';
import { useFullScreenDialog } from '../common/dialog/useFullScreenDialog.ts';

// Keeps the participant dropdown to roughly six rows instead of growing with the member count.
// Phones get a share of the viewport so the list never runs past the bottom of the screen.
const PARTICIPANT_MENU_PROPS = {
  PaperProps: {
    sx: {
      maxHeight: { xs: '45vh', sm: 320 },
      overflowY: 'auto',
    },
  },
};

type SessionFormProps = {
  open: boolean;
  onClose: () => void;
  scoreboard: Scoreboard;
  users: User[];
  pointCategories?: PointCategory[];
  sessionCount?: number;
  onSuccess?: (session: Session) => void;
};

export const SessionForm: React.FC<SessionFormProps> = ({
  open,
  onClose,
  scoreboard,
  users,
  pointCategories,
  sessionCount,
  onSuccess,
}) => {
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    new Set()
  );
  const [selectedPointCategories, setSelectedPointCategories] = useState<
    Set<string>
  >(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const fullScreen = useFullScreenDialog();
  const { showSuccessMessage } = useMessageSnackbar();

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (open && scoreboard && user) {
      const loadPointCategories = async () => {
        try {
          setLoading(true);
          setError(null);

          setSelectedPointCategories(
            new Set(pointCategories?.map((pc) => pc.id) || [])
          );

          setSelectedParticipants(new Set());

          const defaultName = `Session ${(sessionCount ?? scoreboard.sessions.length) + 1}`;
          setName(defaultName.slice(0, MAX_SESSION_NAME_LENGTH));

          setDescription('');
        } catch (err) {
          console.error('Error loading point categories:', err);
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load point categories'
          );
        } finally {
          setLoading(false);
        }
      };
      loadPointCategories();
    } else {
      // Reset form when closed
      setSelectedParticipants(new Set());
      setSelectedPointCategories(new Set());
      setName('');
      setDescription('');
      setError(null);
    }
  }, [open, scoreboard, user, users, pointCategories]);

  const participantsAtCap =
    selectedParticipants.size >= MAX_SESSION_PARTICIPANTS;

  const handleParticipantsChange = (selectedUserIds: string[]) => {
    // The menu items are disabled at the cap, so this only catches the odd keyboard selection.
    if (selectedUserIds.length > MAX_SESSION_PARTICIPANTS) {
      setError(
        `A session can have at most ${MAX_SESSION_PARTICIPANTS} participants`
      );
      return;
    }

    setSelectedParticipants(new Set(selectedUserIds));
  };

  const handlePointCategoryToggle = (categoryId: string) => {
    setSelectedPointCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name cannot be empty');
      return;
    }
    if (trimmedName.length > MAX_SESSION_NAME_LENGTH) {
      setError(`Name must be at most ${MAX_SESSION_NAME_LENGTH} characters`);
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > MAX_SESSION_DESCRIPTION_LENGTH) {
      setError(
        `Description must be at most ${MAX_SESSION_DESCRIPTION_LENGTH} characters`
      );
      return;
    }

    if (selectedPointCategories.size === 0) {
      setError('At least one point category must be selected');
      return;
    }

    // Require at least 2 participants (creator is not mandatory)
    if (selectedParticipants.size < MIN_SESSION_PARTICIPANTS) {
      setError(
        `At least ${MIN_SESSION_PARTICIPANTS} participants are required`
      );
      return;
    }

    if (selectedParticipants.size > MAX_SESSION_PARTICIPANTS) {
      setError(
        `A session can have at most ${MAX_SESSION_PARTICIPANTS} participants`
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const sessionData: CreateSessionData = {
        name: trimmedName,
        description: trimmedDescription,
        scoreboardId: scoreboard.id,
        participants: Array.from(selectedParticipants),
        pointCategories: Array.from(selectedPointCategories),
      };

      const createdSession = await SessionService.createSession(sessionData);

      const allParticipantIds: Set<string> = createdSession.participants
        ? createdSession.participants
        : new Set<string>();
      const pointCategoryIds: Set<string> = createdSession.pointCategories
        ? createdSession.pointCategories
        : new Set<string>();
      const session: Session = SessionType.create({
        id: createdSession.id,
        type: createdSession.type,
        name: createdSession.name,
        description: createdSession.description,
        scoreboardId: createdSession.scoreboardId,
        createdByName: createdSession.createdByName,
        isPending: createdSession.isPending ?? true,
        finishedAt: createdSession.finishedAt ?? null,
        editedAt: createdSession.editedAt ?? null,
        participants: allParticipantIds,
        pointCategories: pointCategoryIds,
        resultEntries: new Set<string>(),
        created: new Date(createdSession.created),
        lastModified: new Date(createdSession.lastModified),
        createdBy: createdSession.createdBy,
        isActive: createdSession.isActive,
      });

      if (onSuccess) {
        showSuccessMessage('Session created');
        onSuccess(session);
      }
      onClose();
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle>Create New Session</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <LoadingSpinner />
            </Box>
          ) : (
            <>
              <Stack spacing={2}>
                <TextField
                  label="Name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.slice(0, MAX_SESSION_NAME_LENGTH))
                  }
                  fullWidth
                  disabled={submitting}
                  required
                  inputProps={{ maxLength: MAX_SESSION_NAME_LENGTH }}
                />
              </Stack>

              <FormControl fullWidth>
                <InputLabel id="participants-label">Participants</InputLabel>
                <Select
                  labelId="participants-label"
                  label="Participants"
                  multiple
                  value={Array.from(selectedParticipants)}
                  onChange={(e) =>
                    handleParticipantsChange(e.target.value as string[])
                  }
                  MenuProps={PARTICIPANT_MENU_PROPS}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {Array.from(selected).map((userId) => {
                        const user = users.find((u) => u.id === userId);
                        return (
                          <Chip
                            key={userId}
                            label={user?.name || user?.email || userId}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                  disabled={submitting}
                >
                  {users.map((u) => {
                    // Creator does NOT need to be included; allow toggling freely.
                    // Once the cap is reached only the already picked members stay selectable.
                    return (
                      <MenuItem
                        key={u.id}
                        value={u.id}
                        disabled={
                          participantsAtCap && !selectedParticipants.has(u.id)
                        }
                      >
                        {u.name || u.email || 'Unknown User'}
                      </MenuItem>
                    );
                  })}
                </Select>
                <FormHelperText>
                  {participantsAtCap
                    ? `${selectedParticipants.size}/${MAX_SESSION_PARTICIPANTS} participants selected. Remove one to pick someone else.`
                    : `${selectedParticipants.size}/${MAX_SESSION_PARTICIPANTS} participants selected (at least ${MIN_SESSION_PARTICIPANTS} required).`}
                </FormHelperText>
              </FormControl>

              <Stack spacing={2}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Point Categories
                </Typography>
                <Stack spacing={1}>
                  {pointCategories?.map((category) => (
                    <FormControlLabel
                      key={category.id}
                      control={
                        <Checkbox
                          checked={selectedPointCategories.has(category.id)}
                          onChange={() =>
                            handlePointCategoryToggle(category.id)
                          }
                          disabled={submitting}
                        />
                      }
                      label={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              backgroundColor: category.color,
                              borderRadius: 1,
                            }}
                          />
                          <span>{category.name}</span>
                        </Stack>
                      }
                    />
                  ))}
                  {pointCategories?.length === 0 && (
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      No point categories available
                    </Typography>
                  )}
                </Stack>
                <TextField
                  label="Description"
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value.slice(0, MAX_SESSION_DESCRIPTION_LENGTH)
                    )
                  }
                  fullWidth
                  disabled={submitting}
                  multiline
                  minRows={2}
                  inputProps={{ maxLength: MAX_SESSION_DESCRIPTION_LENGTH }}
                />
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            submitting ||
            loading ||
            selectedPointCategories.size === 0 ||
            selectedParticipants.size < 2 ||
            name.trim().length === 0 ||
            name.trim().length > MAX_SESSION_NAME_LENGTH ||
            description.trim().length > MAX_SESSION_DESCRIPTION_LENGTH
          }
          sx={{ backgroundColor: '#38a14f', color: '#ffffff' }}
        >
          {submitting ? <LoadingSpinner size={20} /> : 'Create Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
