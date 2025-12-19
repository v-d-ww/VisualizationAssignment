import axios from "axios";
import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Map3D, { ProjectionFnParamType } from "../map3d";
import { GeoJsonType } from "../map3d/typed";
import housePriceData from "../data/housePriceData.json";

// 地图放大倍率
const MapScale: any = {
  province: 100,
  city: 200,
  district: 300,
};

type ProvincePriceRecord = {
  adcode: number;
  name: string;
  data: Record<
    string,
    {
      average?: number | null;
    }
  >;
};

type LinePoint = { year: string; value: number };
type HoverPoint = LinePoint & { cx: number; cy: number };

type SummaryMetric = { label: string; value: string; helper?: string };

function PriceLineChart({
  data,
  width = 720,
  height = 260,
  expand,
}: {
  data: LinePoint[];
  width?: number;
  height?: number;
  expand?: boolean;
}) {
  const [hover, setHover] = useState<HoverPoint | null>(null);

  if (!data.length) return null;

  const margin = expand
    ? { top: 28, right: 28, bottom: 48, left: 72 }
    : { top: 20, right: 20, bottom: 40, left: 60 };

  const x = d3
    .scalePoint()
    .domain(data.map((d) => d.year))
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value) ?? 0])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const line = d3
    .line<LinePoint>()
    .defined((d) => Number.isFinite(d.value))
    .x((d) => x(d.year) ?? 0)
    .y((d) => y(d.value));

  const pathData = line(data) ?? "";

  const handleEnter = (d: LinePoint) => {
    const cx = x(d.year) ?? 0;
    const cy = y(d.value);
    setHover({ ...d, cx, cy });
  };

  const handleLeave = () => setHover(null);

  return (
    <div style={{ position: "relative", width, height }}>
      <svg width={width} height={height}>
        <g>
          {y.ticks(4).map((tick) => (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="#e0e0e0"
                strokeDasharray="4 4"
              />
              <text
                x={margin.left - 10}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                fill="#666"
                fontSize={12}
              >
                {tick.toLocaleString()}
              </text>
            </g>
          ))}
          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={height - margin.bottom}
            y2={height - margin.bottom}
            stroke="#999"
          />
          {data.map((d) => (
            <text
              key={d.year}
              x={x(d.year)}
              y={height - margin.bottom + 18}
              textAnchor="middle"
              fill="#666"
              fontSize={12}
            >
              {d.year}
            </text>
          ))}
        </g>

        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d) => {
          const cx = x(d.year) ?? 0;
          const cy = y(d.value);
          return (
            <circle
              key={d.year}
              cx={cx}
              cy={cy}
              r={4.5}
              fill="#2563eb"
              stroke="#fff"
              strokeWidth={1.5}
              onMouseEnter={() => handleEnter(d)}
              onMouseMove={() => handleEnter(d)}
              onMouseLeave={handleLeave}
            />
          );
        })}
      </svg>

      {hover && (
        <div
          style={{
            position: "absolute",
            left: hover.cx,
            top: hover.cy,
            transform: "translate(-50%, -110%)",
            padding: "6px 10px",
            background: "rgba(15,23,42,0.92)",
            color: "#e2e8f0",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            fontSize: 12,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 8px 18px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontWeight: 700 }}>{hover.year}</div>
          <div>均价：{hover.value.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

function PriceCompareBar({
  provinceName,
  provinceData,
  nationalData,
}: {
  provinceName: string;
  provinceData: LinePoint[];
  nationalData: LinePoint[];
}) {
  const provinceMap = useMemo(
    () => new Map(provinceData.map((p) => [p.year, p.value])),
    [provinceData]
  );
  const nationalMap = useMemo(
    () => new Map(nationalData.map((p) => [p.year, p.value])),
    [nationalData]
  );

  const rows = useMemo(() => {
    const years = provinceData
      .map((p) => p.year)
      .filter((y) => nationalMap.has(y));
    const merged = years.map((year) => ({
      year,
      province: provinceMap.get(year) ?? 0,
      national: nationalMap.get(year) ?? 0,
    }));
    return merged;
  }, [provinceData, nationalMap, provinceMap]);

  if (!rows.length) return null;

  const maxVal =
    d3.max(rows, (r) => Math.max(r.province, r.national)) ?? 1;

  const barWidth = (val: number) =>
    `${Math.max(8, (val / maxVal) * 100)}%`;

  return (
    <div
      style={{
        width: 280,
        minWidth: 240,
        padding: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        background:
          "linear-gradient(145deg, rgba(30,41,59,0.9), rgba(15,23,42,0.85))",
        boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 8,
          color: "#e2e8f0",
        }}
      >
        全国 vs {provinceName}
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
        同年对比（年度平均值）
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.year}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#cbd5e1",
                marginBottom: 4,
              }}
            >
              <span>{row.year}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                全国 {row.national.toLocaleString()}
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "rgba(148,163,184,0.25)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: barWidth(row.national),
                    background: "#38bdf8",
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {provinceName} {row.province.toLocaleString()}
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "rgba(148,163,184,0.25)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: barWidth(row.province),
                    background: "#6366f1",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceSummary({ data }: { data: LinePoint[] }) {
  if (!data.length) return null;

  const formatNumber = d3.format(",.0f");
  const formatPct = (v: number) =>
    Number.isFinite(v) ? `${(v > 0 ? "+" : "")}${v.toFixed(1)}%` : "--";

  const values = data.map((d) => d.value);
  const years = data.map((d) => d.year);

  const minVal = d3.min(values) ?? 0;
  const maxVal = d3.max(values) ?? 0;
  const minYear = years[values.indexOf(minVal)];
  const maxYear = years[values.indexOf(maxVal)];
  const avgVal = d3.mean(values) ?? 0;
  const stdVal = d3.deviation(values) ?? 0;
  const firstVal = values[0];
  const lastVal = values[values.length - 1];
  const changePct = firstVal ? ((lastVal - firstVal) / firstVal) * 100 : NaN;

  const summary: SummaryMetric[] = [
    {
      label: "区间最高",
      value: `${formatNumber(maxVal)}`,
      helper: `年份 ${maxYear}`,
    },
    {
      label: "区间最低",
      value: `${formatNumber(minVal)}`,
      helper: `年份 ${minYear}`,
    },
    {
      label: "区间均值",
      value: formatNumber(avgVal),
      helper: "取所有年份平均",
    },
    {
      label: "波动（标准差）",
      value: formatNumber(stdVal),
      helper: "衡量波动程度",
    },
    {
      label: "区间涨跌幅",
      value: formatPct(changePct),
      helper: `${years[0]} → ${years[years.length - 1]}`,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        marginTop: 12,
      }}
    >
      {summary.map((item) => (
        <div
          key={item.label}
          style={{
            padding: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(15,23,42,0.7))",
          }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
            {item.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>
            {item.value}
          </div>
          {item.helper && (
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              {item.helper}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MapPage() {
  const { adcode } = useParams<{ adcode: string }>();
  const navigate = useNavigate();
  const [geoJson, setGeoJson] = useState<GeoJsonType>();
  const [projectionFnParam, setProjectionFnParam] =
    useState<ProjectionFnParamType>({
      center: [104.0, 37.5],
      scale: 40,
    });

  // 从路由参数获取 adcode，默认为 100000（中国）
  const mapAdCode = adcode ? parseInt(adcode) : 100000;

  // 省份房价数据（按年份平均值）
  const provincePriceTrend = useMemo(() => {
    const list = housePriceData as ProvincePriceRecord[];
    const matched = list.find((item) => item.adcode === mapAdCode);
    if (!matched || !matched.data) return { name: "", points: [] as LinePoint[] };

    const points = Object.keys(matched.data)
      .sort()
      .map((year) => {
        const avg = matched.data[year]?.average;
        if (avg == null) return null;
        return { year, value: avg };
      })
      .filter(Boolean) as LinePoint[];

    return { name: matched.name, points };
  }, [mapAdCode]);

  // 全国房价数据（按年份平均值）
  const nationalPriceTrend = useMemo(() => {
    const list = housePriceData as ProvincePriceRecord[];
    const matched = list.find((item) => item.adcode === 100000);
    if (!matched || !matched.data) return { name: "全国", points: [] as LinePoint[] };

    const points = Object.keys(matched.data)
      .sort()
      .map((year) => {
        const avg = matched.data[year]?.average;
        if (avg == null) return null;
        return { year, value: avg };
      })
      .filter(Boolean) as LinePoint[];

    return { name: matched.name, points };
  }, []);

  // 请求地图数据
  const queryMapData = useCallback(async (code: number) => {
    const response = await axios.get(
      `https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`
    );
    const { data } = response;
    setGeoJson(data);

    // 从数据中找到匹配的 feature（如果当前 code 是某个子区域的 adcode）
    // 或者使用第一个 feature 的中心点作为默认中心
    const targetFeature = data?.features?.find(
      (feature: any) => feature.properties.adcode === code
    ) || data?.features?.[0];

    if (targetFeature?.properties?.centroid) {
      const centroid = targetFeature.properties.centroid;
      const level = targetFeature.properties.level || 'province';
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
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#05070f",
        color: "#e2e8f0",
        padding: 12,
        boxSizing: "border-box",
        gap: 12,
      }}
    >
      <div
        style={{
          flex: "1 1 0",
          minHeight: "80vh",
          width: "100%",
          background: "#05070f",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {geoJson ? (
          <Map3D
            geoJson={geoJson}
            dblClickFn={dblClickFn}
            projectionFnParam={projectionFnParam}
          />
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

      {mapAdCode !== 100000 && provincePriceTrend.points.length > 0 && (
        <div
          style={{
            padding: 16,
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {provincePriceTrend.name} 房价平均值趋势（年份）
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              数据来源：国家统计局
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 320px",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                minHeight: 320,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(15,23,42,0.5))",
              }}
            >
              <PriceLineChart
                data={provincePriceTrend.points}
                width={window.innerWidth > 1024 ? 900 : 700}
                height={340}
                expand
              />
              <div style={{ marginTop: 12 }}>
                <PriceSummary data={provincePriceTrend.points} />
              </div>
            </div>
            <PriceCompareBar
              provinceName={provincePriceTrend.name}
              provinceData={provincePriceTrend.points}
              nationalData={nationalPriceTrend.points}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default MapPage;

