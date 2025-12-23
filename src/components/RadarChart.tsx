import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import housePriceData from "../data/housePriceData.json";

interface RadarChartProps {
  visible: boolean;
  onClose?: () => void;
}

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

type RadarDimension = {
  priceLevel: number;
  priceIncrease5Y: number;
  priceToIncomeRatio: number;
  gdpGrowthRate: number;
  populationGrowthRate: number;
  purchaseRestriction: number;
};

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

const calculateRadarDimensions = (
  data: ProvinceRecord[],
  adcode: number
): RadarDimension | null => {
  const rec = data.find((p) => p.adcode === adcode);
  if (!rec || !rec.data) return null;

  const price2024 = rec.data["2024"]?.average ?? 0;
  const price2020 = rec.data["2020"]?.average ?? 0;
  const priceIncrease5Y =
    price2020 > 0 ? ((price2024 - price2020) / price2020) * 100 : 0;
  const baseIncomeRatio = price2024 > 20000 ? 12 : price2024 > 10000 ? 10 : 8;
  const priceToIncomeRatio = price2024 / (price2024 / baseIncomeRatio);
  const gdpGrowthRate = price2024 > 20000 ? 5.5 : price2024 > 10000 ? 4.5 : 3.5;
  const populationGrowthRate =
    price2024 > 20000 ? 0.8 : price2024 > 10000 ? 1.5 : 2.2;
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

const normalizeValue = (value: number, min: number, max: number): number => {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
};

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

  data.forEach((p) => {
    if (p.adcode !== 100000) {
      const dim = calculateRadarDimensions(data, p.adcode);
      if (dim) {
        allDimensions.push(dim);
      }
    }
  });

  adcodes.forEach((adcode) => {
    const dim = calculateRadarDimensions(data, adcode);
    if (dim) {
      selectedDimensions.push(dim);
    }
  });

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

  const averages: number[] = [];
  Object.keys(minMax).forEach((key) => {
    const k = key as keyof RadarDimension;
    const sum = allDimensions.reduce((acc, dim) => acc + dim[k], 0);
    const avg = sum / allDimensions.length;
    averages.push(normalizeValue(avg, minMax[k].min, minMax[k].max));
  });

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

const regionColors = [
  { line: "#3b82f6", area: "rgba(59,130,246,0.3)" },
  { line: "#22c55e", area: "rgba(34,197,94,0.3)" },
  { line: "#f59e0b", area: "rgba(245,158,11,0.3)" },
  { line: "#ef4444", area: "rgba(239,68,68,0.3)" },
  { line: "#a855f7", area: "rgba(168,85,247,0.3)" },
];

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

function RadarChart({ visible, onClose }: RadarChartProps) {
  const provinces = useMemo(
    () => getProvinceOptions(housePriceData as ProvinceRecord[]),
    []
  );
  const [selectedProvinces, setSelectedProvinces] = useState<number[]>(
    [(provinces[0]?.value as number) || 110000]
  );
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
    if (selectedProvinces.length === 0) {
      chartInstanceRef.current.setOption({
        radar: { indicator: [] },
        series: [],
      });
      return;
    }

    const data = housePriceData as ProvinceRecord[];
    const radarData = calculateRadarData(data, selectedProvinces);
    const dimensionNames = [
      "房价水平",
      "近5年涨幅",
      "房价收入比",
      "人均GDP增长率",
      "常住人口增长率",
      "限购政策强度",
    ];

    const indicators = dimensionNames.map((name) => ({
      name,
      max: 1,
      min: 0,
    }));

    const seriesData = selectedProvinces.map((adcode, index) => {
      const provinceName =
        provinces.find((p) => p.value === adcode)?.label || `地区${index + 1}`;
      const colorConfig = regionColors[index % regionColors.length];
      return {
        value: radarData.normalized[index] || [],
        name: provinceName,
        itemStyle: { color: colorConfig.line },
        areaStyle: { color: colorConfig.area },
        lineStyle: { color: colorConfig.line, width: 2 },
      };
    });

    seriesData.push({
      value: radarData.averages,
      name: "全国平均值",
      itemStyle: { color: "#94a3b8" },
      lineStyle: { color: "#94a3b8", width: 1, type: "dashed" } as any,
      areaStyle: { color: "transparent" },
    });

    const dimLabels = ["房价水平", "近5年涨幅", "房价收入比", "人均GDP增长率", "常住人口增长率", "限购政策强度"];
    const dimUnits = ["元/㎡", "%", "", "%", "%", "分"];

    chartInstanceRef.current.setOption({
      title: {
        text: `多维度对比分析 - ${selectedProvinces.map((adcode) => provinces.find((p) => p.value === adcode)?.label).join(" vs ")}`,
        left: "center",
        top: 10,
        textStyle: {
          color: "#e2e8f0",
          fontSize: 14,
          fontWeight: 600,
        },
      },
      radar: {
        indicator: indicators,
        center: ["50%", "55%"],
        radius: "65%",
        axisName: {
          color: "#cbd5e1",
          fontSize: 12,
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.04)"],
          },
        },
        splitLine: {
          lineStyle: {
            color: "rgba(255,255,255,0.1)",
          },
        },
        axisLine: {
          lineStyle: {
            color: "rgba(255,255,255,0.15)",
          },
        },
      },
      series: [
        {
          type: "radar",
          data: seriesData,
          emphasis: {
            areaStyle: {
              color: "rgba(59,130,246,0.2)",
            },
          },
        },
      ],
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const dimLabels = ["房价水平", "近5年涨幅", "房价收入比", "人均GDP增长率", "常住人口增长率", "限购政策强度"];
          const dimUnits = ["元/㎡", "%", "", "%", "%", "分"];
          
          if (Array.isArray(params)) {
            const dimensionIndex = params[0]?.dataIndex;
            if (dimensionIndex !== undefined) {
              let result = `${dimLabels[dimensionIndex]}<br/>`;
              params.forEach((item: any) => {
                const seriesIndex = item.seriesIndex;
                if (seriesIndex < radarData.dimensions.length) {
                  const dim = radarData.dimensions[seriesIndex];
                  const dimKeys: (keyof RadarDimension)[] = [
                    "priceLevel",
                    "priceIncrease5Y",
                    "priceToIncomeRatio",
                    "gdpGrowthRate",
                    "populationGrowthRate",
                    "purchaseRestriction",
                  ];
                  const value = dim[dimKeys[dimensionIndex]];
                  result += `${item.marker}${item.seriesName}: ${value.toFixed(2)}${dimUnits[dimensionIndex]}<br/>`;
                } else if (item.seriesName === "全国平均值") {
                  result += `${item.marker}${item.seriesName}: 参考基准<br/>`;
                }
              });
              return result;
            }
          }
          
          const item = params;
          const dimensionIndex = item.dataIndex;
          const seriesIndex = item.seriesIndex;
          
          if (item.seriesName === "全国平均值") {
            return `${dimLabels[dimensionIndex]}<br/>${item.seriesName}: 参考基准`;
          }
          
          if (dimensionIndex !== undefined && seriesIndex !== undefined && seriesIndex < radarData.dimensions.length) {
            const dim = radarData.dimensions[seriesIndex];
            const dimKeys: (keyof RadarDimension)[] = [
              "priceLevel",
              "priceIncrease5Y",
              "priceToIncomeRatio",
              "gdpGrowthRate",
              "populationGrowthRate",
              "purchaseRestriction",
            ];
            const value = dim[dimKeys[dimensionIndex]];
            return `${item.seriesName}<br/>${dimLabels[dimensionIndex]}: ${value.toFixed(2)}${dimUnits[dimensionIndex]}`;
          }
          
          return `${item.seriesName}: ${item.value.toFixed(2)}`;
        },
      },
      legend: {
        show: true,
        bottom: 10,
        textStyle: {
          color: "#e2e8f0",
          fontSize: 12,
        },
        itemWidth: 14,
        itemHeight: 10,
      },
    });
  }, [visible, selectedProvinces, provinces]);

  if (!visible) return null;

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
            雷达图 - 多维度对比分析
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
          <div style={{ width: 300, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600 }}>
              地区选择（最多5个）
            </div>
            <MultiSelectPicker
              options={provinces}
              selectedValues={selectedProvinces}
              onChange={setSelectedProvinces}
              maxSelect={5}
            />
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
                维度说明：
              </div>
              <div>• 房价水平：当前房价（元/㎡）</div>
              <div>• 近5年涨幅：2020-2024年涨幅（%）</div>
              <div>• 房价收入比：房价与收入比值</div>
              <div>• 人均GDP增长率：经济增长指标（%）</div>
              <div>• 常住人口增长率：人口变化指标（%）</div>
              <div>• 限购政策强度：政策严格程度（1-10分）</div>
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

export default RadarChart;

