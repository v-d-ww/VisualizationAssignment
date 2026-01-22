import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import housePriceData from "../data/housePriceData.json";

interface ProvinceHeatmapProps {
  selectedProvinces?: number[];
  currentYear?: string;
  width?: number;
  height?: number;
}

type ProvinceRecord = {
  adcode: number;
  name: string;
  data: Record<
    string,
    {
      average?: number | null;
      [month: string]: number | null | undefined;
    }
  >;
};

function ProvinceHeatmap({
  selectedProvinces = [],
  currentYear = "2024",
  width = 400,
  height = 400,
}: ProvinceHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const heatmapData = useMemo(() => {
    const data = housePriceData as ProvinceRecord[];
    const provinces = data.filter((p) => p.name && p.adcode !== 100000);
    
    if (selectedProvinces.length === 0) {
      return { provinces: [], months: [], values: [] };
    }

    const selectedProvinceRecords = selectedProvinces
      .map((adcode) => provinces.find((p) => p.adcode === adcode))
      .filter(Boolean) as ProvinceRecord[];

    if (selectedProvinceRecords.length === 0) {
      return { provinces: [], months: [], values: [] };
    }

    // 获取所有月份
    const months = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    
    // 构建热力图数据
    const values: Array<{ province: string; month: string; value: number }> = [];
    
    selectedProvinceRecords.forEach((province) => {
      months.forEach((month) => {
        const price = province.data[currentYear]?.[month];
        if (price !== null && price !== undefined) {
          values.push({
            province: province.name,
            month,
            value: price,
          });
        }
      });
    });

    return {
      provinces: selectedProvinceRecords.map((p) => p.name),
      months,
      values,
    };
  }, [selectedProvinces, currentYear]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 60, right: 80, bottom: 60, left: 100 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (heatmapData.values.length === 0) {
      g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#94a3b8")
        .attr("font-size", 13)
        .text("请选择省份查看房价热度分布");

      g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("fill", "#e2e8f0")
        .attr("font-size", 14)
        .attr("font-weight", 600)
        .text("省份房价热度图");

      return;
    }

    // 创建比例尺
    const xScale = d3
      .scaleBand()
      .domain(heatmapData.months)
      .range([0, chartWidth])
      .padding(0.05);

    const yScale = d3
      .scaleBand()
      .domain(heatmapData.provinces)
      .range([0, chartHeight])
      .padding(0.05);

    // 颜色比例尺
    const allValues = heatmapData.values.map((d) => d.value);
    const minValue = d3.min(allValues) || 0;
    const maxValue = d3.max(allValues) || 10000;
    
    const colorScale = d3
      .scaleSequential(d3.interpolateRdYlBu)
      .domain([maxValue, minValue]); // 反转：高值红色，低值蓝色

    // 绘制热力格子
    const cells = g
      .append("g")
      .attr("class", "cells")
      .selectAll<SVGRectElement, { province: string; month: string; value: number }>("rect")
      .data(heatmapData.values)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.month) || 0)
      .attr("y", (d) => yScale(d.province) || 0)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => colorScale(d.value))
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-width", 1)
      .attr("rx", 2)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);

        // 显示tooltip
        const tooltip = g
          .append("g")
          .attr("class", "tooltip")
          .attr("transform", `translate(${(xScale(d.month) || 0) + xScale.bandwidth() / 2}, ${(yScale(d.province) || 0) + yScale.bandwidth() / 2})`);

        tooltip
          .append("rect")
          .attr("x", -50)
          .attr("y", -25)
          .attr("width", 100)
          .attr("height", 50)
          .attr("fill", "rgba(5, 7, 15, 0.95)")
          .attr("stroke", "#3b82f6")
          .attr("stroke-width", 1)
          .attr("rx", 4);

        tooltip
          .append("text")
          .attr("x", 0)
          .attr("y", -8)
          .attr("text-anchor", "middle")
          .attr("fill", "#e2e8f0")
          .attr("font-size", 11)
          .attr("font-weight", 600)
          .text(`${d.province}`);

        tooltip
          .append("text")
          .attr("x", 0)
          .attr("y", 8)
          .attr("text-anchor", "middle")
          .attr("fill", "#94a3b8")
          .attr("font-size", 10)
          .text(`${currentYear}-${d.month}: ${d.value.toFixed(0)} 元/㎡`);
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "rgba(255,255,255,0.1)")
          .attr("stroke-width", 1);

        g.selectAll(".tooltip").remove();
      });

    // 添加数值标签（可选，如果格子足够大）
    if (xScale.bandwidth() > 30 && yScale.bandwidth() > 20) {
      cells
        .append("text")
        .attr("x", (d) => (xScale(d.month) || 0) + xScale.bandwidth() / 2)
        .attr("y", (d) => (yScale(d.province) || 0) + yScale.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", (d) => {
          const intensity = (d.value - minValue) / (maxValue - minValue || 1);
          return intensity > 0.5 ? "#fff" : "#333";
        })
        .attr("font-size", 9)
        .text((d) => `${(d.value / 10000).toFixed(1)}万`);
    }

    // 添加X轴
    const xAxis = d3.axisBottom(xScale).tickFormat((d) => `${d}月`);
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", 11);

    // 添加Y轴
    const yAxis = d3.axisLeft(yScale);
    g.append("g")
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", 11);

    // 标题
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text(
        selectedProvinces.length > 0
          ? `省份房价热度图 (${selectedProvinces.length}个省份, ${currentYear}年)`
          : "省份房价热度图"
      );

    // 任务标签
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -12)
      .attr("text-anchor", "middle")
      .attr("fill", "#3b82f6")
      .attr("font-size", 11)
      .text("🔹 核心任务：分析省份房价月度变化趋势");

    // 图例
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = chartWidth - legendWidth - 10;
    const legendY = chartHeight + 40;

    const legendScale = d3.scaleLinear().domain([minValue, maxValue]).range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale).tickFormat((d) => `${(d as number) / 10000}万`).ticks(5);

    const legend = g.append("g").attr("transform", `translate(${legendX}, ${legendY})`);

    // 图例渐变
    const gradient = legend
      .append("defs")
      .append("linearGradient")
      .attr("id", "heatmap-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%");

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const value = minValue + ((maxValue - minValue) * i) / numStops;
      gradient
        .append("stop")
        .attr("offset", `${(i / numStops) * 100}%`)
        .attr("stop-color", colorScale(value));
    }

    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#heatmap-gradient)")
      .attr("stroke", "rgba(255,255,255,0.2)")
      .attr("stroke-width", 1);

    legend
      .append("g")
      .attr("transform", `translate(0,${legendHeight})`)
      .call(legendAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", 10);

    legend
      .append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", 10)
      .text("房价 (元/㎡)");
  }, [heatmapData, width, height, selectedProvinces, currentYear]);

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg ref={svgRef}></svg>
    </div>
  );
}

export default ProvinceHeatmap;

