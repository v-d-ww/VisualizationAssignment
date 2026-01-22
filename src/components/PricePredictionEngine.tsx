import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import housePriceData from "../data/housePriceData.json";

interface PricePredictionEngineProps {
  selectedProvinces?: number[];
  currentYear?: string;
  currentMonth?: string;
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

const findPrice = (
  data: ProvinceRecord[],
  adcode: number,
  year: string,
  month?: string
): number | null => {
  const rec = data.find((p) => p.adcode === adcode);
  if (!rec || !rec.data) return null;
  const y = rec.data[year];
  if (!y) return null;
  if (month) return (y as any)[month] ?? null;
  return y.average ?? null;
};

// 线性回归预测
const linearRegression = (data: number[]): { slope: number; intercept: number } => {
  const validData = data.filter((v) => typeof v === "number" && !isNaN(v) && v > 0);
  if (validData.length < 2) {
    return { slope: 0, intercept: validData.length === 1 ? validData[0] : 0 };
  }
  const n = validData.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = validData.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * validData[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) {
    return { slope: 0, intercept: sumY / n };
  }
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
};

const provinceColors = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
];

function PricePredictionEngine({
  selectedProvinces = [],
  currentYear = "2024",
  currentMonth = "02",
  width = 400,
  height = 400,
}: PricePredictionEngineProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const provinces = useMemo(
    () =>
      (housePriceData as ProvinceRecord[])
        .filter((p) => p.name && p.adcode !== 100000)
        .map((p) => ({ label: p.name, value: p.adcode })),
    []
  );

  // 如果没有选中省份，使用第一个省份作为默认值
  const activeProvinces = selectedProvinces.length > 0 
    ? selectedProvinces.slice(0, 5)
    : [(provinces[0]?.value as number) || 110000];

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 50, right: 60, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const data = housePriceData as ProvinceRecord[];
    const years = ["2020", "2021", "2022", "2023", "2024"];

    // 为每个省份准备数据
    const allData: Array<{
      province: number;
      provinceName: string;
      historical: Array<{ year: string; value: number }>;
      predicted: Array<{ year: string; value: number; isPredicted: boolean }>;
    }> = [];

    activeProvinces.forEach((adcode) => {
      const provinceName = provinces.find((p) => p.value === adcode)?.label || "未知省份";
      const historicalData: Array<{ year: string; value: number }> = [];
      
      years.forEach((year) => {
        const price = findPrice(data, adcode, year);
        if (price !== null && price > 0) {
          historicalData.push({ year, value: price });
        }
      });

      if (historicalData.length > 0) {
        const values = historicalData.map((d) => d.value);
        const { slope, intercept } = linearRegression(values);
        const lastIndex = historicalData.length - 1;
        const predictedData: Array<{ year: string; value: number; isPredicted: boolean }> = [
          ...historicalData.map((d) => ({ ...d, isPredicted: false })),
        ];

        for (let i = 1; i <= 12; i++) {
          const futureIndex = lastIndex + i;
          const predictedValue = slope * futureIndex + intercept;
          predictedData.push({
            year: `未来${i}月`,
            value: Math.max(0, predictedValue),
            isPredicted: true,
          });
        }

        allData.push({
          province: adcode,
          provinceName,
          historical: historicalData,
          predicted: predictedData,
        });
      }
    });

    if (allData.length === 0) {
      g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#94a3b8")
        .text("暂无数据");
      return;
    }

    // 合并所有数据点用于计算比例尺
    const allPoints = allData.flatMap((d) => d.predicted);
    const maxValue = d3.max(allPoints, (d) => d.value) || 0;
    const allTimePoints = allData[0]?.predicted.map((_, i) => i) || [];

    // 创建比例尺
    const xScale = d3
      .scaleLinear()
      .domain([0, allTimePoints.length - 1])
      .range([0, chartWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, maxValue * 1.1])
      .nice()
      .range([chartHeight, 0]);

    // 绘制网格线
    g.selectAll(".grid-line")
      .data(yScale.ticks(5))
      .enter()
      .append("line")
      .attr("class", "grid-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "rgba(255,255,255,0.05)")
      .attr("stroke-width", 1);

    // 绘制坐标轴
    const xAxis = d3.axisBottom(xScale).tickFormat((d, i) => {
      if (allData[0] && i < allData[0].historical.length) {
        return allData[0].historical[i].year;
      }
      return "";
    });
    const yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".0f"));

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", 10)
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end");

    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", 11);

    // 坐标轴标签
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 50)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", 12)
      .text("时间");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -chartHeight / 2)
      .attr("y", -45)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", 12)
      .text("房价 (元/㎡)");

    // 创建折线生成器
    const lineGenerator = d3
      .line<{ year: string; value: number; isPredicted: boolean }>()
      .x((d, i) => xScale(i))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // 绘制每个省份的折线
    allData.forEach((provinceData, index) => {
      const color = provinceColors[index % provinceColors.length];
      const historicalPoints = provinceData.predicted.filter((d) => !d.isPredicted);
      const allPoints = provinceData.predicted;

      // 绘制历史数据线（实线）
      if (historicalPoints.length > 0) {
        g.append("path")
          .datum(historicalPoints)
          .attr("d", lineGenerator)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 2);
      }

      // 绘制预测数据线（虚线）
      if (allPoints.length > historicalPoints.length) {
        g.append("path")
          .datum(allPoints)
          .attr("d", lineGenerator)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5")
          .attr("opacity", 0.7);
      }

      // 绘制数据点
      allPoints.forEach((d, i) => {
        g.append("circle")
          .attr("cx", xScale(i))
          .attr("cy", yScale(d.value))
          .attr("r", 3)
          .attr("fill", color)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1)
          .attr("opacity", d.isPredicted ? 0.7 : 1);
      });
    });

    // 图例
    const legend = g
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${chartWidth - 100},20)`);

    allData.forEach((provinceData, index) => {
      const color = provinceColors[index % provinceColors.length];
      const legendItem = legend.append("g").attr("transform", `translate(0,${index * 20})`);

      legendItem
        .append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 15)
        .attr("y2", 0)
        .attr("stroke", color)
        .attr("stroke-width", 2);

      legendItem
        .append("text")
        .attr("x", 20)
        .attr("y", 4)
        .attr("fill", "#e2e8f0")
        .attr("font-size", 11)
        .text(provinceData.provinceName);
    });

    // 标题
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text(activeProvinces.length > 1 
        ? `多省份房价预测趋势 (${activeProvinces.length}个)`
        : "房价预测趋势");
    
    // 任务标签
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("fill", "#3b82f6")
      .attr("font-size", 11)
      .text("🔹 核心任务：预测房价趋势变化");
  }, [activeProvinces, currentYear, currentMonth, width, height, provinces]);

  return (
    <div
      style={{
        width: width,
        height: height,
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default PricePredictionEngine;
