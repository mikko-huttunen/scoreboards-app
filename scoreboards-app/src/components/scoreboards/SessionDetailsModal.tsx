import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import type { Session } from '../../types/Session';
import type { User } from '../../types/User';
import type { PointCategory } from '../../types/PointCategory';
import type { ResultEntry } from '../../types/ResultEntry';
import { ResultEntryService } from '../../services/ResultEntryService';
import { UserService } from '../../services/UserService';

type SessionDetailsModalProps = {
  session: Session;
  users: User[];
  pointCategories: PointCategory[];
  getAccessTokenSilently: () => Promise<string>;
};

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  session,
  users,
  pointCategories,
  getAccessTokenSilently,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [resultEntries, setResultEntries] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [barPositions, setBarPositions] = useState<
    Array<{ x: number; y: number; width: number }>
  >([]);

  const [resultsMap, setResultsMap] = useState<Map<string, any[]>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();
        const entries = await ResultEntryService.getResultEntriesBySession(
          session.id,
          token
        );
        setResultEntries(entries);

        // Try to fetch results for each entry
        // Backend might return results as part of entry.results or as IDs
        const resultsByEntry = new Map<string, any[]>();
        for (const entry of entries) {
          let entryResults: any[] = [];

          // Check if entry.results contains Result objects
          if (entry.results) {
            const resultsArray =
              entry.results instanceof Set
                ? Array.from(entry.results)
                : Array.isArray(entry.results)
                  ? entry.results
                  : [];

            // Filter to only Result objects (not IDs)
            entryResults = resultsArray.filter(
              (r: any) =>
                r && typeof r === 'object' && r.pointCategoryId !== undefined
            );
          }

          // If no results found, try fetching by result entry ID or session
          if (entryResults.length === 0 && entry.id) {
            try {
              // Try result entry endpoint first
              const resultResponse = await fetch(
                `/api/result-entries/${entry.id}/results`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              if (resultResponse.ok) {
                entryResults = await resultResponse.json();
              } else {
                // Try fetching all results for session and filter by resultEntryId
                try {
                  const sessionResultsResponse = await fetch(
                    `/api/results/session/${session.id}`,
                    {
                      method: 'GET',
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    }
                  );
                  if (sessionResultsResponse.ok) {
                    const allSessionResults =
                      await sessionResultsResponse.json();
                    entryResults = allSessionResults.filter(
                      (r: any) => r.resultEntryId === entry.id
                    );
                  }
                } catch (sessionErr) {
                  // Endpoint might not exist, that's okay
                }
              }
            } catch (err) {
              // Endpoint might not exist, that's okay
            }
          }

          resultsByEntry.set(entry.id, entryResults);
        }
        setResultsMap(resultsByEntry);

        // Fetch user data for all user IDs in result entries
        const userIds = Array.from(new Set(entries.map((e) => e.userId)));
        const usersMap = new Map<string, User>();
        for (const userId of userIds) {
          try {
            const user = await UserService.getUserById(userId, token);
            if (user) {
              usersMap.set(userId, user);
            }
          } catch (err) {
            console.error(`Error fetching user ${userId}:`, err);
          }
        }
        setUserMap(usersMap);
      } catch (err) {
        console.error('Error fetching session data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session.id, getAccessTokenSilently]);

  const chartData = useMemo(() => {
    if (resultEntries.length === 0) return [];

    // Create a map of user ID to their result entry
    const userResultEntries = new Map<string, ResultEntry>();
    resultEntries.forEach((entry) => {
      // Check if entry has results (either in resultsMap or in entry.results)
      const entryResults = resultsMap.get(entry.id) || [];
      let hasResults = entryResults.length > 0;

      // If no results in map, check entry.results
      if (!hasResults && entry.results) {
        const resultsArray =
          entry.results instanceof Set
            ? Array.from(entry.results)
            : Array.isArray(entry.results)
              ? entry.results
              : [];
        hasResults = resultsArray.some(
          (r: any) =>
            r && typeof r === 'object' && r.pointCategoryId !== undefined
        );
      }

      // Include entry if it has results or if totalPoints > 0
      if (hasResults || (entry.totalPoints && entry.totalPoints > 0)) {
        userResultEntries.set(entry.userId, entry);
      }
    });

    // Create bar data with category breakdown
    const data = Array.from(userResultEntries.entries())
      .map(([userId, entry]) => {
        const user = userMap.get(userId) || users.find((u) => u.id === userId);

        // Calculate points per category
        // First try to get results from the results map (fetched separately)
        let entryResults = resultsMap.get(entry.id) || [];

        // If no results in map, check if entry.results contains Result objects
        if (entryResults.length === 0 && entry.results) {
          const resultsArray =
            entry.results instanceof Set
              ? Array.from(entry.results)
              : Array.isArray(entry.results)
                ? entry.results
                : [];

          // Filter to only Result objects (not IDs)
          entryResults = resultsArray.filter(
            (r: any) =>
              r && typeof r === 'object' && r.pointCategoryId !== undefined
          );
        }

        const categoryPoints = new Map<string, number>();
        entryResults.forEach((result: any) => {
          if (result && result.pointCategoryId !== undefined) {
            const categoryId = result.pointCategoryId;
            const points = result.points || 0;
            const current = categoryPoints.get(categoryId) || 0;
            categoryPoints.set(categoryId, current + points);
          }
        });

        // Create segments for each category
        const segments = pointCategories
          .map((category) => {
            const points = categoryPoints.get(category.id) || 0;
            return {
              categoryId: category.id,
              categoryName: category.name,
              value: points,
              color: category.color,
            };
          })
          .filter((seg) => seg.value > 0)
          .sort((a, b) => b.value - a.value);

        return {
          label: user?.name || user?.email || 'Unknown User',
          total: entry.totalPoints || 0,
          userId,
          avatar: user ? user.avatar : undefined,
          segments,
        };
      })
      .sort((a, b) => b.total - a.total);

    return data;
  }, [resultEntries, userMap, users, pointCategories, resultsMap]);

  const leadingUser =
    chartData.length > 0 && chartData[0].total > 0 ? chartData[0] : null;
  const maxValue =
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.total)) : 0;

  // Get unique categories from all segments
  const categories = useMemo(() => {
    const categoryMap = new Map<string, PointCategory>();
    chartData.forEach((bar) => {
      bar.segments.forEach((seg) => {
        const category = pointCategories.find(
          (cat) => cat.id === seg.categoryId
        );
        if (category && !categoryMap.has(category.id)) {
          categoryMap.set(category.id, category);
        }
      });
    });
    return Array.from(categoryMap.values());
  }, [chartData, pointCategories]);

  const chartOption: EChartsOption = useMemo(() => {
    if (chartData.length === 0) return {};

    const userLabels = chartData.map((d) => d.label);

    // Create series for each category
    const series = categories
      .map((category) => {
        const categoryData = chartData.map((bar) => {
          const segment = bar.segments.find(
            (s) => s.categoryId === category.id
          );
          return segment?.value || 0;
        });

        const hasData = categoryData.some((val) => val > 0);
        if (!hasData) {
          return null;
        }

        return {
          name: category.name,
          type: 'bar' as const,
          stack: 'total',
          data: categoryData,
          itemStyle: {
            color: category.color,
            borderRadius: [4, 4, 0, 0],
          },
          animationDuration: 1200,
          animationEasing: 'cubicOut' as const,
          animationDelay: (idx: number) => idx * 50,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const userName = params[0].axisValue;
          let result = `<div style="margin-bottom: 4px;"><strong>${userName}</strong></div>`;
          let total = 0;
          params.forEach((param: any) => {
            if (param.value > 0) {
              result += `<div style="margin: 2px 0;">
                <span style="display:inline-block;width:10px;height:10px;background-color:${param.color};margin-right:5px;"></span>
                ${param.seriesName}: ${param.value}
              </div>`;
              total += param.value;
            }
          });
          result += `<div style="margin-top: 4px;padding-top: 4px;border-top: 1px solid #ddd;"><strong>Total: ${total}</strong></div>`;
          return result;
        },
      },
      legend: {
        show: true,
        top: 0,
        data: categories.map((cat) => cat.name),
        textStyle: {
          fontSize: 12,
        },
      },
      grid: {
        top: categories.length > 0 ? '20%' : '30%',
        left: '10%',
        right: '10%',
        bottom: '15%',
      },
      xAxis: {
        type: 'category',
        data: userLabels,
        axisLabel: { show: false },
      },
      yAxis: {
        type: 'value',
        max: maxValue > 0 ? maxValue : undefined,
      },
      series,
    };
  }, [chartData, maxValue, categories]);

  useEffect(() => {
    if (
      !loading &&
      chartRef.current &&
      chartData.length > 0 &&
      containerRef.current
    ) {
      const updatePositions = () => {
        const chartInstance = chartRef.current?.getEchartsInstance();
        if (!chartInstance) return;

        const positions: Array<{ x: number; y: number; width: number }> = [];
        try {
          chartData.forEach((bar, index) => {
            const xPixel = chartInstance.convertToPixel(
              { xAxisIndex: 0 },
              index
            );
            const nextXPixel = chartInstance.convertToPixel(
              { xAxisIndex: 0 },
              index + 1
            );

            if (xPixel && Array.isArray(xPixel)) {
              const xValue = xPixel[0];
              const nextXValue =
                nextXPixel && Array.isArray(nextXPixel)
                  ? nextXPixel[0]
                  : xValue + 60;
              const barWidth = Math.max(nextXValue - xValue, 40);
              const barCenterX = xValue + barWidth / 2;

              const topPoint = chartInstance.convertToPixel(
                { yAxisIndex: 0 },
                maxValue
              );
              const gridTop =
                topPoint && Array.isArray(topPoint) && topPoint[1]
                  ? topPoint[1]
                  : 0;

              const avatarHeight = isMobile ? 32 : 40;
              const spacingAbove = avatarHeight + 60;

              positions.push({
                x: barCenterX,
                y: Math.max(0, gridTop - spacingAbove),
                width: barWidth,
              });
            }
          });
        } catch (e) {
          // Fallback positioning
          const containerWidth = containerRef.current?.clientWidth || 800;
          const gridWidth = containerWidth * 0.8;
          const barSpacing = gridWidth / Math.max(chartData.length, 1);
          const gridLeft = containerWidth * 0.1;
          const avatarHeight = isMobile ? 32 : 40;
          const spacingAbove = avatarHeight + 60;
          chartData.forEach((_, index) => {
            positions.push({
              x: gridLeft + (index + 0.5) * barSpacing,
              y: Math.max(0, 20 - spacingAbove),
              width: barSpacing * 0.8,
            });
          });
        }
        setBarPositions(positions);
      };

      const timer = setTimeout(updatePositions, 200);
      const resizeTimer = setTimeout(() => {
        if (chartRef.current) {
          const instance = chartRef.current.getEchartsInstance();
          instance.resize();
          updatePositions();
        }
      }, 150);

      const chartInstance = chartRef.current.getEchartsInstance();
      chartInstance.on('finished', updatePositions);
      chartInstance.on('rendered', updatePositions);

      let resizeTimeout: NodeJS.Timeout | undefined;
      const handleResize = () => {
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
          if (chartRef.current) {
            const instance = chartRef.current.getEchartsInstance();
            instance.resize();
            updatePositions();
          }
        }, 150);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(timer);
        clearTimeout(resizeTimer);
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        chartInstance.off('finished', updatePositions);
        chartInstance.off('rendered', updatePositions);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [loading, chartData, maxValue, isMobile]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (chartData.length === 0) {
    return (
      <Typography
        variant="body2"
        sx={{ color: '#666', textAlign: 'center', py: 4 }}
      >
        No results available for this session.
      </Typography>
    );
  }

  return (
    <Box
      sx={{ width: '100%', position: 'relative', minHeight: 400 }}
      ref={containerRef}
    >
      <ReactECharts
        ref={chartRef}
        option={chartOption}
        style={{ height: 400, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
      {barPositions.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {chartData.map((bar, index) => {
            if (!barPositions[index]) return null;
            const isLeader =
              leadingUser && bar.label === leadingUser.label && bar.total > 0;
            const pos = barPositions[index];

            return (
              <Box
                key={bar.userId}
                sx={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${Math.max(pos.width, 60)}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                <Stack
                  direction="column"
                  alignItems="center"
                  spacing={0.25}
                  sx={{ width: '100%' }}
                >
                  {isLeader && (
                    <EmojiEventsIcon
                      sx={{
                        color: '#ffa726',
                        fontSize: isMobile ? 18 : 20,
                        mb: 0.25,
                      }}
                    />
                  )}
                  <Avatar
                    src={bar.avatar}
                    sx={{
                      width: isMobile ? 32 : 40,
                      height: isMobile ? 32 : 40,
                      border: isLeader
                        ? '2px solid #ffa726'
                        : '2px solid #e0e0e0',
                      bgcolor: isLeader ? '#fff3e0' : '#f5f5f5',
                      mb: 0.25,
                    }}
                  >
                    {bar.label.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography
                    variant={isMobile ? 'caption' : 'body2'}
                    sx={{
                      fontWeight: isLeader ? 600 : 500,
                      color: isLeader ? '#ffa726' : 'text.primary',
                      textAlign: 'center',
                      fontSize: isMobile ? '0.7rem' : '0.875rem',
                      mb: 0.25,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}
                  >
                    {bar.label}
                  </Typography>
                  <Typography
                    variant={isMobile ? 'caption' : 'body2'}
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {bar.total.toFixed(0)}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
