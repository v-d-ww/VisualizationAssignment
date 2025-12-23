import { useMemo, useState } from "react";
import housePriceData from "../data/housePriceData.json";

interface DataInsightsProps {
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

type Insight = {
  type: "trend" | "correlation" | "anomaly" | "comparison";
  title: string;
  description: string;
  data: any;
  importance: "high" | "medium" | "low";
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

// 生成数据洞察
const generateInsights = (data: ProvinceRecord[]): Insight[] => {
  const insights: Insight[] = [];

  // 1. 涨幅最大的省份
  const provinces = data.filter((p) => p.adcode !== 100000);
  const growthRates: Array<{ name: string; growth: number; adcode: number }> = [];

  provinces.forEach((province) => {
    const price2020 = findPrice(data, province.adcode, "2020") ?? 0;
    const price2024 = findPrice(data, province.adcode, "2024") ?? 0;
    if (price2020 > 0) {
      const growth = ((price2024 - price2020) / price2020) * 100;
      growthRates.push({ name: province.name, growth, adcode: province.adcode });
    }
  });

  const topGrowth = growthRates.sort((a, b) => b.growth - a.growth).slice(0, 3);
  if (topGrowth.length > 0) {
    insights.push({
      type: "trend",
      title: "涨幅最大的省份",
      description: `${topGrowth[0].name}在2020-2024年间涨幅达${topGrowth[0].growth.toFixed(2)}%，位居全国第一`,
      data: topGrowth,
      importance: "high",
    });
  }

  // 2. 价格最高的省份
  const currentPrices = provinces
    .map((p) => ({
      name: p.name,
      price: findPrice(data, p.adcode, "2024") ?? 0,
      adcode: p.adcode,
    }))
    .filter((p) => p.price > 0)
    .sort((a, b) => b.price - a.price);

  if (currentPrices.length > 0) {
    insights.push({
      type: "comparison",
      title: "房价最高的省份",
      description: `${currentPrices[0].name}当前房价为${(currentPrices[0].price / 10000).toFixed(1)}万元/㎡，远超全国平均水平`,
      data: currentPrices.slice(0, 5),
      importance: "high",
    });
  }

  // 3. 波动最大的省份
  const volatilities: Array<{ name: string; volatility: number; adcode: number }> = [];
  provinces.forEach((province) => {
    const prices: number[] = [];
    const years = Object.keys(province.data).sort();
    const months = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    years.forEach((year) => {
      months.forEach((month) => {
        const price = (province.data[year] as any)?.[month];
        if (price !== null && price !== undefined) {
          prices.push(price);
        }
      });
    });

    if (prices.length > 1) {
      const returns: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] > 0) {
          returns.push(Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]));
        }
      }
      const volatility = returns.length > 0
        ? returns.reduce((a, b) => a + b, 0) / returns.length
        : 0;
      volatilities.push({ name: province.name, volatility, adcode: province.adcode });
    }
  });

  const topVolatility = volatilities.sort((a, b) => b.volatility - a.volatility).slice(0, 3);
  if (topVolatility.length > 0) {
    insights.push({
      type: "anomaly",
      title: "价格波动最大的省份",
      description: `${topVolatility[0].name}价格波动率达${(topVolatility[0].volatility * 100).toFixed(2)}%，市场不确定性较高`,
      data: topVolatility,
      importance: "medium",
    });
  }

  // 4. 最稳定的省份
  const mostStable = volatilities.sort((a, b) => a.volatility - b.volatility).slice(0, 3);
  if (mostStable.length > 0) {
    insights.push({
      type: "trend",
      title: "价格最稳定的省份",
      description: `${mostStable[0].name}价格波动率仅${(mostStable[0].volatility * 100).toFixed(2)}%，市场表现稳定`,
      data: mostStable,
      importance: "medium",
    });
  }

  // 5. 全国平均趋势
  const national2020 = findPrice(data, 100000, "2020") ?? 0;
  const national2024 = findPrice(data, 100000, "2024") ?? 0;
  const nationalGrowth = national2020 > 0 ? ((national2024 - national2020) / national2020) * 100 : 0;

  insights.push({
    type: "trend",
    title: "全国房价趋势",
    description: `2020-2024年全国平均房价${nationalGrowth >= 0 ? "上涨" : "下跌"}${Math.abs(nationalGrowth).toFixed(2)}%，当前均价${(national2024 / 10000).toFixed(1)}万元/㎡`,
    data: { growth: nationalGrowth, current: national2024 },
    importance: "high",
  });

  // 6. 价格分化
  const priceGap = currentPrices.length > 0
    ? currentPrices[0].price / currentPrices[currentPrices.length - 1].price
    : 1;

  if (priceGap > 3) {
    insights.push({
      type: "comparison",
      title: "区域价格分化明显",
      description: `最高价省份与最低价省份价格差距达${priceGap.toFixed(1)}倍，区域分化严重`,
      data: { gap: priceGap },
      importance: "medium",
    });
  }

  return insights.sort((a, b) => {
    const importanceOrder = { high: 3, medium: 2, low: 1 };
    return importanceOrder[b.importance] - importanceOrder[a.importance];
  });
};

function DataInsights({ visible, onClose }: DataInsightsProps) {
  const data = useMemo(() => housePriceData as ProvinceRecord[], []);
  const insights = useMemo(() => generateInsights(data), [data]);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(
    insights.length > 0 ? insights[0] : null
  );

  if (!visible) return null;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "trend":
        return "📈";
      case "correlation":
        return "🔗";
      case "anomaly":
        return "⚠️";
      case "comparison":
        return "⚖️";
      default:
        return "💡";
    }
  };

  const getInsightColor = (importance: string) => {
    switch (importance) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#3b82f6";
      default:
        return "#94a3b8";
    }
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
          maxWidth: 1200,
          height: "80%",
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
            🤖 智能数据洞察
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
          <div
            style={{
              width: 350,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto",
            }}
          >
            {insights.map((insight, index) => (
              <div
                key={index}
                onClick={() => setSelectedInsight(insight)}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background:
                    selectedInsight === insight
                      ? "rgba(59,130,246,0.2)"
                      : "rgba(255,255,255,0.03)",
                  border: `1px solid ${
                    selectedInsight === insight
                      ? "rgba(59,130,246,0.5)"
                      : "rgba(255,255,255,0.08)"
                  }`,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{getInsightIcon(insight.type)}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#e2e8f0",
                        marginBottom: 4,
                      }}
                    >
                      {insight.title}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: `${getInsightColor(insight.importance)}20`,
                        color: getInsightColor(insight.importance),
                        display: "inline-block",
                      }}
                    >
                      {insight.importance === "high" ? "高优先级" : insight.importance === "medium" ? "中优先级" : "低优先级"}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                  {insight.description}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              flex: 1,
              padding: 24,
              borderRadius: 12,
              background: "rgba(255,255,255,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {selectedInsight && (
              <>
                <div>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>
                    {getInsightIcon(selectedInsight.type)}
                  </div>
                  <h3 style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                    {selectedInsight.title}
                  </h3>
                  <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>
                    {selectedInsight.description}
                  </p>
                </div>

                {selectedInsight.data && Array.isArray(selectedInsight.data) && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      marginTop: 16,
                    }}
                  >
                    {selectedInsight.data.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                          {item.name || `项目 ${idx + 1}`}
                        </div>
                        {item.growth !== undefined && (
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                            涨幅:{" "}
                            <span style={{ color: item.growth >= 0 ? "#22c55e" : "#ef4444" }}>
                              {item.growth >= 0 ? "+" : ""}
                              {item.growth.toFixed(2)}%
                            </span>
                          </div>
                        )}
                        {item.price !== undefined && (
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                            价格: {(item.price / 10000).toFixed(1)} 万元/㎡
                          </div>
                        )}
                        {item.volatility !== undefined && (
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                            波动率: {(item.volatility * 100).toFixed(2)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedInsight.data && !Array.isArray(selectedInsight.data) && (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      background: "rgba(59,130,246,0.1)",
                      marginTop: 16,
                    }}
                  >
                    {Object.entries(selectedInsight.data).map(([key, value]: [string, any]) => (
                      <div key={key} style={{ marginBottom: 8 }}>
                        <span style={{ color: "#cbd5e1", fontSize: 12 }}>{key}: </span>
                        <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>
                          {typeof value === "number"
                            ? key === "growth"
                              ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
                              : key === "current"
                              ? `${(value / 10000).toFixed(1)} 万元/㎡`
                              : value.toFixed(2)
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataInsights;

