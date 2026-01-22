import { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import housePriceData from '../data/housePriceData.json';

interface StoryPoint {
  year: string;
  month?: string;
  title: string;
  description: string;
  highlight?: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

function DataStoryBoard({ visible, onClose }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playSpeed, setPlaySpeed] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storyPoints: StoryPoint[] = [
    {
      year: '2020',
      title: '疫情初期',
      description: '2020年初，受疫情影响，全国房价出现波动',
      highlight: ['北京', '上海', '深圳']
    },
    {
      year: '2021',
      title: '政策调控',
      description: '2021年，多地出台限购限贷政策，房价涨幅放缓',
      highlight: ['北京', '上海', '杭州']
    },
    {
      year: '2022',
      title: '市场调整',
      description: '2022年，房地产市场进入调整期，部分城市房价回落',
      highlight: ['深圳', '广州']
    },
    {
      year: '2023',
      title: '稳中有升',
      description: '2023年，政策优化，市场逐步企稳',
      highlight: ['北京', '上海']
    },
    {
      year: '2024',
      title: '分化明显',
      description: '2024年，一线城市稳中有升，二三线城市分化明显',
      highlight: ['北京', '上海', '成都', '武汉']
    }
  ];

  useEffect(() => {
    if (!svgRef.current || !visible) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1000;
    const height = 400;
    const margin = { top: 50, right: 50, bottom: 80, left: 80 };

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const data = housePriceData as any[];
    const provinces = data.filter(p => p.adcode !== 100000);
    const currentPoint = storyPoints[currentIndex];
    
    const chartData = provinces.map(p => {
      const price = p.data[currentPoint.year]?.average || 0;
      return {
        name: p.name,
        value: price,
        highlighted: currentPoint.highlight?.includes(p.name) || false
      };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);

    // 创建比例尺
    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.name))
      .range([0, chartWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.value) || 0])
      .nice()
      .range([chartHeight, 0]);

    // 绘制柱状图
    g.selectAll(".bar")
      .data(chartData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.name) || 0)
      .attr("y", d => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", d => chartHeight - yScale(d.value))
      .attr("fill", d => d.highlighted ? "#ef4444" : "#3b82f6")
      .attr("rx", 4)
      .attr("ry", 4);

    // 添加数值标签
    g.selectAll(".bar-label")
      .data(chartData)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.value) - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", 10)
      .text(d => `${(d.value / 10000).toFixed(1)}万`);

    // 添加坐标轴
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => `${(d as number) / 10000}万`);

    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-size", 11)
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.5em")
      .attr("dy", "0.5em");

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
      .text(`${currentPoint.year}年房价TOP10`);
  }, [visible, currentIndex]);

  const handlePlay = () => {
    if (isPlaying) {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const playNext = () => {
        if (currentIndex < storyPoints.length - 1) {
          setCurrentIndex(prev => prev + 1);
          playTimerRef.current = setTimeout(playNext, 3000 / playSpeed);
        } else {
          setIsPlaying(false);
        }
      };
      playTimerRef.current = setTimeout(playNext, 3000 / playSpeed);
    }
  };

  const handleReset = () => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  useEffect(() => {
    return () => {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  const currentPoint = storyPoints[currentIndex];

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
          maxWidth: 1200,
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
          <h2 style={{ color: '#e2e8f0', margin: 0 }}>数据故事板</h2>
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

        {/* 时间轴 */}
        <div style={{ position: 'relative', padding: '20px 0' }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 2,
              background: 'rgba(255,255,255,0.1)',
              transform: 'translateY(-50%)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: `${(currentIndex / (storyPoints.length - 1)) * 100}%`,
              height: 2,
              background: '#3b82f6',
              transform: 'translateY(-50%)',
              transition: 'width 0.5s'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {storyPoints.map((point, index) => (
              <div
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsPlaying(false);
                  if (playTimerRef.current) {
                    clearTimeout(playTimerRef.current);
                    playTimerRef.current = null;
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: 8
                }}
              >
                <div
                  style={{
                    width: index === currentIndex ? 16 : 12,
                    height: index === currentIndex ? 16 : 12,
                    borderRadius: '50%',
                    background: index === currentIndex ? '#3b82f6' : 'rgba(255,255,255,0.3)',
                    border: '2px solid rgba(255,255,255,0.5)',
                    transition: 'all 0.3s',
                    boxShadow: index === currentIndex ? '0 0 12px rgba(59,130,246,0.6)' : 'none'
                  }}
                />
                <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                  {point.year}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 当前故事点内容 */}
        <div
          style={{
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 12,
            padding: 20
          }}
        >
          <h3 style={{ color: '#3b82f6', marginTop: 0 }}>{currentPoint.title}</h3>
          <p style={{ color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12 }}>
            {currentPoint.description}
          </p>
          {currentPoint.highlight && currentPoint.highlight.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {currentPoint.highlight.map((city, i) => (
                <span
                  key={i}
                  style={{
                    padding: '4px 12px',
                    background: 'rgba(239,68,68,0.2)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    borderRadius: 6,
                    color: '#ef4444',
                    fontSize: 12
                  }}
                >
                  {city}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 图表 */}
        <svg ref={svgRef}></svg>

        {/* 控制按钮 */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            重置
          </button>
          <button
            onClick={handlePlay}
            style={{
              padding: '10px 24px',
              background: isPlaying ? '#ef4444' : '#3b82f6',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>速度:</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={playSpeed}
              onChange={(e) => {
                setPlaySpeed(parseFloat(e.target.value));
                if (isPlaying) {
                  handleReset();
                  setTimeout(() => handlePlay(), 100);
                }
              }}
              style={{ width: 100 }}
            />
            <span style={{ color: '#94a3b8', fontSize: 12 }}>{playSpeed}x</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataStoryBoard;
