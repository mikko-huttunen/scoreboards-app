import React, {
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import type { User } from '../../types/User.ts';
import type { PointCategory } from '../../types/PointCategory.ts';
import type { ResultEntry } from '../../types/ResultEntry.ts';
import {
  type SessionData,
  SessionService,
} from '../../services/SessionService.ts';
import { ResultBarChart } from '../common/charts/ResultBarChart.tsx';
import { useNavigationSpacing } from '../navigation/Navigation';
import { UserService } from '../../services/UserService.ts';
import { LoadingSpinner } from '../common/spinner/LoadingSpinner.tsx';
import { useMessageSnackbar } from '../common/snackbar/MessageSnackbar.tsx';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCurrentUser } from '../../contexts/CurrentUserContext.tsx';
import { TieBreakerModal } from './TieBreakerModal.tsx';
import {
  getSessionTotalsByUserId,
  getTiedUserIds,
} from '../../utils/TieBreaker.ts';

// How long the finished results stay on screen before the tie breaker interrupts them.
const TIE_BREAKER_DELAY_MS = 1000;

// How long the chart holds still after Start is pressed, before the bars begin animating.
const RESULTS_START_DELAY_MS = 2000;

export const SessionResultsView: React.FC = () => {
  const navigate = useNavigate();
  const navigationSpacing = useNavigationSpacing();
  const { scoreboardId, sessionId } = useParams<{
    scoreboardId: string;
    sessionId: string;
  }>();

  const [data, setData] = useState<{
    loading: boolean;
    session: SessionData | null;
    users: User[];
    pointCategories: PointCategory[];
    resultEntries: ResultEntry[];
  }>({
    loading: true,
    session: null,
    users: [],
    pointCategories: [],
    resultEntries: [],
  });

  const { showErrorMessage, showSuccessMessage } = useMessageSnackbar();
  const { user } = useCurrentUser();

  const [tieBreakerOpen, setTieBreakerOpen] = useState(false);
  // The tie breaker is offered once per visit; dismissing it should not re-prompt.
  const tieBreakerShownRef = useRef(false);
  const tieBreakerTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!scoreboardId || !sessionId) return;

    const fetchAll = async () => {
      try {
        setData((prev) => ({ ...prev, loading: true }));

        const [sessionData, usersData] = await Promise.all([
          SessionService.getSessionById(sessionId),
          UserService.getScoreboardUsers(scoreboardId),
        ]);

        setData({
          loading: false,
          session: sessionData,
          users: usersData,
          pointCategories: sessionData!.pointCategoryDetails,
          resultEntries: sessionData!.resultEntryDetails,
        });
      } catch (e) {
        showErrorMessage('Failed to load results');
        navigate(`/scoreboards`);
      }
    };

    fetchAll();
  }, [scoreboardId, sessionId, navigate, showErrorMessage]);

  const participants = useMemo(() => {
    if (!data.session) return [];

    const participantIds = new Set<string>(
      Array.from(data.session.participants ?? [])
    );

    return data.users
      .filter((u) => participantIds.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
      }));
  }, [data.session, data.users]);

  const filteredResults = useMemo(() => {
    const participantIds = new Set<string>(participants.map((p) => p.id));
    return (data.resultEntries ?? []).filter((re) =>
      participantIds.has(re.userId)
    );
  }, [data.resultEntries, participants]);

  const totalsByUserId = useMemo(() => {
    if (!data.session) return new Map<string, number>();
    return getSessionTotalsByUserId(filteredResults, data.session.id);
  }, [filteredResults, data.session]);

  const tiedPlayers = useMemo(() => {
    const tiedUserIds = getTiedUserIds(totalsByUserId);
    const participantById = new Map(participants.map((p) => [p.id, p]));

    return tiedUserIds
      .map((userId) => participantById.get(userId))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((p) => ({
        id: p.id,
        name: p.name || p.email || '[Removed user]',
        avatar: p.avatar,
      }));
  }, [totalsByUserId, participants]);

  const tiePoints = useMemo(() => {
    const first = tiedPlayers[0];
    return first ? (totalsByUserId.get(first.id) ?? 0) : 0;
  }, [tiedPlayers, totalsByUserId]);

  const isParticipant = useMemo(
    () => !!user?.id && participants.some((p) => p.id === user.id),
    [participants, user?.id]
  );

  const canShowTieBreaker =
    isParticipant && tiedPlayers.length > 1 && !data.session?.tieWinner;

  // Results have finished calculating (either animated through or skipped).
  const handleResultsFinished = useCallback(() => {
    if (!canShowTieBreaker || tieBreakerShownRef.current) return;

    tieBreakerShownRef.current = true;
    tieBreakerTimerRef.current = window.setTimeout(
      () => setTieBreakerOpen(true),
      TIE_BREAKER_DELAY_MS
    );
  }, [canShowTieBreaker]);

  useEffect(
    () => () => {
      if (tieBreakerTimerRef.current !== null) {
        window.clearTimeout(tieBreakerTimerRef.current);
      }
    },
    []
  );

  const handleTieWinnerSelected = async (userId: string) => {
    if (!data.session) return;

    try {
      const updatedSession = await SessionService.resolveTieWinner(
        data.session.id,
        userId
      );

      if (updatedSession) {
        setData((prev) => ({ ...prev, session: updatedSession }));
      }

      setTieBreakerOpen(false);
      showSuccessMessage('Tie breaker winner selected');
    } catch (error) {
      showErrorMessage(
        error instanceof Error ? error.message : 'Failed to resolve the tie'
      );
    }
  };

  // Leaving the tie unresolved is what keeps the win split: every tied player stays a winner
  // until someone records a tie breaker winner, so nothing has to be saved here.
  const handleTieSplit = () => {
    setTieBreakerOpen(false);
    showSuccessMessage('The win stays split between the tied players');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 2,
          ...navigationSpacing,
        }}
      >
        <Stack
          spacing={2}
          alignItems="flex-start"
          sx={{
            width: '100%',
            minHeight: 0,
            boxSizing: 'border-box',
          }}
        >
          {data.loading ? (
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LoadingSpinner />
            </Box>
          ) : (
            <Stack spacing={2} sx={{ width: '100%', height: 'auto' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <IconButton
                  onClick={() => navigate(`/scoreboards/${scoreboardId}`)}
                  sx={{ color: '#1b5e20' }}
                  aria-label="back to scoreboards"
                >
                  <ArrowBackIcon />
                </IconButton>

                <Typography
                  variant="h4"
                  sx={{
                    color: '#1b5e20',
                    fontSize: { xs: '1.5rem', sm: '2rem' },
                  }}
                >
                  Session results
                </Typography>
              </Stack>

              <ResultBarChart
                participants={participants}
                results={filteredResults}
                pointCategories={data.pointCategories}
                tieWinnerUserId={data.session?.tieWinner ?? null}
                startDelayMs={RESULTS_START_DELAY_MS}
                onFinished={handleResultsFinished}
              />
            </Stack>
          )}
        </Stack>
      </Box>

      <TieBreakerModal
        open={tieBreakerOpen}
        players={tiedPlayers}
        points={tiePoints}
        onSelect={handleTieWinnerSelected}
        onSplit={handleTieSplit}
        onClose={() => setTieBreakerOpen(false)}
      />
    </Box>
  );
};
