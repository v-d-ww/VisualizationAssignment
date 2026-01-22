import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

interface TimeAxisProps {
  onTimeChange: (year: string, month: string) => void;
  onTimePreview?: (year: string | null, month: string | null) => void; // 悬停预览回调
  availableYears: string[];
  availableMonths: string[];
}

function TimeAxis({ onTimeChange, onTimePreview, availableYears, availableMonths }: TimeAxisProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || "2020");
  const [selectedMonth, setSelectedMonth] = useState<string>("02");

  const renderTimeAxis = useCallback(() => {
    if (!svgRef.current || availableYears.length === 0) {
      return () => {}; // 返回一个空的清理函数而不是null
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // 获取容器宽度，自适应
    const container = svgRef.current.parentElement;
    let containerWidth = 1200; // 默认宽度
    if (container) {
      const rect = container.getBoundingClientRect();
      containerWidth = rect.width - 40; // 减去padding
    }
    const width = Math.max(containerWidth, 800); // 最小宽度800px
    const height = 120;
    const margin = { top: 20, right: 40, bottom: 40, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const yearScale = d3
      .scaleBand()
      .domain(availableYears)
      .range([0, chartWidth])
      .padding(0.1);

    const monthScale = d3
      .scaleBand()
      .domain(availableMonths)
      .range([0, yearScale.bandwidth()])
      .padding(0.05);

    const yearAxis = d3.axisBottom(yearScale);
    g.append("g")
      .attr("class", "year-axis")
      .attr("transform", `translate(0,${chartHeight - 20})`)
      .call(yearAxis)
      .selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-size", "12px");

    const monthAxis = d3.axisBottom(monthScale);
    const yearGroups = g
      .selectAll(".year-group")
      .data(availableYears)
      .enter()
      .append("g")
      .attr("class", "year-group")
      .attr("transform", (d) => `translate(${yearScale(d)},0)`);

    yearGroups
      .append("g")
      .attr("class", "month-axis")
      .attr("transform", `translate(0,${chartHeight - 5})`)
      .call(monthAxis)
      .selectAll("text")
      .style("fill", "#64748b")
      .style("font-size", "10px");

    const yearRects = yearGroups
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", yearScale.bandwidth())
      .attr("height", chartHeight - 30)
      .attr("fill", "transparent")
      .attr("stroke", "#334155")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("fill", "rgba(59, 130, 246, 0.1)");
      })
      .on("mouseleave", function () {
        d3.select(this).attr("fill", "transparent");
      })
      .on("click", function (event, d) {
        setSelectedYear(d);
      });

    const monthRects = yearGroups
      .selectAll(".month-rect")
      .data((d) => availableMonths.map((m) => ({ year: d, month: m })))
      .enter()
      .append("rect")
      .attr("class", "month-rect")
      .attr("x", (d) => monthScale(d.month) || 0)
      .attr("y", 5)
      .attr("width", monthScale.bandwidth())
      .attr("height", chartHeight - 40)
      .attr("fill", (d) => {
        if (d.year === selectedYear && d.month === selectedMonth) {
          return "#3b82f6";
        }
        return "rgba(59, 130, 246, 0.2)";
      })
      .attr("stroke", "#475569")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        if (!(d.year === selectedYear && d.month === selectedMonth)) {
          d3.select(this).attr("fill", "rgba(59, 130, 246, 0.4)");
        }
      })
      .on("mouseleave", function (event, d) {
        if (d.year === selectedYear && d.month === selectedMonth) {
          d3.select(this).attr("fill", "#3b82f6");
        } else {
          d3.select(this).attr("fill", "rgba(59, 130, 246, 0.2)");
        }
      })
      .on("click", function (event, d) {
        setSelectedYear(d.year);
        setSelectedMonth(d.month);
      });

    yearGroups
      .selectAll(".month-rect")
      .attr("fill", (d: any) => {
        if (d.year === selectedYear && d.month === selectedMonth) {
          return "#3b82f6";
        }
        return "rgba(59, 130, 246, 0.2)";
      });

    const indicator = g
      .append("line")
      .attr("class", "time-indicator")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", chartHeight - 30)
      .attr("stroke", "#fbbf24")
      .attr("stroke-width", 2)
      .attr("opacity", 0);

    const updateIndicator = () => {
      const yearX = (yearScale(selectedYear) || 0) + yearScale.bandwidth() / 2;
      const monthX = (monthScale(selectedMonth) || 0) + monthScale.bandwidth() / 2;
      const totalX = (yearScale(selectedYear) || 0) + monthX;

      indicator
        .attr("x1", totalX)
        .attr("x2", totalX)
        .attr("opacity", 1)
        .transition()
        .duration(200);
    };

    updateIndicator();

    const handleMouseMove = (event: MouseEvent) => {
      const [x] = d3.pointer(event, svgRef.current);
      const adjustedX = x - margin.left;

      if (adjustedX >= 0 && adjustedX <= chartWidth) {
        const year = availableYears.find((y) => {
          const yearPos = yearScale(y) || 0;
          return adjustedX >= yearPos && adjustedX < yearPos + yearScale.bandwidth();
        });

        if (year) {
          const yearStart = yearScale(year) || 0;
          const monthX = adjustedX - yearStart;
          const month = availableMonths.find((m) => {
            const monthPos = monthScale(m) || 0;
            return monthX >= monthPos && monthX < monthPos + monthScale.bandwidth();
          });

          if (month) {
            // 悬停预览：触发预览回调，但不更新选中状态
            if (onTimePreview) {
              onTimePreview(year, month);
            }
          }
        }
      }
    };

    const handleMouseLeave = () => {
      // 鼠标离开时，恢复当前选中的时间
      if (onTimePreview) {
        onTimePreview(null, null);
      }
    };

    svgRef.current?.addEventListener("mousemove", handleMouseMove);
    svgRef.current?.addEventListener("mouseleave", handleMouseLeave);
    
    // 返回清理函数
    return () => {
      svgRef.current?.removeEventListener("mousemove", handleMouseMove);
      svgRef.current?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [availableYears, availableMonths, selectedYear, selectedMonth, onTimePreview]);

  useEffect(() => {
    const cleanup = renderTimeAxis();
    return cleanup || undefined; // 确保返回undefined而不是null
  }, [renderTimeAxis]);

  useEffect(() => {
    // 监听窗口大小变化
    const handleResize = () => {
      renderTimeAxis();
    };
    
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [renderTimeAxis]);

  useEffect(() => {
    onTimeChange(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, onTimeChange]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "380px", // 避开左侧计算器（360px padding + 20px margin）
        right: "20px", // 右侧留出边距
        zIndex: 500, // 降低z-index，避免遮挡功能模块和弹窗
        background: "rgba(1, 2, 9, 0.92)",
        padding: "16px 20px",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "all 0.3s ease",
      }}
    >
      <svg 
        ref={svgRef}
        style={{
          width: "100%",
          height: "120px",
          minWidth: "800px",
          maxWidth: "100%",
        }}
      ></svg>
      <div
        style={{
          textAlign: "center",
          color: "#94a3b8",
          marginTop: "10px",
          fontSize: "14px",
        }}
      >
        {selectedYear}年{selectedMonth}月
      </div>
    </div>
  );
}

export default TimeAxis;
