import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import policyData from "../data/policyData.json";

interface PolicyFlowChartProps {
  visible: boolean;
  onClose?: () => void;
}

type PolicyPeriod = {
  period: string;
  periodRange: string;
  policies: Array<{
    id: string;
    date: string;
    title: string;
    affectedProvinces: string[] | number[];
    affectedProvinceNames: string[];
  }>;
};

interface Node {
  id: string;
  name: string;
  type: "policy" | "province";
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value: number;
}

function PolicyFlowChart({ visible, onClose }: PolicyFlowChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  useEffect(() => {
    if (!svgRef.current || !visible) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1200;
    const height = 800;
    const margin = { top: 60, right: 20, bottom: 20, left: 20 };

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const data = policyData as PolicyPeriod[];

    // 构建节点和连接数据
    const allProvinces = new Set<string>();
    const policyMap = new Map<string, { title: string; provinces: string[] }>();

    data.forEach((period) => {
      if (selectedPeriod !== "all" && period.period !== selectedPeriod) return;

      period.policies.forEach((policy) => {
        const provinces = policy.affectedProvinceNames || [];
        policyMap.set(policy.id, {
          title: policy.title,
          provinces: provinces,
        });
        provinces.forEach((province) => {
          if (province !== "全国") {
            allProvinces.add(province);
          }
        });
      });
    });

    const nodes: Node[] = [];
    const links: Link[] = [];

    // 添加政策节点
    policyMap.forEach((policy) => {
      nodes.push({
        id: `policy_${policy.title}`,
        name: policy.title,
        type: "policy",
      });
    });

    // 添加省份节点
    const provinceList = Array.from(allProvinces).sort();
    provinceList.forEach((province) => {
      nodes.push({
        id: `province_${province}`,
        name: province,
        type: "province",
      });
    });

    // 构建连接
    policyMap.forEach((policy) => {
      policy.provinces.forEach((province) => {
        if (province === "全国") {
          provinceList.forEach((p) => {
            links.push({
              source: `policy_${policy.title}`,
              target: `province_${p}`,
              value: 1,
            });
          });
        } else {
          links.push({
            source: `policy_${policy.title}`,
            target: `province_${province}`,
            value: 1,
          });
        }
      });
    });

    // 初始化力导向模拟
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    simulationRef.current = d3
      .forceSimulation<Node>(nodes)
      .force(
        "link",
        d3
          .forceLink<Node, Link>(links)
          .id((d) => d.id)
          .distance(100)
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(chartWidth / 2, chartHeight / 2))
      .force("collision", d3.forceCollide().radius(30))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    // 绘制连接线
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, Link>("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // 绘制节点
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGCircleElement, Node>("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => (d.type === "policy" ? 12 : 8))
      .attr("fill", (d) => (d.type === "policy" ? "#3b82f6" : "#22c55e"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGCircleElement, Node>()
          .on("start", function (event, d) {
            if (!event.active && simulationRef.current) {
              simulationRef.current.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", function (event, d) {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", function (event, d) {
            if (!event.active && simulationRef.current) {
              simulationRef.current.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
          })
      );

    // 添加标签
    const labels = g
      .append("g")
      .attr("class", "labels")
      .selectAll<SVGTextElement, Node>("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("font-size", 11)
      .attr("fill", "#e2e8f0")
      .text((d) => d.name)
      .style("pointer-events", "none");

    // 力导向tick事件
    simulationRef.current.on("tick", () => {
      link
        .attr("x1", (d: any) => {
          const source = typeof d.source === "object" ? d.source : nodes.find((n) => n.id === d.source);
          return source?.x || 0;
        })
        .attr("y1", (d: any) => {
          const source = typeof d.source === "object" ? d.source : nodes.find((n) => n.id === d.source);
          return source?.y || 0;
        })
        .attr("x2", (d: any) => {
          const target = typeof d.target === "object" ? d.target : nodes.find((n) => n.id === d.target);
          return target?.x || 0;
        })
        .attr("y2", (d: any) => {
          const target = typeof d.target === "object" ? d.target : nodes.find((n) => n.id === d.target);
          return target?.y || 0;
        });

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);

      labels
        .attr("x", (d) => (d.x || 0) + 15)
        .attr("y", (d) => (d.y || 0) + 5);
    });

    // 标题
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -30)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 18)
      .attr("font-weight", "bold")
      .text("政策影响流量图");
  }, [visible, selectedPeriod]);

  if (!visible) return null;

  const periods = [
    { value: "all", label: "全部时期" },
    ...(policyData as PolicyPeriod[]).map((p) => ({
      value: p.period,
      label: `${p.period} (${p.periodRange})`,
    })),
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: "90%",
          height: "85%",
          backgroundColor: "#0f172a",
          borderRadius: 12,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backgroundColor: "rgba(239, 68, 68, 0.2)",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
          }}
        >
          ×
        </button>

        <div
          style={{
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 15,
          }}
        >
          <label
            style={{
              color: "#e2e8f0",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            选择时期：
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: "8px 16px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 6,
              color: "#e2e8f0",
              fontSize: 14,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>

        <svg ref={svgRef} style={{ width: "100%", height: "100%", flex: 1 }}></svg>
      </div>
    </div>
  );
}

export default PolicyFlowChart;
