import React, { useState, useEffect } from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { ResultEntryService } from '../../services/ResultEntryService.ts';
import type { Session } from '../../types/Session.ts';
import type { PointCategory } from '../../types/PointCategory.ts';
import type { ResultEntry } from '../../types/ResultEntry.ts';
import type { Result } from '../../types/Result.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';

export type AddScoresProps = {
  open: boolean;
  onClose: () => void;
  session: Session;
  pointCategories: PointCategory[];
};

export const AddScores: React.FC<AddScoresProps> = ({
  open,
  onClose,
  session,
  pointCategories: pointCategoriesProp,
}) => {
  const [pointCategories, setPointCategories] = useState<PointCategory[]>([]);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resultEntry, setResultEntry] = useState<ResultEntry | null>(null);
  const { user } = useCurrentUser();

  useEffect(() => {
    const loadData = async () => {
      if (!session) {
        setError('Session is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const sessionCategoryIds = Array.from(session.pointCategories) || [];
        const filtered = pointCategoriesProp.filter((pg) =>
          sessionCategoryIds.includes(pg.id)
        );
        setPointCategories(filtered);

        // Only use the provided API call (no extra DB calls)
        const resultEntriesData =
          await ResultEntryService.getResultEntriesByUser();

        const resultEntryData = resultEntriesData.find(
          (re) => re.sessionId === session.id
        );

        if (!resultEntryData) {
          setResultEntry(null);
          setScores(new Map()); // start empty; user will fill scores
          setError('No result entry found for the session');
          setLoading(false);
          return;
        }

        setResultEntry(resultEntryData);

        const initial = new Map<string, number>();

        // resultEntryData.results is a Set<Result> now
        const existingResultsArray = Array.from(resultEntryData.results ?? []);

        filtered.forEach((cat) => {
          const found = existingResultsArray.find(
            (r) => r.pointCategoryId === cat.id
          );
          initial.set(cat.id, found ? found.points : 0);
        });

        setScores(initial);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (open) loadData();
  }, [open, session, pointCategoriesProp]);

  const handleScoreChange = (categoryId: string, value: string) => {
    const newScores = new Map(scores);
    const newErrors = new Map(errors);

    if (value === '') {
      newScores.delete(categoryId);
      newErrors.set(categoryId, 'Score is required');
    } else if (/^\d+$/.test(value)) {
      const intValue = parseInt(value, 10);
      newErrors.delete(categoryId);
      newScores.set(categoryId, intValue);
    } else {
      newErrors.set(categoryId, 'Please enter a whole number (0 or higher)');
    }

    setScores(newScores);
    setErrors(newErrors);
  };

  const validateForm = (): boolean => {
    const newErrors = new Map<string, string>();
    pointCategories.forEach((cat) => {
      const score = scores.get(cat.id);
      if (score === undefined || score === null) {
        newErrors.set(cat.id, 'Score is required');
      } else if (!Number.isInteger(score) || score < 0) {
        newErrors.set(cat.id, 'Score must be a whole number 0 or greater');
      }
    });
    setErrors(newErrors);
    return newErrors.size === 0;
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) return;
    if (!session || !user) {
      setError('Session or user information is missing');
      return;
    }

    if (!resultEntry) {
      setError('No result entry loaded for this session');
      return;
    }

    setSubmitting(true);
    try {
      const resultsData: Result[] = pointCategories.map((cat) => ({
        pointCategoryId: cat.id,
        points: scores.get(cat.id) || 0,
      }));
      const totalPoints = resultsData.reduce((s, r) => s + r.points, 0);

      await ResultEntryService.updateResultEntry(resultEntry.id, {
        scoreboardId: session.scoreboardId,
        sessionId: session.id,
        results: resultsData,
        totalPoints,
      });

      setSuccess(true);
      setTimeout(() => onClose(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit scores');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Scores - {session?.scoreboardName}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <LoadingSpinner />
          </Box>
        ) : (
          <Paper elevation={0} sx={{ p: 0 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && (
              <Alert severity="success">Results submitted successfully!</Alert>
            )}
            <form onSubmit={handleSubmit}>
              <Stack spacing={3} sx={{ width: '100%', mt: 1 }}>
                <Typography variant="h6" sx={{ color: '#1b5e20' }}>
                  Session: {session?.scoreboardName}
                </Typography>

                <Stack spacing={2}>
                  {pointCategories.map((category) => (
                    <TextField
                      key={category.id}
                      label={category.name}
                      type="text"
                      value={scores.get(category.id) ?? ''}
                      onChange={(e) =>
                        handleScoreChange(category.id, e.target.value)
                      }
                      error={!!errors.get(category.id)}
                      helperText={errors.get(category.id)}
                      required
                      fullWidth
                      disabled={submitting}
                      inputProps={{
                        inputMode: 'numeric',
                        pattern: '\\d*',
                        min: 0,
                      }}
                      InputProps={{
                        startAdornment: (
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              backgroundColor: category.color,
                              borderRadius: 1,
                              mr: 1,
                            }}
                          />
                        ),
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </form>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={() => handleSubmit()}
          variant="contained"
          disabled={submitting || success || !resultEntry}
          sx={{ backgroundColor: '#38a14f', color: '#fff' }}
        >
          {submitting ? <LoadingSpinner size={20} /> : 'Submit Scores'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddScores;
