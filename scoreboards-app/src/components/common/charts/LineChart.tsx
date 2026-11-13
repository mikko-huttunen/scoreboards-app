import React, { useLayoutEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  Tooltip,
  XAxis,
  YAxis,
  type LegendProps,
} from 'recharts';
import { LoadingSpinner } from '../spinner/LoadingSpinner.tsx';

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

  /**
   * How many data points fit in the visible area at once. When there are more points than
   * this, the chart scrolls horizontally (mouse/trackpad on desktop, swipe on mobile) and
   * opens on the most recent (last) points.
   */
  visiblePoints?: number;

  /** @deprecated Pagination was replaced by horizontal scrolling. Ignored. */
  pagination?: boolean;
  /** @deprecated Use `visiblePoints`. Ignored. */
  pageSize?: number;
  /** @deprecated The chart always opens on the latest points. Ignored. */
  startFromLatest?: boolean;
};

const DEFAULT_TEXT_COLOR = '#555';
const AXIS_LINE_COLOR = 'rgba(0,0,0,0.12)';
const X_AXIS_HEIGHT = 30;
const CHART_MARGIN_TOP = 24;
const CHART_MARGIN_BOTTOM = 12;

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
  visiblePoints = 10,
}) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [scrollNode, setScrollNode] = useState<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const hasData = Array.isArray(data) && data.length > 0;
  const pointCount = data?.length ?? 0;

  // Track the width of the scrollable viewport.
  useLayoutEffect(() => {
    if (!scrollNode) return;

    const update = () => setViewportWidth(scrollNode.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(scrollNode);
    return () => observer.disconnect();
  }, [scrollNode]);

  // Exactly `visiblePoints` points fit in the viewport; anything beyond that is scrolled to.
  const contentWidth = useMemo(() => {
    if (viewportWidth <= 0) return 0;
    const perPoint = viewportWidth / Math.max(1, visiblePoints);
    return Math.max(viewportWidth, Math.round(perPoint * pointCount));
  }, [viewportWidth, visiblePoints, pointCount]);

  // Start at the right edge so the most recent points are shown first.
  useLayoutEffect(() => {
    if (scrollNode) scrollNode.scrollLeft = scrollNode.scrollWidth;
  }, [scrollNode, contentWidth, pointCount]);

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
          <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
            {/* Fixed Y axis. Same data and margins as the plot, so the scales match. */}
            <Box
              sx={{
                flex: '0 0 auto',
                width: yAxisWidth,
                pointerEvents: 'none',
              }}
            >
              <RechartsLineChart
                width={yAxisWidth}
                height={height}
                data={data}
                margin={{
                  top: CHART_MARGIN_TOP,
                  right: 0,
                  left: 0,
                  bottom: CHART_MARGIN_BOTTOM,
                }}
              >
                <XAxis
                  dataKey={xAxisDataKey}
                  height={X_AXIS_HEIGHT}
                  tick={false}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  width={yAxisWidth}
                  allowDecimals={false}
                  tick={{ fill: DEFAULT_TEXT_COLOR, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: AXIS_LINE_COLOR }}
                />
                {visibleSeries.map((item) => (
                  <Line
                    key={item.key}
                    dataKey={item.key}
                    stroke="transparent"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                ))}
              </RechartsLineChart>
            </Box>

            <Box
              ref={setScrollNode}
              sx={{
                flex: 1,
                minWidth: 0,
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'thin',
              }}
            >
              {contentWidth > 0 && (
                <RechartsLineChart
                  width={contentWidth}
                  height={height}
                  data={data}
                  margin={{
                    top: CHART_MARGIN_TOP,
                    right: 24,
                    left: 8,
                    bottom: CHART_MARGIN_BOTTOM,
                  }}
                >
                  {showGrid && (
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(0,0,0,0.08)"
                    />
                  )}

                  <XAxis
                    dataKey={xAxisDataKey}
                    interval={0}
                    height={X_AXIS_HEIGHT}
                    tick={{ fill: DEFAULT_TEXT_COLOR, fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: AXIS_LINE_COLOR }}
                    tickMargin={xAxisTickMargin}
                  />

                  {/* Hidden: only keeps the scale identical to the fixed axis on the left */}
                  <YAxis hide allowDecimals={false} />

                  <Tooltip
                    wrapperStyle={{ zIndex: 10 }}
                    contentStyle={{
                      borderRadius: 14,
                      border: '1px solid rgba(0,0,0,0.08)',
                      boxShadow: '0 10px 28px rgba(0,0,0,0.10)',
                    }}
                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                    labelFormatter={(label, payload) => {
                      const row = payload?.[0]?.payload as
                        | LineChartRow
                        | undefined;

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

                      return [
                        `${numericValue}${tooltipValueSuffix}`,
                        String(name),
                      ];
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
                          ? { r: 4, strokeWidth: 2, fill: '#fff' }
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
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
