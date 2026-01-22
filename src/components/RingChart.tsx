import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import housePriceData from "../data/housePriceData.json";

interface RingChartProps {
  selectedProvinces?: number[]; // 联动参数：选中的省份列表
  currentYear?: string; // 联动参数：当前年份
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

const calculateProvinceFactors = (
  data: ProvinceRecord[],
  adcode: number,
  year: string
): Array<{ name: string; value: number; color: string }> => {
  const price = findPrice(data, adcode, year) ?? 0;
  const price2020 = findPrice(data, adcode, "2020") ?? 0;
  const priceIncrease = price2020 > 0 ? ((price - price2020) / price2020) * 100 : 0;

  const factors = [
    {
      name: "经济支撑",
      weight: price > 20000 ? 0.35 : price > 10000 ? 0.30 : 0.25,
      color: "#3b82f6",
    },
    {
      name: "人口流入",
      weight: price > 20000 ? 0.25 : price > 10000 ? 0.25 : 0.20,
      color: "#22c55e",
    },
    {
      name: "政策宽松",
      weight: price > 20000 ? 0.15 : price > 10000 ? 0.20 : 0.25,
      color: "#f59e0b",
    },
    {
      name: "市场热度",
      weight: priceIncrease > 10 ? 0.20 : priceIncrease > 0 ? 0.15 : 0.10,
      color: "#ef4444",
    },
    {
      name: "其他",
      weight: 0.10,
      color: "#94a3b8",
    },
  ];

  return factors.map((factor) => ({
    name: factor.name,
    value: factor.weight * 100,
    color: factor.color,
  }));
};

function RingChart({
  selectedProvinces = [],
  currentYear = "2024",
  width = 400,
  height = 400,
}: RingChartProps) {
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

    const margin = { top: 40, right: 20, bottom: 40, left: 20 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 20;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const data = housePriceData as ProvinceRecord[];
    // 如果选中多个省份，展示第一个省份的数据（或可以改为展示平均值）
    const activeProvince = activeProvinces[0];
    const chartData = calculateProvinceFactors(data, activeProvince, currentYear);
    const provinceName = provinces.find((p) => p.value === activeProvince)?.label || "未知省份";

    if (chartData.length === 0) {
      g.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("fill", "#94a3b8")
        .text("暂无数据");
      return;
    }

    // 创建饼图布局
    const pie = d3
      .pie<{ name: string; value: number; color: string }>()
      .value((d) => d.value)
      .sort(null);

    // 创建弧生成器
    const arc = d3
      .arc<d3.PieArcDatum<{ name: string; value: number; color: string }>>()
      .innerRadius(radius * 0.4)
      .outerRadius(radius * 0.7);

    const arcs = pie(chartData);

    // 绘制扇形
    const arcsGroup = g
      .selectAll(".arc")
      .data(arcs)
      .enter()
      .append("g")
      .attr("class", "arc");

    arcsGroup
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-width", 1)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("opacity", 0.8);
        // 显示tooltip
        const tooltip = g
          .append("g")
          .attr("class", "tooltip")
          .attr("transform", `translate(${arc.centroid(d)[0] + 20},${arc.centroid(d)[1] - 10})`);

        tooltip
          .append("rect")
          .attr("x", -50)
          .attr("y", -20)
          .attr("width", 100)
          .attr("height", 30)
          .attr("fill", "rgba(0,0,0,0.8)")
          .attr("rx", 4);

        tooltip
          .append("text")
          .attr("x", 0)
          .attr("y", -5)
          .attr("text-anchor", "middle")
          .attr("fill", "#e2e8f0")
          .attr("font-size", 11)
          .text(`${d.data.name}: ${d.data.value.toFixed(1)}%`);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 1);
        g.selectAll(".tooltip").remove();
      });

    // 添加标签
    arcsGroup
      .append("text")
      .attr("transform", (d) => {
        const [x, y] = arc.centroid(d);
        const angle = Math.atan2(y, x);
        const labelRadius = radius * 0.85;
        const labelX = Math.cos(angle) * labelRadius;
        const labelY = Math.sin(angle) * labelRadius;
        return `translate(${labelX},${labelY})`;
      })
      .attr("text-anchor", (d) => {
        const [x] = arc.centroid(d);
        return x > 0 ? "start" : "end";
      })
      .attr("dominant-baseline", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 11)
      .text((d) => `${d.data.name} ${d.data.value.toFixed(1)}%`);

    // 标题
    g.append("text")
      .attr("x", 0)
      .attr("y", -radius - 30)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text(activeProvinces.length > 1 
        ? `${provinceName}等${activeProvinces.length}个省份 - 房价支撑因素`
        : `${provinceName} - 房价支撑因素`);
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

export default RingChart;
