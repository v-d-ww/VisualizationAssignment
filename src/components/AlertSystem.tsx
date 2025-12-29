import { useState, useEffect, useMemo } from 'react';
import housePriceData from '../data/housePriceData.json';

interface Alert {
  id: string;
  level: 'low' | 'medium' | 'high';
  type: 'threshold' | 'anomaly' | 'trend';
  province: string;
  message: string;
  value: number;
  threshold?: number;
  timestamp: Date;
}

interface AlertRule {
  id: string;
  name: string;
  type: 'threshold' | 'anomaly' | 'trend';
  enabled: boolean;
  threshold?: number;
  province?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

function AlertSystem({ visible, onClose }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([
    {
      id: '1',
      name: '高房价预警',
      type: 'threshold',
      enabled: true,
      threshold: 30000
    },
    {
      id: '2',
      name: '异常波动预警',
      type: 'anomaly',
      enabled: true
    },
    {
      id: '3',
      name: '快速上涨预警',
      type: 'trend',
      enabled: true,
      threshold: 20 // 涨幅超过20%
    }
  ]);

  const checkAlerts = useMemo(() => {
    const newAlerts: Alert[] = [];
    const data = housePriceData as any[];
    const provinces = data.filter(p => p.adcode !== 100000);

    rules.forEach(rule => {
      if (!rule.enabled) return;

      if (rule.type === 'threshold' && rule.threshold !== undefined) {
        const threshold = rule.threshold;
        provinces.forEach(province => {
          const years = Object.keys(province.data || {}).sort();
          const latestYear = years[years.length - 1];
          const price = province.data[latestYear]?.average || 0;
          
          if (price > threshold) {
            newAlerts.push({
              id: `${rule.id}-${province.adcode}`,
              level: price > threshold * 1.5 ? 'high' : 'medium',
              type: 'threshold',
              province: province.name,
              message: `${province.name}房价超过${threshold}元/㎡`,
              value: price,
              threshold: threshold,
              timestamp: new Date()
            });
          }
        });
      }

      if (rule.type === 'anomaly') {
        provinces.forEach(province => {
          const years = Object.keys(province.data || {}).sort();
          if (years.length < 3) return;
          
          const prices = years.map(y => province.data[y]?.average || 0).filter(p => p > 0);
          if (prices.length < 3) return;
          
          const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
          const std = Math.sqrt(
            prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length
          );
          const latest = prices[prices.length - 1];
          
          if (Math.abs(latest - avg) > 2 * std) {
            newAlerts.push({
              id: `anomaly-${province.adcode}`,
              level: Math.abs(latest - avg) > 3 * std ? 'high' : 'medium',
              type: 'anomaly',
              province: province.name,
              message: `${province.name}房价出现异常波动`,
              value: latest,
              timestamp: new Date()
            });
          }
        });
      }

      if (rule.type === 'trend' && rule.threshold !== undefined) {
        const threshold = rule.threshold;
        provinces.forEach(province => {
          const years = Object.keys(province.data || {}).sort();
          if (years.length < 2) return;
          
          const first = province.data[years[0]]?.average || 0;
          const last = province.data[years[years.length - 1]]?.average || 0;
          if (first === 0) return;
          
          const increase = ((last - first) / first) * 100;
          if (increase > threshold) {
            newAlerts.push({
              id: `trend-${province.adcode}`,
              level: increase > threshold * 1.5 ? 'high' : 'medium',
              type: 'trend',
              province: province.name,
              message: `${province.name}近${years.length}年涨幅${increase.toFixed(1)}%`,
              value: increase,
              threshold: threshold,
              timestamp: new Date()
            });
          }
        });
      }
    });

    return newAlerts.sort((a, b) => {
      const levelOrder = { high: 3, medium: 2, low: 1 };
      return levelOrder[b.level] - levelOrder[a.level];
    });
  }, [rules]);

  useEffect(() => {
    if (visible) {
      setAlerts(checkAlerts);
    }
  }, [visible, checkAlerts]);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '';
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        top: 20,
        width: 420,
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
          background: 'rgba(239,68,68,0.1)'
        }}
      >
        <div>
          <h3 style={{ color: '#e2e8f0', margin: 0, fontSize: 16 }}>智能预警系统</h3>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            {alerts.length} 条预警
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
        {/* 预警规则 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 12, fontWeight: 600 }}>
            预警规则
          </div>
          {rules.map(rule => (
            <div
              key={rule.id}
              style={{
                padding: 12,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ color: '#e2e8f0', fontSize: 13 }}>{rule.name}</div>
                {rule.threshold && (
                  <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                    阈值: {rule.threshold}{rule.type === 'threshold' ? '元/㎡' : '%'}
                  </div>
                )}
              </div>
              <button
                onClick={() => toggleRule(rule.id)}
                style={{
                  padding: '4px 12px',
                  background: rule.enabled ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                {rule.enabled ? '启用' : '禁用'}
              </button>
            </div>
          ))}
        </div>

        {/* 预警列表 */}
        <div>
          <div style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 12, fontWeight: 600 }}>
            预警列表
          </div>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              暂无预警
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    padding: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${getLevelColor(alert.level)}40`,
                    borderRadius: 8,
                    borderLeft: `4px solid ${getLevelColor(alert.level)}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div>
                      <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
                        {alert.province}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                        {alert.message}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '4px 8px',
                        background: `${getLevelColor(alert.level)}20`,
                        border: `1px solid ${getLevelColor(alert.level)}`,
                        borderRadius: 4,
                        color: getLevelColor(alert.level),
                        fontSize: 11,
                        fontWeight: 600
                      }}
                    >
                      {getLevelText(alert.level)}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {alert.timestamp.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertSystem;

