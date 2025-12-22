import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import housePriceData from "../data/housePriceData.json";

interface PriceClusterChartProps {
  visible: boolean;
  onClose?: () => void;
}

type ProvinceData = {
  adcode: number;
  name: string;
  data: {
    [year: string]: {
      average: number;
    };
  };
};

// K-means聚类算法
function kMeansClustering(
  points: number[][],
  k: number,
  maxIterations: number = 100
): { clusters: number[]; centroids: number[][] } {
  if (points.length === 0) return { clusters: [], centroids: [] };

  // 初始化聚类中心（随机选择k个点）
  const centroids: number[][] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; i < k && i < points.length; i++) {
    let index;
    do {
      index = Math.floor(Math.random() * points.length);
    } while (usedIndices.has(index));
    usedIndices.add(index);
    centroids.push([...points[index]]);
  }

  let clusters: number[] = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    // 分配每个点到最近的聚类中心
    const newClusters: number[] = [];
    for (const point of points) {
      let minDistance = Infinity;
      let closestCluster = 0;
      for (let i = 0; i < centroids.length; i++) {
        const distance = Math.sqrt(
          point.reduce((sum, val, idx) => sum + Math.pow(val - centroids[i][idx], 2), 0)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = i;
        }
      }
      newClusters.push(closestCluster);
    }

    // 检查是否收敛
    let converged = true;
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i] !== newClusters[i]) {
        converged = false;
        break;
      }
    }
    if (converged) break;

    clusters = newClusters;

    // 更新聚类中心
    for (let i = 0; i < centroids.length; i++) {
      const clusterPoints = points.filter((_, idx) => clusters[idx] === i);
      if (clusterPoints.length > 0) {
        centroids[i] = clusterPoints[0].map((_, dim) => {
          const sum = clusterPoints.reduce((s, p) => s + p[dim], 0);
          return sum / clusterPoints.length;
        });
      }
    }

    iterations++;
  }

  return { clusters, centroids };
}

// 计算欧氏距离
function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, idx) => sum + Math.pow(val - b[idx], 2), 0));
}

function PriceClusterChart({ visible, onClose }: PriceClusterChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts>();
  const [clusterCount, setClusterCount] = useState<number>(4);

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

    const data = housePriceData as ProvinceData[];
    
    // 过滤掉"全国"数据
    const provinces = data.filter((item) => item.adcode !== 100000);
    
    // 提取年份数据
    const years = ["2020", "2021", "2022", "2023", "2024"];
    
    // 计算每个省份的增长特征
    const features: Array<{
      name: string;
      adcode: number;
      features: number[];
      prices: number[];
    }> = [];

    provinces.forEach((province) => {
      const prices: number[] = [];
      years.forEach((year) => {
        const avgPrice = province.data[year]?.average;
        if (avgPrice !== undefined && avgPrice !== null) {
          prices.push(avgPrice);
        }
      });

      if (prices.length >= 2) {
        // 计算增长特征
        const startPrice = prices[0];
        const endPrice = prices[prices.length - 1];
        const totalGrowthRate = (endPrice - startPrice) / startPrice; // 总增长率
        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length; // 平均价格
        
        // 计算增长趋势（线性回归斜率）
        let slope = 0;
        if (prices.length > 1) {
          const n = prices.length;
          const sumX = (n * (n - 1)) / 2;
          const sumY = prices.reduce((sum, p) => sum + p, 0);
          const sumXY = prices.reduce((sum, p, idx) => sum + p * idx, 0);
          const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
          slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        }
        
        // 计算波动性（标准差）
        const mean = avgPrice;
        const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
        const volatility = Math.sqrt(variance) / mean; // 相对波动性

        features.push({
          name: province.name,
          adcode: province.adcode,
          features: [
            totalGrowthRate * 100, // 总增长率（百分比）
            avgPrice / 1000, // 平均价格（千元/㎡，归一化）
            slope / 100, // 增长趋势（归一化）
            volatility * 100, // 波动性（百分比）
          ],
          prices,
        });
      }
    });

    if (features.length === 0) return;

    // 提取特征向量用于聚类
    const featureVectors = features.map((f) => f.features);
    
    // 归一化特征（Z-score标准化）
    const dimensions = featureVectors[0].length;
    const means: number[] = [];
    const stds: number[] = [];
    
    for (let dim = 0; dim < dimensions; dim++) {
      const values = featureVectors.map((v) => v[dim]);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      means.push(mean);
      stds.push(std);
    }
    
    const normalizedFeatures = featureVectors.map((vector) =>
      vector.map((val, dim) => (val - means[dim]) / (stds[dim] || 1))
    );

    // 执行K-means聚类
    const { clusters } = kMeansClustering(normalizedFeatures, clusterCount);
    
    // 为每个聚类分配颜色
    const clusterColors = [
      "#3b82f6", // 蓝色
      "#22c55e", // 绿色
      "#f59e0b", // 橙色
      "#ef4444", // 红色
      "#8b5cf6", // 紫色
      "#ec4899", // 粉色
      "#06b6d4", // 青色
      "#84cc16", // 黄绿色
    ];

    // 准备图表数据
    const seriesData: any[] = [];
    const clusterGroups: { [key: number]: any[] } = {};

    features.forEach((feature, idx) => {
      const clusterId = clusters[idx];
      if (!clusterGroups[clusterId]) {
        clusterGroups[clusterId] = [];
      }
      clusterGroups[clusterId].push({
        name: feature.name,
        value: [
          feature.features[0], // 总增长率
          feature.features[1] * 1000, // 平均价格（恢复原始单位）
        ],
        prices: feature.prices,
        adcode: feature.adcode,
      });
    });

    // 创建系列数据
    Object.keys(clusterGroups).forEach((clusterId) => {
      const id = parseInt(clusterId);
      seriesData.push({
        name: `增长模式 ${id + 1}`,
        type: "scatter",
        data: clusterGroups[id],
        itemStyle: {
          color: clusterColors[id % clusterColors.length],
        },
        symbolSize: (data: any) => {
          // 根据平均价格调整点的大小
          return Math.max(8, Math.min(20, data.value[1] / 500));
        },
      });
    });

    // 计算聚类统计信息
    const clusterStats = Object.keys(clusterGroups).map((clusterId) => {
      const id = parseInt(clusterId);
      const group = clusterGroups[id];
      const avgGrowthRate =
        group.reduce((sum, item) => sum + item.value[0], 0) / group.length;
      const avgPrice = group.reduce((sum, item) => sum + item.value[1], 0) / group.length;
      const provinces = group.map((item) => item.name).join("、");
      
      let label = "";
      if (avgGrowthRate > 5) {
        label = "快速增长型";
      } else if (avgGrowthRate > 0) {
        label = "稳定增长型";
      } else if (avgGrowthRate > -5) {
        label = "缓慢下降型";
      } else {
        label = "快速下降型";
      }

      return {
        id,
        label,
        avgGrowthRate: avgGrowthRate.toFixed(2),
        avgPrice: avgPrice.toFixed(0),
        count: group.length,
        provinces,
      };
    });

    const option: echarts.EChartsOption = {
      title: {
        text: "省份房价增长模式聚类分析",
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
        formatter: (params: any) => {
          if (params.data) {
            const data = params.data;
            const prices = data.prices || [];
            const priceText = prices
              .map((p: number, idx: number) => `${2020 + idx}年: ${p.toFixed(2)}`)
              .join("<br/>");
            return `${data.name}<br/>总增长率: ${data.value[0].toFixed(2)}%<br/>平均价格: ${data.value[1].toFixed(2)} 元/㎡<br/><br/>${priceText}`;
          }
          return "";
        },
      },
      legend: {
        data: seriesData.map((s) => s.name),
        top: 60,
        textStyle: {
          color: "#e2e8f0",
        },
      },
      xAxis: {
        type: "value",
        name: "总增长率 (%)",
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: {
          color: "#94a3b8",
          fontSize: 14,
        },
        axisLabel: {
          color: "#94a3b8",
        },
        axisLine: {
          lineStyle: {
            color: "#475569",
          },
        },
        splitLine: {
          lineStyle: {
            color: "#334155",
          },
        },
      },
      yAxis: {
        type: "value",
        name: "平均价格 (元/㎡)",
        nameLocation: "middle",
        nameGap: 50,
        nameTextStyle: {
          color: "#94a3b8",
          fontSize: 14,
        },
        axisLabel: {
          color: "#94a3b8",
        },
        axisLine: {
          lineStyle: {
            color: "#475569",
          },
        },
        splitLine: {
          lineStyle: {
            color: "#334155",
          },
        },
      },
      series: seriesData,
      backgroundColor: "transparent",
    };

    chartInstanceRef.current.setOption(option as any, true);

    // 更新聚类统计信息显示
    const statsContainer = document.getElementById("cluster-stats");
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div style="margin-top: 20px; padding: 16px; background: rgba(15, 23, 42, 0.5); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
          <div style="color: #e2e8f0; font-size: 14px; font-weight: 600; margin-bottom: 12px;">聚类结果统计</div>
          ${clusterStats
            .map(
              (stat) => `
            <div style="margin-bottom: 12px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 6px; border-left: 3px solid ${clusterColors[stat.id % clusterColors.length]};">
              <div style="color: #e2e8f0; font-size: 13px; font-weight: 600; margin-bottom: 4px;">
                ${stat.label} (模式 ${stat.id + 1}) - ${stat.count}个省份
              </div>
              <div style="color: #94a3b8; font-size: 12px; margin-bottom: 2px;">
                平均增长率: ${stat.avgGrowthRate}% | 平均价格: ${stat.avgPrice} 元/㎡
              </div>
              <div style="color: #64748b; font-size: 11px;">
                包含省份: ${stat.provinces}
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }
  }, [visible, clusterCount]);

  if (!visible) return null;

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
          overflow: "auto",
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
            zIndex: 10000,
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
            聚类数量：
          </label>
          <select
            value={clusterCount}
            onChange={(e) => setClusterCount(parseInt(e.target.value))}
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
            {[2, 3, 4, 5, 6].map((k) => (
              <option key={k} value={k}>
                {k} 个聚类
              </option>
            ))}
          </select>
        </div>

        <div
          ref={chartRef}
          style={{
            width: "100%",
            height: "500px",
            flexShrink: 0,
          }}
        />

        <div id="cluster-stats" style={{ marginTop: 20 }} />
      </div>
    </div>
  );
}

export default PriceClusterChart;

