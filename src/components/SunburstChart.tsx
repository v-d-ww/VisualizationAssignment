import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import housePriceData from "../data/housePriceData.json";

interface SunburstChartProps {
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

// 构建层级数据：省份 → 城市 → 区县（或房价构成）
const buildHierarchy = (
  data: ProvinceRecord[],
  selectedProvinces: number[],
  currentYear: string
): any => {
  if (selectedProvinces.length === 0) {
    return null;
  }

  // 选择第一个省份作为主要展示（旭日图通常展示单一数据源）
  const primaryProvince = selectedProvinces[0];
  const provinceData = data.find((p) => p.adcode === primaryProvince);
  
  if (!provinceData) return null;

  const yearData = provinceData.data[currentYear];
  const averagePrice = yearData?.average || 0;

  // 构建房价构成数据（地价+建材+税费+利润）
  const landCost = averagePrice * 0.4; // 地价占40%
  const materialCost = averagePrice * 0.25; // 建材占25%
  const taxCost = averagePrice * 0.15; // 税费占15%
  const profit = averagePrice * 0.2; // 利润占20%

  return {
    name: provinceData.name,
    value: averagePrice,
    children: [
      {
        name: "地价成本",
        value: landCost,
        children: [
          { name: "土地出让金", value: landCost * 0.7 },
          { name: "拆迁补偿", value: landCost * 0.3 },
        ],
      },
      {
        name: "建材成本",
        value: materialCost,
        children: [
          { name: "钢筋水泥", value: materialCost * 0.5 },
          { name: "其他建材", value: materialCost * 0.5 },
        ],
      },
      {
        name: "税费成本",
        value: taxCost,
        children: [
          { name: "增值税", value: taxCost * 0.5 },
          { name: "其他税费", value: taxCost * 0.5 },
        ],
      },
      {
        name: "利润",
        value: profit,
        children: [
          { name: "开发商利润", value: profit * 0.7 },
          { name: "其他利润", value: profit * 0.3 },
        ],
      },
    ],
  };
};

function SunburstChart({
  selectedProvinces = [],
  currentYear = "2024",
  width = 500,
  height = 500,
}: SunburstChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drillDownPath, setDrillDownPath] = useState<string[]>([]);

  const hierarchyData = useMemo(() => {
    const data = housePriceData as ProvinceRecord[];
    return buildHierarchy(data, selectedProvinces, currentYear);
  }, [selectedProvinces, currentYear]);

  useEffect(() => {
    if (!svgRef.current || !hierarchyData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const radius = Math.min(chartWidth, chartHeight) / 2;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // 构建层级结构
    const root = d3.hierarchy(hierarchyData);
    root.sum((d: any) => d.value || 0);

    // 创建分区布局
    const partition = d3.partition().size([2 * Math.PI, radius]);

    const rootNode = partition(root) as any;

    // 颜色比例尺
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // 创建弧生成器
    const arc = d3
      .arc<any>()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .innerRadius((d: any) => d.y0)
      .outerRadius((d: any) => d.y1);

    // 过滤数据：根据drillDownPath显示对应层级
    const getVisibleNodes = (node: any, path: string[]): any[] => {
      if (path.length === 0) {
        return node.descendants().filter((d: any) => d.depth <= 2);
      }
      
      let current = node;
      for (const name of path) {
        const child = current.children?.find((c: any) => c.data.name === name);
        if (!child) break;
        current = child;
      }
      
      return current.descendants().filter((d: any) => d.depth <= current.depth + 2);
    };

    const visibleNodes = getVisibleNodes(rootNode, drillDownPath);

    // 绘制弧
    const arcs = g
      .selectAll(".arc")
      .data(visibleNodes)
      .enter()
      .append("path")
      .attr("class", "arc")
      .attr("d", arc)
      .attr("fill", (d: any) => {
        if (d.depth === 0) return "#3b82f6";
        if (d.depth === 1) return colorScale(d.data.name);
        return d3.color(colorScale(d.parent?.data.name || ""))?.brighter(0.5).toString() || "#94a3b8";
      })
      .attr("stroke", "#05070f")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);

        // 显示tooltip
        const tooltip = g
          .append("g")
          .attr("class", "tooltip")
          .attr("transform", `translate(${arc.centroid(d as any)})`);

        const [x, y] = arc.centroid(d as any);
        tooltip
          .append("rect")
          .attr("x", x - 60)
          .attr("y", y - 30)
          .attr("width", 120)
          .attr("height", 50)
          .attr("fill", "rgba(0,0,0,0.8)")
          .attr("rx", 4);

        tooltip
          .append("text")
          .attr("x", x)
          .attr("y", y - 15)
          .attr("text-anchor", "middle")
          .attr("fill", "#e2e8f0")
          .attr("font-size", 11)
          .text(d.data.name);

        tooltip
          .append("text")
          .attr("x", x)
          .attr("y", y)
          .attr("text-anchor", "middle")
          .attr("fill", "#94a3b8")
          .attr("font-size", 10)
          .text(`${d.value?.toFixed(0) || 0} 元/㎡`);

        tooltip
          .append("text")
          .attr("x", x)
          .attr("y", y + 12)
          .attr("text-anchor", "middle")
          .attr("fill", "#94a3b8")
          .attr("font-size", 9)
          .text(`占比: ${root.value ? ((d.value / root.value) * 100).toFixed(1) : '0.0'}%`);
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("stroke", "#05070f")
          .attr("stroke-width", 1);
        g.selectAll(".tooltip").remove();
      })
      .on("click", function (event, d: any) {
        // 点击内层实现下钻
        if (d.depth > 0 && d.children && d.children.length > 0) {
          setDrillDownPath([...drillDownPath, d.data.name]);
        } else if (drillDownPath.length > 0) {
          // 点击外层返回上级
          setDrillDownPath(drillDownPath.slice(0, -1));
        }
      });

    // 添加标签（仅显示最外层）
    arcs
      .filter((d: any) => d.depth <= 1)
      .append("text")
      .attr("transform", (d: any) => {
        const [x, y] = arc.centroid(d);
        const angle = (d.x0 + d.x1) / 2;
        const rotate = (angle * 180) / Math.PI - 90;
        return `translate(${x},${y}) rotate(${rotate > 90 ? rotate + 180 : rotate})`;
      })
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 11)
      .attr("pointer-events", "none")
      .text((d: any) => d.data.name);

    // 中心文本
    if (drillDownPath.length === 0) {
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-10")
        .attr("fill", "#e2e8f0")
        .attr("font-size", 14)
        .attr("font-weight", 600)
        .text(hierarchyData.name);

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "10")
        .attr("fill", "#94a3b8")
        .attr("font-size", 12)
        .text(`${hierarchyData.value.toFixed(0)} 元/㎡`);
    } else {
      const currentName = drillDownPath[drillDownPath.length - 1];
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-10")
        .attr("fill", "#e2e8f0")
        .attr("font-size", 14)
        .attr("font-weight", 600)
        .text(currentName);

      // 返回按钮
      g.append("circle")
        .attr("r", 20)
        .attr("fill", "rgba(59,130,246,0.2)")
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("click", () => {
          setDrillDownPath(drillDownPath.slice(0, -1));
        });

      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "5")
        .attr("fill", "#e2e8f0")
        .attr("font-size", 10)
        .text("返回")
        .style("cursor", "pointer")
        .on("click", () => {
          setDrillDownPath(drillDownPath.slice(0, -1));
        });
    }

    // 标题
    g.append("text")
      .attr("x", 0)
      .attr("y", -radius - 20)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text(`${selectedProvinces.length > 0 ? hierarchyData.name : "请选择省份"} - 房价构成分析 (${currentYear}年)`);
    
    // 任务标签
    g.append("text")
      .attr("x", 0)
      .attr("y", -radius + 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#3b82f6")
      .attr("font-size", 11)
      .text("🔹 核心任务：下钻分析省份房价层级分布");
  }, [hierarchyData, drillDownPath, width, height, selectedProvinces, currentYear]);

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

export default SunburstChart;

