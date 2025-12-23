import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import housePriceData from "../data/housePriceData.json";

interface InvestmentAdvisorProps {
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

const getProvinceOptions = (data: ProvinceRecord[]): Option[] =>
  data
    .filter((p) => p.name && p.adcode !== 100000)
    .map((p) => ({ label: p.name, value: p.adcode }));

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

// 计算投资指标
const calculateInvestmentMetrics = (
  data: ProvinceRecord[],
  adcode: number,
  purchaseYear: string,
  purchaseMonth: string,
  holdYears: number,
  area: number
) => {
  const purchasePrice = findPrice(data, adcode, purchaseYear, purchaseMonth) ?? 0;
  const currentYear = "2024";
  const currentMonth = "12";
  const currentPrice = findPrice(data, adcode, currentYear, currentMonth) ?? purchasePrice;

  // 计算总投入
  const totalInvestment = purchasePrice * area;
  const downPayment = totalInvestment * 0.3; // 假设首付30%
  const loanAmount = totalInvestment - downPayment;
  const interestRate = 0.045; // 4.5%年利率
  const loanYears = 20;
  const monthlyRate = interestRate / 12;
  const months = loanYears * 12;
  const monthlyPayment =
    loanAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  const totalInterest = monthlyPayment * months - loanAmount;

  // 计算当前价值
  const currentValue = currentPrice * area;

  // 计算收益率
  const totalCost = downPayment + totalInterest;
  const profit = currentValue - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const annualROI = holdYears > 0 ? roi / holdYears : 0;

  // 计算风险指标
  const priceVolatility = calculateVolatility(data, adcode);
  const riskLevel = priceVolatility > 0.15 ? "高" : priceVolatility > 0.08 ? "中" : "低";

  // 计算最佳买入时机
  const bestBuyTime = findBestBuyTime(data, adcode);

  return {
    purchasePrice,
    currentPrice,
    totalInvestment,
    downPayment,
    loanAmount,
    totalInterest,
    monthlyPayment,
    currentValue,
    totalCost,
    profit,
    roi,
    annualROI,
    priceVolatility,
    riskLevel,
    bestBuyTime,
  };
};

// 计算价格波动率
const calculateVolatility = (data: ProvinceRecord[], adcode: number): number => {
  const rec = data.find((p) => p.adcode === adcode);
  if (!rec || !rec.data) return 0;

  const prices: number[] = [];
  const years = Object.keys(rec.data).sort();
  const months = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  years.forEach((year) => {
    months.forEach((month) => {
      const price = (rec.data[year] as any)?.[month];
      if (price !== null && price !== undefined) {
        prices.push(price);
      }
    });
  });

  if (prices.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
};

// 找到最佳买入时机（价格最低点）
const findBestBuyTime = (
  data: ProvinceRecord[],
  adcode: number
): { year: string; month: string; price: number } | null => {
  const rec = data.find((p) => p.adcode === adcode);
  if (!rec || !rec.data) return null;

  let minPrice = Infinity;
  let bestYear = "";
  let bestMonth = "";

  const years = Object.keys(rec.data).sort();
  const months = ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

  years.forEach((year) => {
    months.forEach((month) => {
      const price = (rec.data[year] as any)?.[month];
      if (price !== null && price !== undefined && price < minPrice) {
        minPrice = price;
        bestYear = year;
        bestMonth = month;
      }
    });
  });

  return minPrice < Infinity ? { year: bestYear, month: bestMonth, price: minPrice } : null;
};

// 多城市对比分析
const compareCities = (
  data: ProvinceRecord[],
  adcodes: number[],
  purchaseYear: string,
  purchaseMonth: string,
  holdYears: number,
  area: number
) => {
  return adcodes.map((adcode) => {
    const metrics = calculateInvestmentMetrics(
      data,
      adcode,
      purchaseYear,
      purchaseMonth,
      holdYears,
      area
    );
    const provinceName =
      data.find((p) => p.adcode === adcode)?.name || "未知省份";
    return {
      adcode,
      name: provinceName,
      ...metrics,
    };
  });
};

const MultiSelectPicker = ({
  options,
  selectedValues,
  onChange,
  maxSelect = 5,
}: {
  options: Option[];
  selectedValues: number[];
  onChange: (values: number[]) => void;
  maxSelect?: number;
}) => {
  const handleToggle = (value: number) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      if (selectedValues.length < maxSelect) {
        onChange([...selectedValues, value]);
      }
    }
  };

  return (
    <div
      style={{
        maxHeight: 200,
        overflowY: "auto",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(59,130,246,0.08), rgba(15,23,42,0.5))",
        padding: 6,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((opt) => {
          const isSelected = selectedValues.includes(opt.value as number);
          const isDisabled = !isSelected && selectedValues.length >= maxSelect;
          return (
            <div
              key={opt.value}
              onClick={() => !isDisabled && handleToggle(opt.value as number)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                cursor: isDisabled ? "not-allowed" : "pointer",
                background: isSelected
                  ? "rgba(59,130,246,0.3)"
                  : "rgba(255,255,255,0.04)",
                border: isSelected
                  ? "1px solid rgba(59,130,246,0.6)"
                  : "1px solid rgba(255,255,255,0.04)",
                color: isSelected
                  ? "#e2e8f0"
                  : isDisabled
                  ? "#64748b"
                  : "#94a3b8",
                fontWeight: isSelected ? 700 : 500,
                transition: "all 0.2s",
                opacity: isDisabled ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{opt.label}</span>
              {isSelected && (
                <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 700 }}>✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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

function InvestmentAdvisor({ visible, onClose }: InvestmentAdvisorProps) {
  const provinces = useMemo(
    () => getProvinceOptions(housePriceData as ProvinceRecord[]),
    []
  );
  const years = useMemo(() => {
    const set = new Set<string>();
    (housePriceData as ProvinceRecord[]).forEach((item) => {
      if (item.data) {
        Object.keys(item.data).forEach((y) => set.add(y));
      }
    });
    return Array.from(set)
      .sort()
      .map((y) => ({ label: `${y}年`, value: y }));
  }, []);

  const months = Array.from({ length: 11 }, (_, i) => ({
    label: `${i + 2}月`,
    value: `${String(i + 2).padStart(2, "0")}`,
  }));

  const [selectedCities, setSelectedCities] = useState<number[]>([
    (provinces[0]?.value as number) || 110000,
  ]);
  const [purchaseYear, setPurchaseYear] = useState<string>("2020");
  const [purchaseMonth, setPurchaseMonth] = useState<string>("02");
  const [holdYears, setHoldYears] = useState<number>(5);
  const [area, setArea] = useState<number>(100);

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
    if (!visible || !chartInstanceRef.current || selectedCities.length === 0) return;

    const data = housePriceData as ProvinceRecord[];
    const comparisons = compareCities(
      data,
      selectedCities,
      purchaseYear,
      purchaseMonth,
      holdYears,
      area
    );

    // 按ROI排序
    const sorted = [...comparisons].sort((a, b) => b.roi - a.roi);

    chartInstanceRef.current.setOption({
      title: {
        text: "投资回报率对比分析",
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
              result += `${item.marker}${item.seriesName}: ${item.value.toFixed(2)}%<br/>`;
            });
            return result;
          }
          return "";
        },
      },
      legend: {
        show: true,
        bottom: 10,
        data: ["投资回报率", "年化收益率"],
        textStyle: {
          color: "#e2e8f0",
          fontSize: 12,
        },
      },
      xAxis: {
        type: "category",
        data: sorted.map((c) => c.name),
        axisLabel: {
          color: "#94a3b8",
          rotate: 45,
          fontSize: 11,
        },
        axisLine: {
          lineStyle: { color: "rgba(255,255,255,0.1)" },
        },
      },
      yAxis: {
        type: "value",
        name: "收益率 (%)",
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
          name: "投资回报率",
          type: "bar",
          data: sorted.map((c) => ({
            value: c.roi,
            itemStyle: {
              color:
                c.roi > 20
                  ? "#22c55e"
                  : c.roi > 10
                  ? "#f59e0b"
                  : c.roi > 0
                  ? "#3b82f6"
                  : "#ef4444",
            },
          })),
        },
        {
          name: "年化收益率",
          type: "line",
          data: sorted.map((c) => c.annualROI),
          lineStyle: {
            color: "#a855f7",
            width: 2,
          },
          itemStyle: {
            color: "#a855f7",
          },
        },
      ],
    });
  }, [visible, selectedCities, purchaseYear, purchaseMonth, holdYears, area]);

  if (!visible) return null;

  const data = housePriceData as ProvinceRecord[];
  const comparisons = compareCities(
    data,
    selectedCities,
    purchaseYear,
    purchaseMonth,
    holdYears,
    area
  );
  const bestInvestment = comparisons.reduce((best, current) =>
    current.roi > best.roi ? current : best
  );

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
            投资决策智能助手
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
          <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                选择城市（最多5个）
              </div>
              <MultiSelectPicker
                options={provinces}
                selectedValues={selectedCities}
                onChange={setSelectedCities}
                maxSelect={5}
              />
            </div>

            <div>
              <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                买入时间
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <WheelPicker options={years} value={purchaseYear} onChange={(v) => setPurchaseYear(v as string)} />
                </div>
                <div style={{ flex: 1 }}>
                  <WheelPicker options={months} value={purchaseMonth} onChange={(v) => setPurchaseMonth(v as string)} />
                </div>
              </div>
            </div>

            <div>
              <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                持有年限
              </div>
              <WheelPicker
                options={Array.from({ length: 20 }, (_, i) => ({
                  label: `${i + 1}年`,
                  value: i + 1,
                }))}
                value={holdYears}
                onChange={(v) => setHoldYears(v as number)}
              />
            </div>

            <div>
              <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                房屋面积（㎡）
              </div>
              <WheelPicker
                options={Array.from({ length: 100 }, (_, i) => ({
                  label: `${50 + i * 10}㎡`,
                  value: 50 + i * 10,
                }))}
                value={area}
                onChange={(v) => setArea(v as number)}
              />
            </div>

            {bestInvestment && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.3)",
                }}
              >
                <div style={{ color: "#cbd5e1", fontSize: 12, marginBottom: 8 }}>推荐投资</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>
                  {bestInvestment.name}
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4 }}>
                  投资回报率: <span style={{ color: "#22c55e", fontWeight: 600 }}>{bestInvestment.roi.toFixed(2)}%</span>
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4 }}>
                  年化收益率: <span style={{ color: "#22c55e", fontWeight: 600 }}>{bestInvestment.annualROI.toFixed(2)}%</span>
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4 }}>
                  风险等级: <span style={{ color: bestInvestment.riskLevel === "高" ? "#ef4444" : bestInvestment.riskLevel === "中" ? "#f59e0b" : "#22c55e", fontWeight: 600 }}>{bestInvestment.riskLevel}</span>
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8" }}>
                  预期收益: <span style={{ color: "#22c55e", fontWeight: 600 }}>{(bestInvestment.profit / 10000).toFixed(1)}万</span>
                </div>
              </div>
            )}
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
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {comparisons.map((city) => (
                <div
                  key={city.adcode}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>
                    {city.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                    ROI: <span style={{ color: city.roi > 0 ? "#22c55e" : "#ef4444" }}>{city.roi.toFixed(1)}%</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                    年化: {city.annualROI.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    风险: <span style={{ color: city.riskLevel === "高" ? "#ef4444" : city.riskLevel === "中" ? "#f59e0b" : "#22c55e" }}>{city.riskLevel}</span>
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

export default InvestmentAdvisor;

