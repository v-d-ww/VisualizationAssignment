// ============================================
// 这是今日初始版本桑基图代码（标准基础版）
// ============================================
// 功能：基础的桑基图实现
// - 左侧：源省份节点
// - 右侧：目标省份节点
// - 连接线：表示流量关系
// - 基础布局：固定位置，无动态效果
// ============================================

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import housePriceData from "../data/housePriceData.json";

interface SankeyChartProps {
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

type FlowType = "人口流动" | "经济关联" | "政策影响";

interface SankeyNode {
  id: string;
  name: string;
  type: "source" | "target";
  adcode: number;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SankeyLink {
  source: SankeyNode;
  target: SankeyNode;
  value: number;
  type: FlowType;
  width?: number; // 连接线宽度
}

const flowTypeColors: Record<FlowType, string> = {
  人口流动: "#3b82f6",
  经济关联: "#22c55e",
  政策影响: "#f59e0b",
};

// 计算流量值
const calculateFlowValue = (
  source: ProvinceRecord,
  target: ProvinceRecord,
  year: string,
  flowType: FlowType
): number => {
  const sourcePrice = source.data[year]?.average || 0;
  const targetPrice = target.data[year]?.average || 0;
  const priceDiff = Math.abs(sourcePrice - targetPrice);
  const avgPrice = (sourcePrice + targetPrice) / 2;

  switch (flowType) {
    case "人口流动":
      return Math.max(10, Math.min(100, priceDiff / 20));
    case "经济关联":
      return Math.max(10, Math.min(100, 100 - priceDiff / 30));
    case "政策影响":
      return Math.max(10, Math.min(100, avgPrice / 150));
    default:
      return 10;
  }
};

// 生成桑基图数据
const generateSankeyData = (
  data: ProvinceRecord[],
  selectedProvinces: number[],
  year: string
): { nodes: SankeyNode[]; links: SankeyLink[] } => {
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  if (selectedProvinces.length < 2) {
    return { nodes, links };
  }

  const provinces = data.filter((p) => p.name && p.adcode !== 100000);
  const sourceProvinces = selectedProvinces
    .map((adcode) => provinces.find((p) => p.adcode === adcode))
    .filter(Boolean) as ProvinceRecord[];

  if (sourceProvinces.length === 0) {
    return { nodes, links };
  }

  // 获取目标省份（排除选中的）
  const targetProvinces = provinces.filter(
    (p) => !selectedProvinces.includes(p.adcode)
  );

  const flowTypes: FlowType[] = ["人口流动", "经济关联", "政策影响"];

  // 添加源节点
  sourceProvinces.forEach((province) => {
    nodes.push({
      id: `source_${province.adcode}`,
      name: province.name,
      type: "source",
      adcode: province.adcode,
      value: 0,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  // 添加目标节点（只包含有连接的）
  const targetNodeMap = new Map<string, SankeyNode>();

  sourceProvinces.forEach((sourceProvince) => {
    targetProvinces.forEach((targetProvince) => {
      flowTypes.forEach((flowType) => {
        const flowValue = calculateFlowValue(
          sourceProvince,
          targetProvince,
          year,
          flowType
        );
        if (flowValue > 10) {
          const targetId = `target_${targetProvince.adcode}`;
          if (!targetNodeMap.has(targetId)) {
            targetNodeMap.set(targetId, {
              id: targetId,
              name: targetProvince.name,
              type: "target",
              adcode: targetProvince.adcode,
              value: 0,
              x: 0,
              y: 0,
              width: 0,
              height: 0,
            });
          }
        }
      });
    });
  });

  targetNodeMap.forEach((node) => nodes.push(node));

  // 创建连接
  const sourceNodes = nodes.filter((n) => n.type === "source");
  const targetNodes = nodes.filter((n) => n.type === "target");

  sourceNodes.forEach((sourceNode) => {
    const sourceProvince = sourceProvinces.find(
      (p) => p.adcode === sourceNode.adcode
    );
    if (!sourceProvince) return;

    targetNodes.forEach((targetNode) => {
      const targetProvince = targetProvinces.find(
        (p) => p.adcode === targetNode.adcode
      );
      if (!targetProvince) return;

      flowTypes.forEach((flowType) => {
        const flowValue = calculateFlowValue(
          sourceProvince,
          targetProvince,
          year,
          flowType
        );

        if (flowValue > 10) {
          links.push({
            source: sourceNode,
            target: targetNode,
            value: flowValue,
            type: flowType,
          });
          sourceNode.value += flowValue;
          targetNode.value += flowValue;
        }
      });
    });
  });

  return { nodes, links };
};

// 基础布局计算
const computeSankeyLayout = (
  nodes: SankeyNode[],
  links: SankeyLink[],
  width: number,
  height: number
): { nodes: SankeyNode[]; links: SankeyLink[] } => {
  const nodeWidth = 20;
  const nodePadding = 15;
  const sourceX = width * 0.2;
  const targetX = width * 0.8;

  const sourceNodes = nodes.filter((n) => n.type === "source").sort((a, b) => b.value - a.value);
  const targetNodes = nodes.filter((n) => n.type === "target").sort((a, b) => b.value - a.value);

  // 计算节点高度（基于流量值）
  const allValues = nodes.map((n) => n.value);
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 1);

  // 布局源节点
  let currentY = 50;
  sourceNodes.forEach((node) => {
    const normalizedValue = (node.value - minValue) / (maxValue - minValue || 1);
    const nodeHeight = Math.max(20, Math.min(60, 20 + normalizedValue * 40));

    node.x = sourceX;
    node.y = currentY;
    node.width = nodeWidth;
    node.height = nodeHeight;
    currentY += nodeHeight + nodePadding;
  });

  // 布局目标节点
  currentY = 50;
  targetNodes.forEach((node) => {
    const normalizedValue = (node.value - minValue) / (maxValue - minValue || 1);
    const nodeHeight = Math.max(20, Math.min(60, 20 + normalizedValue * 40));

    node.x = targetX;
    node.y = currentY;
    node.width = nodeWidth;
    node.height = nodeHeight;
    currentY += nodeHeight + nodePadding;
  });

  // 计算连接线宽度
  const allLinkValues = links.map((l) => l.value);
  const maxLinkValue = Math.max(...allLinkValues, 1);
  const minLinkValue = Math.min(...allLinkValues, 1);

  links.forEach((link) => {
    const normalizedValue = (link.value - minLinkValue) / (maxLinkValue - minLinkValue || 1);
    link.width = Math.max(2, 2 + normalizedValue * 6);
  });

  return { nodes, links };
};

// 生成连接线路径（贝塞尔曲线）
const sankeyLinkHorizontal = () => {
  const curvature = 0.5;
  return (d: SankeyLink) => {
    const sourceX = d.source.x + d.source.width;
    const sourceY = d.source.y + d.source.height / 2;
    const targetX = d.target.x;
    const targetY = d.target.y + d.target.height / 2;
    const dx = targetX - sourceX;

    return `M${sourceX},${sourceY}C${sourceX + dx * curvature},${sourceY} ${targetX - dx * curvature},${targetY} ${targetX},${targetY}`;
  };
};

function SankeyChart({
  selectedProvinces = [],
  currentYear = "2024",
  width = 400,
  height = 400,
}: SankeyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const sankeyData = useMemo(() => {
    const data = housePriceData as ProvinceRecord[];
    return generateSankeyData(data, selectedProvinces, currentYear);
  }, [selectedProvinces, currentYear]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 50, right: 100, bottom: 40, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    if (sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
      g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#94a3b8")
        .attr("font-size", 13)
        .text("请选择至少2个省份查看关联关系");

      g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("fill", "#e2e8f0")
        .attr("font-size", 14)
        .attr("font-weight", 600)
        .text("省份关联流量分析");
      return;
    }

    // 计算布局
    const { nodes, links } = computeSankeyLayout(
      sankeyData.nodes,
      sankeyData.links,
      chartWidth,
      chartHeight
    );

    // 绘制连接线
    const linkGenerator = sankeyLinkHorizontal();
    g.append("g")
      .attr("class", "links")
      .selectAll<SVGPathElement, SankeyLink>("path")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("d", linkGenerator)
      .attr("fill", "none")
      .attr("stroke", (d) => flowTypeColors[d.type])
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: any) => d.width || 2);

    // 绘制节点
    g.append("g")
      .attr("class", "nodes")
      .selectAll<SVGRectElement, SankeyNode>("rect")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("rx", 4)
      .attr("fill", (d) => {
        if (d.type === "source") return "#3b82f6";
        return "#22c55e";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // 添加标签
    g.append("g")
      .attr("class", "labels")
      .selectAll<SVGTextElement, SankeyNode>("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("x", (d) => {
        if (d.type === "source") return d.x - 8;
        return d.x + d.width + 8;
      })
      .attr("y", (d) => d.y + d.height / 2)
      .attr("text-anchor", (d) => {
        if (d.type === "source") return "end";
        return "start";
      })
      .attr("dy", "0.35em")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 10)
      .text((d) => d.name);

    // 标题
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text(
        selectedProvinces.length >= 2
          ? `省份关联流量分析 (${selectedProvinces.length}个省份, ${currentYear}年)`
          : "省份关联流量分析"
      );

    // 任务标签
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -12)
      .attr("text-anchor", "middle")
      .attr("fill", "#3b82f6")
      .attr("font-size", 11)
      .text("🔹 核心任务：追踪省份间房价关联传导");

    // 图例
    const legend = g
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${chartWidth - 90}, 10)`);
    const flowTypes: FlowType[] = ["人口流动", "经济关联", "政策影响"];
    flowTypes.forEach((type, i) => {
      const legendItem = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
      legendItem
        .append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", flowTypeColors[type])
        .attr("stroke-width", 2);
      legendItem
        .append("text")
        .attr("x", 25)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .attr("fill", "#94a3b8")
        .attr("font-size", 10)
        .text(type);
    });
  }, [sankeyData, width, height, selectedProvinces, currentYear]);

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

export default SankeyChart;
