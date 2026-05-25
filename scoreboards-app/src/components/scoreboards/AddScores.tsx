import React, { useState, useEffect } from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigation, useNavigationSpacing } from '../navigation/Navigation';
import { SessionService } from '../../services/SessionService';
import { PointCategoryService } from '../../services/PointCategoryService';
import { ResultEntryService } from '../../services/ResultEntryService';
import type { Session } from '../../types/Session';
import type { PointCategory } from '../../types/PointCategory';
import type { ResultEntry } from '../../types/ResultEntry';
import { Session as SessionType } from '../../types/Session';

export const AddScores: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getAccessTokenSilently, user: auth0User } = useAuth0();
  const navigationSpacing = useNavigationSpacing();

  const [session, setSession] = useState<Session | null>(null);
  const [pointCategories, setPointCategories] = useState<PointCategory[]>([]);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingResultEntry, setExistingResultEntry] =
    useState<ResultEntry | null>(null);
  const [scoreboardId, setScoreboardId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!sessionId) {
        setError('Session ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const token = await getAccessTokenSilently();

        // Fetch session first, then fetch categories
        const sessionData = await SessionService.getSessionById(
          sessionId,
          token
        );

        if (!sessionData) {
          setError('Session not found');
          setLoading(false);
          return;
        }

        // Fetch point categories using scoreboardId from session
        const scoreboardId = (sessionData as any).scoreboardId;
        let categoriesData: PointCategory[] = [];
        if (scoreboardId) {
          categoriesData =
            await PointCategoryService.getPointCategoriesByScoreboard(
              scoreboardId,
              token
            );
        }

        // Convert backend session to frontend format
        const convertedSession: Session = SessionType.create({
          id: (sessionData as any).id,
          created: new Date((sessionData as any).created),
          createdById: (sessionData as any).createdById,
          scoreboardId: (sessionData as any).scoreboardId,
          scoreboardName: (sessionData as any).scoreboardName,
          isPending: (sessionData as any).isPending ?? true,
          participants: new Set(),
          pointCategories: new Set(),
          resultEntries: new Set<ResultEntry>(), // Will be populated when needed
          isActive: (sessionData as any).isActive,
        });

        setSession(convertedSession);
        setScoreboardId((sessionData as any).scoreboardId);

        // Filter categories to only those in the session
        const sessionCategoryIds = (sessionData as any).pointCategories || [];
        const filteredCategories = categoriesData.filter((cat) =>
          sessionCategoryIds.includes(cat.id)
        );
        setPointCategories(filteredCategories);

        // Always fetch the latest result entry for this session
        let existingEntry: ResultEntry | null = null;
        try {
          // Fetch fresh data every time to ensure we have the latest scores
          existingEntry =
            await ResultEntryService.getResultEntryBySessionAndUser(
              sessionId,
              token
            );
        } catch (err) {
          // User doesn't have a result entry yet, which is fine
          console.log(
            'No existing result entry found, user can create new one'
          );
        }

        setExistingResultEntry(existingEntry);

        // Always fetch the latest results for the existing entry if it exists
        let existingResults: any[] = [];
        if (existingEntry && existingEntry.id) {
          try {
            // Try to fetch results by result entry ID first
            const resultResponse = await fetch(
              `/api/result-entries/${existingEntry.id}/results`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            if (resultResponse.ok) {
              existingResults = await resultResponse.json();
            } else {
              // If endpoint doesn't exist, try fetching all results for session and filter
              try {
                const sessionResultsResponse = await fetch(
                  `/api/results/session/${sessionId}`,
                  {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );
                if (sessionResultsResponse.ok) {
                  const allSessionResults = await sessionResultsResponse.json();
                  existingResults = allSessionResults.filter(
                    (r: any) => r.resultEntryId === existingEntry.id
                  );
                }
              } catch (sessionErr) {
                // If that fails, check if results are in entry.results
                if (existingEntry.results) {
                  const resultsArray =
                    existingEntry.results instanceof Set
                      ? Array.from(existingEntry.results)
                      : Array.isArray(existingEntry.results)
                        ? existingEntry.results
                        : [];
                  existingResults = resultsArray.filter(
                    (r: any) =>
                      r &&
                      typeof r === 'object' &&
                      r.pointCategoryId !== undefined
                  );
                }
              }
            }
          } catch (err) {
            // If endpoint doesn't exist, try fetching all results for session and filter
            try {
              const sessionResultsResponse = await fetch(
                `/api/results/session/${sessionId}`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              if (sessionResultsResponse.ok) {
                const allSessionResults = await sessionResultsResponse.json();
                existingResults = allSessionResults.filter(
                  (r: any) => r.resultEntryId === existingEntry.id
                );
              } else {
                // If that fails, check if results are in entry.results
                if (existingEntry.results) {
                  const resultsArray =
                    existingEntry.results instanceof Set
                      ? Array.from(existingEntry.results)
                      : Array.isArray(existingEntry.results)
                        ? existingEntry.results
                        : [];
                  existingResults = resultsArray.filter(
                    (r: any) =>
                      r &&
                      typeof r === 'object' &&
                      r.pointCategoryId !== undefined
                  );
                }
              }
            } catch (sessionErr) {
              // If that fails, check if results are in entry.results
              if (existingEntry.results) {
                const resultsArray =
                  existingEntry.results instanceof Set
                    ? Array.from(existingEntry.results)
                    : Array.isArray(existingEntry.results)
                      ? existingEntry.results
                      : [];
                existingResults = resultsArray.filter(
                  (r: any) =>
                    r &&
                    typeof r === 'object' &&
                    r.pointCategoryId !== undefined
                );
              }
            }
          }
        }

        // Initialize scores map - use existing scores if available, otherwise 0
        const initialScores = new Map<string, number>();
        filteredCategories.forEach((cat) => {
          const result = existingResults.find(
            (r: any) => r.pointCategoryId === cat.id
          );
          initialScores.set(cat.id, result ? result.points || 0 : 0);
        });
        setScores(initialScores);
      } catch (err) {
        console.error('Error loading session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId, getAccessTokenSilently]);

  const handleScoreChange = (categoryId: string, value: string) => {
    const numValue = parseFloat(value);
    const newScores = new Map(scores);
    const newErrors = new Map(errors);

    if (isNaN(numValue)) {
      newErrors.set(categoryId, 'Please enter a valid number');
    } else {
      newErrors.delete(categoryId);
      newScores.set(categoryId, numValue);
    }

    setScores(newScores);
    setErrors(newErrors);
  };

  const validateForm = (): boolean => {
    const newErrors = new Map<string, string>();

    pointCategories.forEach((cat) => {
      const score = scores.get(cat.id);
      if (score === undefined || score === null || isNaN(score)) {
        newErrors.set(cat.id, 'Score is required');
      }
    });

    setErrors(newErrors);
    return newErrors.size === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    if (!session || !auth0User?.sub) {
      setError('Session or user information is missing');
      return;
    }

    setSubmitting(true);

    try {
      const token = await getAccessTokenSilently();

      // Prepare results data
      const resultsData = pointCategories.map((cat) => ({
        pointCategoryId: cat.id,
        points: scores.get(cat.id) || 0,
      }));

      // Calculate total points
      const totalPoints = resultsData.reduce(
        (sum, result) => sum + result.points,
        0
      );

      // Create or update result entry (backend handles both cases)
      await ResultEntryService.createResultEntry(
        {
          scoreboardId: session.scoreboardId,
          sessionId: session.id,
          results: resultsData,
          totalPoints: totalPoints,
        },
        token
      );

      setSuccess(true);

      // Navigate back to scoreboard view after a short delay
      setTimeout(() => {
        if (scoreboardId) {
          navigate(`/scoreboards/${scoreboardId}`);
        } else {
          navigate('/scoreboards');
        }
      }, 1500);
    } catch (err) {
      console.error('Error submitting scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit scores');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          backgroundColor: '#ffffff',
          position: 'relative',
          pb: { xs: 10, sm: 4 },
        }}
      >
        <Navigation />
        <Box
          sx={{
            px: 2,
            py: 4,
            ...navigationSpacing,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error && !session) {
    return (
      <Box
        sx={{
          backgroundColor: '#ffffff',
          position: 'relative',
          pb: { xs: 10, sm: 4 },
        }}
      >
        <Navigation />
        <Box sx={{ px: 2, py: 4, ...navigationSpacing }}>
          <Alert severity="error">{error}</Alert>
          <Button
            onClick={() => {
              if (scoreboardId) {
                navigate(`/scoreboards/${scoreboardId}`);
              } else {
                navigate('/scoreboards');
              }
            }}
            sx={{ mt: 2 }}
          >
            Back to Scoreboards
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: '#ffffff',
        position: 'relative',
        pb: { xs: 10, sm: 4 },
      }}
    >
      <Navigation />
      <Box sx={{ px: 2, py: 4, ...navigationSpacing }}>
        <Stack
          spacing={4}
          alignItems="flex-start"
          sx={{ width: 'min(1200px, 100%)' }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ width: '100%' }}
          >
            <IconButton
              onClick={() => {
                if (scoreboardId) {
                  navigate(`/scoreboards/${scoreboardId}`);
                } else {
                  navigate('/scoreboards');
                }
              }}
              sx={{ color: '#1b5e20' }}
              aria-label="back to scoreboard"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="h4"
              sx={{ color: '#1b5e20', fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              Add Scores
            </Typography>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {success && (
            <Alert severity="success">
              Results submitted successfully! Redirecting...
            </Alert>
          )}

          {session && (
            <Box
              sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: { xs: 2, sm: 3 },
                  width: '100%',
                  maxWidth: { xs: '100%', sm: 'min(1200px, 100%)' },
                }}
              >
                <form onSubmit={handleSubmit}>
                  <Stack spacing={3} sx={{ width: '100%' }}>
                    <Typography variant="h6" sx={{ color: '#1b5e20' }}>
                      Session: {session.scoreboardName}
                    </Typography>

                    <Stack spacing={2}>
                      {pointCategories.map((category) => (
                        <TextField
                          key={category.id}
                          label={category.name}
                          type="number"
                          value={scores.get(category.id) ?? ''}
                          onChange={(e) =>
                            handleScoreChange(category.id, e.target.value)
                          }
                          error={!!errors.get(category.id)}
                          helperText={errors.get(category.id)}
                          required
                          fullWidth
                          disabled={submitting}
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

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      justifyContent="flex-end"
                      sx={{ width: '100%' }}
                    >
                      <Button
                        onClick={() => {
                          if (scoreboardId) {
                            navigate(`/scoreboards/${scoreboardId}`);
                          } else {
                            navigate('/scoreboards');
                          }
                        }}
                        disabled={submitting}
                        variant="outlined"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={submitting || success}
                        sx={{
                          backgroundColor: '#38a14f',
                          color: '#ffffff',
                          ':hover': { backgroundColor: '#2d7f3d' },
                        }}
                      >
                        {submitting ? (
                          <CircularProgress
                            size={24}
                            sx={{ color: '#ffffff' }}
                          />
                        ) : (
                          'Submit Scores'
                        )}
                      </Button>
                    </Stack>
                  </Stack>
                </form>
              </Paper>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
