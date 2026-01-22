import { useEffect, useState } from "react";

interface AnalysisTooltipProps {
  message: string;
  position: { x: number; y: number };
  visible: boolean;
  onClose: () => void;
}

function AnalysisTooltip({
  message,
  position,
  visible,
  onClose,
}: AnalysisTooltipProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // 3秒后自动消失

      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        padding: "10px 14px",
        background: "rgba(59,130,246,0.95)",
        border: "1px solid rgba(59,130,246,0.5)",
        borderRadius: 8,
        color: "#fff",
        fontSize: 12,
        lineHeight: 1.5,
        zIndex: 10000,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        pointerEvents: "none",
        maxWidth: 300,
        animation: "fadeIn 0.3s ease",
      }}
    >
      {message}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default AnalysisTooltip;

