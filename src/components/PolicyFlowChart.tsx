import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
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

function PolicyFlowChart({ visible, onClose }: PolicyFlowChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts>();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  useEffect(() => {
    if (chartRef.current && visible) {
      chartInstanceRef.current = echarts.init(chartRef.current);
      const handleResize = () => {
        chartInstanceRef.current?.resize();
      };
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        chartInstanceRef.current?.dispose();
      };
    }
  }, [visible]);

  useEffect(() => {
    if (!chartInstanceRef.current || !visible) return;

    const data = policyData as PolicyPeriod[];
    
    // 获取所有唯一的省份名称
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

    // 构建节点数据
    const nodes: Array<{ name: string; itemStyle?: any }> = [];
    const links: Array<{ source: string; target: string; value: number }> = [];

    // 添加政策节点
    policyMap.forEach((policy, id) => {
      nodes.push({
        name: policy.title,
        itemStyle: {
          color: "#3b82f6",
        },
      });
    });

    // 添加省份节点
    const provinceList = Array.from(allProvinces).sort();
    provinceList.forEach((province) => {
      nodes.push({
        name: province,
        itemStyle: {
          color: "#22c55e",
        },
      });
    });

    // 构建连接关系
    policyMap.forEach((policy, id) => {
      policy.provinces.forEach((province) => {
        if (province === "全国") {
          // 如果是全国政策，连接到所有省份
          provinceList.forEach((p) => {
            links.push({
              source: policy.title,
              target: p,
              value: 1,
            });
          });
        } else {
          links.push({
            source: policy.title,
            target: province,
            value: 1,
          });
        }
      });
    });

    const option: echarts.EChartsOption = {
      title: {
        text: "政策影响流量图",
        left: "center",
        top: 20,
        textStyle: {
          color: "#e2e8f0",
          fontSize: 20,
          fontWeight: "bold",
        },
      },
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        formatter: (params: any) => {
          if (params.dataType === "node") {
            return `${params.name}`;
          } else {
            return `${params.data.source}<br/>→ ${params.data.target}`;
          }
        },
      },
      series: [
        {
          type: "sankey",
          data: nodes,
          links: links,
          emphasis: {
            focus: "adjacency",
          },
          lineStyle: {
            color: "gradient",
            curveness: 0.5,
          },
          label: {
            color: "#e2e8f0",
            fontSize: 12,
          },
          itemStyle: {
            borderWidth: 1,
            borderColor: "#aaa",
          },
        },
      ],
      backgroundColor: "transparent",
    };

    chartInstanceRef.current.setOption(option as any, true);
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

        <div
          ref={chartRef}
          style={{
            width: "100%",
            height: "100%",
            flex: 1,
          }}
        />
      </div>
    </div>
  );
}

export default PolicyFlowChart;

