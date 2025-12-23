import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import housePriceData from "../data/housePriceData.json";

interface RingChartProps {
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

type RingChartDataItem = {
  name: string;
  value: number;
  rawValue?: number;
  itemStyle?: { color: string };
};

const regionMapping: Record<number, "东部" | "中部" | "西部" | "东北"> = {
  110000: "东部", 120000: "东部", 130000: "东部", 310000: "东部",
  320000: "东部", 330000: "东部", 350000: "东部", 370000: "东部",
  440000: "东部", 460000: "东部",
  140000: "中部", 340000: "中部", 360000: "中部", 410000: "中部",
  420000: "中部", 430000: "中部",
  150000: "西部", 450000: "西部", 500000: "西部", 510000: "西部",
  520000: "西部", 530000: "西部", 540000: "西部", 610000: "西部",
  620000: "西部", 630000: "西部", 640000: "西部", 650000: "西部",
  210000: "东北", 220000: "东北", 230000: "东北",
};

const regionColors: Record<string, string[]> = {
  东部: ["#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"],
  中部: ["#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"],
  西部: ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d"],
  东北: ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d"],
};

const getProvinceOptions = (data: ProvinceRecord[]): Option[] =>
  data
    .filter((p) => p.name && p.adcode !== 100000)
    .map((p) => ({ label: p.name, value: p.adcode }));

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

const calculateProvinceFactors = (
  data: ProvinceRecord[],
  adcode: number,
  year: string
): RingChartDataItem[] => {
  const price = findPrice(data, adcode, year) ?? 0;
  const price2020 = findPrice(data, adcode, "2020") ?? 0;
  const priceIncrease = price2020 > 0 ? ((price - price2020) / price2020) * 100 : 0;

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

function RingChart({ visible, onClose }: RingChartProps) {
  const provinces = useMemo(
    () => getProvinceOptions(housePriceData as ProvinceRecord[]),
    []
  );
  const years = useMemo(
    () => getYearsOptions(housePriceData as ProvinceRecord[]),
    []
  );

  const [scene, setScene] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<"top10" | "region">("top10");
  const [province, setProvince] = useState<number>(
    (provinces[0]?.value as number) || 110000
  );
  const [year1, setYear1] = useState<string>(years[0]?.value as string);
  const [year2, setYear2] = useState<string>(years[years.length - 1]?.value as string);

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
    const processData = (data: RingChartDataItem[]): RingChartDataItem[] => {
      const mainData: RingChartDataItem[] = [];
      let othersValue = 0;
      let othersRawValue = 0;

      data.forEach((item) => {
        if (item.value >= 5) {
          mainData.push(item);
        } else {
          othersValue += item.value;
          othersRawValue += (item.rawValue || 0);
        }
      });

      if (othersValue > 0) {
        mainData.push({
          name: "其他",
          value: othersValue,
          rawValue: othersRawValue,
          itemStyle: { color: "#64748b" },
        });
      }

      return mainData;
    };

    if (scene === 1) {
      const chartData = calculateProvinceProportion(data, year1, type);
      const processedData = processData(chartData);
      const total = chartData.reduce((sum, item) => sum + (item.rawValue || 0), 0);

      chartInstanceRef.current.setOption({
        title: {
          text: `${year1}年全国房价总额${type === "top10" ? "TOP10省份" : "区域"}占比`,
          left: "center",
          top: 10,
          textStyle: {
            color: "#e2e8f0",
            fontSize: 14,
            fontWeight: 600,
          },
        },
        tooltip: {
          trigger: "item",
          formatter: (params: any) => {
            const item = params;
            const rawValue = item.data.rawValue || 0;
            if (type === "top10") {
              return `${item.name.replace(/\s+\d+\.\d+%$/, "")}<br/>占比: ${item.percent}%<br/>房价总额: ${(rawValue / 10000).toFixed(2)}万亿<br/>具体数值: ${rawValue.toFixed(0)}元/㎡`;
            } else {
              return `${item.name.replace(/\s+\d+\.\d+%$/, "")}<br/>占比: ${item.percent}%<br/>房价总额: ${(rawValue / 10000).toFixed(2)}万亿`;
            }
          },
        },
        series: [
          {
            type: "pie",
            radius: ["40%", "70%"],
            center: ["50%", "55%"],
            data: processedData.map((item) => ({
              name: `${item.name} ${item.value.toFixed(1)}%`,
              value: item.value,
              rawValue: item.rawValue,
              itemStyle: item.itemStyle,
            })),
            label: {
              show: true,
              formatter: (params: any) => {
                return `${params.name}`;
              },
              color: "#e2e8f0",
              fontSize: 12,
            },
            labelLine: {
              show: true,
              length: 15,
              length2: 10,
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
            },
          },
        ],
      });
    } else if (scene === 2) {
      const chartData = calculateProvinceFactors(data, province, year1);
      const provinceName =
        provinces.find((p) => p.value === province)?.label || "未知省份";

      chartInstanceRef.current.setOption({
        title: {
          text: `${provinceName}房价支撑因素占比`,
          left: "center",
          top: 10,
          textStyle: {
            color: "#e2e8f0",
            fontSize: 14,
            fontWeight: 600,
          },
        },
        tooltip: {
          trigger: "item",
          formatter: (params: any) => {
            const item = params;
            return `${item.name}<br/>占比: ${item.percent}%`;
          },
        },
        series: [
          {
            type: "pie",
            radius: ["40%", "70%"],
            center: ["50%", "55%"],
            data: chartData.map((item) => ({
              name: `${item.name} ${item.value.toFixed(1)}%`,
              value: item.value,
              itemStyle: item.itemStyle,
            })),
            label: {
              show: true,
              formatter: (params: any) => {
                return `${params.name}`;
              },
              color: "#e2e8f0",
              fontSize: 12,
            },
            labelLine: {
              show: true,
              length: 15,
              length2: 10,
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
            },
          },
        ],
      });
    } else if (scene === 3) {
      const data1 = calculatePolicyLevelProportion(data, year1);
      const data2 = calculatePolicyLevelProportion(data, year2);

      chartInstanceRef.current.setOption({
        title: {
          text: `限购政策强度分级占比对比`,
          left: "center",
          top: 10,
          textStyle: {
            color: "#e2e8f0",
            fontSize: 14,
            fontWeight: 600,
          },
        },
        tooltip: {
          trigger: "item",
          formatter: (params: any) => {
            const item = params;
            const rawValue = item.data.rawValue || 0;
            return `${item.name}<br/>占比: ${item.percent}%<br/>省份数量: ${rawValue}个`;
          },
        },
        legend: {
          show: true,
          bottom: 10,
          data: ["严格", "中等", "宽松"],
          textStyle: {
            color: "#e2e8f0",
            fontSize: 12,
          },
        },
        series: [
          {
            name: year1,
            type: "pie",
            radius: ["40%", "70%"],
            center: ["30%", "55%"],
            data: data1.map((item) => ({
              name: `${item.name} ${item.value.toFixed(1)}%`,
              value: item.value,
              rawValue: item.rawValue,
              itemStyle: item.itemStyle,
            })),
            label: {
              show: true,
              formatter: (params: any) => {
                return `${params.name}`;
              },
              color: "#e2e8f0",
              fontSize: 11,
            },
            labelLine: {
              show: true,
              length: 10,
              length2: 8,
            },
          },
          {
            name: year2,
            type: "pie",
            radius: ["40%", "70%"],
            center: ["70%", "55%"],
            data: data2.map((item) => ({
              name: `${item.name} ${item.value.toFixed(1)}%`,
              value: item.value,
              rawValue: item.rawValue,
              itemStyle: item.itemStyle,
            })),
            label: {
              show: true,
              formatter: (params: any) => {
                return `${params.name}`;
              },
              color: "#e2e8f0",
              fontSize: 11,
            },
            labelLine: {
              show: true,
              length: 10,
              length2: 8,
            },
          },
        ],
      });
    }
  }, [visible, scene, type, province, year1, year2, provinces]);

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
            环图 - 比例分布分析
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
            <div style={{ color: "#cbd5e1", fontSize: 14, fontWeight: 600 }}>场景选择</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setScene(1)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  border: "none",
                  background: scene === 1 ? "#3b82f6" : "rgba(255,255,255,0.06)",
                  color: scene === 1 ? "#fff" : "#94a3b8",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: 12,
                }}
              >
                省份占比
              </button>
              <button
                onClick={() => setScene(2)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  border: "none",
                  background: scene === 2 ? "#3b82f6" : "rgba(255,255,255,0.06)",
                  color: scene === 2 ? "#fff" : "#94a3b8",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: 12,
                }}
              >
                多维构成
              </button>
              <button
                onClick={() => setScene(3)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  border: "none",
                  background: scene === 3 ? "#3b82f6" : "rgba(255,255,255,0.06)",
                  color: scene === 3 ? "#fff" : "#94a3b8",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: 12,
                }}
              >
                时间对比
              </button>
            </div>

            {scene === 1 && (
              <>
                <div style={{ color: "#cbd5e1", fontSize: 13 }}>分析类型</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setType("top10")}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 8,
                      border: "none",
                      background: type === "top10" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                      color: type === "top10" ? "#fff" : "#94a3b8",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontSize: 12,
                    }}
                  >
                    TOP10省份
                  </button>
                  <button
                    onClick={() => setType("region")}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 8,
                      border: "none",
                      background: type === "region" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                      color: type === "region" ? "#fff" : "#94a3b8",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontSize: 12,
                    }}
                  >
                    区域占比
                  </button>
                </div>
                <div style={{ color: "#cbd5e1", fontSize: 13 }}>年份</div>
                <WheelPicker options={years} value={year1} onChange={(v) => setYear1(v as string)} />
              </>
            )}

            {scene === 2 && (
              <>
                <div style={{ color: "#cbd5e1", fontSize: 13 }}>省份</div>
                <WheelPicker
                  options={provinces}
                  value={province}
                  onChange={(v) => setProvince(v as number)}
                />
                <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>年份</div>
                <WheelPicker options={years} value={year1} onChange={(v) => setYear1(v as string)} />
              </>
            )}

            {scene === 3 && (
              <>
                <div style={{ color: "#cbd5e1", fontSize: 13 }}>年份1</div>
                <WheelPicker options={years} value={year1} onChange={(v) => setYear1(v as string)} />
                <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 10 }}>年份2</div>
                <WheelPicker options={years} value={year2} onChange={(v) => setYear2(v as string)} />
              </>
            )}

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
                场景说明：
              </div>
              {scene === 1 && (
                <div>显示全国房价总额中TOP10省份或区域的占比分布，占比小于5%的归为"其他"</div>
              )}
              {scene === 2 && (
                <div>显示选定省份房价支撑因素的占比：经济支撑、人口流入、政策宽松、市场热度等</div>
              )}
              {scene === 3 && (
                <div>对比两个年份的限购政策强度分级占比变化（严格/中等/宽松）</div>
              )}
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

export default RingChart;

