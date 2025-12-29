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
import DataStoryBoard from "../components/DataStoryBoard";
import AlertSystem from "../components/AlertSystem";
import MapAnnotation from "../components/MapAnnotation";
import RecommendationSystem from "../components/RecommendationSystem";
import DataSimulator from "../components/DataSimulator";
import housePriceData from "../data/housePriceData.json";

// 地图放大倍率
const MapScale: any = {
  province: 100,
  city: 200,
  district: 300,
};

// 视角类型
type ViewMode = "investment" | "research" | "default";

// 主标签页类型
type MainTab = "visualization" | "tools";

// 可视化场景类型
type VisualizationScene = "geo" | "trend" | "multi";

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
  
  // 主标签页：可视化 / 智能工具
  const [mainTab, setMainTab] = useState<MainTab>("visualization");
  
  // 可视化场景：地理关联 / 趋势对比 / 多维度关联
  const [visualizationScene, setVisualizationScene] = useState<VisualizationScene>("geo");
  
  // 视角模式
  const [viewMode, setViewMode] = useState<ViewMode>("default");
  
  // 功能显示状态
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
  const [showStoryBoard, setShowStoryBoard] = useState<boolean>(false);
  const [showAlertSystem, setShowAlertSystem] = useState<boolean>(false);
  const [showAnnotation, setShowAnnotation] = useState<boolean>(false);
  const [showRecommendation, setShowRecommendation] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  
  // 地图点击选中的省份
  const [selectedProvince, setSelectedProvince] = useState<number | null>(null);

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

  // 单击事件 - 触发功能联动
  const onClickFn = useCallback((customProperties: any) => {
    if (customProperties?.adcode) {
      setSelectedProvince(customProperties.adcode);
      // 自动唤起政策词云和环图
      setShowWordCloud(true);
      setShowRing(true);
      // 切换到地理关联场景
      setVisualizationScene("geo");
      setMainTab("visualization");
    }
  }, []);

  // 视角切换处理
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "investment") {
      // 投资视角：投资决策助手 + 热力图 + 时间轴
      setShowInvestment(true);
      setShowHeatmap(true);
      setMainTab("visualization");
      setVisualizationScene("geo");
    } else if (mode === "research") {
      // 研究视角：3D散点图 + 聚类图 + 政策流量图
      setShowScatter3D(true);
      setShowCluster(true);
      setShowPolicyFlow(true);
      setMainTab("visualization");
      setVisualizationScene("multi");
    } else {
      // 默认视角：关闭所有
      setShowInvestment(false);
      setShowHeatmap(false);
      setShowScatter3D(false);
      setShowCluster(false);
      setShowPolicyFlow(false);
    }
  }, []);

  // 异常检测触发时，自动关联AI预测引擎
  useEffect(() => {
    if (showAnomaly) {
      setShowPrediction(true);
    }
  }, [showAnomaly]);

  // 监听AI聊天中的操作事件
  useEffect(() => {
    const handleAIAction = (e: CustomEvent) => {
      const action = e.detail;
      switch (action.action) {
        case 'showHeatmap':
          setShowHeatmap(true);
          setVisualizationScene('geo');
          setMainTab('visualization');
          break;
        case 'showRadar':
          setShowRadar(true);
          setVisualizationScene('trend');
          setMainTab('visualization');
          break;
        case 'showWordCloud':
          setShowWordCloud(true);
          setVisualizationScene('geo');
          setMainTab('visualization');
          break;
        case 'showPrediction':
          setShowPrediction(true);
          setMainTab('tools');
          break;
        case 'showInvestment':
          setShowInvestment(true);
          setMainTab('tools');
          break;
        case 'showAnomaly':
          setShowAnomaly(true);
          setMainTab('tools');
          break;
        case 'showInsights':
          setShowInsights(true);
          setMainTab('tools');
          break;
        case 'showScatter3D':
          setShowScatter3D(true);
          setVisualizationScene('multi');
          setMainTab('visualization');
          break;
        case 'showCluster':
          setShowCluster(true);
          setVisualizationScene('multi');
          setMainTab('visualization');
          break;
      }
    };

    window.addEventListener('aiAction', handleAIAction as EventListener);
    return () => {
      window.removeEventListener('aiAction', handleAIAction as EventListener);
    };
  }, []);

  // 获取当前视图状态（用于推荐系统）
  const currentView = useMemo(() => {
    const activeCharts: string[] = [];
    if (showScatter3D) activeCharts.push('scatter3d');
    if (showPolicyFlow) activeCharts.push('policyFlow');
    if (showHeatmap) activeCharts.push('heatmap');
    if (showCluster) activeCharts.push('cluster');
    if (showWordCloud) activeCharts.push('wordCloud');
    if (showRadar) activeCharts.push('radar');
    if (showRing) activeCharts.push('ring');

    return {
      scene: visualizationScene,
      activeCharts,
      selectedProvince: selectedProvince?.toString()
    };
  }, [visualizationScene, showScatter3D, showPolicyFlow, showHeatmap, showCluster, showWordCloud, showRadar, showRing, selectedProvince]);

  // 渲染新功能快捷入口
  const renderNewFeaturesQuickAccess = () => (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 20,
        zIndex: 999,
        display: "flex",
        gap: 6,
        padding: "6px",
        background: "rgba(139, 92, 246, 0.15)",
        border: "1px solid rgba(139, 92, 246, 0.3)",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowStoryBoard(true);
        }}
        style={{
          padding: "6px 10px",
          background: "rgba(6, 182, 212, 0.2)",
          border: "1px solid rgba(6, 182, 212, 0.4)",
          borderRadius: 6,
          color: "#06b6d4",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          transition: "all 0.2s"
        }}
        title="数据故事板"
      >
        📖 故事板
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowAlertSystem(true);
        }}
        style={{
          padding: "6px 10px",
          background: "rgba(239, 68, 68, 0.2)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          borderRadius: 6,
          color: "#ef4444",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          transition: "all 0.2s"
        }}
        title="智能预警"
      >
        ⚠️ 预警
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowAnnotation(true);
        }}
        style={{
          padding: "6px 10px",
          background: "rgba(34, 197, 94, 0.2)",
          border: "1px solid rgba(34, 197, 94, 0.4)",
          borderRadius: 6,
          color: "#22c55e",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          transition: "all 0.2s"
        }}
        title="协作标注"
      >
        📝 标注
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowRecommendation(true);
        }}
        style={{
          padding: "6px 10px",
          background: "rgba(168, 85, 247, 0.2)",
          border: "1px solid rgba(168, 85, 247, 0.4)",
          borderRadius: 6,
          color: "#a855f7",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          transition: "all 0.2s"
        }}
        title="智能推荐"
      >
        💡 推荐
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowSimulator(true);
        }}
        style={{
          padding: "6px 10px",
          background: "rgba(245, 158, 11, 0.2)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: 6,
          color: "#f59e0b",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          transition: "all 0.2s"
        }}
        title="数据模拟"
      >
        🎯 模拟
      </button>
    </div>
  );

  // 渲染主标签页切换按钮
  const renderMainTabs = () => (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999,
        display: "flex",
        gap: 8,
        padding: "6px",
        background: "rgba(5, 7, 15, 0.85)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMainTab("visualization");
        }}
        style={{
          padding: "10px 20px",
          background: mainTab === "visualization"
            ? "linear-gradient(135deg, #3b82f6, #2563eb)"
            : "rgba(255,255,255,0.06)",
          color: mainTab === "visualization" ? "#fff" : "#94a3b8",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          transition: "all 0.3s",
        }}
      >
        数据可视化
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMainTab("tools");
        }}
        style={{
          padding: "10px 20px",
          background: mainTab === "tools"
            ? "linear-gradient(135deg, #8b5cf6, #7c3aed)"
            : "rgba(255,255,255,0.06)",
          color: mainTab === "tools" ? "#fff" : "#94a3b8",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          transition: "all 0.3s",
        }}
      >
        智能工具
      </button>
    </div>
  );

  // 渲染视角切换按钮
  const renderViewModeSwitcher = () => (
    <div
      style={{
        position: "absolute",
        top: 70,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999,
        display: "flex",
        gap: 8,
        padding: "6px",
        background: "rgba(5, 7, 15, 0.85)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleViewModeChange("default");
        }}
        style={{
          padding: "8px 16px",
          background: viewMode === "default"
            ? "linear-gradient(135deg, #64748b, #475569)"
            : "rgba(255,255,255,0.06)",
          color: viewMode === "default" ? "#fff" : "#94a3b8",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          transition: "all 0.3s",
        }}
      >
        默认视角
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleViewModeChange("investment");
        }}
        style={{
          padding: "8px 16px",
          background: viewMode === "investment"
            ? "linear-gradient(135deg, #f97316, #ea580c)"
            : "rgba(255,255,255,0.06)",
          color: viewMode === "investment" ? "#fff" : "#94a3b8",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          transition: "all 0.3s",
        }}
      >
        投资视角
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleViewModeChange("research");
        }}
        style={{
          padding: "8px 16px",
          background: viewMode === "research"
            ? "linear-gradient(135deg, #10b981, #059669)"
            : "rgba(255,255,255,0.06)",
          color: viewMode === "research" ? "#fff" : "#94a3b8",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          transition: "all 0.3s",
        }}
      >
        研究视角
      </button>
    </div>
  );

  // 渲染可视化场景切换栏
  const renderVisualizationScenes = () => {
    if (mainTab !== "visualization") return null;
    
    return (
      <div
        style={{
          position: "absolute",
          top: 120,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 998,
          display: "flex",
          gap: 6,
          padding: "6px",
          background: "rgba(5, 7, 15, 0.75)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          backdropFilter: "blur(6px)",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setVisualizationScene("geo");
          }}
          style={{
            padding: "8px 14px",
            background: visualizationScene === "geo"
              ? "rgba(59,130,246,0.3)"
              : "rgba(255,255,255,0.04)",
            color: visualizationScene === "geo" ? "#e2e8f0" : "#94a3b8",
            border: visualizationScene === "geo"
              ? "1px solid rgba(59,130,246,0.6)"
              : "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          地理关联
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setVisualizationScene("trend");
          }}
          style={{
            padding: "8px 14px",
            background: visualizationScene === "trend"
              ? "rgba(139,92,246,0.3)"
              : "rgba(255,255,255,0.04)",
            color: visualizationScene === "trend" ? "#e2e8f0" : "#94a3b8",
            border: visualizationScene === "trend"
              ? "1px solid rgba(139,92,246,0.6)"
              : "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          趋势/对比
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setVisualizationScene("multi");
          }}
          style={{
            padding: "8px 14px",
            background: visualizationScene === "multi"
              ? "rgba(16,185,129,0.3)"
              : "rgba(255,255,255,0.04)",
            color: visualizationScene === "multi" ? "#e2e8f0" : "#94a3b8",
            border: visualizationScene === "multi"
              ? "1px solid rgba(16,185,129,0.6)"
              : "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
        >
          多维度关联
        </button>
      </div>
    );
  };

  // 渲染可视化功能按钮组
  const renderVisualizationButtons = () => {
    if (mainTab !== "visualization") return null;

    const geoButtons = [
      { key: "heatmap", label: "热力图", show: showHeatmap, toggle: setShowHeatmap, color: "#f59e0b" },
      { key: "ring", label: "环图", show: showRing, toggle: setShowRing, color: "#ec4899" },
    ];

    const trendButtons = [
      { key: "policyFlow", label: "政策流量图", show: showPolicyFlow, toggle: setShowPolicyFlow, color: "#8b5cf6" },
      { key: "radar", label: "雷达图", show: showRadar, toggle: setShowRadar, color: "#06b6d4" },
    ];

    const multiButtons = [
      { key: "scatter3d", label: "3D散点图", show: showScatter3D, toggle: setShowScatter3D, color: "#3b82f6" },
      { key: "cluster", label: "聚类图", show: showCluster, toggle: setShowCluster, color: "#10b981" },
      { key: "wordCloud", label: "政策词云", show: showWordCloud, toggle: setShowWordCloud, color: "#f472b6" },
    ];

    const buttons = visualizationScene === "geo" ? geoButtons
      : visualizationScene === "trend" ? trendButtons
      : multiButtons;

    return (
      <div
        style={{
          position: "absolute",
          top: 170,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 998,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          padding: "8px 12px",
          background: "rgba(5, 7, 15, 0.7)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          backdropFilter: "blur(6px)",
          maxWidth: "90%",
        }}
      >
        {buttons.map((btn) => (
          <button
            key={btn.key}
            onClick={(e) => {
              e.stopPropagation();
              btn.toggle(!btn.show);
            }}
            style={{
              padding: "8px 14px",
              background: btn.show
                ? `linear-gradient(135deg, ${btn.color}, ${btn.color}dd)`
                : `rgba(${btn.color === "#3b82f6" ? "59,130,246" : btn.color === "#8b5cf6" ? "139,92,246" : btn.color === "#f59e0b" ? "245,158,11" : btn.color === "#10b981" ? "16,185,129" : btn.color === "#f472b6" ? "244,114,182" : btn.color === "#ec4899" ? "236,72,153" : btn.color === "#06b6d4" ? "6,182,212" : "100,100,100"}, 0.1)`,
              color: "#e2e8f0",
              border: `1px solid ${btn.show ? btn.color : `rgba(255,255,255,0.2)`}`,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              transition: "all 0.3s ease",
              boxShadow: btn.show
                ? `0 4px 12px ${btn.color}40`
                : "0 2px 8px rgba(0,0,0,0.2)",
              minWidth: 90,
            }}
            onMouseEnter={(e) => {
              if (!btn.show) {
                e.currentTarget.style.background = `rgba(${btn.color === "#3b82f6" ? "59,130,246" : btn.color === "#8b5cf6" ? "139,92,246" : btn.color === "#f59e0b" ? "245,158,11" : btn.color === "#10b981" ? "16,185,129" : btn.color === "#f472b6" ? "244,114,182" : btn.color === "#ec4899" ? "236,72,153" : btn.color === "#06b6d4" ? "6,182,212" : "100,100,100"}, 0.2)`;
                e.currentTarget.style.borderColor = btn.color;
              }
            }}
            onMouseLeave={(e) => {
              if (!btn.show) {
                e.currentTarget.style.background = `rgba(${btn.color === "#3b82f6" ? "59,130,246" : btn.color === "#8b5cf6" ? "139,92,246" : btn.color === "#f59e0b" ? "245,158,11" : btn.color === "#10b981" ? "16,185,129" : btn.color === "#f472b6" ? "244,114,182" : btn.color === "#ec4899" ? "236,72,153" : btn.color === "#06b6d4" ? "6,182,212" : "100,100,100"}, 0.1)`;
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }
            }}
          >
            {btn.show ? `关闭${btn.label}` : `显示${btn.label}`}
          </button>
        ))}
      </div>
    );
  };

  // 渲染智能工具卡片
  const renderToolCards = () => {
    if (mainTab !== "tools") return null;

    const tools = [
      {
        key: "prediction",
        title: "AI预测引擎",
        desc: "基于历史数据预测未来房价趋势",
        show: showPrediction,
        toggle: setShowPrediction,
        color: "#14b8a6",
      },
      {
        key: "investment",
        title: "投资决策助手",
        desc: "智能分析投资机会与风险评估",
        show: showInvestment,
        toggle: setShowInvestment,
        color: "#f97316",
      },
      {
        key: "anomaly",
        title: "异常检测系统",
        desc: "识别房价异常波动与潜在风险",
        show: showAnomaly,
        toggle: setShowAnomaly,
        color: "#dc2626",
      },
      {
        key: "insights",
        title: "智能数据洞察",
        desc: "深度挖掘数据背后的规律与趋势",
        show: showInsights,
        toggle: setShowInsights,
        color: "#8b5cf6",
      },
      {
        key: "storyboard",
        title: "数据故事板",
        desc: "交互式时间轴故事线，动画播放历史变化",
        show: showStoryBoard,
        toggle: setShowStoryBoard,
        color: "#06b6d4",
      },
      {
        key: "alert",
        title: "智能预警系统",
        desc: "价格阈值预警、异常波动通知",
        show: showAlertSystem,
        toggle: setShowAlertSystem,
        color: "#ef4444",
      },
      {
        key: "annotation",
        title: "协作标注",
        desc: "地图标注、保存笔记、团队协作",
        show: showAnnotation,
        toggle: setShowAnnotation,
        color: "#22c55e",
      },
      {
        key: "recommendation",
        title: "智能推荐",
        desc: "基于当前视图推荐相关分析",
        show: showRecommendation,
        toggle: setShowRecommendation,
        color: "#a855f7",
      },
      {
        key: "simulator",
        title: "数据模拟",
        desc: "场景模拟器、政策影响分析",
        show: showSimulator,
        toggle: setShowSimulator,
        color: "#f59e0b",
      },
    ];

    return (
      <div
        style={{
          position: "absolute",
          top: 120,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 998,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          padding: "16px",
          background: "rgba(5, 7, 15, 0.75)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          maxWidth: 800,
          width: "90%",
        }}
      >
        {tools.map((tool) => (
          <div
            key={tool.key}
            onClick={(e) => {
              e.stopPropagation();
              tool.toggle(!tool.show);
            }}
            style={{
              padding: "20px",
              background: tool.show
                ? `linear-gradient(135deg, ${tool.color}20, ${tool.color}10)`
                : "rgba(255,255,255,0.04)",
              border: `2px solid ${tool.show ? tool.color : "rgba(255,255,255,0.1)"}`,
              borderRadius: 12,
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: tool.show
                ? `0 4px 16px ${tool.color}30`
                : "0 2px 8px rgba(0,0,0,0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `linear-gradient(135deg, ${tool.color}25, ${tool.color}15)`;
              e.currentTarget.style.borderColor = tool.color;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 6px 20px ${tool.color}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = tool.show
                ? `linear-gradient(135deg, ${tool.color}20, ${tool.color}10)`
                : "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = tool.show ? tool.color : "rgba(255,255,255,0.1)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = tool.show
                ? `0 4px 16px ${tool.color}30`
                : "0 2px 8px rgba(0,0,0,0.2)";
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: tool.show ? tool.color : "#e2e8f0",
                marginBottom: 8,
              }}
            >
              {tool.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                lineHeight: 1.5,
              }}
            >
              {tool.desc}
            </div>
            <div
              style={{
                marginTop: 12,
                padding: "6px 12px",
                background: tool.show ? tool.color : "rgba(255,255,255,0.06)",
                borderRadius: 6,
                fontSize: 12,
                color: tool.show ? "#fff" : "#94a3b8",
                fontWeight: 600,
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              {tool.show ? "已启用" : "点击启用"}
            </div>
          </div>
        ))}
      </div>
    );
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
              onClickFn={onClickFn}
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
            
            {/* 主标签页切换 */}
            {renderMainTabs()}
            
            {/* 新功能快捷入口 */}
            {renderNewFeaturesQuickAccess()}
            
            {/* 视角切换 */}
            {renderViewModeSwitcher()}
            
            {/* 可视化场景切换 */}
            {renderVisualizationScenes()}
            
            {/* 可视化功能按钮 */}
            {renderVisualizationButtons()}
            
            {/* 智能工具卡片 */}
            {renderToolCards()}
            
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
            
            {/* 功能组件 */}
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
            <DataStoryBoard visible={showStoryBoard} onClose={() => setShowStoryBoard(false)} />
            <AlertSystem visible={showAlertSystem} onClose={() => setShowAlertSystem(false)} />
            <MapAnnotation visible={showAnnotation} onClose={() => setShowAnnotation(false)} />
            <RecommendationSystem
              visible={showRecommendation}
              onClose={() => setShowRecommendation(false)}
              currentView={currentView}
              onRecommendationClick={(rec) => {
                const action = { action: rec.action, ...rec.params };
                const event = new CustomEvent('aiAction', { detail: action });
                window.dispatchEvent(event);
              }}
            />
            <DataSimulator visible={showSimulator} onClose={() => setShowSimulator(false)} />
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
