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
  }, [activeTab, provinceA, provinceB, year, month, area, holdYears, budget, downPayment, loanYear, interestRate, loanAmount, repayType]);

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
