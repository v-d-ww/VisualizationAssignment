import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import housePriceData from "../data/housePriceData.json";

interface Scatter3DProps {
  visible: boolean;
  onClose?: () => void;
}

type ProvinceData = {
  adcode: number;
  name: string;
  data: Record<string, { average?: number | null }>;
  gdp?: Record<string, number>;
};

function Scatter3D({ visible, onClose }: Scatter3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<{
    name: string;
    year: number;
    gdp: number;
    price: number;
  } | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedPoint(null);
      return;
    }
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070f);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    camera.position.set(150, 150, 150);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建CSS2D渲染器用于标签
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    labelRenderer.domElement.style.pointerEvents = "none";
    const labelContainer = labelContainerRef.current;
    if (labelContainer) {
      labelContainer.appendChild(labelRenderer.domElement);
    }
    labelRendererRef.current = labelRenderer;

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // 准备数据
    const data = housePriceData as ProvinceData[];
    const scatterPoints: Array<{
      year: number;
      gdp: number;
      price: number;
      name: string;
      adcode: number;
    }> = [];

    data.forEach((province) => {
      if (province.adcode === 100000) return; // 跳过全国数据
      if (!province.gdp || !province.data) return;

      Object.keys(province.data).forEach((year) => {
        const yearNum = parseInt(year);
        if (yearNum < 2020 || yearNum > 2024) return;

        const avgPrice = province.data[year]?.average;
        const gdp = province.gdp?.[year];

        if (avgPrice != null && gdp != null && Number.isFinite(avgPrice) && Number.isFinite(gdp)) {
          scatterPoints.push({
            year: yearNum,
            gdp: gdp,
            price: avgPrice,
            name: province.name,
            adcode: province.adcode,
          });
        }
      });
    });

    if (scatterPoints.length === 0) return;

    // 计算数据范围用于归一化
    const years = scatterPoints.map((p) => p.year);
    const gdps = scatterPoints.map((p) => p.gdp);
    const prices = scatterPoints.map((p) => p.price);

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const minGdp = Math.min(...gdps);
    const maxGdp = Math.max(...gdps);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // 归一化函数（映射到 -50 到 50 的范围）
    const normalizeYear = (year: number) => ((year - minYear) / (maxYear - minYear)) * 100 - 50;
    const normalizeGdp = (gdp: number) => ((gdp - minGdp) / (maxGdp - minGdp)) * 100 - 50;
    const normalizePrice = (price: number) => ((price - minPrice) / (maxPrice - minPrice)) * 100 - 50;

    // 创建点几何体
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(scatterPoints.length * 3);
    const colors = new Float32Array(scatterPoints.length * 3);

    scatterPoints.forEach((point, i) => {
      const x = normalizeYear(point.year);
      const y = normalizeGdp(point.gdp);
      const z = normalizePrice(point.price);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 根据年份设置颜色（渐变）
      const yearRatio = (point.year - minYear) / (maxYear - minYear);
      const color = new THREE.Color();
      color.setHSL(0.6 - yearRatio * 0.4, 0.8, 0.5 + yearRatio * 0.3);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // 创建点材质
    const material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    // 创建点云
    const points = new THREE.Points(geometry, material);
    scene.add(points);
    pointsRef.current = points;

    // 创建坐标轴
    const axesHelper = new THREE.AxesHelper(60);
    scene.add(axesHelper);

    // 创建坐标轴标签（使用CSS2DObject）
    const createAxisLabel = (position: THREE.Vector3, label: string, color: string) => {
      const div = document.createElement("div");
      div.className = "axis-label";
      div.textContent = label;
      div.style.color = color;
      div.style.fontSize = "16px";
      div.style.fontWeight = "600";
      div.style.pointerEvents = "none";
      div.style.userSelect = "none";
      const labelObject = new CSS2DObject(div);
      labelObject.position.copy(position);
      return labelObject;
    };

    // 添加坐标轴标签
    scene.add(createAxisLabel(new THREE.Vector3(55, 0, 0), "年份", "#ff4444"));
    scene.add(createAxisLabel(new THREE.Vector3(0, 55, 0), "GDP(亿元)", "#44ff44"));
    scene.add(createAxisLabel(new THREE.Vector3(0, 0, 55), "房价(元/㎡)", "#4444ff"));

    // 添加网格辅助线
    const gridHelper = new THREE.GridHelper(100, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    // 鼠标交互 - 检测点击的点
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(points);

      if (intersects.length > 0 && intersects[0].index !== undefined) {
        renderer.domElement.style.cursor = "pointer";
      } else {
        renderer.domElement.style.cursor = "default";
      }
    };

    const onMouseClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(points);

      if (intersects.length > 0) {
        const index = intersects[0].index;
        if (index !== undefined) {
          const point = scatterPoints[index];
          setSelectedPoint(point);
        }
      } else {
        setSelectedPoint(null);
      }
    };

    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("click", onMouseClick);

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // 窗口大小调整
    const handleResize = () => {
      if (!container || !camera || !renderer || !labelRenderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      labelRenderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // 清理函数
    return () => {
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("click", onMouseClick);
      window.removeEventListener("resize", handleResize);
      if (container && renderer.domElement.parentNode) {
        container.removeChild(renderer.domElement);
      }
      if (labelContainer && labelRenderer.domElement.parentNode) {
        labelContainer.removeChild(labelRenderer.domElement);
      }
      controls.dispose();
      renderer.dispose();
      labelRenderer.domElement.remove();
      geometry.dispose();
      material.dispose();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1000,
          background: "#05070f",
        }}
      />
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 1003,
            width: 36,
            height: 36,
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "50%",
            color: "#e2e8f0",
            fontSize: 20,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.9)";
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(15, 23, 42, 0.9)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="关闭3D散点图"
        >
          ×
        </button>
      )}
      <div
        ref={labelContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1001,
          pointerEvents: "none",
        }}
      />
      {selectedPoint && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 1002,
            padding: "16px 20px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 12,
            color: "#e2e8f0",
            minWidth: 280,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            {selectedPoint.name}
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8 }}>
            年份: <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{selectedPoint.year}</span>
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8 }}>
            GDP:{" "}
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
              {selectedPoint.gdp.toLocaleString()} 亿元
            </span>
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8" }}>
            房价:{" "}
            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
              {selectedPoint.price.toLocaleString()} 元/㎡
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export default Scatter3D;

