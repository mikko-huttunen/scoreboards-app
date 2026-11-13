import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Paper,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  XAxis,
  Tooltip,
  LabelList,
  type LegendProps,
} from 'recharts';
import { LoadingSpinner } from '../spinner/LoadingSpinner.tsx';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';

export type ScoreBarSeries = {
  key: string;
  title: string;
  color: string;
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
  emptyText?: string;
  showAvatars?: boolean;
  pagination?: boolean;
  pageSize?: number;

  /**
   * Label values that get the crown and highlight instead of the rows with the highest total.
   * Used when the winner is decided by something the chart cannot see, such as a session's tie
   * breaker. Ignored while a single category is selected, which keeps highlighting that
   * category's own leader.
   */
  leaderLabels?: string[];
};

const HIGHLIGHT_COLOR = '#ffb300';
const LEADER_TEXT_COLOR = '#1b5e20';
const DEFAULT_TEXT_COLOR = '#555';
const AVATAR_SIZE = 34;

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
  pagination = true,
  pageSize = 10,
  leaderLabels,
}) => {
  const isHorizontal = direction === 'horizontal';
  const isMobile = useMediaQuery('(max-width:900px)');
  const isSmallMobile = useMediaQuery('(max-width:600px)');
  const truncateWidths = isMobile && data.length > 5;
  const rotateNames = useMediaQuery('(max-width:1400px)') && data.length > 8;

  const avatarSize = truncateWidths ? 26 : AVATAR_SIZE;
  const avatarFontSize = truncateWidths ? 12 : 14;
  const avatarYSpacing =
    truncateWidths || isSmallMobile || rotateNames ? 40 : 22;

  //These series are excluded from the chart's computed "total".
  const totalExcludes = ['Total Wins', 'Total Sessions'];
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  const selectSeries = (key: string) => {
    if (!legendToggleEnabled) return;
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  const visibleKeys = useMemo(() => {
    if (selectedKey) return [selectedKey];

    return series.map((s) => s.key).filter((k) => !totalExcludes.includes(k));
  }, [series, selectedKey]);

  const totalKey = '__totalPoints';

  const safePageSize = Math.max(1, pageSize);
  const maxPageStart = Math.max(0, (data?.length ?? 0) - safePageSize);

  const [startPage, setStartPage] = useState<number>(() => {
    if (!pagination) return 0;
    return 0;
  });

  useEffect(() => {
    if (!pagination) return;
    setStartPage(0);
  }, [data?.length, safePageSize, pagination]);

  const canPrev = pagination && data.length > safePageSize && startPage > 0;
  const canNext =
    pagination && data.length > safePageSize && startPage < maxPageStart;

  const computedDataAll = useMemo<ScoreBarChartRow[]>(() => {
    const withTotals = data.map((row) => {
      if (selectedKey && totalExcludes.includes(selectedKey)) {
        const v = row[selectedKey];
        return {
          ...row,
          [totalKey]: typeof v === 'number' ? v : Number(v ?? 0),
        };
      }

      const total = visibleKeys.reduce((sum, k) => {
        if (totalExcludes.includes(k)) return sum;

        const v = row[k];
        return sum + (typeof v === 'number' ? v : Number(v ?? 0));
      }, 0);

      return { ...row, [totalKey]: total };
    });

    const sortKey: string =
      selectedKey && !totalExcludes.includes(selectedKey)
        ? selectedKey
        : totalKey;

    const toNumber = (r: ScoreBarChartRow, key: string): number => {
      const indexable = r as Record<string, string | number>;
      return Number(indexable[key] ?? 0);
    };

    return [...withTotals].sort((a, b) => {
      const aVal = toNumber(a, sortKey);
      const bVal = toNumber(b, sortKey);

      if (bVal !== aVal) return bVal - aVal;

      const aName = String((a as Record<string, unknown>)[labelKey] ?? '');
      const bName = String((b as Record<string, unknown>)[labelKey] ?? '');
      return aName.localeCompare(bName);
    });
  }, [data, visibleKeys, totalExcludes, selectedKey, labelKey, totalKey]);

  const computedData = useMemo<ScoreBarChartRow[]>(() => {
    if (!pagination) return computedDataAll;
    if (!computedDataAll.length || computedDataAll.length <= safePageSize)
      return computedDataAll;
    return computedDataAll.slice(startPage, startPage + safePageSize);
  }, [computedDataAll, pagination, safePageSize, startPage]);

  const leaderNames = useMemo(() => {
    // The caller knows the winner (tie breaker, for instance), so the totals do not decide it.
    if (leaderLabels && !selectedKey) return new Set(leaderLabels);

    let bestTotal = -Infinity;

    for (const row of computedDataAll) {
      const total = Number(row[totalKey] ?? 0);
      if (total > bestTotal) bestTotal = total;
    }

    if (bestTotal <= 0) return new Set<string>();

    const winners = new Set<string>();
    for (const row of computedDataAll) {
      const total = Number(row[totalKey] ?? 0);
      if (total === bestTotal) {
        winners.add(String(row[labelKey] ?? ''));
      }
    }

    return winners;
  }, [computedDataAll, labelKey, leaderLabels, selectedKey]);

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
  const segmentStaggerMs = Math.round(animationDurationMs * 0.45);

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
  }, [loading, hasData, data, series.length, animationDurationMs]);

  const topVisibleKey =
    selectedKey ??
    visibleKeys[visibleKeys.length - 1] ??
    series[series.length - 1]?.key;

  const renderAvatar = useCallback(
    (
      cx: number,
      cy: number,
      name: string,
      avatarUrl: string | undefined,
      isLeader: boolean
    ) => (
      <foreignObject
        x={cx - avatarSize / 2}
        y={cy}
        width={avatarSize}
        height={avatarSize}
        style={{ overflow: 'visible' }}
      >
        <Avatar
          src={avatarUrl || undefined}
          sx={{
            width: avatarSize,
            height: avatarSize,
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
    ),
    [avatarSize, avatarFontSize]
  );

  const renderAxisTick = useCallback(
    (props: { x: number; y: number; payload: { value: string | number } }) => {
      const { x, y, payload } = props;
      const name = String(payload.value ?? '');
      const isLeader = leaderNames.has(name);

      const avatarUrl = showAvatars ? avatarByName.get(name) : undefined;
      const fill = isLeader ? LEADER_TEXT_COLOR : DEFAULT_TEXT_COLOR;
      const fontWeight = isLeader ? 700 : 400;

      const maxLen = truncateWidths || isSmallMobile || rotateNames ? 8 : 999;
      const truncated =
        (truncateWidths || isSmallMobile || rotateNames) && name.length > maxLen
          ? `${name.slice(0, maxLen)}.`
          : name;

      const label = isLeader ? `👑 ${truncated}` : truncated;

      const rotateLabel = truncateWidths || isSmallMobile || rotateNames;
      const labelYOffset = rotateLabel ? 22 : 14;

      if (isHorizontal) {
        const avatarCx = showAvatars ? x - AVATAR_SIZE / 2 - 4 : x;
        const textX = showAvatars ? avatarCx - AVATAR_SIZE / 2 - 6 : x - 6;

        return (
          <g>
            <text
              x={textX}
              y={y + labelYOffset}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={rotateLabel ? 10 : 12}
              fontWeight={fontWeight}
              fill={fill}
              transform={rotateLabel ? `rotate(-45 ${x} ${y + 22})` : undefined}
            >
              {label}
            </text>
            {showAvatars &&
              renderAvatar(x, y + avatarYSpacing, name, avatarUrl, isLeader)}
          </g>
        );
      }

      return (
        <g>
          <text
            x={x}
            y={y + labelYOffset}
            textAnchor="middle"
            fontSize={rotateLabel ? 10 : 12}
            fontWeight={fontWeight}
            fill={fill}
            transform={rotateLabel ? `rotate(-45 ${x} ${y + 22})` : undefined}
          >
            {label}
          </text>
          {showAvatars &&
            renderAvatar(x, y + avatarYSpacing, name, avatarUrl, isLeader)}
        </g>
      );
    },
    [
      avatarByName,
      renderAvatar,
      truncateWidths,
      isHorizontal,
      isSmallMobile,
      rotateNames,
      showAvatars,
      leaderNames,
      avatarYSpacing,
    ]
  );

  const xAxis = useMemo(() => {
    if (isHorizontal) return <XAxis type="number" allowDecimals={false} />;
    return (
      <XAxis
        dataKey={labelKey}
        interval={0}
        height={72}
        tick={renderAxisTick}
      />
    );
  }, [isHorizontal, labelKey, isMobile, renderAxisTick]);

  const Legend = useMemo(() => {
    if (!legendToggleEnabled) return null;

    const fixedKeys = totalExcludes;

    const CustomLegend: React.FC<LegendProps> = () => {
      const otherSeries = series.filter((s) => !fixedKeys.includes(s.key));
      const fixedSeries = series.filter((s) => fixedKeys.includes(s.key));

      const renderLegendButton = (s: ScoreBarSeries) => {
        const isFixed = fixedKeys.includes(s.key);
        const isDimmed =
          !isFixed && selectedKey !== null && selectedKey !== s.key;

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
              whiteSpace: 'nowrap',
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
      };

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 12,
            padding: '0 4px',
          }}
        >
          {fixedSeries.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              {fixedSeries.map(renderLegendButton)}
            </div>
          )}

          {otherSeries.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              {otherSeries.map(renderLegendButton)}
            </div>
          )}
        </div>
      );
    };

    return <CustomLegend />;
  }, [legendToggleEnabled, selectedKey, series, selectSeries, totalExcludes]);

  if (loading) return <LoadingSpinner />;

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
        <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pb: 1, pt: 4 }}>
          {Legend}
          {pagination && data.length > safePageSize && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                mb: 1,
              }}
            >
              <Button
                onClick={() =>
                  setStartPage((v) => Math.max(0, v - safePageSize))
                }
                disabled={!canPrev}
                sx={{ color: '#1b5e20' }}
              >
                <KeyboardArrowLeft />
              </Button>

              <Typography variant="caption" sx={{ color: '#666' }}>
                Showing {startPage + 1}–
                {Math.min(data.length, startPage + safePageSize)} of{' '}
                {data.length}
              </Typography>

              <Button
                onClick={() =>
                  setStartPage((v) => Math.min(maxPageStart, v + safePageSize))
                }
                disabled={!canNext}
                sx={{ color: '#1b5e20' }}
              >
                <KeyboardArrowRight />
              </Button>
            </Box>
          )}
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
                const isHidden =
                  (selectedKey !== null && selectedKey !== s.key) ||
                  (selectedKey === null && totalExcludes.includes(s.key));

                const isTopSegment = s.key === topVisibleKey;

                return (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.title}
                    fill={s.color}
                    stackId="stack"
                    hide={isHidden}
                    maxBarSize={100}
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
                      const isLeader = leaderNames.has(rowLabel);
                      const showGlow = isLeader && animationComplete;

                      return (
                        <Cell
                          key={`${s.key}-${rowLabel}`}
                          fill={s.color}
                          strokeWidth={showGlow ? 2 : 0}
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
