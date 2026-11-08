import React, { useEffect, useMemo, useState } from 'react';
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
import type { ScoreboardSettings } from '../../types/ScoreboardSettings.ts';
import { STAT_TYPES } from '../../constants.ts';
import { InfoOutlined } from '@mui/icons-material';

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
  statTypes?: ScoreboardSettings['statTypes'];
  defaultStatType?: ScoreboardSettings['defaultStatType'];
  emptyText?: string;
  chartTitle?: string;
  isLoading?: boolean;
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  sessions,
  users,
  pointCategories,
  resultEntries,
  statTypes = [STAT_TYPES.TOTAL, STAT_TYPES.AVERAGE],
  defaultStatType = STAT_TYPES.TOTAL,
  emptyText = 'No scores recorded yet',
  chartTitle = 'Leaderboard',
  isLoading = false,
}) => {
  type StatType = ScoreboardSettings['statTypes'][number];

  const WIN_KEY = 'Total Wins';
  const SESSIONS_KEY = 'Total Sessions';

  const sortedPointCategories = useMemo(
    () => [...pointCategories].sort((a, b) => a.index - b.index),
    [pointCategories]
  );

  const availableStatTypes = useMemo<StatType[]>(
    () =>
      (statTypes && statTypes.length > 0
        ? statTypes
        : [STAT_TYPES.TOTAL]
      ).filter(
        (t): t is StatType => t === STAT_TYPES.TOTAL || t === STAT_TYPES.AVERAGE
      ),
    [statTypes]
  );

  const pickInitialMode = (): StatType => {
    if (defaultStatType && availableStatTypes.includes(defaultStatType)) {
      return defaultStatType;
    }
    return availableStatTypes[0] ?? (STAT_TYPES.TOTAL as StatType);
  };

  const [scoreMode, setScoreMode] = useState<StatType>(() => pickInitialMode());

  useEffect(() => {
    setScoreMode(pickInitialMode());
  }, [availableStatTypes, defaultStatType]);

  const leaderboardChartData = useMemo<LeaderboardRow[]>(() => {
    if (!sessions?.length || !sortedPointCategories?.length) return [];

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

    const sessionById = new Map(sessions.map((s) => [s.id, s]));

    for (const [sessionId, entries] of entriesBySession.entries()) {
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

      const topScorerIds = Array.from(totalsThisSession.entries())
        .filter(([, total]) => total === bestTotal)
        .map(([userId]) => userId);

      // A tie breaker winner takes the whole win; an unresolved tie stays split between
      // everyone who shares the top total.
      const tieWinner = sessionById.get(sessionId)?.tieWinner;
      const winnerIds =
        topScorerIds.length > 1 && tieWinner && topScorerIds.includes(tieWinner)
          ? [tieWinner]
          : topScorerIds;

      for (const userId of winnerIds) {
        winsByUserId.set(userId, (winsByUserId.get(userId) ?? 0) + 1);
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

        for (const category of sortedPointCategories) {
          const totalForCategory = value.categories.get(category.id) ?? 0;

          const avgForCategory =
            sessionsCount > 0 ? totalForCategory / sessionsCount : 0;
          const roundedAvgForCategory = Math.round(avgForCategory);

          row[category.name] =
            scoreMode === STAT_TYPES.AVERAGE
              ? roundedAvgForCategory
              : totalForCategory;
        }

        return row;
      }
    );

    chartRows.sort((a, b) => {
      const totalA = sortedPointCategories.reduce((sum, category) => {
        const v = a[category.name];
        return sum + (typeof v === 'number' ? v : Number(v ?? 0));
      }, 0);

      const totalB = sortedPointCategories.reduce((sum, category) => {
        const v = b[category.name];
        return sum + (typeof v === 'number' ? v : Number(v ?? 0));
      }, 0);

      if (totalB !== totalA) return totalB - totalA;

      return String(a.name).localeCompare(String(b.name));
    });

    return chartRows;
  }, [sessions, users, sortedPointCategories, resultEntries, scoreMode]);

  const leaderboardSeries = useMemo(() => {
    const pointSeries = sortedPointCategories.map((category) => ({
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
  }, [sortedPointCategories]);

  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="flex-start"
        spacing={2}
      >
        <Stack direction="row" spacing={1}>
          <Typography variant="h6" sx={{ color: '#1b5e20' }}>
            {chartTitle}
          </Typography>

          {availableStatTypes.length === 1 && (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="center"
              spacing={0.5}
            >
              <InfoOutlined sx={{ fontSize: 14, color: '#666' }} />
              <Typography
                variant="caption"
                sx={{
                  fontStyle: 'italic',
                  color: '#666',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {availableStatTypes[0] === STAT_TYPES.TOTAL
                  ? 'Displaying total scores'
                  : 'Displaying average scores'}
              </Typography>
            </Stack>
          )}
        </Stack>

        {availableStatTypes.length > 1 && (
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
            {availableStatTypes.includes(STAT_TYPES.TOTAL as StatType) && (
              <ToggleButton
                value={STAT_TYPES.TOTAL as StatType}
                aria-label="Total scores"
              >
                Total
              </ToggleButton>
            )}

            {availableStatTypes.includes(STAT_TYPES.AVERAGE as StatType) && (
              <ToggleButton
                value={STAT_TYPES.AVERAGE as StatType}
                aria-label="Average scores"
              >
                Average
              </ToggleButton>
            )}
          </ToggleButtonGroup>
        )}
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
