import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import housePriceData from "../data/housePriceData.json";

type Option = { label: string; value: string | number };

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

const months: Option[] = Array.from({ length: 12 }, (_, i) => ({
  label: `${i + 1}月`,
  value: `${String(i + 1).padStart(2, "0")}`,
}));

const areas: Option[] = Array.from({ length: 171 }, (_, i) => ({
  label: `${30 + i}㎡`,
  value: 30 + i,
}));

const yearsHold: Option[] = Array.from({ length: 30 }, (_, i) => ({
  label: `${i + 1}年`,
  value: i + 1,
}));

const budgets: Option[] = Array.from({ length: 196 }, (_, i) => ({
  label: `${50 + i * 10}万`,
  value: 50 + i * 10,
}));

const downPayments: Option[] = Array.from({ length: 8 }, (_, i) => ({
  label: `${20 + i * 5}%`,
  value: 20 + i * 5,
}));

const loanYears: Option[] = Array.from({ length: 30 }, (_, i) => ({
  label: `${i + 1}年`,
  value: i + 1,
}));

const interestRates: Option[] = [
  { label: "3.5%", value: 3.5 },
  { label: "3.7%", value: 3.7 },
  { label: "4.0%", value: 4.0 },
  { label: "4.2%", value: 4.2 },
  { label: "4.5%", value: 4.5 },
  { label: "4.7%", value: 4.7 },
  { label: "5.0%", value: 5.0 },
  { label: "5.2%", value: 5.2 },
];

const loanAmounts: Option[] = Array.from({ length: 200 }, (_, i) => ({
  label: `${10 + i * 5}万`,
  value: (10 + i * 5) * 10000,
}));

const WheelPicker = ({
  options,
  value,
  onChange,
  width = "100%",
}: {
  options: Option[];
  value: string | number;
  onChange: (v: string | number) => void;
  width?: string | number;
}) => {
  return (
    <div
      style={{
        width,
        height: 120,
        overflowY: "auto",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(59,130,246,0.08), rgba(15,23,42,0.5))",
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

const MultiSelectPicker = ({
  options,
  selectedValues,
  onChange,
  maxSelect = 5,
  width = "100%",
}: {
  options: Option[];
  selectedValues: number[];
  onChange: (values: number[]) => void;
  maxSelect?: number;
  width?: string | number;
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
        width,
        maxHeight: 200,
        overflowY: "auto",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(59,130,246,0.08), rgba(15,23,42,0.5))",
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
                <span
                  style={{
                    fontSize: 12,
                    color: "#3b82f6",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>
      {selectedValues.length > 0 && (
        <div
          style={{
            marginTop: 8,
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(59,130,246,0.1)",
            fontSize: 12,
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          已选择 {selectedValues.length}/{maxSelect} 个地区
        </div>
      )}
    </div>
  );
};

const TabButton = ({
  active,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "10px 12px",
      border: "none",
      borderRadius: 10,
      background: active
        ? "linear-gradient(135deg, #3b82f6, #2563eb)"
        : "rgba(255,255,255,0.06)",
      color: active ? "#fff" : disabled ? "#64748b" : "#e2e8f0",
      fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.2s",
      opacity: disabled ? 0.5 : 1,
    }}
  >
    {label}
  </button>
);

const getYearsOptions = (data: ProvinceRecord[]): Option[] => {
  const set = new Set<string>();
  data.forEach((p) => {
    if (p.data) {
      Object.keys(p.data).forEach((y) => set.add(y));
    }
  });
  return Array.from(set)
    .sort()
    .map((y) => ({ label: `${y}年`, value: y }));
};

const getProvinceOptions = (data: ProvinceRecord[]): Option[] =>
  data
    .filter((p) => p.name && p.adcode !== 100000)
    .map((p) => ({ label: p.name, value: p.adcode }));

// 区域划分数据（东部/中部/西部/东北）
const regionMapping: Record<number, "东部" | "中部" | "西部" | "东北"> = {
  // 东部：北京、天津、河北、上海、江苏、浙江、福建、山东、广东、海南
  110000: "东部", 120000: "东部", 130000: "东部", 310000: "东部",
  320000: "东部", 330000: "东部", 350000: "东部", 370000: "东部",
  440000: "东部", 460000: "东部",
  // 中部：山西、安徽、江西、河南、湖北、湖南
  140000: "中部", 340000: "中部", 360000: "中部", 410000: "中部",
  420000: "中部", 430000: "中部",
  // 西部：内蒙古、广西、重庆、四川、贵州、云南、西藏、陕西、甘肃、青海、宁夏、新疆
  150000: "西部", 450000: "西部", 500000: "西部", 510000: "西部",
  520000: "西部", 530000: "西部", 540000: "西部", 610000: "西部",
  620000: "西部", 630000: "西部", 640000: "西部", 650000: "西部",
  // 东北：辽宁、吉林、黑龙江
  210000: "东北", 220000: "东北", 230000: "东北",
};

// 区域配色方案（同色系渐变）
const regionColors: Record<string, string[]> = {
  东部: ["#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"],
  中部: ["#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"],
  西部: ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d"],
  东北: ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"],
};

// 环图数据类型
type RingChartDataItem = {
  name: string;
  value: number;
  rawValue?: number; // 原始数值（用于tooltip显示）
  itemStyle?: { color: string };
};

// 场景1：单一维度省份占比（TOP10或区域占比）
const calculateProvinceProportion = (
  data: ProvinceRecord[],
  year: string,
  type: "top10" | "region"
): RingChartDataItem[] => {
  const provinces = data.filter((p) => p.adcode !== 100000);
  const provinceData: Array<{ name: string; value: number; region: string; adcode: number }> = [];

  provinces.forEach((p) => {
    const price = findPrice(data, p.adcode, year) ?? 0;
    if (price > 0 && p.name) {
      provinceData.push({
        name: p.name,
        value: price,
        region: regionMapping[p.adcode] || "其他",
        adcode: p.adcode,
      });
    }
  });

  if (type === "top10") {
    // TOP10省份占比
    const sorted = provinceData.sort((a, b) => b.value - a.value).slice(0, 10);
    const total = provinceData.reduce((sum, p) => sum + p.value, 0);
    const top10Total = sorted.reduce((sum, p) => sum + p.value, 0);
    const othersValue = total - top10Total;

    const result: RingChartDataItem[] = sorted.map((p, index) => ({
      name: p.name,
      value: (p.value / total) * 100,
      rawValue: p.value,
      itemStyle: {
        color: regionColors[p.region]?.[index % regionColors[p.region].length] || "#94a3b8",
      },
    }));

    if (othersValue > 0) {
      result.push({
        name: "其他",
        value: (othersValue / total) * 100,
        rawValue: othersValue,
        itemStyle: { color: "#64748b" },
      });
    }

    return result;
  } else {
    // 区域占比
    const regionData: Record<string, number> = {};
    provinceData.forEach((p) => {
      regionData[p.region] = (regionData[p.region] || 0) + p.value;
    });

    const total = provinceData.reduce((sum, p) => sum + p.value, 0);
    const regions: Array<[string, number]> = Object.entries(regionData).sort(
      (a, b) => b[1] - a[1]
    );

    return regions.map(([region, value], index) => ({
      name: region,
      value: (value / total) * 100,
      rawValue: value,
      itemStyle: {
        color: regionColors[region]?.[index % regionColors[region].length] || "#94a3b8",
      },
    }));
  }
};

// 场景2：同一省份的多维构成（房价支撑因素）
const calculateProvinceFactors = (
  data: ProvinceRecord[],
  adcode: number,
  year: string
): RingChartDataItem[] => {
  const price = findPrice(data, adcode, year) ?? 0;
  const price2020 = findPrice(data, adcode, "2020") ?? 0;
  const priceIncrease = price2020 > 0 ? ((price - price2020) / price2020) * 100 : 0;

  // 基于房价水平和其他因素估算各支撑因素的权重
  const factors = [
    {
      name: "经济支撑",
      weight: price > 20000 ? 0.35 : price > 10000 ? 0.30 : 0.25,
    },
    {
      name: "人口流入",
      weight: price > 20000 ? 0.25 : price > 10000 ? 0.25 : 0.20,
    },
    {
      name: "政策宽松",
      weight: price > 20000 ? 0.15 : price > 10000 ? 0.20 : 0.25,
    },
    {
      name: "市场热度",
      weight: priceIncrease > 10 ? 0.20 : priceIncrease > 0 ? 0.15 : 0.10,
    },
    {
      name: "其他",
      weight: 0.10,
    },
  ];

  return factors.map((factor, index) => ({
    name: factor.name,
    value: factor.weight * 100,
    itemStyle: {
      color: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#94a3b8"][index],
    },
  }));
};

// 场景3：时间维度对比（政策强度分级占比）
const calculatePolicyLevelProportion = (
  data: ProvinceRecord[],
  year: string
): RingChartDataItem[] => {
  const provinces = data.filter((p) => p.adcode !== 100000);
  const levels: Record<string, number> = { 严格: 0, 中等: 0, 宽松: 0 };

  provinces.forEach((p) => {
    const price = findPrice(data, p.adcode, year) ?? 0;
    let level: "严格" | "中等" | "宽松";
    if (price > 20000) {
      level = "严格";
    } else if (price > 10000) {
      level = "中等";
    } else {
      level = "宽松";
    }
    levels[level]++;
  });

  const total = provinces.length;
  return [
    {
      name: "严格",
      value: (levels["严格"] / total) * 100,
      rawValue: levels["严格"],
      itemStyle: { color: "#ef4444" },
    },
    {
      name: "中等",
      value: (levels["中等"] / total) * 100,
      rawValue: levels["中等"],
      itemStyle: { color: "#f59e0b" },
    },
    {
      name: "宽松",
      value: (levels["宽松"] / total) * 100,
      rawValue: levels["宽松"],
      itemStyle: { color: "#22c55e" },
    },
  ];
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

// 雷达图维度数据类型
type RadarDimension = {
  priceLevel: number; // 房价水平（元/㎡）
  priceIncrease5Y: number; // 近5年涨幅（%）
  priceToIncomeRatio: number; // 房价收入比
  gdpGrowthRate: number; // 人均GDP增长率（%）
  populationGrowthRate: number; // 常住人口增长率（%）
  purchaseRestriction: number; // 限购政策强度（1-10分）
};

// 计算省份的雷达图维度数据
const calculateRadarDimensions = (
  data: ProvinceRecord[],
  adcode: number
): RadarDimension | null => {
  const rec = data.find((p) => p.adcode === adcode);
  if (!rec || !rec.data) return null;

  // 1. 房价水平：使用2024年平均值
  const price2024 = rec.data["2024"]?.average ?? 0;
  const price2020 = rec.data["2020"]?.average ?? 0;

  // 2. 近5年涨幅（%）
  const priceIncrease5Y =
    price2020 > 0 ? ((price2024 - price2020) / price2020) * 100 : 0;

  // 3. 房价收入比：基于房价估算（假设年收入为房价的1/15到1/8之间，高房价地区比例更高）
  const baseIncomeRatio = price2024 > 20000 ? 12 : price2024 > 10000 ? 10 : 8;
  const priceToIncomeRatio = price2024 / (price2024 / baseIncomeRatio);

  // 4. 人均GDP增长率：模拟数据（基于房价水平，高房价地区通常GDP增长率较高）
  const gdpGrowthRate = price2024 > 20000 ? 5.5 : price2024 > 10000 ? 4.5 : 3.5;

  // 5. 常住人口增长率：模拟数据（一线城市人口增长放缓，二三线增长较快）
  const populationGrowthRate =
    price2024 > 20000 ? 0.8 : price2024 > 10000 ? 1.5 : 2.2;

  // 6. 限购政策强度（1-10分）：基于房价水平估算
  const purchaseRestriction =
    price2024 > 30000 ? 9 : price2024 > 20000 ? 7 : price2024 > 10000 ? 5 : 3;

  return {
    priceLevel: price2024,
    priceIncrease5Y,
    priceToIncomeRatio,
    gdpGrowthRate,
    populationGrowthRate,
    purchaseRestriction,
  };
};

// Min-Max标准化函数
const normalizeValue = (value: number, min: number, max: number): number => {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
};

// 计算所有省份的雷达图数据并标准化
const calculateRadarData = (
  data: ProvinceRecord[],
  adcodes: number[]
): {
  dimensions: RadarDimension[];
  normalized: number[][];
  averages: number[];
  minMax: Record<keyof RadarDimension, { min: number; max: number }>;
} => {
  const allDimensions: RadarDimension[] = [];
  const selectedDimensions: RadarDimension[] = [];

  // 计算所有省份的数据（用于计算全国平均值和min-max）
  data.forEach((p) => {
    if (p.adcode !== 100000) {
      const dim = calculateRadarDimensions(data, p.adcode);
      if (dim) {
        allDimensions.push(dim);
      }
    }
  });

  // 计算选中省份的数据
  adcodes.forEach((adcode) => {
    const dim = calculateRadarDimensions(data, adcode);
    if (dim) {
      selectedDimensions.push(dim);
    }
  });

  // 计算每个维度的min-max
  const minMax: Record<keyof RadarDimension, { min: number; max: number }> = {
    priceLevel: { min: Infinity, max: -Infinity },
    priceIncrease5Y: { min: Infinity, max: -Infinity },
    priceToIncomeRatio: { min: Infinity, max: -Infinity },
    gdpGrowthRate: { min: Infinity, max: -Infinity },
    populationGrowthRate: { min: Infinity, max: -Infinity },
    purchaseRestriction: { min: Infinity, max: -Infinity },
  };

  allDimensions.forEach((dim) => {
    Object.keys(minMax).forEach((key) => {
      const k = key as keyof RadarDimension;
      minMax[k].min = Math.min(minMax[k].min, dim[k]);
      minMax[k].max = Math.max(minMax[k].max, dim[k]);
    });
  });

  // 计算全国平均值
  const averages: number[] = [];
  Object.keys(minMax).forEach((key) => {
    const k = key as keyof RadarDimension;
    const sum = allDimensions.reduce((acc, dim) => acc + dim[k], 0);
    const avg = sum / allDimensions.length;
    averages.push(
      normalizeValue(avg, minMax[k].min, minMax[k].max)
    );
  });

  // 标准化选中省份的数据
  const normalized = selectedDimensions.map((dim) => {
    return Object.keys(minMax).map((key) => {
      const k = key as keyof RadarDimension;
      return normalizeValue(dim[k], minMax[k].min, minMax[k].max);
    });
  });

  return {
    dimensions: selectedDimensions,
    normalized,
    averages,
    minMax,
  };
};

const CalculatorPanel = () => {
  const provinces = useMemo(
    () => getProvinceOptions(housePriceData as ProvinceRecord[]),
    []
  );
  const years = useMemo(
    () => getYearsOptions(housePriceData as ProvinceRecord[]),
    []
  );

  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedProvinces, setSelectedProvinces] = useState<number[]>(
    [(provinces[0]?.value as number) || 110000]
  );
  const [provinceA, setProvinceA] = useState<number>(
    (provinces[0]?.value as number) || 110000
  );
  const [provinceB, setProvinceB] = useState<number>(
    (provinces[1]?.value as number) || 310000
  );
  const [year, setYear] = useState<string>(years[0]?.value as string);
  const [month, setMonth] = useState<string>("02");
  const [area, setArea] = useState<number>(90);
  const [holdYears, setHoldYears] = useState<number>(10);
  const [budget, setBudget] = useState<number>(200);
  const [downPayment, setDownPayment] = useState<number>(30);
  const [loanYear, setLoanYear] = useState<number>(20);
  const [interestRate, setInterestRate] = useState<number>(4.5);
  const [loanAmount, setLoanAmount] = useState<number>(1000000);
  const [repayType, setRepayType] = useState<"equal" | "principal">("equal");

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts>();

  useEffect(() => {
    if (chartRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }
    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, []);

  const renderChart = (option: echarts.EChartsOption) => {
    if (!chartInstanceRef.current) return;
    chartInstanceRef.current.setOption(option as any, true);
  };

  // 定义多个地区的颜色
  const regionColors = [
    { line: "#3b82f6", area: "rgba(59,130,246,0.3)" },
    { line: "#22c55e", area: "rgba(34,197,94,0.3)" },
    { line: "#f59e0b", area: "rgba(245,158,11,0.3)" },
    { line: "#ef4444", area: "rgba(239,68,68,0.3)" },
    { line: "#a855f7", area: "rgba(168,85,247,0.3)" },
  ];

  const handleCompute = () => {
    const data = housePriceData as ProvinceRecord[];
    if (activeTab === 1) {
      if (selectedProvinces.length === 0) {
        renderChart({
          xAxis: { type: "category", data: months.map((m) => m.label) },
          yAxis: { type: "value" },
          series: [],
          tooltip: { trigger: "axis" },
        });
        return;
      }

      const series = selectedProvinces.map((adcode, index) => {
        const prices = months.map((m) => {
          const v = findPrice(data, adcode, year, m.value as string);
          return v ?? 0;
        });
        const provinceName =
          provinces.find((p) => p.value === adcode)?.label || `地区${index + 1}`;
        const colorConfig = regionColors[index % regionColors.length];

        return {
          type: "line" as const,
          name: provinceName,
          data: prices,
          smooth: true,
          lineStyle: {
            color: colorConfig.line,
            width: 2,
          },
          itemStyle: {
            color: colorConfig.line,
          },
          areaStyle: {
            color: colorConfig.area,
          },
        };
      });

      renderChart({
        xAxis: { type: "category", data: months.map((m) => m.label) },
        yAxis: { type: "value" },
        series,
        tooltip: {
          trigger: "axis",
          formatter: (params: any) => {
            if (Array.isArray(params)) {
              let result = `${params[0].axisValue}<br/>`;
              params.forEach((item: any) => {
                result += `${item.marker}${item.seriesName}: ${item.value.toFixed(0)} 元/㎡<br/>`;
              });
              return result;
            }
            return "";
          },
        },
        legend: {
          show: true,
          top: 10,
          textStyle: {
            color: "#e2e8f0",
            fontSize: 12,
          },
          itemWidth: 14,
          itemHeight: 10,
        },
      });
    }

    if (activeTab === 2) {
      const valA = findPrice(data, provinceA, year, month) ?? 0;
      const valB = findPrice(data, provinceB, year, month) ?? 0;
      const ratioA = valA ? budget * 10000 / valA : 0;
      const ratioB = valB ? budget * 10000 / valB : 0;
      renderChart({
        xAxis: { type: "category", data: ["方案A", "方案B"] },
        yAxis: { type: "value" },
        series: [
          {
            type: "bar",
            data: [
              { value: ratioA, itemStyle: { color: "#3b82f6" } },
              { value: ratioB, itemStyle: { color: "#22c55e" } },
            ],
          },
        ],
        tooltip: {
          formatter: (p: any) => `${p.name}: 可购面积 ${p.value.toFixed(2)} ㎡`,
        },
      });
    }

    if (activeTab === 3) {
      const price = findPrice(data, provinceA, year, month) ?? 0;
      const purchase = price * area;
      const taxes = purchase * 0.05;
      const maintenance = area * 8 * 12 * holdYears;
      const total = purchase + taxes + maintenance;
      renderChart({
        series: [
          {
            type: "pie",
            radius: ["35%", "65%"],
            data: [
              { value: purchase, name: "房款" },
              { value: taxes, name: "税费" },
              { value: maintenance, name: "维护" },
            ],
          },
        ],
        tooltip: { trigger: "item" },
      });
    }

    if (activeTab === 4) {
      const price = findPrice(data, provinceA, year, month) ?? 0;
      const totalPrice = price * area;
      const downPay = totalPrice * (downPayment / 100);
      const loan = totalPrice - downPay;
      const monthlyRate = interestRate / 100 / 12;
      const months = loanYear * 12;
      
      let monthlyPay = 0;
      if (repayType === "equal") {
        monthlyPay = loan * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      } else {
        const principal = loan / months;
        const firstMonth = principal + loan * monthlyRate;
        monthlyPay = firstMonth;
      }
      
      const totalInterest = repayType === "equal" 
        ? monthlyPay * months - loan
        : (loan * monthlyRate * (months + 1)) / 2;
      
      renderChart({
        series: [
          {
            type: "pie",
            radius: ["35%", "65%"],
            data: [
              { value: downPay, name: "首付" },
              { value: loan, name: "贷款本金" },
              { value: totalInterest, name: "总利息" },
            ],
          },
        ],
        tooltip: { trigger: "item", formatter: "{b}: {c} 元<br/>({d}%)" },
      });
    }

    if (activeTab === 5) {
      const monthlyRate = interestRate / 100 / 12;
      const months = loanYear * 12;
      
      let monthlyPay = 0;
      let totalInterest = 0;
      
      if (repayType === "equal") {
        monthlyPay = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        totalInterest = monthlyPay * months - loanAmount;
      } else {
        const principal = loanAmount / months;
        const payments: number[] = [];
        for (let i = 0; i < months; i++) {
          const remaining = loanAmount - principal * i;
          payments.push(principal + remaining * monthlyRate);
        }
        monthlyPay = payments[0];
        totalInterest = payments.reduce((a, b) => a + b, 0) - loanAmount;
      }
      
      renderChart({
        xAxis: { type: "category", data: ["贷款本金", "总利息", "还款总额"] },
        yAxis: { type: "value" },
        series: [
          {
            type: "bar",
            data: [
              { value: loanAmount, itemStyle: { color: "#3b82f6" } },
              { value: totalInterest, itemStyle: { color: "#f59e0b" } },
              { value: loanAmount + totalInterest, itemStyle: { color: "#22c55e" } },
            ],
          },
        ],
        tooltip: { trigger: "axis", formatter: (p: any) => `${p[0].name}: ${(p[0].value / 10000).toFixed(2)} 万` },
      });
    }

  };

  useEffect(() => {
    handleCompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedProvinces, provinceA, provinceB, year, month, area, holdYears, budget, downPayment, loanYear, interestRate, loanAmount, repayType]);

  const renderResultSummary = () => {
    const data = housePriceData as ProvinceRecord[];
    if (activeTab === 1) {
      if (selectedProvinces.length === 0) {
        return "请至少选择一个地区";
      }
      const summaries = selectedProvinces.map((adcode) => {
        const provinceName =
          provinces.find((p) => p.value === adcode)?.label || "未知地区";
        const latest = findPrice(data, adcode, year, month) ?? 0;
        return `${provinceName}: ${latest.toFixed(0)} 元/㎡`;
      });
      return `当前 ${year}-${month} 房价 - ${summaries.join(" | ")}`;
    }
    if (activeTab === 2) {
      const valA = findPrice(data, provinceA, year, month) ?? 0;
      const valB = findPrice(data, provinceB, year, month) ?? 0;
      if (!valA || !valB) return "暂无数据";
      const ratioA = budget * 10000 / valA;
      const ratioB = budget * 10000 / valB;
      return ratioA > ratioB
        ? `同预算推荐 ${provinces.find((p) => p.value === provinceA)?.label}`
        : `同预算推荐 ${provinces.find((p) => p.value === provinceB)?.label}`;
    }
    if (activeTab === 3) {
      const price = findPrice(data, provinceA, year, month) ?? 0;
      const purchase = price * area;
      const taxes = purchase * 0.05;
      const maintenance = area * 8 * 12 * holdYears;
      const total = purchase + taxes + maintenance;
      return `总成本约 ${(total / 10000).toFixed(1)} 万（房款 ${(purchase / 10000).toFixed(1)} 万，税费 ${(taxes / 10000).toFixed(1)} 万，维护 ${(maintenance / 10000).toFixed(1)} 万）`;
    }
    if (activeTab === 4) {
      const price = findPrice(data, provinceA, year, month) ?? 0;
      const totalPrice = price * area;
      const downPay = totalPrice * (downPayment / 100);
      const loan = totalPrice - downPay;
      const monthlyRate = interestRate / 100 / 12;
      const months = loanYear * 12;
      const monthlyPay = loan * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      const totalInterest = monthlyPay * months - loan;
      return `月供约 ${(monthlyPay / 10000).toFixed(2)} 万，首付 ${(downPay / 10000).toFixed(1)} 万，总利息 ${(totalInterest / 10000).toFixed(1)} 万`;
    }
    if (activeTab === 5) {
      const monthlyRate = interestRate / 100 / 12;
      const months = loanYear * 12;
      let monthlyPay = 0;
      let totalInterest = 0;
      if (repayType === "equal") {
        monthlyPay = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        totalInterest = monthlyPay * months - loanAmount;
      } else {
        const principal = loanAmount / months;
        monthlyPay = principal + loanAmount * monthlyRate;
        totalInterest = (loanAmount * monthlyRate * (months + 1)) / 2;
      }
      return `月供约 ${(monthlyPay / 10000).toFixed(2)} 万（${repayType === "equal" ? "等额本息" : "等额本金"}），总利息 ${(totalInterest / 10000).toFixed(1)} 万，还款总额 ${((loanAmount + totalInterest) / 10000).toFixed(1)} 万`;
    }
    return "";
  };

  const renderParams = () => {
    const commonTime = (
      <>
        <div style={{ color: "#cbd5e1", fontSize: 13 }}>年份</div>
        <WheelPicker options={years} value={year} onChange={(v) => setYear(v as string)} />
        <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 8 }}>月份</div>
        <WheelPicker options={months} value={month} onChange={(v) => setMonth(v as string)} />
      </>
    );

    if (activeTab === 1) {
      return (
        <>
          <div style={{ color: "#cbd5e1", fontSize: 13 }}>
            地区选择（最多5个）
          </div>
          <MultiSelectPicker
            options={provinces}
            selectedValues={selectedProvinces}
            onChange={setSelectedProvinces}
            maxSelect={5}
          />
          <div style={{ marginTop: 12 }}>{commonTime}</div>
        </>
      );
    }

    if (activeTab === 2) {
      return (
        <>
          <div style={{ color: "#cbd5e1", fontSize: 13 }}>区域A</div>
          <WheelPicker
            options={provinces}
            value={provinceA}
            onChange={(v) => setProvinceA(v as number)}
          />
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>区域B</div>
          <WheelPicker
            options={provinces}
            value={provinceB}
            onChange={(v) => setProvinceB(v as number)}
          />
          <div style={{ marginTop: 12 }}>{commonTime}</div>
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>预算</div>
          <WheelPicker
            options={budgets}
            value={budget}
            onChange={(v) => setBudget(v as number)}
          />
        </>
      );
    }

    if (activeTab === 3) {
      return (
        <>
          <div style={{ color: "#cbd5e1", fontSize: 13 }}>省份</div>
          <WheelPicker
            options={provinces}
            value={provinceA}
            onChange={(v) => setProvinceA(v as number)}
          />
          <div style={{ marginTop: 12 }}>{commonTime}</div>
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>面积</div>
          <WheelPicker
            options={areas}
            value={area}
            onChange={(v) => setArea(v as number)}
          />
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>持有年限</div>
          <WheelPicker
            options={yearsHold}
            value={holdYears}
            onChange={(v) => setHoldYears(v as number)}
          />
        </>
      );
    }

    if (activeTab === 4) {
      return (
        <>
          <div style={{ color: "#cbd5e1", fontSize: 13 }}>省份</div>
          <WheelPicker
            options={provinces}
            value={provinceA}
            onChange={(v) => setProvinceA(v as number)}
          />
          <div style={{ marginTop: 12 }}>{commonTime}</div>
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>面积</div>
          <WheelPicker
            options={areas}
            value={area}
            onChange={(v) => setArea(v as number)}
          />
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>首付比例</div>
          <WheelPicker
            options={downPayments}
            value={downPayment}
            onChange={(v) => setDownPayment(v as number)}
          />
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>贷款年限</div>
          <WheelPicker
            options={loanYears}
            value={loanYear}
            onChange={(v) => setLoanYear(v as number)}
          />
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>利率</div>
          <WheelPicker
            options={interestRates}
            value={interestRate}
            onChange={(v) => setInterestRate(v as number)}
          />
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>还款方式</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              onClick={() => setRepayType("equal")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 8,
                border: "none",
                background: repayType === "equal" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                color: repayType === "equal" ? "#fff" : "#94a3b8",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              等额本息
            </button>
            <button
              onClick={() => setRepayType("principal")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 8,
                border: "none",
                background: repayType === "principal" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                color: repayType === "principal" ? "#fff" : "#94a3b8",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              等额本金
            </button>
          </div>
        </>
      );
    }

    if (activeTab === 5) {
      return (
        <>
          <div style={{ color: "#cbd5e1", fontSize: 13 }}>贷款金额</div>
          <WheelPicker
            options={loanAmounts}
            value={loanAmount}
            onChange={(v) => setLoanAmount(v as number)}
          />
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>贷款年限</div>
          <WheelPicker
            options={loanYears}
            value={loanYear}
            onChange={(v) => setLoanYear(v as number)}
          />
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>利率</div>
          <WheelPicker
            options={interestRates}
            value={interestRate}
            onChange={(v) => setInterestRate(v as number)}
          />
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>还款方式</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              onClick={() => setRepayType("equal")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 8,
                border: "none",
                background: repayType === "equal" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                color: repayType === "equal" ? "#fff" : "#94a3b8",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              等额本息
            </button>
            <button
              onClick={() => setRepayType("principal")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: 8,
                border: "none",
                background: repayType === "principal" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                color: repayType === "principal" ? "#fff" : "#94a3b8",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              等额本金
            </button>
          </div>
        </>
      );
    }


    return null;
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        top: 12,
        width: 340,
        height: "calc(100vh - 24px)",
        background: "rgba(5,7,15,0.92)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: 12,
        boxSizing: "border-box",
        zIndex: 900,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "0 12px 28px rgba(0,0,0,0.4)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
        <TabButton active={activeTab === 1} label="趋势" onClick={() => setActiveTab(1)} />
        <TabButton active={activeTab === 2} label="对比" onClick={() => setActiveTab(2)} />
        <TabButton active={activeTab === 3} label="成本" onClick={() => setActiveTab(3)} />
        <TabButton active={activeTab === 4} label="房贷" onClick={() => setActiveTab(4)} />
        <TabButton active={activeTab === 5} label="贷款" onClick={() => setActiveTab(5)} />
      </div>

      <div
        style={{
          flex: "1 1 0",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingRight: 4,
        }}
      >
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(15,23,42,0.6))",
            transition: "all 0.3s",
          }}
        >
          <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: 8 }}>参数选择</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, transition: "all 0.3s" }}>
            {renderParams()}
          </div>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.03)",
            minHeight: 220,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            transition: "all 0.3s",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700 }}>计算结果</div>
            <button
              onClick={handleCompute}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: "#3b82f6",
                color: "#fff",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
            >
              计算
            </button>
          </div>
          <div style={{ color: "#cbd5e1", fontSize: 13 }}>{renderResultSummary()}</div>
          <div
            ref={chartRef}
            style={{
              width: "100%",
              height: 200,
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CalculatorPanel;
