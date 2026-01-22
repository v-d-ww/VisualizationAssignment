import { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import housePriceData from '../data/housePriceData.json';

interface Scenario {
  id: string;
  name: string;
  description: string;
  factors: {
    policy: number;
    economy: number;
    population: number;
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

function DataSimulator({ visible, onClose }: Props) {
  const [selectedProvince, setSelectedProvince] = useState('北京');
  const [scenario, setScenario] = useState<Scenario>({
    id: '1',
    name: '基准场景',
    description: '保持当前趋势',
    factors: { policy: 0, economy: 0, population: 0 }
  });
  const [timeHorizon, setTimeHorizon] = useState(5);
  const svgRef = useRef<SVGSVGElement>(null);

  const scenarios: Scenario[] = [
    {
      id: '1',
      name: '基准场景',
      description: '保持当前趋势',
      factors: { policy: 0, economy: 0, population: 0 }
    },
    {
      id: '2',
      name: '政策收紧',
      description: '限购限贷政策加强',
      factors: { policy: -0.3, economy: 0, population: -0.1 }
    },
    {
      id: '3',
      name: '政策宽松',
      description: '政策支持购房',
      factors: { policy: 0.2, economy: 0.1, population: 0.1 }
    },
    {
      id: '4',
      name: '经济高速增长',
      description: 'GDP快速增长',
      factors: { policy: 0, economy: 0.3, population: 0.2 }
    },
    {
      id: '5',
      name: '人口流入',
      description: '大量人口流入',
      factors: { policy: 0, economy: 0.1, population: 0.3 }
    }
  ];

  const provinces = useMemo(() => {
    const data = housePriceData as any[];
    return data.filter(p => p.adcode !== 100000).map(p => p.name);
  }, []);

  const simulateData = useMemo(() => {
    const data = housePriceData as any[];
    const province = data.find(p => p.name === selectedProvince);
    if (!province) return [];

    const years = Object.keys(province.data || {}).sort();
    const historical = years.map(year => ({
      year,
      price: province.data[year]?.average || 0,
      type: 'historical'
    }));

    const lastYear = parseInt(years[years.length - 1]);
    const lastPrice = province.data[years[years.length - 1]]?.average || 0;
    
    const growthRates: number[] = [];
    for (let i = 1; i < historical.length; i++) {
      if (historical[i - 1].price > 0) {
        growthRates.push((historical[i].price - historical[i - 1].price) / historical[i - 1].price);
      }
    }
    const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;

    const simulated = [];
    let currentPrice = lastPrice;
    for (let i = 1; i <= timeHorizon; i++) {
      let growthRate = avgGrowthRate;
      growthRate += scenario.factors.policy * 0.05;
      growthRate += scenario.factors.economy * 0.08;
      growthRate += scenario.factors.population * 0.06;
      growthRate += (Math.random() - 0.5) * 0.02;
      currentPrice = currentPrice * (1 + growthRate);
      simulated.push({
        year: (lastYear + i).toString(),
        price: currentPrice,
        type: 'simulated'
      });
    }

    return [...historical, ...simulated];
  }, [selectedProvince, scenario, timeHorizon]);

  useEffect(() => {
    if (!svgRef.current || !visible) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 500;
    const margin = { top: 50, right: 50, bottom: 60, left: 80 };

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const historical = simulateData.filter(d => d.type === 'historical');
    const simulated = simulateData.filter(d => d.type === 'simulated');
    const allData = simulateData;

    // 创建比例尺
    const xScale = d3.scaleBand()
      .domain(allData.map(d => d.year))
      .range([0, chartWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(allData, d => d.price) || 0])
      .nice()
      .range([chartHeight, 0]);

    // 创建折线生成器
    const lineGenerator = d3.line<{year: string; price: number}>()
      .x(d => (xScale(d.year) || 0) + xScale.bandwidth() / 2)
      .y(d => yScale(d.price))
      .curve(d3.curveMonotoneX);

    // 绘制历史数据折线
    const historicalLine = lineGenerator(historical as any);
    if (historicalLine) {
      g.append("path")
        .datum(historical)
        .attr("fill", "none")
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 2)
        .attr("d", historicalLine);
    }

    // 绘制模拟数据折线
    const simulatedLine = lineGenerator(simulated as any);
    if (simulatedLine) {
      g.append("path")
        .datum(simulated)
        .attr("fill", "none")
        .attr("stroke", "#22c55e")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("d", simulatedLine);
    }

    // 绘制数据点
    g.selectAll(".historical-dot")
      .data(historical)
      .enter()
      .append("circle")
      .attr("class", "historical-dot")
      .attr("cx", d => (xScale(d.year) || 0) + xScale.bandwidth() / 2)
      .attr("cy", d => yScale(d.price))
      .attr("r", 4)
      .attr("fill", "#3b82f6");

    g.selectAll(".simulated-dot")
      .data(simulated)
      .enter()
      .append("circle")
      .attr("class", "simulated-dot")
      .attr("cx", d => (xScale(d.year) || 0) + xScale.bandwidth() / 2)
      .attr("cy", d => yScale(d.price))
      .attr("r", 4)
      .attr("fill", "#22c55e");

    // 绘制分隔线（当前时间）
    if (historical.length > 0) {
      const currentX = (xScale(historical[historical.length - 1].year) || 0) + xScale.bandwidth() / 2;
      g.append("line")
        .attr("x1", currentX)
        .attr("x2", currentX)
        .attr("y1", 0)
        .attr("y2", chartHeight)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3,3");

      g.append("text")
        .attr("x", currentX)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "#94a3b8")
        .attr("font-size", 11)
        .text("当前");
    }

    // 添加坐标轴
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => `${d} 元/㎡`);

    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", 11);

    g.append("g")
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", 11);

    // 标题
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 16)
      .attr("font-weight", 600)
      .text(`${selectedProvince}房价模拟`);

    // 图例
    const legend = g.append("g").attr("transform", `translate(${chartWidth - 120}, 10)`);
    legend.append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2);
    legend.append("text")
      .attr("x", 25)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .attr("fill", "#94a3b8")
      .attr("font-size", 11)
      .text("历史数据");

    legend.append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 20)
      .attr("y2", 20)
      .attr("stroke", "#22c55e")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5");
    legend.append("text")
      .attr("x", 25)
      .attr("y", 20)
      .attr("dy", "0.35em")
      .attr("fill", "#94a3b8")
      .attr("font-size", 11)
      .text("模拟数据");
  }, [simulateData, visible, selectedProvince]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: 1000,
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#e2e8f0', margin: 0 }}>数据合成与模拟</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 24,
              cursor: 'pointer',
              padding: 4
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 8, display: 'block' }}>
                选择省份
              </label>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none'
                }}
              >
                {provinces.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 8, display: 'block' }}>
                时间范围（年）
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 12, display: 'block' }}>
                场景选择
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scenarios.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setScenario(s)}
                    style={{
                      padding: 12,
                      background: scenario.id === s.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${scenario.id === s.id ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      {s.name}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 11 }}>
                      {s.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <svg ref={svgRef}></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataSimulator;
