import { useState, useEffect, useRef } from 'react';

interface Annotation {
  id: string;
  lng: number;
  lat: number;
  title: string;
  content: string;
  color: string;
  timestamp: Date;
  author?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAnnotationAdd?: (annotation: Annotation) => void;
  annotations?: Annotation[];
}

function MapAnnotation({ visible, onClose, onAnnotationAdd, annotations = [] }: Props) {
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(annotations);
  const [isAdding, setIsAdding] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState<Partial<Annotation>>({
    title: '',
    content: '',
    color: '#3b82f6'
  });
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);

  useEffect(() => {
    // 从localStorage加载标注
    const saved = localStorage.getItem('mapAnnotations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }));
        setLocalAnnotations(parsed);
      } catch (e) {
        console.error('Failed to load annotations', e);
      }
    }
  }, []);

  const saveAnnotations = (annos: Annotation[]) => {
    localStorage.setItem('mapAnnotations', JSON.stringify(annos));
    setLocalAnnotations(annos);
  };

  const handleAdd = () => {
    if (!newAnnotation.title || !newAnnotation.content) return;
    
    const annotation: Annotation = {
      id: Date.now().toString(),
      lng: 104.0, // 默认位置，实际应该从地图点击获取
      lat: 37.5,
      title: newAnnotation.title!,
      content: newAnnotation.content!,
      color: newAnnotation.color || '#3b82f6',
      timestamp: new Date(),
      author: '当前用户'
    };

    const updated = [...localAnnotations, annotation];
    saveAnnotations(updated);
    if (onAnnotationAdd) {
      onAnnotationAdd(annotation);
    }
    
    setNewAnnotation({ title: '', content: '', color: '#3b82f6' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    const updated = localAnnotations.filter(a => a.id !== id);
    saveAnnotations(updated);
    setSelectedAnnotation(null);
  };

  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: 380,
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
          background: 'rgba(59,130,246,0.1)'
        }}
      >
        <h3 style={{ color: '#e2e8f0', margin: 0, fontSize: 16 }}>协作标注</h3>
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
        {!isAdding ? (
          <>
            <button
              onClick={() => setIsAdding(true)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 16
              }}
            >
              + 添加标注
            </button>

            {localAnnotations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                暂无标注
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {localAnnotations.map(anno => (
                  <div
                    key={anno.id}
                    onClick={() => setSelectedAnnotation(anno)}
                    style={{
                      padding: 12,
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${anno.color}40`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      borderLeft: `4px solid ${anno.color}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
                          {anno.title}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                          {anno.content.substring(0, 50)}...
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                          {anno.timestamp.toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(anno.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 4,
                          fontSize: 14
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              placeholder="标注标题"
              value={newAnnotation.title || ''}
              onChange={(e) => setNewAnnotation({ ...newAnnotation, title: e.target.value })}
              style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none'
              }}
            />
            <textarea
              placeholder="标注内容"
              value={newAnnotation.content || ''}
              onChange={(e) => setNewAnnotation({ ...newAnnotation, content: e.target.value })}
              rows={4}
              style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
            <div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>选择颜色</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {colors.map(color => (
                  <div
                    key={color}
                    onClick={() => setNewAnnotation({ ...newAnnotation, color })}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: color,
                      cursor: 'pointer',
                      border: newAnnotation.color === color ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: newAnnotation.color === color ? `0 0 8px ${color}` : 'none'
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewAnnotation({ title: '', content: '', color: '#3b82f6' });
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={!newAnnotation.title || !newAnnotation.content}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: (!newAnnotation.title || !newAnnotation.content) ? 'rgba(59,130,246,0.3)' : '#3b82f6',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: (!newAnnotation.title || !newAnnotation.content) ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                保存
              </button>
            </div>
          </div>
        )}

        {selectedAnnotation && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
            onClick={() => setSelectedAnnotation(null)}
          >
            <div
              style={{
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: 20,
                maxWidth: 400,
                width: '100%'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: '#e2e8f0', marginTop: 0 }}>
                {selectedAnnotation.title}
              </h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
                {selectedAnnotation.content}
              </p>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
                {selectedAnnotation.timestamp.toLocaleString()}
              </div>
              <button
                onClick={() => setSelectedAnnotation(null)}
                style={{
                  marginTop: 16,
                  width: '100%',
                  padding: '10px',
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapAnnotation;

