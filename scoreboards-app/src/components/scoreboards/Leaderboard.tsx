import React, { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
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
  isLoading?: boolean;
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  sessions,
  users,
  pointCategories,
  resultEntries,
  emptyText = 'No scores recorded yet',
  chartTitle = 'Leaderboard',
  isLoading = false,
}) => {
  const leaderboardChartData = useMemo<LeaderboardRow[]>(() => {
    if (!sessions?.length || !pointCategories?.length) return [];

    const finishedSessionIds = new Set(sessions.map((s) => s.id));
    const userById = new Map<string, User>(users.map((u) => [u.id, u]));

    const totalsByUserId = new Map<
      string,
      { name: string; avatar: string; categories: Map<string, number> }
    >();

    const winsByUserId = new Map<string, number>();

    // Group results by session so we can determine "session winner" correctly.
    const entriesBySession = new Map<string, ResultEntry[]>();
    for (const entry of resultEntries ?? []) {
      if (!finishedSessionIds.has(entry.sessionId)) continue;
      if (entry.isPending) continue;
      if (!entry.isActive) continue;

      // Skip entries whose user isn't a (known) member of this scoreboard
      if (!userById.has(entry.userId)) continue;

      const list = entriesBySession.get(entry.sessionId) ?? [];
      list.push(entry);
      entriesBySession.set(entry.sessionId, list);
    }

    // Only use the provided props: no extra fetching.
    for (const entry of resultEntries ?? []) {
      if (!finishedSessionIds.has(entry.sessionId)) continue;
      if (entry.isPending) continue;
      if (!entry.isActive) continue;

      // Skip entries whose user isn't a (known) member of this scoreboard
      const user = userById.get(entry.userId);
      if (!user) continue;

      const displayName = user.name || user.email || '[Removed user]';
      const avatar = user.avatar || '';

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

    for (const [_sessionId, entries] of entriesBySession.entries()) {
      let bestTotal = -Infinity;
      const totalsThisSession = new Map<string, number>();

      for (const entry of entries) {
        // entries were already filtered above to contain only members
        let sum = 0;
        for (const r of entry.results ?? []) {
          sum += r.points ?? 0;
        }

        totalsThisSession.set(entry.userId, sum);
        if (sum > bestTotal) bestTotal = sum;
      }

      for (const [userId, total] of totalsThisSession.entries()) {
        if (total === bestTotal) {
          winsByUserId.set(userId, (winsByUserId.get(userId) ?? 0) + 1);
        }
      }
    }

    const WIN_KEY = 'Wins';

    const chartRows = Array.from(totalsByUserId.entries()).map(
      ([_userId, value]) => {
        const row: LeaderboardRow = {
          name: value.name,
          avatar: value.avatar,
          [WIN_KEY]: winsByUserId.get(_userId) ?? 0,
        };

        for (const category of pointCategories) {
          row[category.name] = value.categories.get(category.id) ?? 0;
        }

        return row;
      }
    );

    chartRows.sort((a, b) => a.name.localeCompare(b.name));

    return chartRows;
  }, [sessions, users, pointCategories, resultEntries]);

  const leaderboardSeries = useMemo(() => {
    const WIN_KEY = 'Wins';

    return [
      // Wins first so it’s visible/togglable right away in the legend
      {
        key: WIN_KEY,
        title: WIN_KEY,
        color: '#ffb300', // gold
      },
      ...pointCategories.map((category) => ({
        key: category.name,
        title: category.name,
        color: category.color,
      })),
    ];
  }, [pointCategories]);

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
        loading={isLoading}
        direction="vertical"
        data={leaderboardChartData}
        series={leaderboardSeries}
        animationDurationMs={200}
        legendToggleEnabled
        showAvatars={true}
        emptyText={emptyText}
      />
    </Stack>
  );
};
