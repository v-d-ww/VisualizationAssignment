import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Map3D, { ProjectionFnParamType } from "../map3d";
import { GeoJsonType } from "../map3d/typed";
import TimeAxis from "../components/TimeAxis";
import AIChat from "../components/AIChat";
import CalculatorPanel from "../components/CalculatorPanel";
import Scatter3D from "../components/Scatter3D";
import PolicyFlowChart from "../components/PolicyFlowChart";
import PolicyWordCloud from "../components/PolicyWordCloud";
import PriceClusterChart from "../components/PriceClusterChart";
import RadarChart from "../components/RadarChart";
import RingChart from "../components/RingChart";
import PricePredictionEngine from "../components/PricePredictionEngine";
import InvestmentAdvisor from "../components/InvestmentAdvisor";
import AnomalyDetector from "../components/AnomalyDetector";
import DataInsights from "../components/DataInsights";
import housePriceData from "../data/housePriceData.json";

// 地图放大倍率
const MapScale: any = {
  province: 100,
  city: 200,
  district: 300,
};

function MainPage() {
  const { adcode } = useParams<{ adcode: string }>();
  const navigate = useNavigate();
  const [geoJson, setGeoJson] = useState<GeoJsonType>();
  const [projectionFnParam, setProjectionFnParam] =
    useState<ProjectionFnParamType>({
      center: [104.0, 37.5],
      scale: 40,
    });
  const [currentYear, setCurrentYear] = useState<string>("2020");
  const [currentMonth, setCurrentMonth] = useState<string>("02");
  const [showScatter3D, setShowScatter3D] = useState<boolean>(false);
  const [showPolicyFlow, setShowPolicyFlow] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showCluster, setShowCluster] = useState<boolean>(false);
  const [showWordCloud, setShowWordCloud] = useState<boolean>(false);
  const [showRadar, setShowRadar] = useState<boolean>(false);
  const [showRing, setShowRing] = useState<boolean>(false);
  const [showPrediction, setShowPrediction] = useState<boolean>(false);
  const [showInvestment, setShowInvestment] = useState<boolean>(false);
  const [showAnomaly, setShowAnomaly] = useState<boolean>(false);
  const [showInsights, setShowInsights] = useState<boolean>(false);

  const mapAdCode = adcode ? parseInt(adcode) : 100000;

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    (housePriceData as any[]).forEach((item) => {
      if (item.data) {
        Object.keys(item.data).forEach((year) => years.add(year));
      }
    });
    return Array.from(years).sort();
  }, []);

  const availableMonths = useMemo(() => {
    return ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  }, []);

  const handleTimeChange = useCallback((year: string, month: string) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  }, []);

  // 请求地图数据
  const queryMapData = useCallback(async (code: number) => {
    const response = await axios.get(
      `https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`
    );
    const { data } = response;
    setGeoJson(data);

    const targetFeature =
      data?.features?.find(
        (feature: any) => feature.properties.adcode === code
      ) || data?.features?.[0];

    if (targetFeature?.properties?.centroid) {
      const centroid = targetFeature.properties.centroid;
      const level = targetFeature.properties.level || "province";
      setProjectionFnParam({
        center: centroid,
        scale: MapScale[level] || 100,
      });
    }
  }, []);

  useEffect(() => {
    queryMapData(mapAdCode);
  }, [mapAdCode, queryMapData]);

  // 双击事件 - 跳转到新的路由
  const dblClickFn = (customProperties: any) => {
    navigate(`/map/${customProperties.adcode}`);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#05070f",
        padding: 12,
        paddingLeft: 360,
        boxSizing: "border-box",
      }}
    >
      <CalculatorPanel />
      <div
        style={{
          width: "100%",
          height: "100%",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {geoJson ? (
          <>
            <Map3D
              geoJson={geoJson}
              dblClickFn={dblClickFn}
              projectionFnParam={projectionFnParam}
              housePriceData={housePriceData as any[]}
              currentYear={currentYear}
              currentMonth={currentMonth}
              showHeatmap={showHeatmap}
            />
            <TimeAxis
              onTimeChange={handleTimeChange}
              availableYears={availableYears}
              availableMonths={availableMonths}
            />
            <AIChat />
            <div
              style={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 998,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "center",
                padding: "6px 10px",
                background: "rgba(5, 7, 15, 0.6)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                backdropFilter: "blur(6px)",
              }}
            >
              <button
                onClick={() => setShowScatter3D(!showScatter3D)}
                style={{
                  padding: "10px 16px",
                  background: showScatter3D
                    ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                    : "rgba(59, 130, 246, 0.1)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showScatter3D
                    ? "0 4px 12px rgba(59, 130, 246, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showScatter3D) {
                    e.currentTarget.style.background =
                      "rgba(59, 130, 246, 0.2)";
                    e.currentTarget.style.borderColor =
                      "rgba(59, 130, 246, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showScatter3D) {
                    e.currentTarget.style.background =
                      "rgba(59, 130, 246, 0.1)";
                    e.currentTarget.style.borderColor =
                      "rgba(59, 130, 246, 0.3)";
                  }
                }}
              >
                {showScatter3D ? "关闭3D散点图" : "显示3D散点图"}
              </button>
              <button
                onClick={() => setShowPolicyFlow(!showPolicyFlow)}
                style={{
                  padding: "10px 16px",
                  background: showPolicyFlow
                    ? "linear-gradient(135deg, #8b5cf6, #7c3aed)"
                    : "rgba(139, 92, 246, 0.1)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showPolicyFlow
                    ? "0 4px 12px rgba(139, 92, 246, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showPolicyFlow) {
                    e.currentTarget.style.background =
                      "rgba(139, 92, 246, 0.2)";
                    e.currentTarget.style.borderColor =
                      "rgba(139, 92, 246, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showPolicyFlow) {
                    e.currentTarget.style.background =
                      "rgba(139, 92, 246, 0.1)";
                    e.currentTarget.style.borderColor =
                      "rgba(139, 92, 246, 0.3)";
                  }
                }}
              >
                {showPolicyFlow ? "关闭政策流量图" : "显示政策流量图"}
              </button>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                style={{
                  padding: "10px 16px",
                  background: showHeatmap
                    ? "linear-gradient(135deg, #f59e0b, #d97706)"
                    : "rgba(245, 158, 11, 0.1)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showHeatmap
                    ? "0 4px 12px rgba(245, 158, 11, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showHeatmap) {
                    e.currentTarget.style.background =
                      "rgba(245, 158, 11, 0.2)";
                    e.currentTarget.style.borderColor =
                      "rgba(245, 158, 11, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showHeatmap) {
                    e.currentTarget.style.background =
                      "rgba(245, 158, 11, 0.1)";
                    e.currentTarget.style.borderColor =
                      "rgba(245, 158, 11, 0.3)";
                  }
                }}
              >
                {showHeatmap ? "关闭热力图" : "显示热力图"}
              </button>
              <button
                onClick={() => setShowCluster(!showCluster)}
                style={{
                  padding: "10px 16px",
                  background: showCluster
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : "rgba(16, 185, 129, 0.1)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showCluster
                    ? "0 4px 12px rgba(16, 185, 129, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showCluster) {
                    e.currentTarget.style.background =
                      "rgba(16, 185, 129, 0.2)";
                    e.currentTarget.style.borderColor =
                      "rgba(16, 185, 129, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showCluster) {
                    e.currentTarget.style.background =
                      "rgba(16, 185, 129, 0.1)";
                    e.currentTarget.style.borderColor =
                      "rgba(16, 185, 129, 0.3)";
                  }
                }}
              >
                {showCluster ? "关闭聚类图" : "显示聚类图"}
              </button>
              <button
                onClick={() => setShowWordCloud(!showWordCloud)}
                style={{
                  padding: "10px 16px",
                  background: showWordCloud
                    ? "linear-gradient(135deg, #f472b6, #ec4899)"
                    : "rgba(244, 114, 182, 0.12)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(244, 114, 182, 0.35)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showWordCloud
                    ? "0 4px 12px rgba(244, 114, 182, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showWordCloud) {
                    e.currentTarget.style.background =
                      "rgba(244, 114, 182, 0.2)";
                    e.currentTarget.style.borderColor =
                      "rgba(244, 114, 182, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showWordCloud) {
                    e.currentTarget.style.background =
                      "rgba(244, 114, 182, 0.12)";
                    e.currentTarget.style.borderColor =
                      "rgba(244, 114, 182, 0.35)";
                  }
                }}
              >
                {showWordCloud ? "关闭政策词云" : "显示政策词云"}
              </button>
              <button
                onClick={() => setShowRadar(!showRadar)}
                style={{
                  padding: "10px 16px",
                  background: showRadar
                    ? "linear-gradient(135deg, #06b6d4, #0891b2)"
                    : "rgba(6, 182, 212, 0.1)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showRadar
                    ? "0 4px 12px rgba(6, 182, 212, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showRadar) {
                    e.currentTarget.style.background = "rgba(6, 182, 212, 0.2)";
                    e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showRadar) {
                    e.currentTarget.style.background = "rgba(6, 182, 212, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.3)";
                  }
                }}
              >
                {showRadar ? "关闭雷达图" : "显示雷达图"}
              </button>
              <button
                onClick={() => setShowRing(!showRing)}
                style={{
                  padding: "10px 16px",
                  background: showRing
                    ? "linear-gradient(135deg, #ec4899, #db2777)"
                    : "rgba(236, 72, 153, 0.1)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(236, 72, 153, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showRing
                    ? "0 4px 12px rgba(236, 72, 153, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showRing) {
                    e.currentTarget.style.background = "rgba(236, 72, 153, 0.2)";
                    e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showRing) {
                    e.currentTarget.style.background = "rgba(236, 72, 153, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.3)";
                  }
                }}
              >
                {showRing ? "关闭环图" : "显示环图"}
              </button>
              <button
                onClick={() => setShowPrediction(!showPrediction)}
                style={{
                  padding: "10px 16px",
                  background: showPrediction
                    ? "linear-gradient(135deg, #14b8a6, #0d9488)"
                    : "rgba(20, 184, 166, 0.1)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(20, 184, 166, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showPrediction
                    ? "0 4px 12px rgba(20, 184, 166, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showPrediction) {
                    e.currentTarget.style.background = "rgba(20, 184, 166, 0.2)";
                    e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showPrediction) {
                    e.currentTarget.style.background = "rgba(20, 184, 166, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(20, 184, 166, 0.3)";
                  }
                }}
              >
                {showPrediction ? "关闭AI预测" : "AI预测引擎"}
              </button>
              <button
                onClick={() => setShowInvestment(!showInvestment)}
                style={{
                  padding: "10px 16px",
                  background: showInvestment
                    ? "linear-gradient(135deg, #f97316, #ea580c)"
                    : "rgba(249, 115, 22, 0.1)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(249, 115, 22, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showInvestment
                    ? "0 4px 12px rgba(249, 115, 22, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showInvestment) {
                    e.currentTarget.style.background = "rgba(249, 115, 22, 0.2)";
                    e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showInvestment) {
                    e.currentTarget.style.background = "rgba(249, 115, 22, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.3)";
                  }
                }}
              >
                {showInvestment ? "关闭投资助手" : "投资决策助手"}
              </button>
              <button
                onClick={() => setShowAnomaly(!showAnomaly)}
                style={{
                  padding: "10px 16px",
                  background: showAnomaly
                    ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                    : "rgba(220, 38, 38, 0.1)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(220, 38, 38, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showAnomaly
                    ? "0 4px 12px rgba(220, 38, 38, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showAnomaly) {
                    e.currentTarget.style.background = "rgba(220, 38, 38, 0.2)";
                    e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showAnomaly) {
                    e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.3)";
                  }
                }}
              >
                {showAnomaly ? "关闭异常检测" : "异常检测系统"}
              </button>
              <button
                onClick={() => setShowInsights(!showInsights)}
                style={{
                  padding: "10px 16px",
                  background: showInsights
                    ? "linear-gradient(135deg, #8b5cf6, #7c3aed)"
                    : "rgba(139, 92, 246, 0.1)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: showInsights
                    ? "0 4px 12px rgba(139, 92, 246, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",
                  minWidth: 110,
                }}
                onMouseEnter={(e) => {
                  if (!showInsights) {
                    e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)";
                    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showInsights) {
                    e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)";
                  }
                }}
              >
                {showInsights ? "关闭数据洞察" : "智能数据洞察"}
              </button>
            </div>
            {/* 热力图图例 */}
            {showHeatmap && (
              <div
                style={{
                  position: "absolute",
                  bottom: 80,
                  left: 20,
                  zIndex: 998,
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  minWidth: 120,
                }}
              >
                <div
                  style={{
                    color: "#e2e8f0",
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  房价热力图
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 120,
                      background: "linear-gradient(to top, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)",
                      borderRadius: 4,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      height: 120,
                      color: "#94a3b8",
                      fontSize: 11,
                    }}
                  >
                    <span>高</span>
                    <span>低</span>
                  </div>
                </div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 10,
                    marginTop: 4,
                  }}
                >
                  {currentYear}年平均值
                </div>
              </div>
            )}
            <Scatter3D visible={showScatter3D} onClose={() => setShowScatter3D(false)} />
            <PolicyFlowChart visible={showPolicyFlow} onClose={() => setShowPolicyFlow(false)} />
            <PriceClusterChart visible={showCluster} onClose={() => setShowCluster(false)} />
            <PolicyWordCloud visible={showWordCloud} onClose={() => setShowWordCloud(false)} />
            <RadarChart visible={showRadar} onClose={() => setShowRadar(false)} />
            <RingChart visible={showRing} onClose={() => setShowRing(false)} />
            <PricePredictionEngine visible={showPrediction} onClose={() => setShowPrediction(false)} />
            <InvestmentAdvisor visible={showInvestment} onClose={() => setShowInvestment(false)} />
            <AnomalyDetector visible={showAnomaly} onClose={() => setShowAnomaly(false)} />
            <DataInsights visible={showInsights} onClose={() => setShowInsights(false)} />
          </>
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
            }}
          >
            加载地图中...
          </div>
        )}
      </div>
    </div>
  );
}

export default MainPage;