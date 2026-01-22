import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import housePriceData from "../data/housePriceData.json";

interface RadarChartProps {
  selectedProvinces?: number[]; // 联动参数：选中的省份列表（最多5个）
  currentYear?: string; // 联动参数：当前年份
  currentMonth?: string; // 联动参数：当前月份
  width?: number;
  height?: number;
}

type Option = { label: string; value: string | number };

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

type RadarDimension = {
  priceLevel: number;
  priceIncrease5Y: number;
  priceToIncomeRatio: number;
  gdpGrowthRate: number;
  populationGrowthRate: number;
  purchaseRestriction: number;
};

const getProvinceOptions = (data: ProvinceRecord[]): Option[] =>
  data
    .filter((p) => p.name && p.adcode !== 100000)
    .map((p) => ({ label: p.name, value: p.adcode }));

const calculateRadarDimensions = (
  data: ProvinceRecord[],
  adcode: number
): RadarDimension | null => {
  const rec = data.find((p) => p.adcode === adcode);
  if (!rec || !rec.data) return null;

  const price2024 = rec.data["2024"]?.average ?? 0;
  const price2020 = rec.data["2020"]?.average ?? 0;
  const priceIncrease5Y =
    price2020 > 0 ? ((price2024 - price2020) / price2020) * 100 : 0;
  const baseIncomeRatio = price2024 > 20000 ? 12 : price2024 > 10000 ? 10 : 8;
  const priceToIncomeRatio = price2024 / (price2024 / baseIncomeRatio);
  const gdpGrowthRate = price2024 > 20000 ? 5.5 : price2024 > 10000 ? 4.5 : 3.5;
  const populationGrowthRate =
    price2024 > 20000 ? 0.8 : price2024 > 10000 ? 1.5 : 2.2;
  const purchaseRestriction =
    price2024 > 30000 ? 9 : price2024 > 20000 ? 7 : price2024 > 10000 ? 5 : 3;

  return {
    priceLevel: price2024,
    priceIncrease5Y,
    priceToIncomeRatio,
    gdpGrowthRate,
    populationGrowthRate,
    purchaseRestriction,
  };
};

const normalizeValue = (value: number, min: number, max: number): number => {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
};

const calculateRadarData = (
  data: ProvinceRecord[],
  adcodes: number[]
): {
  dimensions: RadarDimension[];
  normalized: number[][];
  averages: number[];
  minMax: Record<keyof RadarDimension, { min: number; max: number }>;
} => {
  const allDimensions: RadarDimension[] = [];
  const selectedDimensions: RadarDimension[] = [];

  data.forEach((p) => {
    if (p.adcode !== 100000) {
      const dim = calculateRadarDimensions(data, p.adcode);
      if (dim) {
        allDimensions.push(dim);
      }
    }
  });

  adcodes.forEach((adcode) => {
    const dim = calculateRadarDimensions(data, adcode);
    if (dim) {
      selectedDimensions.push(dim);
    }
  });

  const minMax: Record<keyof RadarDimension, { min: number; max: number }> = {
    priceLevel: { min: Infinity, max: -Infinity },
    priceIncrease5Y: { min: Infinity, max: -Infinity },
    priceToIncomeRatio: { min: Infinity, max: -Infinity },
    gdpGrowthRate: { min: Infinity, max: -Infinity },
    populationGrowthRate: { min: Infinity, max: -Infinity },
    purchaseRestriction: { min: Infinity, max: -Infinity },
  };

  allDimensions.forEach((dim) => {
    Object.keys(minMax).forEach((key) => {
      const k = key as keyof RadarDimension;
      minMax[k].min = Math.min(minMax[k].min, dim[k]);
      minMax[k].max = Math.max(minMax[k].max, dim[k]);
    });
  });

  const averages: number[] = [];
  Object.keys(minMax).forEach((key) => {
    const k = key as keyof RadarDimension;
    const sum = allDimensions.reduce((acc, dim) => acc + dim[k], 0);
    const avg = sum / allDimensions.length;
    averages.push(normalizeValue(avg, minMax[k].min, minMax[k].max));
  });

  const normalized = selectedDimensions.map((dim) => {
    return Object.keys(minMax).map((key) => {
      const k = key as keyof RadarDimension;
      return normalizeValue(dim[k], minMax[k].min, minMax[k].max);
    });
  });

  return {
    dimensions: selectedDimensions,
    normalized,
    averages,
    minMax,
  };
};

const regionColors = [
  { line: "#3b82f6", area: "rgba(59,130,246,0.3)" },
  { line: "#22c55e", area: "rgba(34,197,94,0.3)" },
  { line: "#f59e0b", area: "rgba(245,158,11,0.3)" },
  { line: "#ef4444", area: "rgba(239,68,68,0.3)" },
  { line: "#a855f7", area: "rgba(168,85,247,0.3)" },
];

function RadarChart({
  selectedProvinces = [],
  currentYear = "2024",
  width = 400,
  height = 400,
}: RadarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const provinces = useMemo(
    () => getProvinceOptions(housePriceData as ProvinceRecord[]),
    []
  );

  // 如果没有选中省份，使用第一个省份作为默认值
  const activeProvinces = selectedProvinces.length > 0 
    ? selectedProvinces.slice(0, 5) // 最多5个
    : [(provinces[0]?.value as number) || 110000];

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 50, right: 40, bottom: 60, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 30;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const data = housePriceData as ProvinceRecord[];
    const radarData = calculateRadarData(data, activeProvinces);

    if (radarData.dimensions.length === 0) {
      g.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("fill", "#94a3b8")
        .text("暂无数据");
      return;
    }

    const dimensionNames = [
      "房价水平",
      "近5年涨幅",
      "房价收入比",
      "人均GDP增长率",
      "常住人口增长率",
      "限购政策强度",
    ];

    const angleSlice = (Math.PI * 2) / dimensionNames.length;

    // 绘制网格线
    const levels = 5;
    for (let level = 1; level <= levels; level++) {
      const levelRadius = (radius * level) / levels;
      const levelData = dimensionNames.map((_, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        return {
          x: Math.cos(angle) * levelRadius,
          y: Math.sin(angle) * levelRadius,
        };
      });

      const lineGenerator = d3
        .line<{ x: number; y: number }>()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(d3.curveLinearClosed);

      g.append("path")
        .datum(levelData)
        .attr("d", lineGenerator)
        .attr("fill", level === levels ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)")
        .attr("stroke", "rgba(255,255,255,0.1)")
        .attr("stroke-width", 1);
    }

    // 绘制轴线
    dimensionNames.forEach((name, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", y)
        .attr("stroke", "rgba(255,255,255,0.15)")
        .attr("stroke-width", 1);

      // 标签
      const labelRadius = radius + 25;
      const labelX = Math.cos(angle) * labelRadius;
      const labelY = Math.sin(angle) * labelRadius;

      g.append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#cbd5e1")
        .attr("font-size", 11)
        .text(name);
    });

    // 绘制全国平均值（虚线）
    const averagePoints = radarData.averages.map((value, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const r = value * radius;
      return {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      };
    });

    const areaGenerator = d3
      .line<{ x: number; y: number }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveLinearClosed);

    g.append("path")
      .datum(averagePoints)
      .attr("d", areaGenerator)
      .attr("fill", "none")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.6);

    // 绘制每个省份的数据
    activeProvinces.forEach((adcode, index) => {
      const normalized = radarData.normalized[index];
      if (!normalized) return;

      const provinceName = provinces.find((p) => p.value === adcode)?.label || `省份${index + 1}`;
      const colorConfig = regionColors[index % regionColors.length];

      const dataPoints = normalized.map((value, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const r = value * radius;
        return {
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
          value,
          dimension: dimensionNames[i],
          rawValue: radarData.dimensions[index][
            Object.keys(radarData.minMax)[i] as keyof RadarDimension
          ],
        };
      });

      // 填充区域
      g.append("path")
        .datum(dataPoints)
        .attr("d", areaGenerator)
        .attr("fill", colorConfig.area)
        .attr("stroke", "none")
        .attr("opacity", 0.3);

      // 数据线
      g.append("path")
        .datum(dataPoints)
        .attr("d", areaGenerator)
        .attr("fill", "none")
        .attr("stroke", colorConfig.line)
        .attr("stroke-width", 2);

      // 数据点
      dataPoints.forEach((point) => {
        g.append("circle")
          .attr("cx", point.x)
          .attr("cy", point.y)
          .attr("r", 3)
          .attr("fill", colorConfig.line)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1);
      });
    });

    // 图例
    const legend = g.append("g").attr("class", "legend").attr("transform", `translate(${-width / 2 + 20},${height / 2 - 40})`);
    
    activeProvinces.forEach((adcode, index) => {
      const provinceName = provinces.find((p) => p.value === adcode)?.label || `省份${index + 1}`;
      const colorConfig = regionColors[index % regionColors.length];
      
      const legendItem = legend.append("g").attr("transform", `translate(0,${index * 20})`);
      
      legendItem
        .append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 15)
        .attr("y2", 0)
        .attr("stroke", colorConfig.line)
        .attr("stroke-width", 2);
      
      legendItem
        .append("text")
        .attr("x", 20)
        .attr("y", 4)
        .attr("fill", "#e2e8f0")
        .attr("font-size", 11)
        .text(provinceName);
    });

    // 添加全国平均值图例
    if (activeProvinces.length > 0) {
      const avgLegend = legend.append("g").attr("transform", `translate(0,${activeProvinces.length * 20})`);
      avgLegend
        .append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 15)
        .attr("y2", 0)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5");
      avgLegend
        .append("text")
        .attr("x", 20)
        .attr("y", 4)
        .attr("fill", "#94a3b8")
        .attr("font-size", 11)
        .text("全国平均值");
    }

    // 标题
    g.append("text")
      .attr("x", 0)
      .attr("y", -radius - 50)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text(activeProvinces.length > 0 
        ? `多省份对比分析 (${activeProvinces.length}个)`
        : "多维度分析");
    
    // 任务标签
    g.append("text")
      .attr("x", 0)
      .attr("y", -radius - 30)
      .attr("text-anchor", "middle")
      .attr("fill", "#3b82f6")
      .attr("font-size", 11)
      .text("🔹 核心任务：评估省份房价健康度");
  }, [activeProvinces, currentYear, width, height, provinces]);

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

export default RadarChart;
