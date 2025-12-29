import { useState, useEffect, useMemo } from 'react';

interface Recommendation {
  id: string;
  type: 'visualization' | 'analysis' | 'comparison' | 'prediction';
  title: string;
  description: string;
  action: string;
  params?: Record<string, any>;
  score: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  currentView?: {
    scene?: string;
    activeCharts?: string[];
    selectedProvince?: string;
  };
  onRecommendationClick?: (rec: Recommendation) => void;
}

function RecommendationSystem({ visible, onClose, currentView, onRecommendationClick }: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (!visible) return;

    const recs: Recommendation[] = [];

    // 基于当前场景推荐
    if (currentView?.scene === 'geo') {
      recs.push({
        id: '1',
        type: 'visualization',
        title: '查看政策词云',
        description: '了解该地区的政策关键词分布',
        action: 'showWordCloud',
        score: 0.9
      });
      recs.push({
        id: '2',
        type: 'comparison',
        title: '对比相邻省份',
        description: '对比周边省份的房价差异',
        action: 'compareNearby',
        score: 0.8
      });
    }

    if (currentView?.scene === 'trend') {
      recs.push({
        id: '3',
        type: 'analysis',
        title: '查看预测趋势',
        description: '使用AI预测引擎预测未来走势',
        action: 'showPrediction',
        score: 0.85
      });
      recs.push({
        id: '4',
        type: 'visualization',
        title: '查看3D散点图',
        description: '多维度分析房价关系',
        action: 'showScatter3D',
        score: 0.75
      });
    }

    if (currentView?.scene === 'multi') {
      recs.push({
        id: '5',
        type: 'analysis',
        title: '查看聚类分析',
        description: '发现相似房价模式的城市群',
        action: 'showCluster',
        score: 0.9
      });
    }

    // 基于活跃图表推荐
    if (currentView?.activeCharts?.includes('heatmap')) {
      recs.push({
        id: '6',
        type: 'comparison',
        title: '查看区域对比',
        description: '对比不同区域的房价水平',
        action: 'showRadar',
        score: 0.8
      });
    }

    if (currentView?.activeCharts?.includes('scatter3d')) {
      recs.push({
        id: '7',
        type: 'analysis',
        title: '查看数据洞察',
        description: '获取智能数据洞察分析',
        action: 'showInsights',
        score: 0.85
      });
    }

    // 通用推荐
    recs.push({
      id: '8',
      type: 'analysis',
      title: '查看异常检测',
      description: '检测房价异常波动',
      action: 'showAnomaly',
      score: 0.7
    });

    recs.push({
      id: '9',
      type: 'prediction',
      title: '投资决策建议',
      description: '获取投资决策助手建议',
      action: 'showInvestment',
      score: 0.75
    });

    // 按分数排序
    setRecommendations(recs.sort((a, b) => b.score - a.score).slice(0, 6));
  }, [visible, currentView]);

  const handleClick = (rec: Recommendation) => {
    if (onRecommendationClick) {
      onRecommendationClick(rec);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'visualization': return '📊';
      case 'analysis': return '🔍';
      case 'comparison': return '⚖️';
      case 'prediction': return '🔮';
      default: return '💡';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'visualization': return '#3b82f6';
      case 'analysis': return '#22c55e';
      case 'comparison': return '#f59e0b';
      case 'prediction': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 20,
        top: 20,
        width: 360,
        maxHeight: 'calc(100vh - 40px)',
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          padding: 16,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(139,92,246,0.1)'
        }}
      >
        <div>
          <h3 style={{ color: '#e2e8f0', margin: 0, fontSize: 16 }}>智能推荐</h3>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            为您推荐 {recommendations.length} 项
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: 20,
            cursor: 'pointer',
            padding: 4
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {recommendations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            暂无推荐
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recommendations.map(rec => (
              <div
                key={rec.id}
                onClick={() => handleClick(rec)}
                style={{
                  padding: 14,
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${getTypeColor(rec.type)}40`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderLeft: `4px solid ${getTypeColor(rec.type)}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
                  <div style={{ fontSize: 24 }}>{getTypeIcon(rec.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                      <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
                        {rec.title}
                      </div>
                      <div
                        style={{
                          padding: '2px 6px',
                          background: `${getTypeColor(rec.type)}20`,
                          borderRadius: 4,
                          fontSize: 10,
                          color: getTypeColor(rec.type)
                        }}
                      >
                        {Math.round(rec.score * 100)}%
                      </div>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>
                      {rec.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecommendationSystem;

