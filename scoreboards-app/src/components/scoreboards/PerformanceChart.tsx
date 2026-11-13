import React, { useMemo } from 'react';
import { Stack, Typography } from '@mui/material';
import {
  LineChart,
  type LineChartSeries,
} from '../common/charts/LineChart.tsx';
import type { ResultEntry } from '../../types/ResultEntry.ts';
import type { Session } from '../../types/Session.ts';
import type { User } from '../../types/User.ts';

type PerformanceChartRow = {
  session: string;
  sessionTitle: string;
  [key: string]: string | number | null;
};

export type PerformanceChartProps = {
  sessions: Session[];
  users: User[];
  resultEntries: ResultEntry[];
  emptyText?: string;
  chartTitle?: string;
  isLoading?: boolean;
};

const USER_LINE_COLORS = [
  '#38a14f',
  '#1976d2',
  '#ff7043',
  '#842bfb',
  '#FF0000',
  '#f9a825',
  '#00FFFF',
  '#FF69B4',
  '#363636',
  '#895129',
  '#39FF14',
  '#00008B',
  '#65000B',
  '#452c63',
  '#E9967A',
  '#5F9EA0',
  '#E0115F',
  '#A0AD59',
  '#7B68EE',
  '#000000',
];

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  sessions,
  users,
  resultEntries,
  emptyText = 'Not enough finished sessions to display performance',
  chartTitle,
  isLoading = false,
}) => {
  const latestSessions = useMemo(() => {
    return [...(sessions ?? [])]
      .filter((session) => session.isActive && !session.isPending)
      .sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
      );
  }, [sessions]);

  const userSeries = useMemo<LineChartSeries[]>(() => {
    const userIdsWithScores = new Set(
      (resultEntries ?? [])
        .filter(
          (entry) =>
            !entry.isPending &&
            entry.isActive &&
            latestSessions.some((session) => session.id === entry.sessionId)
        )
        .map((entry) => entry.userId)
    );

    return users
      .filter((user) => user.isActive && userIdsWithScores.has(user.id))
      .map((user, index) => ({
        key: user.id,
        title: user.name || user.email || 'Unknown user',
        color: USER_LINE_COLORS[index % USER_LINE_COLORS.length],
        strokeWidth: 3,
      }));
  }, [latestSessions, resultEntries, users]);

  const chartData = useMemo<PerformanceChartRow[]>(() => {
    if (!latestSessions.length || !userSeries.length) return [];

    const entriesBySessionId = new Map<string, ResultEntry[]>();

    for (const entry of resultEntries ?? []) {
      if (entry.isPending || !entry.isActive) continue;

      const list = entriesBySessionId.get(entry.sessionId) ?? [];
      list.push(entry);
      entriesBySessionId.set(entry.sessionId, list);
    }

    return latestSessions.map((session, index) => {
      const row: PerformanceChartRow = {
        session: `S${index + 1}`,
        sessionTitle: session.name,
      };

      const sessionEntries = entriesBySessionId.get(session.id) ?? [];

      for (const series of userSeries) {
        const entry = sessionEntries.find((item) => item.userId === series.key);

        if (!entry) {
          row[series.key] = null;
          continue;
        }

        const calculatedTotal =
          typeof entry.totalPoints === 'number'
            ? entry.totalPoints
            : (entry.results ?? []).reduce(
                (sum, result) => sum + (result.points ?? 0),
                0
              );

        row[series.key] = calculatedTotal;
      }

      return row;
    });
  }, [latestSessions, resultEntries, userSeries]);

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

      <LineChart
        loading={isLoading}
        data={chartData}
        series={userSeries}
        xAxisDataKey="session"
        emptyText={emptyText}
        legendToggleEnabled
        showGrid
        showDots
        connectNulls={false}
        tooltipValueSuffix=" pts"
        tooltipLabelFormatter={(label, payload) =>
          `${payload.sessionTitle} (${label})`
        }
        valueFormatter={(value, seriesName) => [`${value} pts`, seriesName]}
        pagination
        pageSize={10}
      />
    </Stack>
  );
};
