import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import housePriceData from "../data/housePriceData.json";

interface AnomalyDetectorProps {
  visible: boolean;
  onClose?: () => void;
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

type Anomaly = {
  province: string;
  adcode: number;
  year: string;
  month: string;
  price: number;
  expectedPrice: number;
  deviation: number;
  severity: "high" | "medium" | "low";
  type: "spike" | "drop";
};

// 使用Z-score方法检测异常
const detectAnomalies = (data: ProvinceRecord[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const threshold = 2.5; // Z-score阈值

  data.forEach((province) => {
    if (province.adcode === 100000) return; // 跳过全国数据

    const prices: Array<{ price: number; year: string; month: string }> = [];
    const years = Object.keys(province.data).sort();
    const months = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    years.forEach((year) => {
      months.forEach((month) => {
        const price = (province.data[year] as any)?.[month];
        if (price !== null && price !== undefined) {
          prices.push({ price, year, month });
        }
      });
    });

    if (prices.length < 6) return; // 数据太少不检测

    // 计算均值和标准差
    const mean = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p.price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return; // 无波动

    // 检测异常
    prices.forEach(({ price, year, month }) => {
      const zScore = Math.abs((price - mean) / stdDev);
      
      if (zScore > threshold) {
        const deviation = ((price - mean) / mean) * 100;
        const severity =
          zScore > 3.5 ? "high" : zScore > 3.0 ? "medium" : "low";
        const type = price > mean ? "spike" : "drop";

        anomalies.push({
          province: province.name,
          adcode: province.adcode,
          year,
          month,
          price,
          expectedPrice: mean,
          deviation,
          severity,
          type,
        });
      }
    });
  });

  // 按严重程度和偏差排序
  return anomalies.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return Math.abs(b.deviation) - Math.abs(a.deviation);
  });
};

// 计算趋势异常（突然的大幅变化）
const detectTrendAnomalies = (data: ProvinceRecord[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  data.forEach((province) => {
    if (province.adcode === 100000) return;

    const prices: Array<{ price: number; year: string; month: string }> = [];
    const years = Object.keys(province.data).sort();
    const months = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    years.forEach((year) => {
      months.forEach((month) => {
        const price = (province.data[year] as any)?.[month];
        if (price !== null && price !== undefined) {
          prices.push({ price, year, month });
        }
      });
    });

    if (prices.length < 3) return;

    // 检测月度变化率异常
    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1].price;
      const currPrice = prices[i].price;
      const changeRate = Math.abs((currPrice - prevPrice) / prevPrice);

      // 如果月度变化超过15%，标记为异常
      if (changeRate > 0.15) {
        const deviation = ((currPrice - prevPrice) / prevPrice) * 100;
        const severity = changeRate > 0.25 ? "high" : changeRate > 0.20 ? "medium" : "low";
        const type = currPrice > prevPrice ? "spike" : "drop";

        anomalies.push({
          province: province.name,
          adcode: province.adcode,
          year: prices[i].year,
          month: prices[i].month,
          price: currPrice,
          expectedPrice: prevPrice,
          deviation,
          severity,
          type,
        });
      }
    }
  });

  return anomalies;
};

const getProvinceOptions = (data: ProvinceRecord[]): Array<{ label: string; value: number }> =>
  data
    .filter((p) => p.name && p.adcode !== 100000)
    .map((p) => ({ label: p.name, value: p.adcode }));

function AnomalyDetector({ visible, onClose }: AnomalyDetectorProps) {
  const data = useMemo(() => housePriceData as ProvinceRecord[], []);
  const [detectionMethod, setDetectionMethod] = useState<"zscore" | "trend">("zscore");
  const [selectedSeverity, setSelectedSeverity] = useState<"all" | "high" | "medium" | "low">("all");
  const [selectedProvince, setSelectedProvince] = useState<number | null>(null);

  const anomalies = useMemo(() => {
    const allAnomalies =
      detectionMethod === "zscore"
        ? detectAnomalies(data)
        : detectTrendAnomalies(data);

    let filtered = allAnomalies;

    if (selectedSeverity !== "all") {
      filtered = filtered.filter((a) => a.severity === selectedSeverity);
    }

    if (selectedProvince !== null) {
      filtered = filtered.filter((a) => a.adcode === selectedProvince);
    }

    return filtered;
  }, [data, detectionMethod, selectedSeverity, selectedProvince]);

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts>();

  useEffect(() => {
    if (chartRef.current && visible) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }
    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !chartInstanceRef.current || anomalies.length === 0) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.setOption({});
      }
      return;
    }

    // 按省份分组统计异常数量
    const provinceStats: Record<
      string,
      { name: string; high: number; medium: number; low: number }
    > = {};

    anomalies.forEach((anomaly) => {
      if (!provinceStats[anomaly.adcode]) {
        provinceStats[anomaly.adcode] = {
          name: anomaly.province,
          high: 0,
          medium: 0,
          low: 0,
        };
      }
      provinceStats[anomaly.adcode][anomaly.severity]++;
    });

    const provinces = Object.values(provinceStats);
    const sortedProvinces = provinces.sort(
      (a, b) => b.high + b.medium - (a.high + a.medium)
    );

    chartInstanceRef.current.setOption({
      title: {
        text: "异常检测统计",
        left: "center",
        top: 10,
        textStyle: {
          color: "#e2e8f0",
          fontSize: 16,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          if (Array.isArray(params)) {
            let result = `${params[0].axisValue}<br/>`;
            params.forEach((item: any) => {
              result += `${item.marker}${item.seriesName}: ${item.value}个<br/>`;
            });
            return result;
          }
          return "";
        },
      },
      legend: {
        show: true,
        bottom: 10,
        data: ["高严重度", "中严重度", "低严重度"],
        textStyle: {
          color: "#e2e8f0",
          fontSize: 12,
        },
      },
      xAxis: {
        type: "category",
        data: sortedProvinces.map((p) => p.name),
        axisLabel: {
          color: "#94a3b8",
          rotate: 45,
          fontSize: 10,
        },
        axisLine: {
          lineStyle: { color: "rgba(255,255,255,0.1)" },
        },
      },
      yAxis: {
        type: "value",
        name: "异常数量",
        nameTextStyle: {
          color: "#94a3b8",
        },
        axisLabel: {
          color: "#94a3b8",
        },
        axisLine: {
          lineStyle: { color: "rgba(255,255,255,0.1)" },
        },
        splitLine: {
          lineStyle: { color: "rgba(255,255,255,0.05)" },
        },
      },
      series: [
        {
          name: "高严重度",
          type: "bar",
          stack: "anomalies",
          data: sortedProvinces.map((p) => ({
            value: p.high,
            itemStyle: { color: "#ef4444" },
          })),
        },
        {
          name: "中严重度",
          type: "bar",
          stack: "anomalies",
          data: sortedProvinces.map((p) => ({
            value: p.medium,
            itemStyle: { color: "#f59e0b" },
          })),
        },
        {
          name: "低严重度",
          type: "bar",
          stack: "anomalies",
          data: sortedProvinces.map((p) => ({
            value: p.low,
            itemStyle: { color: "#3b82f6" },
          })),
        },
      ],
    });
  }, [visible, anomalies]);

  if (!visible) return null;

  const provinces = getProvinceOptions(data);
  const severityCounts = {
    high: anomalies.filter((a) => a.severity === "high").length,
    medium: anomalies.filter((a) => a.severity === "medium").length,
    low: anomalies.filter((a) => a.severity === "low").length,
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)",
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
          maxWidth: 1400,
          height: "85%",
          background: "rgba(5, 7, 15, 0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ color: "#e2e8f0", margin: 0, fontSize: 20, fontWeight: 700 }}>
            异常检测系统
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              关闭
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>
          <div style={{ width: 300, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                检测方法
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setDetectionMethod("zscore")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      detectionMethod === "zscore" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                    color: detectionMethod === "zscore" ? "#fff" : "#94a3b8",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Z-Score
                </button>
                <button
                  onClick={() => setDetectionMethod("trend")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      detectionMethod === "trend" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                    color: detectionMethod === "trend" ? "#fff" : "#94a3b8",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  趋势变化
                </button>
              </div>
            </div>

            <div>
              <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                严重度筛选
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(["all", "high", "medium", "low"] as const).map((severity) => (
                  <button
                    key={severity}
                    onClick={() => setSelectedSeverity(severity)}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      border: "none",
                      background:
                        selectedSeverity === severity ? "#3b82f6" : "rgba(255,255,255,0.06)",
                      color: selectedSeverity === severity ? "#fff" : "#94a3b8",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: "left",
                    }}
                  >
                    {severity === "all"
                      ? "全部"
                      : severity === "high"
                      ? "高严重度"
                      : severity === "medium"
                      ? "中严重度"
                      : "低严重度"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                省份筛选
              </div>
              <select
                value={selectedProvince || ""}
                onChange={(e) =>
                  setSelectedProvince(e.target.value ? parseInt(e.target.value) : null)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#e2e8f0",
                  fontSize: 12,
                }}
              >
                <option value="">全部省份</option>
                {provinces.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: "rgba(59,130,246,0.1)",
              }}
            >
              <div style={{ color: "#cbd5e1", fontSize: 12, marginBottom: 12 }}>异常统计</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
                {anomalies.length}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                高严重度: <span style={{ color: "#ef4444" }}>{severityCounts.high}</span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                中严重度: <span style={{ color: "#f59e0b" }}>{severityCounts.medium}</span>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                低严重度: <span style={{ color: "#3b82f6" }}>{severityCounts.low}</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              ref={chartRef}
              style={{
                flex: 1,
                minHeight: 0,
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
              }}
            />

            <div
              style={{
                maxHeight: 250,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {anomalies.slice(0, 20).map((anomaly, index) => (
                <div
                  key={index}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${
                      anomaly.severity === "high"
                        ? "rgba(239,68,68,0.3)"
                        : anomaly.severity === "medium"
                        ? "rgba(245,158,11,0.3)"
                        : "rgba(59,130,246,0.3)"
                    }`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                        {anomaly.province} - {anomaly.year}年{parseInt(anomaly.month)}月
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                        {anomaly.type === "spike" ? "价格飙升" : "价格暴跌"} | 偏差:{" "}
                        {anomaly.deviation >= 0 ? "+" : ""}
                        {anomaly.deviation.toFixed(2)}%
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color:
                            anomaly.severity === "high"
                              ? "#ef4444"
                              : anomaly.severity === "medium"
                              ? "#f59e0b"
                              : "#3b82f6",
                        }}
                      >
                        {anomaly.severity === "high" ? "高" : anomaly.severity === "medium" ? "中" : "低"}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        {anomaly.price.toFixed(0)} 元/㎡
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnomalyDetector;

