import { useState } from "react";
import { mapConfig } from "../map3d/mapConfig";

interface ColorControlPanelProps {
  onColorChange?: (config: {
    mapColor: string;
    mapHoverColor: string;
    mapSideColor1: string;
    mapSideColor2: string;
    topLineColor: string;
  }) => void;
}

function ColorControlPanel({ onColorChange }: ColorControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // 从mapConfig获取初始值
  const [colorConfig, setColorConfig] = useState({
    mapColor: mapConfig.mapColor,
    mapHoverColor: mapConfig.mapHoverColor,
    mapSideColor1: mapConfig.mapSideColor1,
    mapSideColor2: mapConfig.mapSideColor2,
    topLineColor: typeof mapConfig.topLineColor === "number" 
      ? `#${mapConfig.topLineColor.toString(16).padStart(6, '0')}` 
      : mapConfig.topLineColor,
  });

  const handleColorChange = (key: keyof typeof colorConfig, value: string) => {
    const newConfig = { ...colorConfig, [key]: value };
    setColorConfig(newConfig);
    if (onColorChange) {
      onColorChange(newConfig);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 20,
        zIndex: 9999,
      }}
    >
      {/* 悬浮球按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "none",
          background: isOpen
            ? "linear-gradient(135deg, #3b82f6, #2563eb)"
            : "rgba(59,130,246,0.2)",
          color: "#fff",
          cursor: "pointer",
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          transition: "all 0.3s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        title="颜色设置"
      >
        {isOpen ? "✖" : "🎨"}
      </button>

      {/* 展开的控制面板 */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 0,
            width: 250,
            background: "rgba(5, 7, 15, 0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            地图颜色设置
          </div>

          {/* 地图颜色 */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                color: "#94a3b8",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              地图颜色
            </label>
            <input
              type="color"
              value={colorConfig.mapColor}
              onChange={(e) => handleColorChange("mapColor", e.target.value)}
              style={{
                width: "100%",
                height: 32,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            />
          </div>

          {/* 悬停颜色 */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                color: "#94a3b8",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              悬停颜色
            </label>
            <input
              type="color"
              value={colorConfig.mapHoverColor}
              onChange={(e) => handleColorChange("mapHoverColor", e.target.value)}
              style={{
                width: "100%",
                height: 32,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            />
          </div>

          {/* 侧面颜色1 */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                color: "#94a3b8",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              侧面颜色1
            </label>
            <input
              type="color"
              value={colorConfig.mapSideColor1}
              onChange={(e) => handleColorChange("mapSideColor1", e.target.value)}
              style={{
                width: "100%",
                height: 32,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            />
          </div>

          {/* 侧面颜色2 */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                color: "#94a3b8",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              侧面颜色2
            </label>
            <input
              type="color"
              value={colorConfig.mapSideColor2}
              onChange={(e) => handleColorChange("mapSideColor2", e.target.value)}
              style={{
                width: "100%",
                height: 32,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            />
          </div>

          {/* 顶线颜色 */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                color: "#94a3b8",
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              顶线颜色
            </label>
            <input
              type="color"
              value={colorConfig.topLineColor}
              onChange={(e) => handleColorChange("topLineColor", e.target.value)}
              style={{
                width: "100%",
                height: 32,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ColorControlPanel;
