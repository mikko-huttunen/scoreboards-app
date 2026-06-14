import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { ScoreBarChart } from '../common/charts/ScoreBarChart';
import { ResultEntryService } from '../../services/ResultEntryService';
import type { Session } from '../../types/Session';
import type { User } from '../../types/User';
import type { PointCategory } from '../../types/PointCategory';

type LeaderboardRow = {
  name: string;
  avatar: string;
  [key: string]: string | number;
};

export type LeaderboardProps = {
  sessions: Session[];
  users: User[];
  pointCategories: PointCategory[];
  emptyText?: string;
  chartTitle?: string;
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  sessions,
  users,
  pointCategories,
  emptyText = 'No scores recorded yet',
  chartTitle = 'Leaderboard',
}) => {
  const [loading, setLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardChartData, setLeaderboardChartData] = useState<
    LeaderboardRow[]
  >([]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!sessions || sessions.length === 0) {
        setLeaderboardChartData([]);
        setLeaderboardError(null);
        setLoading(false);
        return;
      }

      try {
        setLeaderboardError(null);

        const finishedSessions = sessions.filter((s) => !s.isPending);
        if (finishedSessions.length === 0) {
          setLeaderboardChartData([]);
          return;
        }

        const userById = new Map<string, User>(users.map((u) => [u.id, u]));

        const totalsByUserId = new Map<
          string,
          { name: string; avatar: string; categories: Map<string, number> }
        >();

        const resultEntriesBySession = await Promise.all(
          finishedSessions.map(async (session) => {
            const sessionResultEntries =
              await ResultEntryService.getResultEntriesBySession(session.id);

            const resolvedEntries = await Promise.all(
              sessionResultEntries.map(async (entry) => {
                const results =
                  await ResultEntryService.getResultsByResultEntryId(entry.id);
                return { entry, results };
              })
            );

            return resolvedEntries;
          })
        );

        for (const sessionEntries of resultEntriesBySession) {
          for (const { entry, results } of sessionEntries) {
            if (entry?.isActive === false) continue;

            const user = userById.get(entry.userId);
            const userId = entry.userId;

            const existing = totalsByUserId.get(userId) ?? {
              name: user?.name || user?.email || '[Removed user]',
              avatar: user?.avatar || '',
              categories: new Map<string, number>(),
            };

            for (const result of results) {
              const categoryId = result.pointCategoryId;
              const current = existing.categories.get(categoryId) ?? 0;
              existing.categories.set(
                categoryId,
                current + (result.points ?? 0)
              );
            }

            totalsByUserId.set(userId, existing);
          }
        }

        const chartRows = Array.from(totalsByUserId.entries()).map(
          ([_userId, value]) => {
            const row: LeaderboardRow = {
              name: value.name,
              avatar: value.avatar,
            };

            for (const category of pointCategories) {
              row[category.name] = value.categories.get(category.id) ?? 0;
            }

            return row;
          }
        );

        chartRows.sort((a, b) => {
          const aTotal = pointCategories.reduce(
            (sum, pc) => sum + Number(a[pc.name] ?? 0),
            0
          );
          const bTotal = pointCategories.reduce(
            (sum, pc) => sum + Number(b[pc.name] ?? 0),
            0
          );
          return bTotal - aTotal;
        });

        setLeaderboardChartData(chartRows);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        setLeaderboardError(
          err instanceof Error ? err.message : 'Failed to load leaderboard'
        );
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [sessions, users, pointCategories]);

  const leaderboardSeries = useMemo(
    () =>
      pointCategories.map((category) => ({
        key: category.name,
        title: category.name,
        color: category.color,
      })),
    [pointCategories]
  );

  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Typography variant="h6" sx={{ color: '#1b5e20' }}>
          {chartTitle}
        </Typography>
      </Stack>

      {leaderboardError && <Alert severity="error">{leaderboardError}</Alert>}

      <ScoreBarChart
        loading={loading}
        direction="vertical"
        data={leaderboardChartData}
        series={leaderboardSeries}
        animationDurationMs={200}
        legendToggleEnabled
        showAvatars
        emptyText={emptyText}
      />
    </Stack>
  );
};
