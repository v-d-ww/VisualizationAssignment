import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Map3D, { ProjectionFnParamType } from "../map3d";
import { GeoJsonType } from "../map3d/typed";
import TimeAxis from "../components/TimeAxis";
import AIChat from "../components/AIChat";
import CalculatorPanel from "../components/CalculatorPanel";
import Scatter3D from "../components/Scatter3D";
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
            />
            <TimeAxis
              onTimeChange={handleTimeChange}
              availableYears={availableYears}
              availableMonths={availableMonths}
            />
            <AIChat />
            <button
              onClick={() => setShowScatter3D(!showScatter3D)}
              style={{
                position: "absolute",
                top: 450,
                right: 10,
                zIndex: 998,
                padding: "10px 20px",
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
              }}
              onMouseEnter={(e) => {
                if (!showScatter3D) {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                  e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                if (!showScatter3D) {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
                }
              }}
            >
              {showScatter3D ? "关闭3D散点图" : "显示3D散点图"}
            </button>
            <Scatter3D visible={showScatter3D} onClose={() => setShowScatter3D(false)} />
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