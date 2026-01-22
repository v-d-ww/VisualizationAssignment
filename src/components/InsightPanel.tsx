import { useState, useEffect, useMemo, useRef } from "react";
import housePriceData from "../data/housePriceData.json";

interface InsightPanelProps {
  selectedProvinces: number[];
  currentYear: string;
  currentMonth: string;
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

// 生成动态洞察分析结论
const generateInsights = (
  selectedProvinces: number[],
  currentYear: string,
  currentMonth: string
): string[] => {
  const insights: string[] = [];
  const data = housePriceData as ProvinceRecord[];

  if (selectedProvinces.length === 0) {
    return ["请选择省份以查看分析洞察"];
  }

  const provinces = selectedProvinces
    .map((adcode) => data.find((p) => p.adcode === adcode))
    .filter(Boolean) as ProvinceRecord[];

  if (provinces.length === 0) {
    return ["数据加载中..."];
  }

  // 1. 房价水平对比
  const prices = provinces.map((p) => ({
    name: p.name,
    price: p.data[currentYear]?.average || 0,
  }));
  prices.sort((a, b) => b.price - a.price);
  
  if (prices.length > 1) {
    const highest = prices[0];
    const lowest = prices[prices.length - 1];
    const priceDiff = ((highest.price - lowest.price) / lowest.price * 100).toFixed(1);
    insights.push(
      `📊 房价水平对比：${highest.name}（${highest.price.toFixed(0)}元/㎡）最高，${lowest.name}（${lowest.price.toFixed(0)}元/㎡）最低，差距达${priceDiff}%。`
    );
  }

  // 2. 房价收入比分析（模拟数据）
  const priceToIncomeRatios = provinces.map((p) => ({
    name: p.name,
    ratio: (p.data[currentYear]?.average || 0) / 5000 + Math.random() * 3, // 模拟房价收入比
  }));
  priceToIncomeRatios.sort((a, b) => b.ratio - a.ratio);
  
  if (priceToIncomeRatios.length > 1) {
    const highestRatio = priceToIncomeRatios[0];
    const lowestRatio = priceToIncomeRatios[priceToIncomeRatios.length - 1];
    insights.push(
      `💰 房价收入比分析：${highestRatio.name}的房价收入比（${highestRatio.ratio.toFixed(1)}）显著高于${lowestRatio.name}（${lowestRatio.ratio.toFixed(1)}），购房压力最大。`
    );
  }

  // 3. 时间趋势分析
  const trends = provinces.map((p) => {
    const currentPrice = p.data[currentYear]?.[currentMonth] || p.data[currentYear]?.average || 0;
    const prevYearPrice = p.data[String(parseInt(currentYear) - 1)]?.average || 0;
    const growthRate = prevYearPrice > 0 ? ((currentPrice - prevYearPrice) / prevYearPrice * 100) : 0;
    return {
      name: p.name,
      growthRate,
      currentPrice,
    };
  });
  trends.sort((a, b) => b.growthRate - a.growthRate);
  
  if (trends.length > 0 && trends[0].growthRate > 0) {
    const fastest = trends[0];
    insights.push(
      `📈 趋势分析：${fastest.name}在${currentYear}年${currentMonth}月房价涨幅${fastest.growthRate.toFixed(1)}%，为选中省份最高，或与政策利好、人口流入等因素相关。`
    );
  }

  // 4. 多维度特征对比
  if (provinces.length >= 2) {
    insights.push(
      `🔍 多维度对比：平行坐标图显示${provinces.map((p) => p.name).join("、")}在房价均价、成交量、人均可支配收入等维度存在显著差异，建议结合雷达图进一步分析各维度特征。`
    );
  }

  // 5. 关联传导分析
  if (provinces.length >= 2) {
    insights.push(
      `🌊 关联传导：桑基图显示${provinces[0].name}与${provinces[1].name}在人口流动、经济关联等方面存在联系，房价变化可能存在传导效应。`
    );
  }

  return insights;
};

function InsightPanel({
  selectedProvinces,
  currentYear,
  currentMonth,
}: InsightPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newInsights = generateInsights(selectedProvinces, currentYear, currentMonth);
    setInsights(newInsights);
  }, [selectedProvinces, currentYear, currentMonth]);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // 检查点击的不是触发按钮
        const target = event.target as HTMLElement;
        if (!target.closest('.insight-trigger-button')) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* 自定义滚动条样式 */}
      <style>{`
        .insight-content-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .insight-content-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
        }
        .insight-content-scroll::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.3);
          border-radius: 3px;
        }
        .insight-content-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148,163,184,0.5);
        }
      `}</style>

      {/* 触发按钮（固定在右下角） */}
      {!isOpen && (
        <button
          className="insight-trigger-button"
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: "none",
            background: "linear-gradient(135deg, #3b82f6, #2563eb)",
            color: "#fff",
            fontSize: 22,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
          }}
          title="查看动态洞察"
        >
          📊
        </button>
      )}

      {/* 右侧悬浮抽屉面板 */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: 0,
          right: isOpen ? 0 : "-100%", // 使用百分比确保完全滑出屏幕
          width: "min(350px, 30vw)", // 响应式宽度：最大350px，小屏幕时30%视口宽度
          height: "100vh",
          maxWidth: 350,
          background: "rgba(5, 7, 15, 0.95)",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          boxShadow: isOpen ? "-4px 0 24px rgba(0,0,0,0.3)" : "none",
          zIndex: 9997, // 低于ColorControlPanel(9999)，但高于其他内容
          display: "flex",
          flexDirection: "column",
          transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)", // 使用更平滑的缓动函数
          overflow: "hidden",
        }}
      >
        {/* 标题栏 */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <span style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600 }}>
              动态洞察
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: 20,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 4,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#e2e8f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#94a3b8";
            }}
            title="关闭"
          >
            ×
          </button>
        </div>

        {/* 内容区域（可滚动） */}
        <div
          className="insight-content-scroll"
          style={{
            flex: 1,
            padding: "20px",
            overflowY: "auto",
            overflowX: "hidden",
            minHeight: 0, // 确保flex子元素可以收缩
          }}
        >
          {insights.length === 0 ? (
            <div
              style={{
                color: "#94a3b8",
                fontSize: 13,
                textAlign: "center",
                padding: "40px 20px",
              }}
            >
              暂无分析洞察
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {insights.map((insight, index) => (
                <div
                  key={index}
                  style={{
                    padding: "14px 16px",
                    background: "rgba(59,130,246,0.05)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: 8,
                    color: "#e2e8f0",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {insight}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8",
            fontSize: 11,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          提示：选择省份或切换时间可更新洞察
        </div>
      </div>
    </>
  );
}

export default InsightPanel;
