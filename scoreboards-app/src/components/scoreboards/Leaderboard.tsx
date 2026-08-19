import React, { useMemo, useState } from 'react';
import {
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
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
  const WIN_KEY = 'Total Wins';
  const SESSIONS_KEY = 'Total Sessions';

  const [scoreMode, setScoreMode] = useState<'total' | 'average'>('total');

  const leaderboardChartData = useMemo<LeaderboardRow[]>(() => {
    if (!sessions?.length || !pointCategories?.length) return [];

    const finishedSessionIds = new Set(sessions.map((s) => s.id));
    const userById = new Map<string, User>(users.map((u) => [u.id, u]));

    const totalsByUserId = new Map<
      string,
      { name: string; avatar: string; categories: Map<string, number> }
    >();

    const winsByUserId = new Map<string, number>();

    const sessionsPlayedByUserId = new Map<string, Set<string>>();
    const entriesBySession = new Map<string, ResultEntry[]>();
    for (const entry of resultEntries ?? []) {
      if (!finishedSessionIds.has(entry.sessionId)) continue;
      if (entry.isPending) continue;
      if (!entry.isActive) continue;
      if (!userById.has(entry.userId)) continue;

      const list = entriesBySession.get(entry.sessionId) ?? [];
      list.push(entry);
      entriesBySession.set(entry.sessionId, list);

      if (!sessionsPlayedByUserId.has(entry.userId)) {
        sessionsPlayedByUserId.set(entry.userId, new Set<string>());
      }
      sessionsPlayedByUserId.get(entry.userId)!.add(entry.sessionId);
    }

    for (const entry of resultEntries ?? []) {
      if (!finishedSessionIds.has(entry.sessionId)) continue;
      if (entry.isPending) continue;
      if (!entry.isActive) continue;

      const user = userById.get(entry.userId);
      if (!user) continue;

      const displayName = user.name || user.email || '[Removed user]';
      const avatar = user.avatar || '';

      const existing = totalsByUserId.get(entry.userId) ?? {
        name: displayName,
        avatar,
        categories: new Map<string, number>(),
      };

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

    const chartRows = Array.from(totalsByUserId.entries()).map(
      ([_userId, value]) => {
        const sessionsCount = sessionsPlayedByUserId.get(_userId)?.size ?? 0;

        const row: LeaderboardRow = {
          name: value.name,
          avatar: value.avatar,
          [WIN_KEY]: winsByUserId.get(_userId) ?? 0,
          [SESSIONS_KEY]: sessionsCount,
        };

        for (const category of pointCategories) {
          const totalForCategory = value.categories.get(category.id) ?? 0;

          const avgForCategory =
            sessionsCount > 0 ? totalForCategory / sessionsCount : 0;
          const roundedAvgForCategory = Math.round(avgForCategory);

          row[category.name] =
            scoreMode === 'average' ? roundedAvgForCategory : totalForCategory;
        }

        return row;
      }
    );

    chartRows.sort((a, b) => {
      const totalA = pointCategories.reduce((sum, category) => {
        const v = a[category.name];
        return sum + (typeof v === 'number' ? v : Number(v ?? 0));
      }, 0);

      const totalB = pointCategories.reduce((sum, category) => {
        const v = b[category.name];
        return sum + (typeof v === 'number' ? v : Number(v ?? 0));
      }, 0);

      if (totalB !== totalA) return totalB - totalA;

      return String(a.name).localeCompare(String(b.name));
    });

    return chartRows;
  }, [sessions, users, pointCategories, resultEntries, scoreMode]);

  const leaderboardSeries = useMemo(() => {
    const pointSeries = pointCategories.map((category) => ({
      key: category.name,
      title: category.name,
      color: category.color,
    }));

    return [
      {
        key: WIN_KEY,
        title: WIN_KEY,
        color: '#ffb300',
      },
      {
        key: SESSIONS_KEY,
        title: SESSIONS_KEY,
        color: '#515151',
      },
      ...pointSeries,
    ];
  }, [pointCategories]);

  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="flex-start"
        spacing={2}
      >
        <Typography variant="h6" sx={{ color: '#1b5e20' }}>
          {chartTitle}
        </Typography>

        <ToggleButtonGroup
          value={scoreMode}
          exclusive
          onChange={(_e, v) => {
            if (v) setScoreMode(v);
          }}
          size="small"
          aria-label="Leaderboard score mode"
          sx={{ borderRadius: '20px' }}
        >
          <ToggleButton value="total" aria-label="Total scores">
            Total
          </ToggleButton>
          <ToggleButton value="average" aria-label="Average scores">
            Average
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <ScoreBarChart
        key={`leaderboard-${scoreMode}`}
        loading={isLoading}
        direction="vertical"
        data={leaderboardChartData}
        series={leaderboardSeries}
        animationDurationMs={200}
        legendToggleEnabled
        showAvatars={true}
        emptyText={emptyText}
        pagination
        pageSize={10}
      />
    </Stack>
  );
};
