import { useState, useRef, useEffect, useCallback } from 'react';
import { callAIAPI } from '../services/aiService';
import { parseDataQuery, QueryResult } from '../services/dataQueryService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  requestId?: string;
  queryResult?: QueryResult;
}

function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    const queryText = input.trim();
    setInput('');
    setLoading(true);

    try {
      // 先尝试解析数据查询
      const queryResult = parseDataQuery(queryText);
      
      if (queryResult) {
        // 如果有数据查询结果，直接显示
        const assistantMessage: Message = {
          role: 'assistant',
          content: queryResult.message,
          timestamp: new Date(),
          queryResult
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
        return;
      }

      // 否则调用AI API
      const response = await callAIAPI(queryText);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        requestId: response.requestId
      };
      console.log('AI响应 - Request ID:', response.requestId);
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `错误: ${error.message || '请求失败，请稍后重试'}`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, handleOutsideClick]);

  return (
    <>
      {!isOpen && (
        <div
          style={{
            position: 'fixed',
            right: 20,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            background: 'rgba(15,23,42,0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 999,
            padding: '10px 14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
          }}
          onClick={() => setIsOpen(true)}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(59,130,246,0.45)'
            }}
            aria-label="打开AI对话"
          >
            💬
          </div>
          <span style={{ color: '#e2e8f0', fontSize: 13 }}>AI房价助手</span>
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          zIndex: 1001
        }}
      >
        {/* 背景遮罩，点击关闭 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isOpen ? 'rgba(0,0,0,0.15)' : 'transparent',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.3s',
            pointerEvents: isOpen ? 'auto' : 'none'
          }}
          onClick={() => setIsOpen(false)}
        />

        {/* 对话面板 */}
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            right: 20,
            top: '10vh',
            width: 380,
            height: '70vh',
            maxHeight: 700,
            background: 'rgba(1, 2, 9, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            transform: isOpen ? 'translateX(0)' : 'translateX(120%)',
            opacity: isOpen ? 1 : 0,
            transition: 'transform 0.3s ease, opacity 0.3s ease',
            pointerEvents: isOpen ? 'auto' : 'none'
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>
                AI 房价助手
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                询问房价相关问题
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                fontSize: 18,
                cursor: 'pointer',
                padding: 4
              }}
              aria-label="关闭AI对话框"
            >
              ×
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: 14,
                  textAlign: 'center',
                  padding: '40px 20px',
                  lineHeight: 1.6
                }}
              >
                <div style={{ marginBottom: 12 }}>💬 欢迎使用AI房价助手</div>
                <div style={{ fontSize: 12 }}>
                  <div style={{ marginBottom: 8, fontWeight: 600, color: '#e2e8f0' }}>📊 数据查询示例：</div>
                  • "北京2023年房价是多少？"
                  <br />
                  • "哪些城市房价超过2万？"
                  <br />
                  • "对比一下北上广深的房价"
                  <br />
                  • "涨幅最大的10个城市"
                  <br />
                  <div style={{ marginTop: 12, marginBottom: 8, fontWeight: 600, color: '#e2e8f0' }}>✨ 新功能入口：</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    • 右上角快捷按钮：故事板、预警、标注、推荐、模拟
                    <br />
                    • 切换到"智能工具"标签查看所有功能卡片
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background:
                      msg.role === 'user'
                        ? 'rgba(59, 130, 246, 0.3)'
                        : 'rgba(255,255,255,0.08)',
                    color: '#e2e8f0',
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {msg.content}
                </div>
                {msg.queryResult && msg.queryResult.actions && msg.queryResult.actions.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {msg.queryResult.actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const event = new CustomEvent('aiAction', { detail: action });
                          window.dispatchEvent(event);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(59,130,246,0.2)',
                          border: '1px solid rgba(59,130,246,0.4)',
                          borderRadius: 6,
                          color: '#3b82f6',
                          cursor: 'pointer',
                          fontSize: 12,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(59,130,246,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(59,130,246,0.2)';
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    marginTop: 4,
                    paddingLeft: msg.role === 'user' ? 0 : 4,
                    paddingRight: msg.role === 'user' ? 4 : 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                >
                  <span>{msg.timestamp.toLocaleTimeString()}</span>
                  {msg.requestId && (
                    <span style={{ fontSize: 10, color: '#475569' }}>
                      Request ID: {msg.requestId}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.08)',
                    color: '#94a3b8',
                    fontSize: 14
                  }}
                >
                  <span>思考中...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              padding: '16px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(15,23,42,0.5)'
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入问题..."
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{
                  padding: '10px 20px',
                  background: loading || !input.trim() 
                    ? 'rgba(59, 130, 246, 0.3)' 
                    : '#3b82f6',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AIChat;
