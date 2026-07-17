import React, { useCallback, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import type { PointCategory } from '../../../types/PointCategory.ts';
import type { ResultEntry } from '../../../types/ResultEntry.ts';
import type { User } from '../../../types/User.ts';

type ResultBarChartParticipant = Pick<User, 'id' | 'name' | 'email' | 'avatar'>;

type ResultBarChartProps = {
  participants: ResultBarChartParticipant[];
  results: ResultEntry[];
  pointCategories: PointCategory[];
  chartTitle?: string;
  emptyText?: string;
  onFinished?: () => void;

  /**
   * Animation speed control: milliseconds per stacked segment.
   * Default: 3000ms (3 seconds per segment).
   */
  segmentDurationMs?: number;
};

type TotalChartRow = {
  name: string;
  avatar: string;
  __grandTotal: number;
  [key: string]: string | number;
};

type CategoryChartRow = {
  name: string;
  avatar: string;
  points: number;
};

const HIGHLIGHT_COLOR = '#ffb300';
const LEADER_TEXT_COLOR = '#1b5e20';
const DEFAULT_TEXT_COLOR = '#546e5a';
const AVATAR_SIZE = 34;

type FlowStep = 'idle' | 'animating' | 'finished';

export const ResultBarChart: React.FC<ResultBarChartProps> = ({
  participants,
  results,
  pointCategories,
  emptyText = 'No results to display',
  onFinished,
  segmentDurationMs = 2000,
}) => {
  const [step, setStep] = useState<FlowStep>('idle');
  const [revealedSegmentCount, setRevealedSegmentCount] = useState<number>(0);
  const [selectedCategoryIdForLegend, setSelectedCategoryIdForLegend] =
    useState<string | null>(null);
  const isMobile = useMediaQuery('(max-width:900px)');
  const isSmallMobile = useMediaQuery('(max-width:600px)');
  const truncateWidths = isMobile && participants.length > 5;
  const rotateNames =
    useMediaQuery('(max-width:1400px)') && participants.length > 8;

  const segmentRevealDelayMs = 2000;

  const avatarSize = truncateWidths ? 26 : AVATAR_SIZE;
  const avatarFontSize = truncateWidths ? 12 : 14;
  const avatarYSpacing =
    truncateWidths || isSmallMobile || rotateNames ? 40 : 22;

  const presentCategoryIdsFromResults = useMemo(() => {
    const ids = new Set<string>();

    for (const entry of results ?? []) {
      if (entry.isPending) continue;
      if (entry.isActive === false) continue;

      for (const r of entry.results ?? []) {
        if (r?.pointCategoryId) ids.add(r.pointCategoryId);
      }
    }

    return ids;
  }, [results]);

  const effectivePointCategories = useMemo(() => {
    // Only keep categories that actually appear in this session's result data
    return pointCategories.filter((c) =>
      presentCategoryIdsFromResults.has(c.id)
    );
  }, [pointCategories, presentCategoryIdsFromResults]);

  const userById = useMemo(
    () =>
      new Map(participants.map((participant) => [participant.id, participant])),
    [participants]
  );

  const totalsByUserId = useMemo(() => {
    const totals = new Map<
      string,
      {
        name: string;
        avatar: string;
        total: number;
        categories: Map<string, number>;
      }
    >();

    for (const participant of participants) {
      totals.set(participant.id, {
        name: participant.name || participant.email || '[Removed user]',
        avatar: participant.avatar ?? '',
        total: 0,
        categories: new Map<string, number>(),
      });
    }

    const presentCategoryIds = new Set(pointCategories.map((c) => c.id));

    for (const entry of results ?? []) {
      if (entry.isPending) continue;
      if (!entry.isActive) continue;

      const participant = userById.get(entry.userId);
      const participantName =
        participant?.name || participant?.email || '[Removed user]';
      const participantAvatar = participant?.avatar ?? '';

      const existing = totals.get(entry.userId) ?? {
        name: participantName,
        avatar: participantAvatar,
        total: 0,
        categories: new Map<string, number>(),
      };

      for (const result of entry.results ?? []) {
        // Only count points for point categories that exist in the session
        if (!presentCategoryIds.has(result.pointCategoryId)) continue;

        const prev = existing.categories.get(result.pointCategoryId) ?? 0;
        const next = prev + (result.points ?? 0);
        existing.categories.set(result.pointCategoryId, next);
        existing.total += result.points ?? 0;
      }

      totals.set(entry.userId, existing);
    }

    return totals;
  }, [participants, results, userById, pointCategories]);

  const orderedParticipants = useMemo(() => {
    return Array.from(totalsByUserId.entries())
      .map(([userId, value]) => ({
        userId,
        name: value.name,
        avatar: value.avatar,
        total: value.total,
        categories: value.categories,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [totalsByUserId]);

  const avatarUrlByName = useMemo(() => {
    // Faster lookup for axis ticks (avoids orderedParticipants.find(...) per tick).
    const map = new Map<string, string>();
    for (const p of orderedParticipants) {
      if (p.name) map.set(p.name, p.avatar ?? '');
    }
    return map;
  }, [orderedParticipants]);

  const hasData =
    participants.length > 0 &&
    effectivePointCategories.length > 0 &&
    orderedParticipants.length > 0;

  const categoryLeadersById = useMemo(() => {
    // For each point category, find the leading user(s).
    const map = new Map<
      string,
      {
        leaders: { name: string; avatar: string }[];
        score: number;
        isTie: boolean;
      }
    >();

    for (const category of pointCategories) {
      let bestScore = 0;
      for (const p of orderedParticipants) {
        const score = p.categories.get(category.id) ?? 0;
        if (score > bestScore) bestScore = score;
      }

      if (bestScore <= 0) {
        map.set(category.id, { leaders: [], score: 0, isTie: false });
        continue;
      }

      const leaders = orderedParticipants
        .filter((p) => (p.categories.get(category.id) ?? 0) === bestScore)
        .map((p) => ({ name: p.name, avatar: p.avatar }));

      map.set(category.id, {
        leaders,
        score: bestScore,
        isTie: leaders.length > 1,
      });
    }

    return map;
  }, [orderedParticipants, pointCategories]);

  const totalWinner = useMemo(() => {
    // keep the winner calculation hidden until the flow is finished
    if (step !== 'finished') return null;

    if (orderedParticipants.length === 0) return null;

    const highestTotal = Math.max(...orderedParticipants.map((p) => p.total));
    if (highestTotal <= 0) return null;

    const winners = orderedParticipants.filter((p) => p.total === highestTotal);
    return { score: highestTotal, winners, isTie: winners.length > 1 };
  }, [orderedParticipants, step]);

  const totalLeaderNames = useMemo(() => {
    if (!totalWinner) return new Set<string>();
    return new Set(totalWinner.winners.map((w) => w.name));
  }, [totalWinner]);

  const totalSeries = useMemo(
    () =>
      effectivePointCategories.map((category) => ({
        key: category.id,
        title: category.name,
        color: category.color,
      })),
    [effectivePointCategories]
  );

  const totalChartData = useMemo<TotalChartRow[]>(() => {
    return orderedParticipants.map((participant) => {
      let grandTotal = 0;
      const row: TotalChartRow & { __grandTotal: number } = {
        name: participant.name,
        avatar: participant.avatar,
        __grandTotal: 0,
      };

      for (const category of effectivePointCategories) {
        const v = Number(participant.categories.get(category.id) ?? 0);

        row[category.id] = v;
        grandTotal += v;
      }

      row.__grandTotal = grandTotal;
      return row;
    });
  }, [orderedParticipants, effectivePointCategories]);

  // If we are in “category highlight” mode, we highlight category leaders only (after finished).
  const currentCategoryLeaderNames = useMemo(() => {
    if (!selectedCategoryIdForLegend) return new Set<string>();
    const entry = categoryLeadersById.get(selectedCategoryIdForLegend);
    const names = entry?.leaders.map((l) => l.name) ?? [];
    return new Set(names);
  }, [categoryLeadersById, selectedCategoryIdForLegend]);

  const leaderNameForAxis = useMemo(() => {
    if (step !== 'finished') return new Set<string>();
    // Highlight category leaders only when a category is selected; otherwise nothing until winner view is complete.
    return selectedCategoryIdForLegend
      ? currentCategoryLeaderNames
      : new Set<string>();
  }, [currentCategoryLeaderNames, selectedCategoryIdForLegend, step]);

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
            fontSize: avatarFontSize,
            bgcolor: '#38a14f',
            border: isLeader ? `2px solid ${HIGHLIGHT_COLOR}` : undefined,
            boxShadow: isLeader
              ? '0 0 10px rgba(255,179,0,0.7)'
              : '0 4px 10px rgba(0,0,0,0.14)',
          }}
        >
          {name.charAt(0).toUpperCase() || '?'}
        </Avatar>
      </foreignObject>
    ),
    [avatarSize, avatarFontSize]
  );

  const hasFinishedAllSegments = step === 'finished';

  const renderAxisTick = useCallback(
    (props: { x: number; y: number; payload: { value: string | number } }) => {
      const { x, y, payload } = props;
      const name = String(payload.value ?? '');

      const isCategoryLeader =
        step === 'finished' && leaderNameForAxis.has(name);
      const isTotalLeader =
        step === 'finished' &&
        hasFinishedAllSegments &&
        !selectedCategoryIdForLegend &&
        totalLeaderNames.has(name);

      const isLeader = isCategoryLeader || isTotalLeader;

      // O(1) lookup instead of orderedParticipants.find(...) (O(n) per tick)
      const avatarUrl = avatarUrlByName.get(name) ?? '';

      const maxLen = truncateWidths || isSmallMobile || rotateNames ? 8 : 999;
      const truncated =
        (truncateWidths || isSmallMobile || rotateNames) && name.length > maxLen
          ? `${name.slice(0, maxLen)}.`
          : name;

      return (
        <g>
          <text
            x={x}
            y={y + (truncateWidths || isSmallMobile || rotateNames ? 22 : 14)}
            textAnchor="middle"
            fontSize={truncateWidths || isSmallMobile || rotateNames ? 10 : 12}
            fontWeight={isLeader ? 800 : 500}
            fill={isLeader ? LEADER_TEXT_COLOR : DEFAULT_TEXT_COLOR}
            transform={
              truncateWidths || isSmallMobile || rotateNames
                ? `rotate(-45 ${x} ${y + 22})`
                : undefined
            }
          >
            {isLeader ? `👑 ${truncated}` : truncated}
          </text>

          {renderAvatar(x, y + avatarYSpacing, name, avatarUrl, isLeader)}
        </g>
      );
    },
    [
      step,
      leaderNameForAxis,
      hasFinishedAllSegments,
      selectedCategoryIdForLegend,
      totalLeaderNames,
      avatarUrlByName, // new
      renderAvatar,
      truncateWidths,
      rotateNames,
      isSmallMobile,
      avatarYSpacing,
    ]
  );

  const startAnimation = useCallback(() => {
    if (!hasData || step !== 'idle') return;

    setStep('animating');
    setRevealedSegmentCount(0);

    const totalSegments = totalSeries.length;
    const timers: number[] = [];

    // Reveal each segment at i * (segmentDurationMs + segmentRevealDelayMs)
    for (let i = 0; i < totalSegments; i++) {
      const t = window.setTimeout(
        () => {
          setRevealedSegmentCount(i + 1);
        },
        i * (segmentDurationMs + segmentRevealDelayMs)
      );
      timers.push(t);
    }

    const finishedTimeout = window.setTimeout(
      () => {
        setStep('finished');
        onFinished?.();
      },
      (totalSegments - 1) * (segmentDurationMs + segmentRevealDelayMs) +
        segmentDurationMs +
        segmentRevealDelayMs
    );
    timers.push(finishedTimeout);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [hasData, onFinished, segmentDurationMs, step, totalSeries.length]);

  const handleSkip = useCallback(() => {
    if (!hasData) return;
    setRevealedSegmentCount(totalSeries.length);
    setStep('finished');
    onFinished?.();
  }, [hasData, onFinished, totalSeries.length]);

  const currentCategoryDuringCalc = useMemo(() => {
    if (step !== 'animating') return null;
    const idx = revealedSegmentCount - 1;
    if (idx < 0) return null;
    return totalSeries[idx] ?? null;
  }, [revealedSegmentCount, step, totalSeries]);

  const currentCategoryIndexLabel = useMemo(() => {
    if (step !== 'animating' || !currentCategoryDuringCalc) return null;
    const currentIdx = totalSeries.findIndex(
      (c) => c.key === currentCategoryDuringCalc.key
    );
    if (currentIdx < 0) return null;
    const total = effectivePointCategories.length || totalSeries.length;
    return `${currentIdx + 1}/${total}`;
  }, [
    step,
    currentCategoryDuringCalc,
    totalSeries,
    effectivePointCategories.length,
  ]);

  const currentButtonLabel = useMemo(() => {
    if (step === 'idle') return 'Start';
    if (step === 'animating') return 'Revealing…';
    return 'Completed';
  }, [step]);

  const totalWinnerCardText = useMemo(() => {
    if (!totalWinner) return 'No winner';
    if (totalWinner.isTie) return `Tie at ${totalWinner.score} points.`;
    return `${totalWinner.winners[0]?.name} won with ${totalWinner.score} points.`;
  }, [totalWinner]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryIdForLegend) return null;
    return (
      effectivePointCategories.find(
        (c) => c.id === selectedCategoryIdForLegend
      ) ?? null
    );
  }, [effectivePointCategories, selectedCategoryIdForLegend]);

  const selectedCategoryData = useMemo<CategoryChartRow[]>(() => {
    if (!selectedCategory) return [];
    return orderedParticipants.map((p) => ({
      name: p.name,
      avatar: p.avatar,
      points: p.categories.get(selectedCategory.id) ?? 0,
    }));
  }, [orderedParticipants, selectedCategory]);

  if (!hasData) {
    return (
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          borderRadius: 4,
          border: '1px solid rgba(56, 161, 79, 0.14)',
          background:
            'linear-gradient(180deg, #ffffff 0%, #f6fbf7 45%, #eef8f0 100%)',
          boxShadow: '0 16px 38px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box
          sx={{
            minHeight: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 3,
          }}
        >
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {emptyText}
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          height: isMobile ? '83vh' : '92vh',
          borderRadius: 4,
          border: '1px solid rgba(56, 161, 79, 0.14)',
          background:
            'linear-gradient(180deg, #ffffff 0%, #f6fbf7 45%, #eef8f0 100%)',
          boxShadow: '0 16px 38px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box sx={{ pt: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {step === 'animating' && currentCategoryDuringCalc && (
              <Box
                sx={{
                  mt: 1,
                  px: 2,
                  py: 1.2,
                  borderRadius: 3,
                  border: `1px solid rgba(0,0,0,0.08)`,
                  background: 'rgba(255,255,255,0.7)',
                  boxShadow: '0 10px 22px rgba(0,0,0,0.06)',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      background: currentCategoryDuringCalc.color ?? '#38a14f',
                      boxShadow: '0 0 0 4px rgba(56,161,79,0.12)',
                      flex: '0 0 auto',
                    }}
                  />
                  <Stack spacing={0}>
                    <Stack direction="row" alignItems="baseline" spacing={1}>
                      <Typography
                        variant="subtitle2"
                        sx={{ color: 'text.secondary', fontWeight: 700 }}
                      >
                        Current category
                      </Typography>

                      {currentCategoryIndexLabel && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#1b5e20',
                            fontWeight: 800,
                            ml: 0.5,
                          }}
                        >
                          {currentCategoryIndexLabel}
                        </Typography>
                      )}
                    </Stack>

                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        color: '#1b5e20',
                        lineHeight: 1.1,
                      }}
                    >
                      {currentCategoryDuringCalc.title}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            )}

            {hasFinishedAllSegments && (
              <Box
                sx={{
                  width: '100%',
                  px: 2,
                  py: 1.5,
                  borderRadius: 3,
                  background:
                    'linear-gradient(135deg, rgba(255,243,205,0.95) 0%, rgba(255,248,225,1) 100%)',
                  border: '1px solid rgba(255179,0.32)',
                  boxShadow: '0 10px 25px rgba(255, 179, 0, 0.12)',
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800, color: '#8a5a00' }}
                >
                  🏆 Winner
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {totalWinnerCardText}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>

        <Box
          sx={{
            height: hasFinishedAllSegments
              ? isMobile
                ? '60vh'
                : '78vh'
              : isMobile
                ? '74vh'
                : '88vh',
            px: { xs: 1.5, sm: 2.5 },
          }}
        >
          {step === 'idle' ? (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                padding: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(240,248,242,1) 100%)',
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  color: '#546e5a',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                Press start to watch results calculation. Press skip to view the
                results.
              </Typography>
              <div style={{ display: 'flex', gap: '20px', marginTop: 24 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={startAnimation}
                  disabled={step !== 'idle'}
                  sx={{
                    px: 3.5,
                    py: 1.4,
                    fontWeight: 800,
                    textTransform: 'none',
                    background:
                      'linear-gradient(135deg, #38a14f 0%, #2e7d32 100%)',
                    boxShadow: '0 10px 24px rgba(56, 161, 79, 0.26)',
                  }}
                >
                  {currentButtonLabel}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleSkip}
                  disabled={step !== 'idle'}
                  sx={{
                    px: 3.5,
                    py: 1.4,
                    fontWeight: 800,
                    textTransform: 'none',
                    borderColor: 'rgba(56, 161, 79, 0.32)',
                    color: '#2e7d32',
                    backgroundColor: '#fff',
                  }}
                >
                  Skip
                </Button>
              </div>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {/* ... existing BarChart rendering stays exactly as-is ... */}
              {/* 1) Stacked totals animation mode */}
              {!selectedCategoryIdForLegend || !hasFinishedAllSegments ? (
                <BarChart
                  data={totalChartData}
                  margin={{
                    top: 24,
                    right: 24,
                    left: 8,
                    bottom:
                      hasFinishedAllSegments && !isMobile
                        ? 20
                        : isMobile
                          ? 0
                          : 50,
                  }}
                  layout="horizontal"
                  barCategoryGap="35%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0,0,0,0.08)"
                  />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    height={isMobile ? 88 : 72}
                    tick={renderAxisTick}
                  />

                  {totalSeries.map((series, idx) => {
                    const isTopSegment = idx === totalSeries.length - 1;
                    const showTotalLabel = isTopSegment;

                    return (
                      <Bar
                        key={series.key}
                        dataKey={series.key}
                        name={series.title}
                        fill={series.color}
                        stackId="total"
                        maxBarSize={100}
                        radius={isTopSegment ? [7, 7, 0, 0] : [0, 0, 0, 0]}
                        isAnimationActive={
                          step === 'animating' || step === 'finished'
                        }
                        animationDuration={
                          step === 'animating' ? segmentDurationMs : 0
                        }
                        animationEasing="ease-out"
                        animationBegin={
                          step === 'animating'
                            ? idx * (segmentDurationMs + segmentRevealDelayMs)
                            : 0
                        }
                      >
                        {totalChartData.map((row) => {
                          const participantName = String(row.name ?? '');
                          const isTotalLeader =
                            hasFinishedAllSegments &&
                            totalLeaderNames.has(participantName);

                          return (
                            <Cell
                              key={`${series.key}-${participantName}`}
                              stroke={
                                isTotalLeader ? HIGHLIGHT_COLOR : undefined
                              }
                              strokeWidth={isTotalLeader ? 2 : 0}
                            />
                          );
                        })}

                        {showTotalLabel ? (
                          <LabelList
                            dataKey="__grandTotal"
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
              ) : (
                // 2) Category highlight mode (after finished)
                <BarChart
                  data={selectedCategoryData}
                  margin={{ top: 24, right: 24, left: 8, bottom: 20 }}
                  layout="horizontal"
                  barCategoryGap="35%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0,0,0,0.08)"
                  />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    height={isMobile ? 88 : 72}
                    tick={renderAxisTick}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(56, 161, 79, 0.06)' }}
                    contentStyle={{
                      borderRadius: 14,
                      border: '1px solid rgba(0,0,0,0.08)',
                      boxShadow: '0 10px 28px rgba(0,0,0,0.10)',
                    }}
                    formatter={(value: number | string) => [
                      `${Number(value ?? 0)} points`,
                      selectedCategory?.name ?? 'Points',
                    ]}
                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                  />

                  <Bar
                    dataKey="points"
                    name={selectedCategory?.name ?? 'Points'}
                    fill={selectedCategory?.color ?? '#38a14f'}
                    maxBarSize={100}
                    radius={[8, 8, 0, 0]}
                    isAnimationActive={false}
                  >
                    {selectedCategoryData.map((row) => {
                      const isLeader = leaderNameForAxis.has(row.name);
                      return (
                        <Cell
                          key={row.name}
                          stroke={isLeader ? HIGHLIGHT_COLOR : undefined}
                          strokeWidth={isLeader ? 3 : 0}
                        />
                      );
                    })}
                    <LabelList
                      dataKey="points"
                      position="top"
                      formatter={(value: unknown) => `${value}`}
                      style={{
                        fill: '#1b5e20',
                        fontWeight: 700,
                        fontSize: 12,
                        strokeWidth: 0,
                      }}
                    />
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </Box>

        {hasFinishedAllSegments && (
          <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pb: 2 }}>
            <Stack spacing={1.5} alignItems="flex-start">
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  flexWrap: 'wrap',
                  display: 'inline-block',
                }}
              >
                {totalSeries.map((s) => {
                  const isActive = selectedCategoryIdForLegend === s.key;

                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() =>
                        setSelectedCategoryIdForLegend((prev) =>
                          prev === s.key ? null : s.key
                        )
                      }
                      style={{
                        cursor: 'pointer',
                        background: isActive ? 'rgba(0,0,0,0.03)' : '#fff',
                        border: isActive
                          ? `1px solid ${s.color}`
                          : '1px solid rgba(0,0,0,0.10)',
                        borderRadius: 999,
                        padding: '8px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 10,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        opacity: isActive ? 1 : 0.92,
                        transition: 'all 160ms ease',
                      }}
                      aria-pressed={isActive}
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
                      <span style={{ fontSize: 12, fontWeight: 800 }}>
                        {s.title}
                      </span>
                    </button>
                  );
                })}
              </Stack>
            </Stack>
          </Box>
        )}
      </Paper>
    </>
  );
};
