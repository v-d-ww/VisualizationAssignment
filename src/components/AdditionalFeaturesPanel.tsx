import { useState } from "react";
import PolicyFlowChart from "./PolicyFlowChart";
import PolicyFlowChartOriginal from "./PolicyFlowChartOriginal";
import DataSimulator from "./DataSimulator";
import DataStoryBoard from "./DataStoryBoard";

function AdditionalFeaturesPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const features = [
    { id: "policy", name: "政策流量图", icon: "📊", component: "PolicyFlowChart" },
    { id: "policy-original", name: "政策流量图(原版)", icon: "📋", component: "PolicyFlowChartOriginal" },
    { id: "simulator", name: "数据模拟器", icon: "🔮", component: "DataSimulator" },
    { id: "storyboard", name: "数据故事板", icon: "📖", component: "DataStoryBoard" },
  ];

  const handleFeatureClick = (featureId: string) => {
    setActiveFeature(featureId);
    setIsOpen(false);
  };

  const handleClose = () => {
    setActiveFeature(null);
  };

  return (
    <>
      {/* 悬浮球按钮 */}
      {!activeFeature && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            right: 20,
            zIndex: 9998,
          }}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "none",
              background: isOpen
                ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                : "rgba(59,130,246,0.2)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 24,
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
            title="附加功能"
          >
            {isOpen ? "✖" : "⚙️"}
          </button>

          {/* 展开的功能列表 */}
          {isOpen && (
            <div
              style={{
                position: "absolute",
                bottom: 70,
                right: 0,
                width: 200,
                background: "rgba(5, 7, 15, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: 12,
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              }}
            >
              {features.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => handleFeatureClick(feature.id)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    marginBottom: 8,
                    background: "rgba(59,130,246,0.1)",
                    border: "1px solid rgba(59,130,246,0.2)",
                    borderRadius: 8,
                    color: "#e2e8f0",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(59,130,246,0.2)";
                    e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(59,130,246,0.1)";
                    e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)";
                  }}
                >
                  <span style={{ fontSize: 18 }}>{feature.icon}</span>
                  <span>{feature.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 功能组件 */}
      {activeFeature === "policy" && (
        <PolicyFlowChart visible={true} onClose={handleClose} />
      )}
      {activeFeature === "policy-original" && (
        <PolicyFlowChartOriginal visible={true} onClose={handleClose} />
      )}
      {activeFeature === "simulator" && (
        <DataSimulator visible={true} onClose={handleClose} />
      )}
      {activeFeature === "storyboard" && (
        <DataStoryBoard visible={true} onClose={handleClose} />
      )}
    </>
  );
}

export default AdditionalFeaturesPanel;

