import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Box, Stack, Typography, useTheme, useMediaQuery, CircularProgress, Avatar } from "@mui/material";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

export type BarData = {
  label: string;
  total: number;
  userId?: string;
  avatar?: string;
  segments: Array<{
    categoryId: string;
    categoryName: string;
    value: number;
    color: string;
  }>;
};

export type AnimatedBarChartProps = {
  data: BarData[];
  maxValue?: number;
  showLegend?: boolean;
  showCrown?: boolean;
  height?: number;
  loading?: boolean;
  selectedCategoryId?: string; // Optional category filter
};

export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data,
  maxValue,
  showLegend = true,
  showCrown = true,
  height = 400,
  loading = false,
  selectedCategoryId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [barPositions, setBarPositions] = useState<Array<{ x: number; y: number; width: number }>>([]);

  // Filter data if category is selected
  const filteredData = useMemo(() => {
    if (!selectedCategoryId) return data;
    
    return data.map(bar => {
      const categorySegment = bar.segments.find(s => s.categoryId === selectedCategoryId);
      return {
        ...bar,
        total: categorySegment?.value || 0,
        segments: categorySegment ? [categorySegment] : [],
      };
    }).filter(bar => bar.total > 0).sort((a, b) => b.total - a.total);
  }, [data, selectedCategoryId]);

  // Calculate max value if not provided
  const calculatedMaxValue = maxValue ?? (Math.max(...filteredData.map((d) => d.total), 0) || 1);

  // Get all unique categories for legend
  const categories = useMemo(() => {
    const categoryMap = new Map();
    filteredData.forEach((d) => {
      d.segments.forEach((s) => {
        if (!categoryMap.has(s.categoryId)) {
          categoryMap.set(s.categoryId, { id: s.categoryId, name: s.categoryName, color: s.color });
        }
      });
    });
    return Array.from(categoryMap.values());
  }, [filteredData]);

  // Find leading player
  const leadingPlayer = filteredData.length > 0 && filteredData[0].total > 0 ? filteredData[0] : null;

  // Update bar positions after chart renders
  const updateBarPositions = useCallback(() => {
    if (!chartRef.current || filteredData.length === 0 || !containerRef.current) return;

    const chartInstance = chartRef.current.getEchartsInstance();
    const positions: Array<{ x: number; y: number; width: number }> = [];

    try {
      const chartDom = chartInstance.getDom();
      if (!chartDom) return;
      
      filteredData.forEach((bar, index) => {
        try {
          const xPixel = chartInstance.convertToPixel({ xAxisIndex: 0 }, index);
          const nextXPixel = chartInstance.convertToPixel({ xAxisIndex: 0 }, index + 1);
          
          if (xPixel !== null && xPixel !== undefined && Array.isArray(xPixel)) {
            const xValue = xPixel[0];
            const nextXValue = (nextXPixel && Array.isArray(nextXPixel)) ? nextXPixel[0] : xValue + 60;
            const barWidth = Math.max(nextXValue - xValue, 40);
            const barCenterX = xValue + barWidth / 2;
            
            const topPoint = chartInstance.convertToPixel({ yAxisIndex: 0 }, calculatedMaxValue);
            const gridTop = (topPoint && Array.isArray(topPoint) && topPoint[1]) ? topPoint[1] : 0;
            
            const avatarHeight = isMobile ? 32 : 40;
            const spacingAbove = avatarHeight + 60;
            
            positions.push({
              x: barCenterX,
              y: Math.max(0, gridTop - spacingAbove),
              width: barWidth,
            });
          } else {
            throw new Error("Could not convert to pixel");
          }
        } catch (e) {
          const containerWidth = containerRef.current?.clientWidth || 800;
          const gridWidth = containerWidth * 0.8;
          const barSpacing = gridWidth / Math.max(filteredData.length, 1);
          const gridLeft = containerWidth * 0.1;
          const avatarHeight = isMobile ? 32 : 40;
          const spacingAbove = avatarHeight + 60;
          positions.push({
            x: gridLeft + (index + 0.5) * barSpacing,
            y: Math.max(0, 20 - spacingAbove),
            width: barSpacing * 0.8,
          });
        }
      });
    } catch (e) {
      const containerWidth = containerRef.current?.clientWidth || 800;
      const gridWidth = containerWidth * 0.8;
      const barSpacing = gridWidth / Math.max(filteredData.length, 1);
      const gridLeft = containerWidth * 0.1;
      const avatarHeight = isMobile ? 32 : 40;
      const spacingAbove = avatarHeight + 60;
      filteredData.forEach((_, index) => {
        positions.push({
          x: gridLeft + (index + 0.5) * barSpacing,
          y: Math.max(0, 20 - spacingAbove),
          width: barSpacing * 0.8,
        });
      });
    }

    setBarPositions(positions);
  }, [filteredData, calculatedMaxValue, isMobile]);

  // Prepare ECharts data
  const chartOption = useMemo((): EChartsOption => {
    if (filteredData.length === 0) {
      return {};
    }

    const userLabels = filteredData.map((d) => d.label);
    
    // Create series for each category
    const series = categories.map((category) => {
      const categoryData = filteredData.map((bar) => {
        const segment = bar.segments.find((s) => s.categoryId === category.id);
        return segment?.value || 0;
      });

      const hasData = categoryData.some((val) => val > 0);
      if (!hasData) {
        return null;
      }

      return {
        name: category.name,
        type: "bar" as const,
        stack: "total",
        data: categoryData,
        itemStyle: {
          color: category.color,
          borderRadius: [4, 4, 0, 0],
        },
        animationDuration: 1200,
        animationEasing: "cubicOut" as const,
        animationDelay: (idx: number) => idx * 50,
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);

    const isFiltered = categories.length === 1;

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return "";
          const userName = params[0].axisValue;
          let result = `<div style="margin-bottom: 4px;"><strong>${userName}</strong></div>`;
          let total = 0;
          
          params.forEach((param: any) => {
            if (param.value > 0 || !isFiltered) {
              result += `<div style="margin: 2px 0;">
                <span style="display:inline-block;width:10px;height:10px;background-color:${param.color};margin-right:5px;border-radius:2px;"></span>
                ${param.seriesName}: <strong>${param.value.toFixed(0)}</strong>
              </div>`;
              total += param.value || 0;
            }
          });
          
          if (!isFiltered && total > 0) {
            result += `<div style="margin-top: 4px;padding-top: 4px;border-top: 1px solid #eee;">
              <strong>Total: ${total.toFixed(0)}</strong>
            </div>`;
          }
          return result;
        },
      },
      legend: showLegend && categories.length > 0
        ? {
            show: true,
            data: categories.map((c) => c.name),
            bottom: 0,
            itemWidth: isMobile ? 16 : 20,
            itemHeight: isMobile ? 16 : 20,
            textStyle: {
              fontSize: isMobile ? 12 : 14,
              color: theme.palette.text.secondary,
            },
          }
        : { show: false },
      grid: {
        left: "10%",
        right: "10%",
        top: "30%",
        bottom: showLegend && categories.length > 0 ? "15%" : "10%",
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: userLabels,
        axisLabel: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        type: "value",
        max: calculatedMaxValue,
        axisLabel: {
          fontSize: isMobile ? 10 : 12,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "#f0f0f0",
          },
        },
      },
      series: series,
      animation: true,
      animationDuration: 1200,
      animationEasing: "cubicOut",
    };
  }, [filteredData, categories, calculatedMaxValue, showLegend, isMobile, theme]);

  // Update positions when chart is ready or resized
  useEffect(() => {
    if (!loading && chartRef.current && filteredData.length > 0) {
      const chartInstance = chartRef.current.getEchartsInstance();
      
      const timer = setTimeout(() => {
        updateBarPositions();
      }, 200);

      let resizeTimer: NodeJS.Timeout;
      const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (chartRef.current) {
            const instance = chartRef.current.getEchartsInstance();
            instance.resize();
            updateBarPositions();
          }
        }, 150);
      };

      chartInstance.on("finished", updateBarPositions);
      chartInstance.on("rendered", updateBarPositions);
      window.addEventListener("resize", handleResize);

      return () => {
        clearTimeout(timer);
        clearTimeout(resizeTimer);
        chartInstance.off("finished", updateBarPositions);
        chartInstance.off("rendered", updateBarPositions);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [loading, updateBarPositions, filteredData.length]);

  const actualHeight = isMobile ? 300 : height;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: actualHeight, width: "100%" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (filteredData.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: actualHeight, width: "100%" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        width: "100%", 
        position: "relative",
        minHeight: actualHeight,
      }} 
      ref={containerRef}
    >
      <ReactECharts
        ref={chartRef}
        option={chartOption}
        style={{ height: actualHeight, width: "100%" }}
        opts={{ renderer: "canvas" }}
        onChartReady={updateBarPositions}
      />
      
      {/* Overlay for avatars and usernames */}
      {barPositions.length > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {filteredData.map((bar, index) => {
            if (barPositions[index]) {
              const isLeader = showCrown && leadingPlayer && bar.label === leadingPlayer.label && bar.total > 0;
              const pos = barPositions[index];
              
              return (
                <Box
                  key={bar.label}
                  sx={{
                    position: "absolute",
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: `${Math.max(pos.width, 60)}px`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    transform: "translateX(-50%)",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  <Stack
                    direction="column"
                    alignItems="center"
                    spacing={0.25}
                    sx={{ width: "100%" }}
                  >
                    {isLeader && (
                      <EmojiEventsIcon
                        sx={{
                          color: "#ffa726",
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
                        border: isLeader ? "2px solid #ffa726" : "2px solid #e0e0e0",
                        bgcolor: isLeader ? "#fff3e0" : "#f5f5f5",
                        mb: 0.25,
                      }}
                    >
                      {bar.label.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography
                      variant={isMobile ? "caption" : "body2"}
                      sx={{
                        fontWeight: isLeader ? 600 : 500,
                        color: isLeader ? "#ffa726" : "text.primary",
                        textAlign: "center",
                        fontSize: isMobile ? "0.7rem" : "0.875rem",
                        mb: 0.25,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        lineHeight: 1.2,
                      }}
                    >
                      {bar.label}
                    </Typography>
                    <Typography
                      variant={isMobile ? "caption" : "body2"}
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                        fontSize: isMobile ? "0.75rem" : "0.875rem",
                        lineHeight: 1.2,
                      }}
                    >
                      {bar.total.toFixed(0)}
                    </Typography>
                  </Stack>
                </Box>
              );
            }
            return null;
          })}
        </Box>
      )}
    </Box>
  );
};

