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

type SessionFormProps = {
  open: boolean;
  onClose: () => void;
  scoreboard: Scoreboard;
  users: User[];
  pointCategories?: PointCategory[];
  onSuccess?: (session: Session) => void;
};

const SESSION_NAME_MAX_LENGTH = 20;
const SESSION_COMMENT_MAX_LENGTH = 50;

export const SessionForm: React.FC<SessionFormProps> = ({
  open,
  onClose,
  scoreboard,
  users,
  pointCategories,
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
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();

  const [name, setName] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  useEffect(() => {
    if (open && scoreboard && user) {
      const loadPointCategories = async () => {
        try {
          setLoading(true);
          setError(null);
          // Select all categories by default
          setSelectedPointCategories(
            new Set(pointCategories?.map((pc) => pc.id) || [])
          );

          // Include all scoreboard users in participants by default
          setSelectedParticipants(new Set(users.map((u) => u.id)));

          // Default session name to current date/time (capped)
          const defaultName = `${scoreboard.name} session ${
            scoreboard.sessions.length + 1
          }`;
          setName(defaultName.slice(0, SESSION_NAME_MAX_LENGTH));

          // Comment initially empty (optional; capped)
          setComment('');
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
      setComment('');
      setError(null);
    }
  }, [open, scoreboard, user, users, pointCategories]);

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
    if (trimmedName.length > SESSION_NAME_MAX_LENGTH) {
      setError(`Name must be at most ${SESSION_NAME_MAX_LENGTH} characters`);
      return;
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length > SESSION_COMMENT_MAX_LENGTH) {
      setError(
        `Comment must be at most ${SESSION_COMMENT_MAX_LENGTH} characters`
      );
      return;
    }

    if (selectedPointCategories.size === 0) {
      setError('At least one point category must be selected');
      return;
    }

    // Require at least 2 participants (creator is not mandatory)
    if (selectedParticipants.size < 2) {
      setError('At least 2 participants are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const sessionData: CreateSessionData = {
        name: trimmedName,
        comment: trimmedComment, // optional; empty string is fine
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
        comment: createdSession.comment,
        scoreboardId: createdSession.scoreboardId,
        createdByName: createdSession.createdByName,
        isPending: createdSession.isPending ?? true,
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
      showErrorMessage('Failed to create session');
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
                    setName(e.target.value.slice(0, SESSION_NAME_MAX_LENGTH))
                  }
                  fullWidth
                  disabled={submitting}
                  required
                  inputProps={{ maxLength: SESSION_NAME_MAX_LENGTH }}
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
                    setSelectedParticipants(new Set(e.target.value as string[]))
                  }
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
                    return (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name || u.email || 'Unknown User'}
                      </MenuItem>
                    );
                  })}
                </Select>
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
                  label="Comment"
                  value={comment}
                  onChange={(e) =>
                    setComment(
                      e.target.value.slice(0, SESSION_COMMENT_MAX_LENGTH)
                    )
                  }
                  fullWidth
                  disabled={submitting}
                  multiline
                  minRows={2}
                  inputProps={{ maxLength: SESSION_COMMENT_MAX_LENGTH }}
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
            name.trim().length > SESSION_NAME_MAX_LENGTH ||
            comment.trim().length > SESSION_COMMENT_MAX_LENGTH
          }
          sx={{ backgroundColor: '#38a14f', color: '#ffffff' }}
        >
          {submitting ? <LoadingSpinner size={20} /> : 'Create Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
