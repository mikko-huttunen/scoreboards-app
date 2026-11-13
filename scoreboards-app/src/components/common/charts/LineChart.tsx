import React, { useMemo, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type LegendProps,
} from 'recharts';
import { LoadingSpinner } from '../spinner/LoadingSpinner.tsx';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';

export type LineChartSeries = {
  key: string;
  title: string;
  color: string;
  strokeWidth?: number;
};

type LineChartRow = Record<string, string | number | null | undefined>;

type Props = {
  loading?: boolean;
  data: LineChartRow[];
  series: LineChartSeries[];
  chartTitle?: string;
  emptyText?: string;
  xAxisDataKey: string;
  yAxisWidth?: number;
  height?: number;
  animationDurationMs?: number;
  legendToggleEnabled?: boolean;
  showGrid?: boolean;
  showDots?: boolean;
  connectNulls?: boolean;
  lineType?:
    | 'basis'
    | 'basisClosed'
    | 'basisOpen'
    | 'bumpX'
    | 'bumpY'
    | 'bump'
    | 'linear'
    | 'linearClosed'
    | 'natural'
    | 'monotoneX'
    | 'monotoneY'
    | 'monotone'
    | 'step'
    | 'stepBefore'
    | 'stepAfter';
  xAxisTickMargin?: number;
  tooltipValueSuffix?: string;
  tooltipLabelFormatter?: (
    label: string | number,
    payload: LineChartRow
  ) => string;
  valueFormatter?: (value: number, seriesName: string) => [string, string];
  pagination?: boolean;
  pageSize?: number;
  startFromLatest?: boolean;
};

const DEFAULT_TEXT_COLOR = '#555';

export const LineChart: React.FC<Props> = ({
  loading = false,
  data,
  series,
  emptyText = 'No data to display',
  xAxisDataKey,
  yAxisWidth = 44,
  height = 430,
  animationDurationMs = 700,
  legendToggleEnabled = false,
  showGrid = true,
  showDots = true,
  connectNulls = false,
  lineType = 'linear',
  xAxisTickMargin = 10,
  tooltipValueSuffix = '',
  tooltipLabelFormatter,
  valueFormatter,
  pagination = true,
  pageSize = 10,
  startFromLatest = true,
}) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const hasData = Array.isArray(data) && data.length > 0;

  const safePageSize = Math.max(1, pageSize);
  const maxPageStart = Math.max(0, (data?.length ?? 0) - safePageSize);

  const [startPage, setStartPage] = useState<number>(() => {
    if (!pagination) return 0;
    const latestStart = Math.max(0, (data?.length ?? 0) - safePageSize);
    return startFromLatest ? latestStart : 0;
  });

  React.useEffect(() => {
    if (!pagination) return;
    const latestStart = Math.max(0, (data?.length ?? 0) - safePageSize);
    setStartPage(startFromLatest ? latestStart : 0);
  }, [data]);

  const pageData = useMemo(() => {
    if (!pagination) return data;
    if (!Array.isArray(data) || data.length <= safePageSize) return data;
    return data.slice(startPage, startPage + safePageSize);
  }, [data, startPage, safePageSize]);

  const canPrev = pagination && data.length > safePageSize && startPage > 0;
  const canNext =
    pagination && data.length > safePageSize && startPage < maxPageStart;

  const visibleSeries = useMemo(() => {
    if (selectedKey) {
      return series.filter((item) => item.key === selectedKey);
    }

    return series;
  }, [selectedKey, series]);

  const selectSeries = (key: string) => {
    if (!legendToggleEnabled) return;
    setSelectedKey((prev) => (prev === key ? null : key));
  };

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
        {series.map((item) => {
          const isDimmed = selectedKey !== null && selectedKey !== item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => selectSeries(item.key)}
              style={{
                cursor: legendToggleEnabled ? 'pointer' : 'default',
                background: isDimmed ? 'rgba(0,0,0,0.03)' : '#fff',
                border:
                  selectedKey === item.key
                    ? `1px solid ${item.color}`
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
              aria-pressed={selectedKey === item.key}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: item.color,
                  display: 'inline-block',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.9) inset',
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  userSelect: 'none',
                  fontWeight: selectedKey === item.key ? 700 : 400,
                }}
              >
                {item.title}
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
          <CustomLegend />

          {pagination && data.length > safePageSize && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
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

          <ResponsiveContainer width="100%" height={height}>
            <RechartsLineChart
              data={pageData}
              margin={{ top: 24, right: 24, left: 8, bottom: 12 }}
            >
              {showGrid && (
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.08)"
                />
              )}

              <XAxis
                dataKey={xAxisDataKey}
                tick={{ fill: DEFAULT_TEXT_COLOR, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.12)' }}
                tickMargin={xAxisTickMargin}
              />

              <YAxis
                width={yAxisWidth}
                allowDecimals={false}
                tick={{ fill: DEFAULT_TEXT_COLOR, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.12)' }}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: 14,
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.10)',
                }}
                labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                labelFormatter={(label, payload) => {
                  const row = payload?.[0]?.payload as LineChartRow | undefined;

                  if (!tooltipLabelFormatter || !row) {
                    return String(label);
                  }

                  return tooltipLabelFormatter(label, row);
                }}
                formatter={(value, name) => {
                  const numericValue =
                    typeof value === 'number' ? value : Number(value ?? 0);

                  if (valueFormatter) {
                    return valueFormatter(numericValue, String(name));
                  }

                  return [`${numericValue}${tooltipValueSuffix}`, String(name)];
                }}
              />

              {visibleSeries.map((item, index) => (
                <Line
                  key={item.key}
                  type={lineType}
                  dataKey={item.key}
                  name={item.title}
                  stroke={item.color}
                  strokeWidth={item.strokeWidth ?? 3}
                  dot={
                    showDots
                      ? {
                          r: 4,
                          strokeWidth: 2,
                          fill: '#fff',
                        }
                      : false
                  }
                  activeDot={{
                    r: 6,
                    strokeWidth: 2,
                    fill: item.color,
                  }}
                  connectNulls={connectNulls}
                  isAnimationActive
                  animationDuration={animationDurationMs}
                  animationBegin={index * 120}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};
