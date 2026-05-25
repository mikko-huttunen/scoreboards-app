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
  TextField,
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { SessionService } from '../../services/SessionService';
import { PointCategoryService } from '../../services/PointCategoryService';
import type { User } from '../../types/User';
import type { PointCategory } from '../../types/PointCategory';
import type { Session } from '../../types/Session';
import type { ResultEntry } from '../../types/ResultEntry';
import { Session as SessionType } from '../../types/Session';

type SessionFormProps = {
  open: boolean;
  onClose: () => void;
  scoreboardId: string;
  scoreboardName: string;
  users: User[];
  onSuccess?: (session: Session) => void;
};

export const SessionForm: React.FC<SessionFormProps> = ({
  open,
  onClose,
  scoreboardId,
  scoreboardName,
  users,
  onSuccess,
}) => {
  const { getAccessTokenSilently, user: auth0User } = useAuth0();
  const [pointCategories, setPointCategories] = useState<PointCategory[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [selectedPointCategories, setSelectedPointCategories] = useState<
    Set<string>
  >(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && scoreboardId && auth0User?.sub) {
      const loadPointCategories = async () => {
        try {
          setLoading(true);
          setError(null);
          const token = await getAccessTokenSilently();
          const categories =
            await PointCategoryService.getPointCategoriesByScoreboard(
              scoreboardId,
              token
            );
          setPointCategories(categories);
          // Select all categories by default
          setSelectedPointCategories(new Set(categories.map((cat) => cat.id)));
          // Add all users to participants by default
          setSelectedParticipants(users.map((u) => u.id));
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
      setSelectedParticipants([]);
      setSelectedPointCategories(new Set());
      setError(null);
    }
  }, [open, scoreboardId, getAccessTokenSilently, auth0User?.sub, users]);

  const handleParticipantChange = (userId: string) => {
    // Prevent removing the creator
    if (userId === auth0User?.sub && selectedParticipants.includes(userId)) {
      return;
    }
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
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
    if (!auth0User?.sub) {
      setError('User not authenticated');
      return;
    }

    if (selectedPointCategories.size === 0) {
      setError('At least one point category must be selected');
      return;
    }

    // Require at least 2 participants (creator + at least one other)
    if (selectedParticipants.length < 2) {
      setError('At least 2 participants are required (including yourself)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently();
      const sessionData = {
        scoreboardId,
        scoreboardName,
        participants: selectedParticipants,
        pointCategories: Array.from(selectedPointCategories),
      };

      const createdSession = await SessionService.createSession(
        sessionData,
        token
      );

      // Convert backend response to frontend Session type
      // Backend returns participants and pointCategories as arrays, and results as Map
      const allParticipantIds: string[] = [
        createdSession.createdById,
        ...(Array.isArray(createdSession.participants)
          ? createdSession.participants
          : []),
      ];
      const pointCategoryIds: string[] = Array.isArray(
        createdSession.pointCategories
      )
        ? createdSession.pointCategories
        : [];
      const session: Session = SessionType.create({
        id: createdSession.id,
        created: new Date(createdSession.created),
        createdById: createdSession.createdById,
        scoreboardId: createdSession.scoreboardId,
        scoreboardName: createdSession.scoreboardName,
        isPending: createdSession.isPending ?? true,
        participants: new Set(
          users.filter((u) => allParticipantIds.includes(u.id))
        ),
        pointCategories: new Set(
          pointCategories.filter((cat) => pointCategoryIds.includes(cat.id))
        ),
        resultEntries: new Set<ResultEntry>(), // Will be populated when needed
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
                  value={selectedParticipants}
                  onChange={(e) =>
                    setSelectedParticipants(e.target.value as string[])
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((userId) => {
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
                    const isCreator = user.id === auth0User?.sub;
                    const isSelected = selectedParticipants.includes(user.id);
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
                  {pointCategories.map((category) => (
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
                  {pointCategories.length === 0 && (
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
            selectedParticipants.length < 2
          }
          sx={{ backgroundColor: '#38a14f', color: '#ffffff' }}
        >
          {submitting ? <CircularProgress size={20} /> : 'Create Session'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
