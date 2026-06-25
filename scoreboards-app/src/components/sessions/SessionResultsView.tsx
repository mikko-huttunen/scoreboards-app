import React, { useMemo, useEffect, useState } from 'react';
import { Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import type { User } from '../../types/User.ts';
import type { Session } from '../../types/Session.ts';
import type { PointCategory } from '../../types/PointCategory.ts';
import type { ResultEntry } from '../../types/ResultEntry.ts';
import { SessionService } from '../../services/SessionService.ts';
import { PointCategoryService } from '../../services/PointCategoryService.ts';
import { ResultEntryService } from '../../services/ResultEntryService.ts';
import { ResultBarChart } from '../common/charts/ResultBarChart.tsx';
import { useNavigationSpacing } from '../navigation/Navigation';
import { ScoreboardsService } from '../../services/ScoreboardService.ts';

export const SessionResultsView: React.FC = () => {
  const navigationSpacing = useNavigationSpacing();
  const { scoreboardId, sessionId } = useParams<{
    scoreboardId: string;
    sessionId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [pointCategories, setPointCategories] = useState<PointCategory[]>([]);
  const [resultEntries, setResultEntries] = useState<ResultEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scoreboardId || !sessionId) return;

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);

        const s = await SessionService.getSessionById(sessionId);
        if (!s) throw new Error('Session not found');

        setSession(s);

        const usersForBoard =
          await ScoreboardsService.getScoreboardUsers(scoreboardId);
        setUsers(usersForBoard);

        const categoriesForBoard =
          await PointCategoryService.getPointCategoriesByScoreboard(
            scoreboardId
          );
        setPointCategories(categoriesForBoard);

        const entriesForBoard =
          await ResultEntryService.getResultEntriesByScoreboard(scoreboardId);

        setResultEntries(
          entriesForBoard.filter((re) => re.sessionId === sessionId)
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [scoreboardId, sessionId]);

  const participants = useMemo(() => {
    if (!session) return [];

    const participantIds = new Set<string>(
      Array.from(session.participants ?? [])
    );
    return users
      .filter((u) => participantIds.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
      }));
  }, [session, users]);

  const activePointCategories = useMemo(() => {
    if (!session) return [];
    const allowed = new Set<string>(Array.from(session.pointCategories ?? []));
    return pointCategories.filter((pc) => allowed.has(pc.id));
  }, [session, pointCategories]);

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
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 4 },
          ...navigationSpacing,
        }}
      >
        <Stack
          spacing={2}
          alignItems="flex-start"
          sx={{
            width: 'min(1200px, 100%)',
            minHeight: 0,
            // Extra guard: ensure content never slips under the desktop drawer.
            pl: navigationSpacing.pl,
            boxSizing: 'border-box',
          }}
        >
          {loading ? (
            <Box
              sx={{
                width: '100%',
                minHeight: { xs: 360, sm: 420 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress />
            </Box>
          ) : error || !session ? (
            <Paper sx={{ p: 3, width: '100%', maxWidth: 720 }}>
              <Typography variant="h6" color="error">
                {error || 'Session not found'}
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2} sx={{ width: '100%' }}>
              <ResultBarChart
                participants={participants}
                results={resultEntries}
                pointCategories={activePointCategories}
                chartTitle={`Results - ${session.scoreboardName}`}
              />
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
