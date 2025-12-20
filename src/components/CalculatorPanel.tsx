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

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts>();

  const isComingSoon = activeTab === 4 || activeTab === 5;

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
    chartInstanceRef.current.setOption(option, true);
  };

  const handleCompute = () => {
    const data = housePriceData as ProvinceRecord[];
    if (activeTab === 1) {
      const prices = months.map((m) => {
        const v = findPrice(data, provinceA, year, m.value as string);
        return v ?? 0;
      });
      renderChart({
        xAxis: { type: "category", data: months.map((m) => m.label) },
        yAxis: { type: "value" },
        series: [{ type: "line", data: prices, smooth: true, areaStyle: {} }],
        tooltip: { trigger: "axis" },
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
  };

  useEffect(() => {
    if (isComingSoon) return;
    handleCompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, provinceA, provinceB, year, month, area, holdYears, budget]);

  const renderResultSummary = () => {
    const data = housePriceData as ProvinceRecord[];
    if (activeTab === 1) {
      const latest = findPrice(data, provinceA, year, month) ?? 0;
      return `当前 ${year}-${month} 房价约 ${latest.toFixed(0)} 元/㎡`;
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
    return "即将上线，敬请期待";
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
          <div style={{ color: "#cbd5e1", fontSize: 13 }}>省份</div>
          <WheelPicker
            options={provinces}
            value={provinceA}
            onChange={(v) => setProvinceA(v as number)}
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

    return (
      <div
        style={{
          color: "#94a3b8",
          padding: 12,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10,
        }}
      >
        数据补充后开放，敬请期待。
      </div>
    );
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
        <TabButton active={activeTab === 4} label="场景" onClick={() => setActiveTab(4)} disabled />
        <TabButton active={activeTab === 5} label="因子" onClick={() => setActiveTab(5)} disabled />
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
            {!isComingSoon && (
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
            )}
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
