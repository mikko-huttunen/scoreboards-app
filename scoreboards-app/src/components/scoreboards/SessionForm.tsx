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
  CircularProgress,
  Box,
} from '@mui/material';
import {
  SessionService,
  type CreateSessionData,
} from '../../services/SessionService';
import type { User } from '../../types/User';
import type { PointCategory } from '../../types/PointCategory';
import type { Session } from '../../types/Session';
import { Session as SessionType } from '../../types/Session';
import type { Scoreboard } from '../../types/Scoreboard';

type SessionFormProps = {
  open: boolean;
  onClose: () => void;
  scoreboard: Scoreboard;
  currentUser: User;
  users: User[];
  pointCategories?: PointCategory[];
  onSuccess?: (session: Session) => void;
};

export const SessionForm: React.FC<SessionFormProps> = ({
  open,
  onClose,
  scoreboard,
  currentUser,
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

  useEffect(() => {
    if (open && scoreboard && currentUser) {
      const loadPointCategories = async () => {
        try {
          setLoading(true);
          setError(null);
          // Select all categories by default
          setSelectedPointCategories(
            new Set(pointCategories?.map((pc) => pc.id) || [])
          );
          // Add all users to participants by default
          setSelectedParticipants(new Set(users.map((u) => u.id)));
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
      setError(null);
    }
  }, [open, scoreboard, currentUser, users, pointCategories]);

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
    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

    if (selectedPointCategories.size === 0) {
      setError('At least one point category must be selected');
      return;
    }

    // Require at least 2 participants
    if (selectedParticipants.size < 2) {
      setError('At least 2 participants are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const sessionData: CreateSessionData = {
        scoreboardId: scoreboard.id,
        scoreboardName: scoreboard.name,
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
        scoreboardId: createdSession.scoreboardId,
        scoreboardName: createdSession.scoreboardName,
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Session</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
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
                  {users.map((user) => {
                    const isCreator = user.id === currentUser.id;
                    const isSelected = selectedParticipants.has(user.id);
                    return (
                      <MenuItem
                        key={user.id}
                        value={user.id}
                        disabled={isCreator && isSelected} // Disable if creator is already selected
                      >
                        {user.name || user.email || 'Unknown User'}
                        {isCreator && ' (You)'}
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
            selectedParticipants.size < 2
          }
          sx={{ backgroundColor: '#38a14f', color: '#ffffff' }}
        >
          {submitting ? <CircularProgress size={20} /> : 'Create Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
