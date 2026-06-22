import React, { useMemo } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { ScoreBarChart } from '../common/charts/ScoreBarChart';
import type { Session } from '../../types/Session';
import type { User } from '../../types/User';
import type { PointCategory } from '../../types/PointCategory';
import type { ResultEntry } from '../../types/ResultEntry.ts';

type LeaderboardRow = {
  name: string;
  avatar: string;
  [key: string]: string | number;
};

export type LeaderboardProps = {
  sessions: Session[];
  users: User[];
  pointCategories: PointCategory[];
  resultEntries: ResultEntry[];
  emptyText?: string;
  chartTitle?: string;
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  sessions,
  users,
  pointCategories,
  resultEntries,
  emptyText = 'No scores recorded yet',
  chartTitle = 'Leaderboard',
}) => {
  const leaderboardChartData = useMemo<LeaderboardRow[]>(() => {
    if (!sessions?.length || !pointCategories?.length) return [];

    const finishedSessionIds = new Set(sessions.map((s) => s.id));
    const userById = new Map<string, User>(users.map((u) => [u.id, u]));

    const totalsByUserId = new Map<
      string,
      { name: string; avatar: string; categories: Map<string, number> }
    >();

    // Only use the provided props: no extra fetching.
    for (const entry of resultEntries ?? []) {
      if (!finishedSessionIds.has(entry.sessionId)) continue;
      if (entry.isPending) continue;
      if (entry.isActive === false) continue;

      const user = userById.get(entry.userId);
      const displayName = user?.name || user?.email || '[Removed user]';
      const avatar = user?.avatar || '';

      const existing = totalsByUserId.get(entry.userId) ?? {
        name: displayName,
        avatar,
        categories: new Map<string, number>(),
      };

      // entry.results is a Set<Result>
      for (const result of entry.results ?? []) {
        const categoryId = result.pointCategoryId;
        const current = existing.categories.get(categoryId) ?? 0;
        existing.categories.set(categoryId, current + (result.points ?? 0));
      }

      totalsByUserId.set(entry.userId, existing);
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

    return chartRows;
  }, [sessions, users, pointCategories, resultEntries]);

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

      <ScoreBarChart
        loading={false}
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
