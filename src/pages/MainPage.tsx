import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Map3D, { ProjectionFnParamType } from "../map3d";
import { GeoJsonType } from "../map3d/typed";
import TimeAxis from "../components/TimeAxis";
import RadarChart from "../components/RadarChart";
import SunburstChart from "../components/SunburstChart";
import PriceClusterChart from "../components/PriceClusterChart";
import PricePredictionEngine from "../components/PricePredictionEngine";
import ProvinceHeatmap from "../components/ProvinceHeatmap";
import ColorControlPanel from "../components/ColorControlPanel";
import ParallelCoordinates from "../components/ParallelCoordinates";
import InsightPanel from "../components/InsightPanel";
import AnalysisTooltip from "../components/AnalysisTooltip";
import AdditionalFeaturesPanel from "../components/AdditionalFeaturesPanel";
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
  const [currentYear, setCurrentYear] = useState<string>("2024");
  const [currentMonth, setCurrentMonth] = useState<string>("02");
  
  // 预览时间（悬停时间轴时临时显示）
  const [previewYear, setPreviewYear] = useState<string | null>(null);
  const [previewMonth, setPreviewMonth] = useState<string | null>(null);
  
  // 实际使用的时间（用于图表显示）
  const displayYear = previewYear || currentYear;
  const displayMonth = previewMonth || currentMonth;
  
  // 地图点击选中的省份列表 - 联动核心状态（支持0-5个）
  const [selectedProvinces, setSelectedProvinces] = useState<number[]>([]);
  
  // 交互分析提示状态
  const [tooltip, setTooltip] = useState<{
    message: string;
    position: { x: number; y: number };
    visible: boolean;
  }>({
    message: "",
    position: { x: 0, y: 0 },
    visible: false,
  });

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
    
    // 显示交互分析提示
    if (selectedProvinces.length > 0) {
      const provinceNames = selectedProvinces
        .map((adcode) => {
          const p = (housePriceData as any[]).find((item) => item.adcode === adcode);
          return p?.name;
        })
        .filter(Boolean)
        .join("、");
      
      setTooltip({
        message: `📈 ${year}年${month}月，${provinceNames}的房价数据已更新，折线图显示趋势变化。`,
        position: { x: window.innerWidth / 2, y: 100 },
        visible: true,
      });
    }
  }, [selectedProvinces]);

  // 时间轴悬停预览处理
  const handleTimePreview = useCallback((year: string | null, month: string | null) => {
    setPreviewYear(year);
    setPreviewMonth(month);
    
    // 悬停时显示提示
    if (year && month && selectedProvinces.length > 0) {
      const provinceNames = selectedProvinces
        .map((adcode) => {
          const p = (housePriceData as any[]).find((item) => item.adcode === adcode);
          return p?.name;
        })
        .filter(Boolean)
        .join("、");
      
      setTooltip({
        message: `📊 ${year}年${month}月预览：${provinceNames}的房价数据临时切换，所有图表同步更新。`,
        position: { x: window.innerWidth / 2, y: 100 },
        visible: true,
      });
    }
  }, [selectedProvinces]);

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

  // 单击事件 - 触发联动：选中省份，所有图表同步更新（已在地图组件内部处理多选逻辑）
  const onClickFn = useCallback((customProperties: any) => {
    // 这个回调保留用于兼容，实际多选逻辑在Map3D组件内部处理
  }, []);

  // 省份选择变化回调（优化：使用useCallback避免不必要的重渲染）
  const handleProvinceSelectChange = useCallback((provinces: number[]) => {
    setSelectedProvinces(provinces);
    
    // 显示交互分析提示
    if (provinces.length > 0) {
      const provinceNames = provinces
        .map((adcode) => {
          const p = (housePriceData as any[]).find((item) => item.adcode === adcode);
          return p?.name;
        })
        .filter(Boolean)
        .join("、");
      
      setTooltip({
        message: `🔍 选中${provinceNames}后，雷达图显示多维度特征对比，平行坐标图验证各维度差异。`,
        position: { x: window.innerWidth / 2, y: 100 },
        visible: true,
      });
    }
  }, []);

  // 获取选中省份名称列表（优化：使用useMemo缓存计算结果）
  const selectedProvinceNames = useMemo(() => {
    if (selectedProvinces.length === 0) return null;
    const provinces = (housePriceData as any[]).filter(
      (p) => p.name && p.adcode !== 100000
    );
    return selectedProvinces
      .map((adcode) => provinces.find((p) => p.adcode === adcode)?.name)
      .filter(Boolean)
      .join("、");
  }, [selectedProvinces]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#05070f",
        padding: 12,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 顶部标题栏 */}
      <div
        style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          background: "rgba(5, 7, 15, 0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <h1 style={{ color: "#e2e8f0", margin: 0, fontSize: 20, fontWeight: 700 }}>
          房价数据可视化分析系统
        </h1>
        {selectedProvinceNames && (
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(59,130,246,0.2)",
              border: "1px solid rgba(59,130,246,0.4)",
              borderRadius: 8,
              color: "#3b82f6",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            已选中 ({selectedProvinces.length}/5): {selectedProvinceNames}
      </div>
        )}
        {selectedProvinces.length === 0 && (
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(148,163,184,0.1)",
              border: "1px solid rgba(148,163,184,0.2)",
              borderRadius: 8,
              color: "#94a3b8",
              fontSize: 12,
            }}
          >
            提示：左键点击地图省份进行多选（最多5个），右键取消选中
          </div>
        )}
      </div>

      {/* 主内容区域 - 一屏展示所有图表 */}
    <div
      style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gridTemplateRows: "1fr 1fr",
          gap: 12,
          minHeight: 0,
        }}
      >
        {/* 左上：3D地图（核心视图） */}
      <div
        style={{
            gridColumn: "1 / 2",
            gridRow: "1 / 3",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
            background: "#05070f",
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
                currentYear={displayYear}
                currentMonth={displayMonth}
                showHeatmap={true}
                selectedProvinces={selectedProvinces}
                onProvinceSelectChange={handleProvinceSelectChange}
              />
              {/* 地图标题 */}
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  padding: "8px 16px",
                  background: "rgba(5, 7, 15, 0.85)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#e2e8f0",
                  fontSize: 14,
                  fontWeight: 600,
                  zIndex: 1000,
                }}
              >
                3D地图 - 左键多选省份，右键取消选中
              </div>
              
              {/* 地图任务标签 */}
              <div
                style={{
                  position: "absolute",
                  top: 50,
                  left: 16,
                  padding: "6px 12px",
                  background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  borderRadius: 6,
                  color: "#3b82f6",
                  fontSize: 11,
                  zIndex: 1000,
                }}
              >
                🔹 核心任务：识别房价热点区域
              </div>
              
              {/* 颜色控制悬浮球 */}
              <ColorControlPanel 
                onColorChange={(config) => {
                  // 通过全局函数更新地图颜色
                  if ((window as any).__updateMapColorConfig) {
                    (window as any).__updateMapColorConfig(config);
                  }
                }}
              />
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

        {/* 右上：雷达图 */}
        <div
          style={{
            gridColumn: "2 / 3",
            gridRow: "1 / 2",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(5, 7, 15, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RadarChart
            selectedProvinces={selectedProvinces}
            currentYear={displayYear}
            currentMonth={displayMonth}
            width={500}
            height={280}
          />
        </div>

        {/* 右中：环图 */}
        <div
          style={{
            gridColumn: "2 / 3",
            gridRow: "2 / 3",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(5, 7, 15, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SunburstChart
            selectedProvinces={selectedProvinces}
            currentYear={displayYear}
            width={500}
            height={280}
          />
        </div>
      </div>

      {/* 底部：第二行图表 */}
      <div
        style={{
          height: 300,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 12,
          marginTop: 12,
        }}
      >
        {/* 左下：聚类图 */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(5, 7, 15, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PriceClusterChart
            selectedProvinces={selectedProvinces}
            currentYear={displayYear}
            width={300}
            height={280}
          />
        </div>

        {/* 中下1：预测图 */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(5, 7, 15, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PricePredictionEngine
            selectedProvinces={selectedProvinces}
            currentYear={displayYear}
            currentMonth={displayMonth}
            width={300}
            height={280}
          />
        </div>

        {/* 中下2：热力图 */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(5, 7, 15, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ProvinceHeatmap
            selectedProvinces={selectedProvinces}
            currentYear={displayYear}
            width={300}
            height={280}
          />
        </div>

        {/* 右下：3D散点图 */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "rgba(5, 7, 15, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ParallelCoordinates
            selectedProvinces={selectedProvinces}
            currentYear={displayYear}
            width={300}
            height={280}
            onProvinceHover={(adcode) => {
              // 联动地图高亮
              if ((window as any).__highlightProvinceOnMap) {
                (window as any).__highlightProvinceOnMap(adcode);
              }
            }}
          />
        </div>
      </div>

      {/* 底部时间轴 */}
      <div
        style={{
          height: 140,
          marginTop: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          background: "rgba(5, 7, 15, 0.85)",
          padding: 12,
        }}
      >
        <TimeAxis
          onTimeChange={handleTimeChange}
          onTimePreview={handleTimePreview}
          availableYears={availableYears}
          availableMonths={availableMonths}
        />
      </div>

      {/* 动态洞察面板 */}
      <InsightPanel
        selectedProvinces={selectedProvinces}
        currentYear={displayYear}
        currentMonth={displayMonth}
      />

      {/* 交互分析提示 */}
      <AnalysisTooltip
        message={tooltip.message}
        position={tooltip.position}
        visible={tooltip.visible}
        onClose={() => setTooltip({ ...tooltip, visible: false })}
      />

      {/* 附加功能悬浮球 */}
      <AdditionalFeaturesPanel />
    </div>
  );
}

export default MainPage;
