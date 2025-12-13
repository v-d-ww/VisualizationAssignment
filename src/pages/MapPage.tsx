import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Map3D, { ProjectionFnParamType } from "../map3d";
import { GeoJsonType } from "../map3d/typed";

// 地图放大倍率
const MapScale: any = {
  province: 100,
  city: 200,
  district: 300,
};

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
    <>
      {geoJson && (
        <Map3D
          geoJson={geoJson}
          dblClickFn={dblClickFn}
          projectionFnParam={projectionFnParam}
        />
      )}
    </>
  );
}

export default MapPage;

