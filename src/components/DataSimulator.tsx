import { useState, useMemo } from 'react';
import * as echarts from 'echarts';
import { useRef, useEffect } from 'react';
import housePriceData from '../data/housePriceData.json';

interface Scenario {
  id: string;
  name: string;
  description: string;
  factors: {
    policy: number; // -1 to 1
    economy: number; // -1 to 1
    population: number; // -1 to 1
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
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts>();

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
    
    // 计算历史增长率
    const growthRates: number[] = [];
    for (let i = 1; i < historical.length; i++) {
      if (historical[i - 1].price > 0) {
        growthRates.push((historical[i].price - historical[i - 1].price) / historical[i - 1].price);
      }
    }
    const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;

    // 模拟未来数据
    const simulated = [];
    let currentPrice = lastPrice;
    for (let i = 1; i <= timeHorizon; i++) {
      // 基础增长率
      let growthRate = avgGrowthRate;
      
      // 应用场景因子
      growthRate += scenario.factors.policy * 0.05;
      growthRate += scenario.factors.economy * 0.08;
      growthRate += scenario.factors.population * 0.06;
      
      // 添加随机波动
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
    if (chartRef.current && visible) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }
    return () => {
      chartInstanceRef.current?.dispose();
    };
  }, [visible]);

  useEffect(() => {
    if (!chartInstanceRef.current || !visible) return;

    const historical = simulateData.filter(d => d.type === 'historical');
    const simulated = simulateData.filter(d => d.type === 'simulated');

    chartInstanceRef.current.setOption({
      title: {
        text: `${selectedProvince}房价模拟`,
        left: 'center',
        textStyle: { color: '#e2e8f0', fontSize: 16 }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          return `${param.axisValue}<br/>${param.seriesName}: ${param.value.toFixed(0)} 元/㎡`;
        }
      },
      legend: {
        data: ['历史数据', '模拟数据'],
        top: 30,
        textStyle: { color: '#94a3b8' }
      },
      xAxis: {
        type: 'category',
        data: simulateData.map(d => d.year),
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', formatter: '{value} 元/㎡' }
      },
      series: [
        {
          name: '历史数据',
          type: 'line',
          data: historical.map(d => d.price),
          smooth: true,
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          markLine: {
            data: [{ xAxis: historical.length - 1 }],
            lineStyle: { color: '#94a3b8', type: 'dashed' },
            label: { formatter: '当前', color: '#94a3b8' }
          }
        },
        {
          name: '模拟数据',
          type: 'line',
          data: [...Array(historical.length).fill(null), ...simulated.map(d => d.price)],
          smooth: true,
          lineStyle: { color: '#22c55e', width: 2, type: 'dashed' },
          itemStyle: { color: '#22c55e' }
        }
      ]
    }, true);
  }, [simulateData, visible, selectedProvince]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 10001, // 提高z-index，确保在所有组件（包括时间轴）之上
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
          {/* 控制面板 */}
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

            {/* 因子调整 */}
            <div>
              <label style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 12, display: 'block' }}>
                自定义因子
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(scenario.factors).map(([key, value]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>
                        {key === 'policy' ? '政策' : key === 'economy' ? '经济' : '人口'}
                      </span>
                      <span style={{ color: '#e2e8f0', fontSize: 12 }}>
                        {(value * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={value}
                      onChange={(e) => {
                        setScenario({
                          ...scenario,
                          factors: {
                            ...scenario.factors,
                            [key]: parseFloat(e.target.value)
                          }
                        });
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 图表 */}
          <div>
            <div
              ref={chartRef}
              style={{
                width: '100%',
                height: 500,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 12
              }}
            />
            <div style={{ marginTop: 16, padding: 16, background: 'rgba(59,130,246,0.1)', borderRadius: 8 }}>
              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                模拟结果
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.6 }}>
                根据历史数据和场景因子，预测未来{timeHorizon}年{selectedProvince}的房价走势。
                模拟结果仅供参考，实际价格受多种因素影响。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataSimulator;

