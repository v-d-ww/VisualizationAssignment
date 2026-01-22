import { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import housePriceData from "../data/housePriceData.json";

interface ParallelCoordinatesProps {
  selectedProvinces?: number[];
  currentYear?: string;
  width?: number;
  height?: number;
  onProvinceHover?: (adcode: number | null) => void; // 悬停回调，用于联动地图
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

// 获取省份的多维度数据
const getProvinceDimensions = (
  data: ProvinceRecord[],
  adcode: number,
  year: string
): {
  province: string;
  adcode: number;
  price: number; // 房价均价
  volume: number; // 成交量（模拟）
  income: number; // 人均可支配收入（模拟）
  rate: number; // 房贷利率（模拟）
  density: number; // 人口密度（模拟）
} | null => {
  const province = data.find((p) => p.adcode === adcode);
  if (!province) return null;

  const yearData = province.data[year];
  const averagePrice = yearData?.average || 0;

  if (averagePrice === 0) return null;

  // 模拟其他维度数据（基于房价估算）
  return {
    province: province.name,
    adcode: province.adcode,
    price: averagePrice,
    volume: averagePrice * 0.1 + Math.random() * 1000, // 成交量
    income: averagePrice * 0.3 + Math.random() * 5000, // 人均可支配收入
    rate: 4.5 + (averagePrice / 10000) * 0.1 + Math.random() * 0.5, // 房贷利率
    density: averagePrice / 100 + Math.random() * 50, // 人口密度
  };
};

function ParallelCoordinates({
  selectedProvinces = [],
  currentYear = "2024",
  width = 600,
  height = 400,
  onProvinceHover,
}: ParallelCoordinatesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredProvince, setHoveredProvince] = useState<number | null>(null);

  const dimensionsData = useMemo(() => {
    const data = housePriceData as ProvinceRecord[];
    const activeProvinces = selectedProvinces.length > 0 
      ? selectedProvinces.slice(0, 5) 
      : data.filter((p) => p.name && p.adcode !== 100000).slice(0, 5).map((p) => p.adcode);

    return activeProvinces
      .map((adcode) => getProvinceDimensions(data, adcode, currentYear))
      .filter(Boolean) as Array<{
        province: string;
        adcode: number;
        price: number;
        volume: number;
        income: number;
        rate: number;
        density: number;
      }>;
  }, [selectedProvinces, currentYear]);

  // 维度定义
  const dimensions = [
    { key: "price", label: "房价均价", unit: "元/㎡" },
    { key: "volume", label: "成交量", unit: "套" },
    { key: "income", label: "人均可支配收入", unit: "元" },
    { key: "rate", label: "房贷利率", unit: "%" },
    { key: "density", label: "人口密度", unit: "人/km²" },
  ];

  // 颜色配置
  const regionColors = [
    { line: "#3b82f6", area: "rgba(59,130,246,0.1)" },
    { line: "#22c55e", area: "rgba(34,197,94,0.1)" },
    { line: "#f59e0b", area: "rgba(245,158,11,0.1)" },
    { line: "#ef4444", area: "rgba(239,68,68,0.1)" },
    { line: "#8b5cf6", area: "rgba(139,92,246,0.1)" },
  ];

  useEffect(() => {
    if (!svgRef.current || dimensionsData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // 计算每个维度的位置
    const dimensionSpacing = chartWidth / (dimensions.length - 1);
    const dimensionPositions = dimensions.map((_, i) => i * dimensionSpacing);

    // 为每个维度创建比例尺
    const scales = dimensions.reduce((acc, dim) => {
      const values = dimensionsData.map((d) => d[dim.key as keyof typeof dimensionsData[0]] as number);
      const extent = d3.extent(values) as [number, number];
      
      acc[dim.key] = d3.scaleLinear()
        .domain(extent)
        .range([chartHeight, 0])
        .nice();
      
      return acc;
    }, {} as Record<string, d3.ScaleLinear<number, number>>);

    // 绘制坐标轴
    dimensions.forEach((dim, i) => {
      const scale = scales[dim.key];
      const x = dimensionPositions[i];

      // Y轴
      const yAxis = d3.axisLeft(scale).ticks(5);
      g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${x},0)`)
        .call(yAxis)
        .selectAll("text")
        .attr("fill", "#94a3b8")
        .attr("font-size", 10);

      // 维度标签
      g.append("text")
        .attr("x", x)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "#e2e8f0")
        .attr("font-size", 11)
        .attr("font-weight", 600)
        .text(dim.label);

      // 单位标签
      g.append("text")
        .attr("x", x)
        .attr("y", chartHeight + 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#94a3b8")
        .attr("font-size", 9)
        .text(dim.unit);
    });

    // 绘制网格线
    dimensions.forEach((dim, i) => {
      const scale = scales[dim.key];
      const x = dimensionPositions[i];
      const ticks = scale.ticks(5);

      g.selectAll(`.grid-${dim.key}`)
        .data(ticks)
        .enter()
        .append("line")
        .attr("class", `grid-${dim.key}`)
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", (d) => scale(d))
        .attr("y2", (d) => scale(d))
        .attr("stroke", "rgba(255,255,255,0.05)")
        .attr("stroke-width", 1);
    });

    // 创建折线生成器
    const line = d3
      .line<{ key: string; value: number; x: number }>()
      .x((d) => d.x)
      .y((d) => scales[d.key](d.value))
      .curve(d3.curveMonotoneX);

    // 绘制每个省份的折线
    dimensionsData.forEach((provinceData, index) => {
      const isSelected = selectedProvinces.includes(provinceData.adcode);
      const isHovered = hoveredProvince === provinceData.adcode;
      const color = regionColors[index % regionColors.length];

      // 准备折线数据点
      const lineData = dimensions.map((dim) => ({
        key: dim.key,
        value: provinceData[dim.key as keyof typeof provinceData] as number,
        x: dimensionPositions[dimensions.findIndex((d) => d.key === dim.key)],
      }));

      // 绘制折线
      const path = g
        .append("path")
        .datum(lineData)
        .attr("class", `line-${provinceData.adcode}`)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", color.line)
        .attr("stroke-width", isHovered ? 3 : isSelected ? 2 : 1.5)
        .attr("opacity", isHovered ? 1 : isSelected ? 0.8 : 0.4)
        .style("cursor", "pointer")
        .on("mouseover", function () {
          setHoveredProvince(provinceData.adcode);
          if (onProvinceHover) {
            onProvinceHover(provinceData.adcode);
          }
          // 高亮当前折线
          d3.select(this)
            .transition()
            .duration(200)
            .attr("stroke-width", 3)
            .attr("opacity", 1);
        })
        .on("mouseout", function () {
          setHoveredProvince(null);
          if (onProvinceHover) {
            onProvinceHover(null);
          }
          // 恢复折线样式
          d3.select(this)
            .transition()
            .duration(200)
            .attr("stroke-width", isSelected ? 2 : 1.5)
            .attr("opacity", isSelected ? 0.8 : 0.4);
        });

      // 绘制数据点
      lineData.forEach((point) => {
        g.append("circle")
          .attr("class", `point-${provinceData.adcode}`)
          .attr("cx", point.x)
          .attr("cy", scales[point.key](point.value))
          .attr("r", isHovered ? 5 : isSelected ? 4 : 3)
          .attr("fill", color.line)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1)
          .attr("opacity", isHovered ? 1 : isSelected ? 0.8 : 0.4)
          .style("cursor", "pointer")
          .on("mouseover", function () {
            setHoveredProvince(provinceData.adcode);
            if (onProvinceHover) {
              onProvinceHover(provinceData.adcode);
            }
          })
          .on("mouseout", function () {
            setHoveredProvince(null);
            if (onProvinceHover) {
              onProvinceHover(null);
            }
          });
      });
    });

    // 图例
    const legend = g
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${chartWidth - 150}, 10)`);

    dimensionsData.forEach((provinceData, index) => {
      const color = regionColors[index % regionColors.length];
      const legendItem = legend
        .append("g")
        .attr("transform", `translate(0, ${index * 20})`);

      legendItem
        .append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", color.line)
        .attr("stroke-width", 2);

      legendItem
        .append("text")
        .attr("x", 25)
        .attr("y", 4)
        .attr("fill", "#e2e8f0")
        .attr("font-size", 10)
        .text(provinceData.province);
    });

    // 标题
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text(`多维度对比分析 (${currentYear}年)`);
    
    // 任务标签
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("fill", "#3b82f6")
      .attr("font-size", 11)
      .text("🔹 核心任务：对比多省份房价多维度特征");
  }, [dimensionsData, hoveredProvince, selectedProvinces, currentYear, width, height, onProvinceHover]);

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

export default ParallelCoordinates;

