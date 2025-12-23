import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import housePriceData from "../data/housePriceData.json";

interface PricePredictionEngineProps {
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

type Option = { label: string; value: string | number };

// 线性回归预测
const linearRegression = (data: number[]): { slope: number; intercept: number } => {
  // 过滤无效数据
  const validData = data.filter(
    (v) => typeof v === 'number' && !isNaN(v) && v > 0 && v !== null && v !== undefined
  );

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
    // 避免除零错误
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // 检查结果有效性
  if (typeof slope !== 'number' || isNaN(slope) || typeof intercept !== 'number' || isNaN(intercept)) {
    return { slope: 0, intercept: sumY / n };
  }

  return { slope, intercept };
};

// 指数平滑预测
const exponentialSmoothing = (data: number[], alpha: number = 0.3): number[] => {
  if (data.length === 0) return [];
  
  const smoothed: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
};

// 预测未来价格
const predictPrices = (
  historicalData: number[],
  months: number = 12
): { predicted: number[]; confidence: number[]; trend: "up" | "down" | "stable" } => {
  // 过滤无效数据
  const validData = historicalData.filter(
    (v) => typeof v === 'number' && !isNaN(v) && v > 0 && v !== null && v !== undefined
  );

  if (validData.length < 3) {
    return { predicted: [], confidence: [], trend: "stable" };
  }

  // 使用线性回归
  const { slope, intercept } = linearRegression(validData);
  
  // 计算趋势
  const lastValue = validData[validData.length - 1];
  const firstValue = validData[0];
  
  if (typeof lastValue !== 'number' || isNaN(lastValue) || lastValue <= 0) {
    return { predicted: [], confidence: [], trend: "stable" };
  }
  
  let trend: "up" | "down" | "stable" = "stable";
  if (typeof slope === 'number' && !isNaN(slope)) {
    if (slope > lastValue * 0.01) trend = "up";
    else if (slope < -lastValue * 0.01) trend = "down";
  }

  // 预测未来值
  const predicted: number[] = [];
  const confidence: number[] = [];
  const baseIndex = validData.length;

  // 计算历史波动率
  const returns: number[] = [];
  for (let i = 1; i < validData.length; i++) {
    const prev = validData[i - 1];
    const curr = validData[i];
    if (typeof prev === 'number' && typeof curr === 'number' && prev > 0 && !isNaN(prev) && !isNaN(curr)) {
      returns.push(Math.abs((curr - prev) / prev));
    }
  }
  const volatility = returns.length > 0 
    ? returns.reduce((a, b) => a + b, 0) / returns.length 
    : 0.05;

  if (typeof intercept !== 'number' || isNaN(intercept) || typeof slope !== 'number' || isNaN(slope)) {
    return { predicted: [], confidence: [], trend: "stable" };
  }

  for (let i = 0; i < months; i++) {
    const predictedValue = intercept + slope * (baseIndex + i);
    const validValue = typeof predictedValue === 'number' && !isNaN(predictedValue) 
      ? Math.max(0, predictedValue) 
      : 0;
    predicted.push(validValue);
    
    // 置信区间（随时间增加不确定性）
    const conf = Math.max(0.5, 1 - (i * 0.05));
    confidence.push(conf);
  }

  return { predicted, confidence, trend };
};

// 获取省份选项
const getProvinceOptions = (data: ProvinceRecord[]): Option[] =>
  data
    .filter((p) => p.name && p.adcode !== 100000)
    .map((p) => ({ label: p.name, value: p.adcode }));

// 获取历史价格数据
const getHistoricalPrices = (
  data: ProvinceRecord[],
  adcode: number
): { prices: number[]; dates: string[] } => {
  const rec = data.find((p) => p.adcode === adcode);
  if (!rec || !rec.data) return { prices: [], dates: [] };

  const prices: number[] = [];
  const dates: string[] = [];
  const years = Object.keys(rec.data).sort();
  const months = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  years.forEach((year) => {
    months.forEach((month) => {
      const price = (rec.data[year] as any)?.[month];
      // 严格检查：确保price是有效的数字
      if (
        price !== null && 
        price !== undefined && 
        typeof price === 'number' && 
        !isNaN(price) && 
        price > 0
      ) {
        prices.push(price);
        dates.push(`${year}-${month}`);
      }
    });
  });

  return { prices, dates };
};

const WheelPicker = ({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string | number;
  onChange: (v: string | number) => void;
}) => {
  return (
    <div
      style={{
        height: 120,
        overflowY: "auto",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(59,130,246,0.08), rgba(15,23,42,0.5))",
        scrollSnapType: "y mandatory",
        padding: 6,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <div
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                cursor: "pointer",
                background: active
                  ? "rgba(59,130,246,0.3)"
                  : "rgba(255,255,255,0.04)",
                border: active
                  ? "1px solid rgba(59,130,246,0.6)"
                  : "1px solid rgba(255,255,255,0.04)",
                color: active ? "#e2e8f0" : "#94a3b8",
                fontWeight: active ? 700 : 500,
                transition: "all 0.2s",
                scrollSnapAlign: "start",
              }}
            >
              {opt.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function PricePredictionEngine({ visible, onClose }: PricePredictionEngineProps) {
  const provinces = useMemo(
    () => getProvinceOptions(housePriceData as ProvinceRecord[]),
    []
  );
  const [selectedProvince, setSelectedProvince] = useState<number>(
    (provinces[0]?.value as number) || 110000
  );
  const [predictionMonths, setPredictionMonths] = useState<number>(12);
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
    if (!visible || !chartInstanceRef.current) return;

    const data = housePriceData as ProvinceRecord[];
    const { prices, dates } = getHistoricalPrices(data, selectedProvince);
    
    if (prices.length === 0) {
      chartInstanceRef.current.setOption({});
      return;
    }

    const prediction = predictPrices(prices, predictionMonths);
    const provinceName = provinces.find((p) => p.value === selectedProvince)?.label || "未知省份";

    // 生成未来日期
    const futureDates: string[] = [];
    if (dates.length === 0) {
      chartInstanceRef.current.setOption({});
      return;
    }
    const lastDate = dates[dates.length - 1];
    if (!lastDate) {
      chartInstanceRef.current.setOption({});
      return;
    }
    const [lastYear, lastMonth] = lastDate.split("-");
    if (!lastYear || !lastMonth) {
      chartInstanceRef.current.setOption({});
      return;
    }
    let year = parseInt(lastYear);
    let month = parseInt(lastMonth);
    if (isNaN(year) || isNaN(month)) {
      chartInstanceRef.current.setOption({});
      return;
    }

    for (let i = 0; i < predictionMonths; i++) {
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
      futureDates.push(`${year}-${String(month).padStart(2, "0")}`);
    }

    // 计算置信区间
    const upperBound = prediction.predicted.map((p, i) => 
      p * (1 + (1 - prediction.confidence[i]) * 0.15)
    );
    const lowerBound = prediction.predicted.map((p, i) => 
      p * (1 - (1 - prediction.confidence[i]) * 0.15)
    );

    const allDates = [...dates, ...futureDates];
    const allPrices = [...prices, ...prediction.predicted];

    chartInstanceRef.current.setOption({
      title: {
        text: `${provinceName}房价预测分析`,
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
              if (item.seriesName === "历史数据") {
                if (item.value !== null && item.value !== undefined && typeof item.value === 'number') {
                  result += `${item.marker}${item.seriesName}: ${item.value.toFixed(0)} 元/㎡<br/>`;
                }
              } else if (item.seriesName === "预测值") {
                if (item.value !== null && item.value !== undefined && typeof item.value === 'number') {
                  result += `${item.marker}${item.seriesName}: ${item.value.toFixed(0)} 元/㎡<br/>`;
                }
              } else if (item.seriesName === "置信区间") {
                // 不显示置信区间的tooltip
              }
            });
            return result;
          }
          return "";
        },
      },
      legend: {
        show: true,
        bottom: 10,
        data: ["历史数据", "预测值", "置信区间"],
        textStyle: {
          color: "#e2e8f0",
          fontSize: 12,
        },
      },
      xAxis: {
        type: "category",
        data: allDates,
        boundaryGap: false,
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
        name: "房价 (元/㎡)",
        nameTextStyle: {
          color: "#94a3b8",
        },
        axisLabel: {
          color: "#94a3b8",
          formatter: (value: number) => {
            if (typeof value !== 'number' || isNaN(value) || value === null || value === undefined) {
              return '0';
            }
            return value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toFixed(0);
          },
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
          name: "历史数据",
          type: "line",
          data: [...prices.map(p => typeof p === 'number' && !isNaN(p) ? p : null), ...Array(predictionMonths).fill(null)],
          smooth: true,
          lineStyle: {
            color: "#3b82f6",
            width: 2,
          },
          itemStyle: {
            color: "#3b82f6",
          },
          areaStyle: {
            color: "rgba(59,130,246,0.1)",
          },
        },
        {
          name: "预测值",
          type: "line",
          data: [...Array(dates.length).fill(null), ...prediction.predicted.map(p => typeof p === 'number' && !isNaN(p) ? p : null)],
          smooth: true,
          lineStyle: {
            color: "#22c55e",
            width: 2,
            type: "dashed",
          },
          itemStyle: {
            color: "#22c55e",
          },
          markLine: {
            silent: true,
            lineStyle: {
              color: "#64748b",
              width: 1,
              type: "dashed",
            },
            data: [
              {
                xAxis: dates.length - 1,
              },
            ],
          },
        },
        {
          name: "置信区间",
          type: "line",
          data: [...Array(dates.length).fill(null), ...upperBound.map(p => typeof p === 'number' && !isNaN(p) ? p : null)],
          lineStyle: { opacity: 0 },
          stack: "confidence",
          symbol: "none",
          areaStyle: {
            color: "rgba(34,197,94,0.2)",
          },
        },
        {
          name: "置信区间",
          type: "line",
          data: [...Array(dates.length).fill(null), ...lowerBound.map(p => typeof p === 'number' && !isNaN(p) ? p : null)],
          lineStyle: { opacity: 0 },
          stack: "confidence",
          symbol: "none",
          areaStyle: {
            color: "rgba(34,197,94,0.2)",
          },
        },
      ],
    });
  }, [visible, selectedProvince, predictionMonths, provinces]);

  if (!visible) return null;

  const data = housePriceData as ProvinceRecord[];
  const { prices } = getHistoricalPrices(data, selectedProvince);
  const prediction = predictPrices(prices, predictionMonths);
  const provinceName = provinces.find((p) => p.value === selectedProvince)?.label || "未知省份";

  const trendText = {
    up: "上涨趋势",
    down: "下跌趋势",
    stable: "稳定趋势",
  }[prediction.trend];

  const trendColor = {
    up: "#22c55e",
    down: "#ef4444",
    stable: "#f59e0b",
  }[prediction.trend];

  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const predictedPrice = prediction.predicted.length > 0 
    ? prediction.predicted[prediction.predicted.length - 1] 
    : 0;
  const priceChange = predictedPrice - currentPrice;
  const priceChangePercent = currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;

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
            AI房价预测引擎
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
                选择省份
              </div>
              <WheelPicker
                options={provinces}
                value={selectedProvince}
                onChange={(v) => setSelectedProvince(v as number)}
              />
            </div>

            <div>
              <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                预测时长（月）
              </div>
              <WheelPicker
                options={Array.from({ length: 24 }, (_, i) => ({
                  label: `${i + 1}个月`,
                  value: i + 1,
                }))}
                value={predictionMonths}
                onChange={(v) => setPredictionMonths(v as number)}
              />
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: "rgba(59,130,246,0.1)",
                border: `1px solid ${trendColor}40`,
              }}
            >
              <div style={{ color: "#cbd5e1", fontSize: 12, marginBottom: 8 }}>预测结果</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: trendColor, marginBottom: 8 }}>
                {trendText}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                当前价格: {typeof currentPrice === 'number' ? currentPrice.toFixed(0) : '0'} 元/㎡
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                预测价格: {typeof predictedPrice === 'number' ? predictedPrice.toFixed(0) : '0'} 元/㎡
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: priceChange >= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {priceChange >= 0 ? "+" : ""}
                {typeof priceChange === 'number' ? priceChange.toFixed(0) : '0'} 元/㎡ ({priceChangePercent >= 0 ? "+" : ""}
                {typeof priceChangePercent === 'number' ? priceChangePercent.toFixed(2) : '0.00'}%)
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "rgba(59,130,246,0.1)",
                fontSize: 12,
                color: "#94a3b8",
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                预测说明：
              </div>
              <div>• 基于历史数据使用线性回归算法</div>
              <div>• 绿色虚线为预测值</div>
              <div>• 阴影区域为置信区间</div>
              <div>• 预测时间越长，不确定性越大</div>
            </div>
          </div>

          <div
            ref={chartRef}
            style={{
              flex: 1,
              minHeight: 0,
              borderRadius: 12,
              background: "rgba(255,255,255,0.02)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default PricePredictionEngine;

