import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Box, Paper, Typography, useMediaQuery } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  type LegendProps,
} from 'recharts';
import { LoadingSpinner } from '../spinner/LoadingSpinner.tsx';

export type ScoreBarSeries = {
  key: string; // Field name in each data row (e.g. 'Math', 'Scrabble', ...)
  title: string; // Legend label (and tooltip label)
  color: string; // Bar color
};

type ScoreBarChartRow = Record<string, string | number>;

type Props = {
  loading: boolean;
  data: ScoreBarChartRow[];
  barTitle?: string;

  direction: 'vertical' | 'horizontal';

  series: ScoreBarSeries[];

  /** Field name in each data row used for the axis label and leader identity. */
  labelKey?: string;

  /** Controls Recharts animation duration (ms) for each stacked segment. */
  animationDurationMs?: number;

  /**
   * If true, clicking a legend item isolates that single point category so the
   * chart only displays points from that category. Clicking it again (or the
   * active one) restores all categories.
   * If false, legend is non-interactive.
   */
  legendToggleEnabled?: boolean;

  /** Text shown when there is no data to display a bar chart. */
  emptyText?: string;

  /** If true, displays each user's avatar below their name on the axis. */
  showAvatars?: boolean;
};

const HIGHLIGHT_COLOR = '#ffb300';
const LEADER_TEXT_COLOR = '#1b5e20';
const DEFAULT_TEXT_COLOR = '#555';
const AVATAR_SIZE = 32;

export const ScoreBarChart: React.FC<Props> = ({
  loading,
  data,
  direction,
  barTitle,
  series,
  labelKey = 'name',
  animationDurationMs = 900,
  legendToggleEnabled = false,
  emptyText = 'No data to display',
  showAvatars = false,
}) => {
  const isHorizontal = direction === 'horizontal';
  const isMobile = useMediaQuery('(max-width:600px)');

  // When set, only this single point category is shown (isolation mode).
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Becomes true once the initial staggered load animation has finished. It
  // gates two behaviours: (1) toggling the legend afterwards updates the bars
  // instantly instead of re-running the staggered animation (which previously
  // left a delayed/empty bar "hovering" before drawing), and (2) the leader's
  // animated glow only switches on after the chart has loaded.
  const [animationComplete, setAnimationComplete] = useState(false);

  const selectSeries = (key: string) => {
    if (!legendToggleEnabled) return;
    // Toggle: clicking the already-isolated category restores all categories.
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  const visibleKeys = useMemo(() => {
    if (selectedKey) return [selectedKey];
    return series.map((s) => s.key);
  }, [series, selectedKey]);

  const totalKey = '__totalPoints';

  const computedData = useMemo<ScoreBarChartRow[]>(() => {
    return data.map((row) => {
      const total = visibleKeys.reduce((sum, k) => {
        const v = row[k];
        return sum + (typeof v === 'number' ? v : Number(v ?? 0));
      }, 0);

      return { ...row, [totalKey]: total };
    });
  }, [data, visibleKeys]);

  // Identify the leader (most points across the visible categories) so we can
  // highlight their name and bar.
  const leaderName = useMemo(() => {
    let best: { name: string; total: number } | null = null;
    for (const row of computedData) {
      const total = Number(row[totalKey] ?? 0);
      if (!best || total > best.total) {
        best = { name: String(row[labelKey] ?? ''), total };
      }
    }
    return best && best.total > 0 ? best.name : null;
  }, [computedData, labelKey]);

  const avatarByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of data) {
      const name = String(row[labelKey] ?? '');
      const avatar = row.avatar ? String(row.avatar) : '';
      if (name) map.set(name, avatar);
    }
    return map;
  }, [data, labelKey]);

  const hasData = Array.isArray(data) && data.length > 0;

  // Each stacked segment starts before the previous one has fully finished so
  // the whole chart loads quickly while still revealing one section at a time.
  // The overlap (and therefore overall speed) scales with animationDurationMs.
  const segmentStaggerMs = Math.round(animationDurationMs * 0.45);

  // Run the staggered reveal only on the initial load (per data set). Toggling
  // the legend afterwards must not re-trigger it, so selectedKey is not a dep.
  useEffect(() => {
    if (loading || !hasData) return;
    setAnimationComplete(false);
    const totalAnimationMs =
      Math.max(series.length - 1, 0) * segmentStaggerMs + animationDurationMs;
    const timer = setTimeout(
      () => setAnimationComplete(true),
      totalAnimationMs
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasData, data, series.length, animationDurationMs]);

  // The top-most visible segment carries the rounded corners and the total
  // label. During isolation only the selected category is visible, so it must
  // be the one that gets them — not the last series (which may be hidden).
  const topVisibleKey = selectedKey ?? series[series.length - 1]?.key;

  const renderAvatar = (
    cx: number,
    cy: number,
    name: string,
    avatarUrl: string | undefined,
    isLeader: boolean
  ) => (
    <foreignObject
      x={cx - AVATAR_SIZE / 2}
      y={cy}
      width={AVATAR_SIZE}
      height={AVATAR_SIZE}
      style={{ overflow: 'visible' }}
    >
      <Avatar
        src={avatarUrl || undefined}
        sx={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          fontSize: 14,
          bgcolor: '#38a14f',
          border: isLeader ? `2px solid ${HIGHLIGHT_COLOR}` : undefined,
          boxShadow: isLeader
            ? '0 0 8px rgba(255,179,0,0.65)'
            : '0 1px 3px rgba(0,0,0,0.18)',
        }}
      >
        {name.charAt(0).toUpperCase() || '?'}
      </Avatar>
    </foreignObject>
  );

  // Custom axis tick: renders the user's name, highlights the leader, and
  // (when enabled) shows the user's avatar below their name.
  const renderAxisTick = (props: {
    x: number;
    y: number;
    payload: { value: string | number };
  }) => {
    const { x, y, payload } = props;
    const name = String(payload.value ?? '');
    const isLeader = leaderName != null && name === leaderName;

    const avatarUrl = showAvatars ? avatarByName.get(name) : undefined;
    const fill = isLeader ? LEADER_TEXT_COLOR : DEFAULT_TEXT_COLOR;
    const fontWeight = isLeader ? 700 : 400;

    const maxLen = isMobile ? 10 : 999;
    const truncated =
      isMobile && name.length > maxLen ? `${name.slice(0, maxLen)}.` : name;

    const label = isLeader ? `👑 ${truncated}` : truncated;

    if (isHorizontal) {
      const avatarCx = showAvatars ? x - AVATAR_SIZE / 2 - 4 : x;
      const textX = showAvatars ? avatarCx - AVATAR_SIZE / 2 - 6 : x - 6;

      return (
        <g>
          <text
            x={textX}
            y={y}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={isMobile ? 10 : 12}
            fontWeight={fontWeight}
            fill={fill}
          >
            {label}
          </text>
          {showAvatars &&
            renderAvatar(
              avatarCx,
              y - AVATAR_SIZE / 2,
              name,
              avatarUrl,
              isLeader
            )}
        </g>
      );
    }

    // Names sit on the X axis (below the chart); the avatar sits below the name.
    return (
      <g>
        <text
          x={x}
          y={y + (!showAvatars ? 22 : 14)}
          textAnchor="middle"
          fontSize={isMobile ? 10 : 12}
          fontWeight={fontWeight}
          fill={fill}
          transform={
            !showAvatars
              ? `rotate(-45 ${x} ${y + (!showAvatars ? 22 : 14)})`
              : undefined
          }
        >
          {label}
        </text>
        {showAvatars && renderAvatar(x, y + 22, name, avatarUrl, isLeader)}
      </g>
    );
  };

  const xAxis = useMemo(() => {
    if (isHorizontal) return <XAxis type="number" allowDecimals={false} />;
    return (
      <XAxis
        dataKey={labelKey}
        interval={0}
        height={showAvatars ? 72 : isMobile ? 48 : 28}
        tick={renderAxisTick}
      />
    );
  }, [isHorizontal, showAvatars, leaderName, avatarByName, labelKey, isMobile]);

  const yAxis = useMemo(() => {
    if (isHorizontal)
      return (
        <YAxis
          dataKey={labelKey}
          type="category"
          width={showAvatars ? 150 : isMobile ? 110 : 100}
          tick={renderAxisTick}
        />
      );
    return <YAxis />;
  }, [isHorizontal, showAvatars, leaderName, avatarByName, labelKey, isMobile]);

  if (loading) return <LoadingSpinner />;

  const CustomLegend: React.FC<LegendProps> = () => {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 12,
          padding: '0 4px',
        }}
      >
        {series.map((s) => {
          const isDimmed = selectedKey !== null && selectedKey !== s.key;

          return (
            <button
              key={s.key}
              type="button"
              onClick={() => selectSeries(s.key)}
              style={{
                cursor: legendToggleEnabled ? 'pointer' : 'default',
                background: isDimmed ? 'rgba(0,0,0,0.03)' : '#fff',
                border:
                  selectedKey === s.key
                    ? `1px solid ${s.color}`
                    : '1px solid rgba(0,0,0,0.10)',
                borderRadius: 999,
                padding: '7px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                opacity: isDimmed ? 0.45 : 1,
                pointerEvents: legendToggleEnabled ? 'auto' : 'none',
                transition: 'all 160ms ease',
              }}
              aria-pressed={selectedKey === s.key}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: s.color,
                  display: 'inline-block',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.9) inset',
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  userSelect: 'none',
                  fontWeight: selectedKey === s.key ? 700 : 400,
                }}
              >
                {s.title}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid rgba(56, 161, 79, 0.14)',
        background: 'linear-gradient(180deg, #ffffff 0%, #fbfdfb 100%)',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.06)',
      }}
    >
      {!hasData ? (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2.5 },
            pb: { xs: 4, sm: 5 },
            pt: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 200,
          }}
        >
          <Typography variant="body2" sx={{ color: '#9e9e9e' }}>
            {emptyText}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pb: { xs: 2, sm: 3 }, pt: 4 }}>
          {legendToggleEnabled && <CustomLegend />}
          <ResponsiveContainer width="100%" height={430}>
            <BarChart
              data={computedData}
              margin={{ top: 24, right: 24, left: 8, bottom: 20 }}
              layout={isHorizontal ? 'vertical' : 'horizontal'}
              barCategoryGap="35%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              {xAxis}

              <Tooltip
                cursor={{ fill: 'rgba(56, 161, 79, 0.06)' }}
                contentStyle={{
                  borderRadius: 14,
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.10)',
                }}
                formatter={(value, name) => {
                  const v =
                    typeof value === 'number' ? value : Number(value ?? 0);
                  return [`${v} ${barTitle ?? ''}`.trim(), name];
                }}
                labelStyle={{ fontWeight: 700, marginBottom: 4 }}
              />

              {series.map((s, idx) => {
                const isHidden = selectedKey !== null && selectedKey !== s.key;
                const isTopSegment = s.key === topVisibleKey;

                return (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.title}
                    fill={s.color}
                    stackId="stack"
                    hide={isHidden}
                    barSize={28}
                    maxBarSize={30}
                    radius={isTopSegment ? [7, 7, 0, 0] : [0, 0, 0, 0]}
                    // Animate only during the initial staggered reveal. After
                    // that, legend toggles update bars instantly.
                    isAnimationActive={!animationComplete}
                    animationDuration={
                      animationComplete ? 0 : animationDurationMs
                    }
                    animationEasing="ease-out"
                    animationBegin={
                      animationComplete ? 0 : idx * segmentStaggerMs
                    }
                  >
                    {computedData.map((row) => {
                      const rowLabel = String(row[labelKey] ?? '');
                      const isLeader =
                        leaderName != null && rowLabel === leaderName;
                      // Gold edges appear only once loaded.
                      const showGlow = isLeader && animationComplete;
                      return (
                        <Cell
                          key={`${s.key}-${rowLabel}`}
                          fill={s.color}
                          stroke={showGlow ? HIGHLIGHT_COLOR : undefined}
                          strokeWidth={showGlow ? 2 : 0}
                          className={showGlow ? 'leader-bar' : undefined}
                        />
                      );
                    })}

                    {isTopSegment && !isHorizontal ? (
                      <LabelList
                        dataKey={totalKey}
                        position="top"
                        formatter={(v: unknown) => `${v}`}
                        style={{
                          fill: '#1b5e20',
                          fontWeight: 700,
                          fontSize: 12,
                          strokeWidth: 0,
                        }}
                      />
                    ) : null}
                  </Bar>
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};
