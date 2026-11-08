import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Session } from '../../types/Session.ts';
import type { User } from '../../types/User.ts';
import { type PointCategory } from '../../types/PointCategory.ts';
import type { ResultEntry } from '../../types/ResultEntry.ts';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import { hasSessionsPermission, isOwner } from '../../utils/Utils.ts';
import type { Scoreboard } from '../../types/Scoreboard.ts';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import {
  type SessionData,
  SessionService,
  type UpdateSessionResultEntryData,
} from '../../services/SessionService.ts';
import {
  MAX_SESSION_DESCRIPTION_LENGTH,
  MAX_SESSION_NAME_LENGTH,
} from '../../constants.ts';
import { RestoreOutlined } from '@mui/icons-material';
import { getTiedUserIds } from '../../utils/TieBreaker.ts';

type EditSessionProps = {
  open: boolean;
  onClose: () => void;
  session: Session;
  scoreboard: Scoreboard;
  users: User[];
  pointCategories: PointCategory[];
  resultEntries: ResultEntry[];
  onSuccess?: (session: SessionData) => void | Promise<void>;
};

type ScoreState = Record<string, Record<string, string>>;

export const EditSession: React.FC<EditSessionProps> = ({
  open,
  onClose,
  session,
  scoreboard,
  users,
  pointCategories,
  resultEntries,
  onSuccess,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useCurrentUser();
  const { showSuccessMessage, showErrorMessage } = useMessageSnackbar();

  const canOpenEditor =
    isOwner(scoreboard.memberships, user?.id) ||
    session.createdBy === user?.id ||
    hasSessionsPermission(scoreboard.memberships, user?.id);

  const isScoreboardCreator = isOwner(scoreboard.memberships, user?.id);
  const isSessionCreator = session.createdBy === user?.id;
  const canEditSessionMeta = isScoreboardCreator || isSessionCreator;

  const canEditMyScores = useMemo(() => {
    if (!user?.id) return false;
    return Array.from(session.participants ?? []).includes(user.id);
  }, [session.participants, user?.id]);

  const canEditAnyScores = canEditSessionMeta || canEditMyScores;

  const visiblePointCategories = useMemo(
    () =>
      pointCategories.filter((category) =>
        Array.from(session.pointCategories ?? []).includes(category.id)
      ),
    [pointCategories, session.pointCategories]
  );

  const relevantEntries = useMemo(
    () =>
      (resultEntries ?? []).filter(
        (entry) => entry.sessionId === session.id && entry.isActive
      ),
    [resultEntries, session.id]
  );

  const participantRows = useMemo(() => {
    const userById = new Map(users.map((item) => [item.id, item]));
    const seen = new Set<string>();

    const rows = relevantEntries
      .map((entry) => {
        const participant = userById.get(entry.userId);
        if (!participant || seen.has(entry.userId)) return null;
        seen.add(entry.userId);

        return {
          userId: participant.id,
          label: participant.name || participant.email || '[Removed user]',
          email: participant.email,
          resultEntry: entry,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);

    rows.sort((a, b) => {
      if (a.userId === user?.id) return -1;
      if (b.userId === user?.id) return 1;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });

    return rows;
  }, [relevantEntries, users, user?.id]);

  const [name, setName] = useState(session.name);
  const [description, setDescription] = useState(session.description ?? '');
  const [tieWinner, setTieWinner] = useState(session.tieWinner ?? '');
  const [scores, setScores] = useState<ScoreState>({});
  const [initialScores, setInitialScores] = useState<ScoreState>({});
  const [expandedUserId, setExpandedUserId] = useState<string | false>(
    user?.id ?? false
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tie state is derived from the scores currently typed into the form, so the selector keeps
  // up as the editor changes points around.
  const tiedPlayers = useMemo(() => {
    const totals = new Map<string, number>();

    for (const row of participantRows) {
      const total = visiblePointCategories.reduce((sum, category) => {
        const raw = scores[row.userId]?.[category.id];
        const parsed = raw === '' || raw === undefined ? NaN : Number(raw);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0);

      totals.set(row.userId, total);
    }

    const tiedUserIds = getTiedUserIds(totals);

    return participantRows.filter((row) => tiedUserIds.includes(row.userId));
  }, [participantRows, visiblePointCategories, scores]);

  // Scores are only filled in once the editor opens. Until then every total reads as zero, which
  // looks exactly like "no tie" and would wipe the winner the session already has on record.
  const scoresInitialized = useMemo(
    () =>
      participantRows.length > 0 &&
      participantRows.every((row) => scores[row.userId] !== undefined),
    [participantRows, scores]
  );

  // The tie is settled as soon as the editor has picked someone, so stop shouting about it.
  const isTieResolved = tieWinner !== '';

  useEffect(() => {
    if (!open) return;

    setName(session.name);
    setDescription(session.description ?? '');
    setTieWinner(session.tieWinner ?? '');
    setError(null);

    const nextInitialScores: ScoreState = {};
    const nextScores: ScoreState = {};

    for (const row of participantRows) {
      nextInitialScores[row.userId] = {};
      nextScores[row.userId] = {};

      for (const category of visiblePointCategories) {
        const existingResult = row.resultEntry.results?.find(
          (result) => result.pointCategoryId === category.id
        );

        const normalized =
          existingResult?.points === undefined ||
          existingResult?.points === null
            ? ''
            : String(existingResult.points);

        nextInitialScores[row.userId][category.id] = normalized;
        nextScores[row.userId][category.id] = normalized;
      }
    }

    setInitialScores(nextInitialScores);
    setScores(nextScores);

    setExpandedUserId(user?.id ?? participantRows[0]?.userId ?? false);
  }, [open, session, participantRows, visiblePointCategories, user?.id]);

  // Editing scores can break the tie or drop the chosen winner out of the lead, which would make
  // the stored pick invalid. Clear it rather than letting the save fail server-side.
  useEffect(() => {
    if (!tieWinner) return;
    if (!scoresInitialized) return;
    if (tiedPlayers.some((row) => row.userId === tieWinner)) return;

    setTieWinner('');
  }, [scoresInitialized, tiedPlayers, tieWinner]);

  const isScoreFieldChanged = (userId: string, pointCategoryId: string) => {
    const current = scores[userId]?.[pointCategoryId] ?? '';
    const initial = initialScores[userId]?.[pointCategoryId] ?? '';
    return current !== initial;
  };

  const handleResetScoreField = (userId: string, pointCategoryId: string) => {
    const initialValue = initialScores[userId]?.[pointCategoryId] ?? '';

    setScores((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {}),
        [pointCategoryId]: initialValue,
      },
    }));
  };

  const handleScoreChange = (
    userId: string,
    pointCategoryId: string,
    value: string
  ) => {
    if (!/^-?\d*$/.test(value)) return;

    setScores((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {}),
        [pointCategoryId]: value,
      },
    }));
  };

  const buildPayload = () => {
    const scoreRowsToUpdate = canEditSessionMeta
      ? participantRows
      : participantRows.filter((row) => row.userId === user?.id);

    const resultEntryUpdates: UpdateSessionResultEntryData[] =
      scoreRowsToUpdate.map((row) => ({
        id: row.resultEntry.id,
        userId: row.userId,
        results: visiblePointCategories.map((category) => ({
          pointCategoryId: category.id,
          points: Number(scores[row.userId]?.[category.id] ?? 0),
        })),
      }));

    return {
      name: canEditSessionMeta ? name.trim() : session.name.trim(),
      description: canEditSessionMeta
        ? description.trim()
        : (session.description ?? ''),
      resultEntries: resultEntryUpdates,
      // Empty string clears the winner and reopens the tie; omitted entirely when the editor
      // is not allowed to change it.
      ...(canEditSessionMeta ? { tieWinner } : {}),
    };
  };

  const handleSubmit = async () => {
    if (!canOpenEditor) return;

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (canEditSessionMeta) {
      if (!trimmedName) {
        setError('Session name is required');
        return;
      }
      if (trimmedName.length > MAX_SESSION_NAME_LENGTH) {
        setError(
          `Session name cannot be longer than ${MAX_SESSION_NAME_LENGTH} characters`
        );
        return;
      }
      if (trimmedDescription.length > MAX_SESSION_DESCRIPTION_LENGTH) {
        setError(
          `Description cannot be longer than ${MAX_SESSION_DESCRIPTION_LENGTH} characters`
        );
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const updatedSession = await SessionService.updateSession(
        session.id,
        buildPayload()
      );

      if (!updatedSession) {
        throw new Error('Session update returned no data');
      }

      showSuccessMessage('Session updated');
      await onSuccess?.(updatedSession);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update session';
      setError(message);
      showErrorMessage('Failed to update session');
    } finally {
      setSubmitting(false);
    }
  };

  const isSaveDisabled =
    submitting ||
    !canOpenEditor ||
    participantRows.length === 0 ||
    (canEditSessionMeta
      ? !name.trim() ||
        name.trim().length > MAX_SESSION_NAME_LENGTH ||
        description.trim().length > MAX_SESSION_DESCRIPTION_LENGTH
      : false) ||
    visiblePointCategories.some((category) => {
      const rowsToCheck = canEditSessionMeta
        ? participantRows
        : participantRows.filter((row) => row.userId === user?.id);

      return rowsToCheck.some((row) => {
        const v = scores[row.userId]?.[category.id];
        return v === '' || v === undefined;
      });
    });

  const renderScoreFields = (row: (typeof participantRows)[number]) => (
    <Stack spacing={2}>
      {visiblePointCategories.map((category) => {
        const value = scores[row.userId]?.[category.id] ?? '';
        const fieldEmpty = value === '' || value === undefined;
        const changed = isScoreFieldChanged(row.userId, category.id);

        const canEditThisRow =
          canEditAnyScores && (canEditSessionMeta || row.userId === user?.id);

        return (
          <Stack
            key={`${row.userId}-${category.id}`}
            direction="row"
            alignItems="center"
          >
            <TextField
              label={category.name}
              type="number"
              size="small"
              fullWidth
              value={value}
              onChange={(event) =>
                handleScoreChange(row.userId, category.id, event.target.value)
              }
              disabled={!canEditThisRow || submitting}
              error={fieldEmpty}
              slotProps={{
                htmlInput: {
                  inputMode: 'numeric',
                },
              }}
            />

            <Tooltip title="Undo">
              <span>
                <IconButton
                  disabled={!canEditThisRow || submitting || !changed}
                  onClick={() => handleResetScoreField(row.userId, category.id)}
                  size="small"
                  sx={{
                    verticalAlign: 'middle',
                    color: '#38a14f',
                    pl: 1,
                  }}
                >
                  <RestoreOutlined />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        );
      })}
    </Stack>
  );

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {`Edit session - ${session.name}`}
      </DialogTitle>

      <DialogContent
        sx={{
          pt: 1,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Stack spacing={2.5}>
          {!canOpenEditor && (
            <Alert severity="error">
              You do not have permission to edit this session.
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {canEditSessionMeta ? (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                backgroundColor: '#f5f5f5',
                borderRadius: 2,
              }}
            >
              <Stack spacing={2}>
                <TextField
                  label="Session Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={submitting}
                  fullWidth
                  error={name.trim().length > MAX_SESSION_NAME_LENGTH}
                  helperText={
                    name.trim().length > MAX_SESSION_NAME_LENGTH
                      ? `Session name cannot be longer than ${MAX_SESSION_NAME_LENGTH} characters`
                      : undefined
                  }
                />

                <TextField
                  label="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={submitting}
                  fullWidth
                  multiline
                  minRows={3}
                  error={
                    description.trim().length > MAX_SESSION_DESCRIPTION_LENGTH
                  }
                  helperText={
                    description.trim().length > MAX_SESSION_DESCRIPTION_LENGTH
                      ? `Description cannot be longer than ${MAX_SESSION_DESCRIPTION_LENGTH} characters`
                      : undefined
                  }
                />
              </Stack>
            </Paper>
          ) : null}

          {canEditSessionMeta && tiedPlayers.length > 1 && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                backgroundColor: isTieResolved ? '#f5f5f5' : '#fff8e1',
                border: isTieResolved
                  ? 'none'
                  : '1px solid rgba(255,179,0,0.32)',
                borderRadius: 2,
              }}
            >
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Tie breaker
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {`${tiedPlayers.length} players share the top total. Pick the winner, or leave
                   it unresolved to split the win between them.`}
                </Typography>

                <TextField
                  select
                  label="Tie breaker winner"
                  value={tieWinner}
                  onChange={(event) => setTieWinner(event.target.value)}
                  disabled={submitting}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">
                    <em>Unresolved — split the win</em>
                  </MenuItem>

                  {tiedPlayers.map((row) => (
                    <MenuItem key={row.userId} value={row.userId}>
                      {row.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Paper>
          )}

          <Box>
            <Typography variant="h6" sx={{ color: '#1b5e20', mb: 1.5 }}>
              Scores
            </Typography>

            {participantRows.length === 0 ? (
              <Alert severity="info">
                No editable participant scores found.
              </Alert>
            ) : canEditSessionMeta ? (
              // Scoreboard creator / session creator: keep accordion
              <Stack spacing={1.5}>
                {participantRows.map((row) => (
                  <Accordion
                    key={row.userId}
                    expanded={expandedUserId === row.userId}
                    onChange={(_event, expanded) =>
                      setExpandedUserId(expanded ? row.userId : false)
                    }
                    disableGutters
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '12px !important',
                      overflow: 'hidden',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ width: '100%', pr: 1 }}
                      >
                        <Typography sx={{ fontWeight: 600 }}>
                          {row.label}
                        </Typography>
                      </Stack>
                    </AccordionSummary>

                    <Divider />

                    <AccordionDetails
                      sx={{
                        pl: { xs: 2, sm: 2 },
                        pr: { xs: 1, sm: 1 },
                        py: 2,
                        backgroundColor: '#fafafa',
                      }}
                    >
                      {renderScoreFields(row)}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            ) : (
              // Participants: no accordion, show only their scores
              (() => {
                const myRow = participantRows.find(
                  (r) => r.userId === user?.id
                );
                if (!myRow) {
                  return (
                    <Alert severity="info">
                      Your scores are not available for this session.
                    </Alert>
                  );
                }

                return (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: '#fafafa',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, mb: 1 }}>
                      {myRow.label}
                    </Typography>
                    {renderScoreFields(myRow)}
                  </Paper>
                );
              })()
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 2.5 },
          pt: 1.5,
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          disabled={submitting}
          variant="outlined"
          fullWidth={fullScreen}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSaveDisabled}
          fullWidth={fullScreen}
          sx={{
            backgroundColor: '#38a14f',
            color: '#ffffff',
            ':hover': { backgroundColor: '#2d7f3d' },
          }}
        >
          {submitting ? <LoadingSpinner size={20} /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
