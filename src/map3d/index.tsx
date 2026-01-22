import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import ToolTip from "../tooltip";
import {
  drawLineBetween2Spot,
  generateMapLabel2D,
  generateMapObject3D,
  generateMapSpot,
  getDynamicMapScale,
} from "./drawFunc";
import { GeoJsonType } from "./typed";
import gsap from "gsap";

import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

import { drawRadar, radarData, RadarOption } from "./radar";
import { initScene } from "./scene";
import { mapConfig } from "./mapConfig";
import { initCamera } from "./camera";

export type ProjectionFnParamType = {
  center: [number, number];
  scale: number;
};

interface Props {
  geoJson: GeoJsonType;
  dblClickFn: (customProperties: any) => void;
  onClickFn?: (customProperties: any) => void;
  projectionFnParam: ProjectionFnParamType;
  housePriceData?: any[];
  currentYear?: string;
  currentMonth?: string;
  showHeatmap?: boolean;
  selectedProvinces?: number[]; // 选中的省份列表
  onProvinceSelectChange?: (provinces: number[]) => void; // 省份选择变化回调
  onColorConfigChange?: (config: {
    mapColor: string;
    mapHoverColor: string;
    mapSideColor1: string;
    mapSideColor2: string;
    topLineColor: string;
  }) => void; // 颜色配置变化回调（用于ColorControlPanel）
}

let lastPick: any = null;

function Map3D(props: Props) {
  const { geoJson, dblClickFn, onClickFn, projectionFnParam, housePriceData, currentYear, currentMonth, showHeatmap = false, selectedProvinces = [], onProvinceSelectChange, onColorConfigChange } = props;
  const mapRef = useRef<any>();
  const map2dRef = useRef<any>();
  const toolTipRef = useRef<any>();
  const mapObject3DRef = useRef<any>(null);

  const [toolTipData, setToolTipData] = useState<any>({
    text: "",
  });

  const getPriceByTime = useCallback((adcode: number, year: string, month: string) => {
    if (!housePriceData) return null;
    const province = housePriceData.find((item: any) => item.adcode === adcode);
    if (!province || !province.data || !province.data[year]) return null;
    return province.data[year][month] || null;
  }, [housePriceData]);

  // 获取年份平均房价
  const getYearAveragePrice = useCallback((adcode: number, year: string) => {
    if (!housePriceData) return null;
    const province = housePriceData.find((item: any) => item.adcode === adcode);
    if (!province || !province.data || !province.data[year]) return null;
    return province.data[year].average || null;
  }, [housePriceData]);

  // 热力图颜色映射：从冷色（蓝）到热色（红）
  const getHeatmapColor = useCallback((price: number | null, maxPrice: number, minPrice: number) => {
    if (price === null) return "#06092A";
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    
    // 使用 HSL 颜色空间，从蓝色(240度)渐变到红色(0度)
    // H: 240 -> 0 (蓝 -> 青 -> 绿 -> 黄 -> 红)
    // S: 0.8 -> 1.0 (饱和度逐渐增加)
    // L: 0.35 -> 0.55 (亮度逐渐增加)
    const hue = 240 * (1 - ratio); // 从240度(蓝)到0度(红)
    const saturation = 0.8 + ratio * 0.2; // 0.8到1.0
    const lightness = 0.35 + ratio * 0.2; // 0.35到0.55
    
    const color = new THREE.Color();
    color.setHSL(hue / 360, saturation, lightness);
    return `#${color.getHexString()}`;
  }, []);

  // 普通颜色映射（原有逻辑）
  const getPriceColor = useCallback((price: number | null, maxPrice: number, minPrice: number) => {
    if (price === null) return "#06092A";
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    if (ratio < 0.25) return "#132354";
    if (ratio < 0.5) return "#0B388A";
    if (ratio < 0.75) return "#1E6BF8";
    return "#42A0F9";
  }, []);

  // 更新选中省份的高亮显示
  const updateSelectedProvincesHighlight = useCallback(() => {
    if (!mapObject3DRef.current) return;
    
    mapObject3DRef.current.traverse((obj: any) => {
      if (obj.material && obj.material[0] && obj.userData.isChangeColor && obj.parent && obj.parent.customProperties) {
        const adcode = obj.parent.customProperties.adcode;
        const isSelected = selectedProvinces.includes(adcode);
        
        if (isSelected) {
          // 选中状态：金色描边 + 半透明白色填充
          obj.material[0].emissive.setHex(0xffd700); // 金色
          obj.material[0].emissiveIntensity = 0.5;
          obj.material[0].opacity = 0.9;
          // 保存原始颜色
          if (!obj.userData.originalColor) {
            obj.userData.originalColor = obj.material[0].color.clone();
          }
        } else {
          // 恢复原始颜色
          if (obj.userData.originalColor) {
            obj.material[0].color.copy(obj.userData.originalColor);
          }
          obj.material[0].emissive.setHex(0x000000);
          obj.material[0].emissiveIntensity = 0;
          obj.material[0].opacity = mapConfig.mapOpacity;
        }
      }
    });
  }, [selectedProvinces]);

  const updateMapColors = useCallback(() => {
    if (!mapObject3DRef.current || !currentYear || !housePriceData) return;
    if (!showHeatmap && !currentMonth) return;

    const prices: number[] = [];
    
    // 收集所有省份的价格数据
    mapObject3DRef.current.traverse((obj: any) => {
      if (obj.userData.isChangeColor && obj.parent && obj.parent.customProperties) {
        const adcode = obj.parent.customProperties.adcode;
        if (adcode) {
          let price: number | null = null;
          if (showHeatmap) {
            // 热力图模式：使用年份平均值
            price = getYearAveragePrice(adcode, currentYear);
          } else {
            // 普通模式：使用当前月份数据
            price = getPriceByTime(adcode, currentYear, currentMonth || "");
          }
          if (price !== null) {
            prices.push(price);
          }
        }
      }
    });

    if (prices.length === 0) return;

    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);

    // 更新地图颜色
    mapObject3DRef.current.traverse((obj: any) => {
      if (obj.material && obj.material[0] && obj.userData.isChangeColor && obj.parent && obj.parent.customProperties) {
        const adcode = obj.parent.customProperties.adcode;
        let price: number | null = null;
        if (showHeatmap) {
          price = getYearAveragePrice(adcode, currentYear);
        } else {
          price = getPriceByTime(adcode, currentYear, currentMonth || "");
        }
        
        const color = showHeatmap 
          ? getHeatmapColor(price, maxPrice, minPrice)
          : getPriceColor(price, maxPrice, minPrice);
        obj.material[0].color.set(color);
        obj.userData.priceColor = color;
        // 保存原始颜色（如果还没有保存）
        if (!obj.userData.originalColor) {
          obj.userData.originalColor = obj.material[0].color.clone();
        }
      }
    });
  }, [currentYear, currentMonth, housePriceData, showHeatmap, getPriceByTime, getYearAveragePrice, getPriceColor, getHeatmapColor]);

  useEffect(() => {
    updateMapColors();
  }, [updateMapColors]);

  // 监听选中省份变化，更新高亮
  useEffect(() => {
    if (mapObject3DRef.current) {
      updateSelectedProvincesHighlight();
    }
  }, [selectedProvinces, updateSelectedProvincesHighlight]);

  useEffect(() => {
    const currentDom = mapRef.current;
    if (!currentDom) return;
    const ratio = {
      value: 0,
    };

    /**
     * 初始化场景
     */
    const scene = initScene();

    /**
     * 初始化摄像机
     */
    const { camera, cameraHelper } = initCamera(currentDom);

    /**
     * 初始化渲染器
     */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentDom.clientWidth, currentDom.clientHeight);
    // 防止开发时重复渲染
    // if (!currentDom.hasChildNodes()) {
    //   currentDom.appendChild(renderer.domElement);
    // }
    // 这里修改为下面写法，否则 onresize 不生效
    if (currentDom.childNodes[0]) {
      currentDom.removeChild(currentDom.childNodes[0]);
    }
    currentDom.appendChild(renderer.domElement);

    /**
     * 创建css2 Renderer 渲染器
     */
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(currentDom.clientWidth, currentDom.clientHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    const labelRendererDom = map2dRef.current;
    if (labelRendererDom?.childNodes[0]) {
      labelRendererDom.removeChild(labelRendererDom.childNodes[0]);
    }
    labelRendererDom.appendChild(labelRenderer.domElement);

    /**
     * 初始化模型（绘制3D模型）
     */
    const { mapObject3D, label2dData } = generateMapObject3D(
      geoJson,
      projectionFnParam
    );
    mapObject3DRef.current = mapObject3D;
    scene.add(mapObject3D);

    // 暴露悬停高亮函数给平行坐标图（通过全局函数）
    (window as any).__highlightProvinceOnMap = (adcode: number | null) => {
      if (!mapObject3DRef.current) return;
      
      mapObject3DRef.current.traverse((obj: any) => {
        if (obj.material && obj.material[0] && obj.userData.isChangeColor && obj.parent && obj.parent.customProperties) {
          const provinceAdcode = obj.parent.customProperties.adcode;
          const isSelected = selectedProvinces?.includes(provinceAdcode);
          const isHovered = adcode === provinceAdcode;
          
          if (isHovered && !isSelected) {
            // 悬停高亮（临时）
            obj.material[0].emissive.setHex(0x00ff00); // 绿色
            obj.material[0].emissiveIntensity = 0.3;
            obj.material[0].opacity = 0.85;
          } else if (!isSelected) {
            // 恢复原始颜色
            if (obj.userData.originalColor) {
              obj.material[0].color.copy(obj.userData.originalColor);
            }
            obj.material[0].emissive.setHex(0x000000);
            obj.material[0].emissiveIntensity = 0;
            obj.material[0].opacity = mapConfig.mapOpacity;
          }
        }
      });
    };

    // 暴露颜色更新函数给ColorControlPanel（通过全局函数）
    (window as any).__updateMapColorConfig = (config: {
      mapColor: string;
      mapHoverColor: string;
      mapSideColor1: string;
      mapSideColor2: string;
      topLineColor: string;
    }) => {
      mapConfig.mapColor = config.mapColor;
      mapConfig.mapHoverColor = config.mapHoverColor;
      mapConfig.mapSideColor1 = config.mapSideColor1;
      mapConfig.mapSideColor2 = config.mapSideColor2;
      mapConfig.topLineColor = parseInt(config.topLineColor.replace("#", ""), 16);
      
      // 更新地图颜色
      mapObject3D.traverse((obj: any) => {
        if (obj.material && obj.material[0] && obj.userData.isChangeColor) {
          // 如果省份已选中，保持高亮；否则更新为新的基础颜色
          const adcode = obj.parent?.customProperties?.adcode;
          const isSelected = selectedProvinces?.includes(adcode);
          if (!isSelected) {
            obj.material[0].color.set(config.mapColor);
            obj.userData.priceColor = config.mapColor;
            if (!obj.userData.originalColor) {
              obj.userData.originalColor = obj.material[0].color.clone();
            }
          }
        }
        if (obj.material && obj.material[1] && obj.material[1].uniforms) {
          if (obj.material[1].uniforms.color1) {
            obj.material[1].uniforms.color1.value.set(config.mapSideColor1);
          }
          if (obj.material[1].uniforms.color2) {
            obj.material[1].uniforms.color2.value.set(config.mapSideColor2);
          }
        }
        if (obj.type === "Line2" && obj.material) {
          obj.material.color.set(config.topLineColor);
        }
      });
    };

    /**
     * 动态地图缩放大小
     */
    const mapScale = getDynamicMapScale(mapObject3D, currentDom);

    /**
     * 绘制 2D 面板
     */
    const labelObject2D = generateMapLabel2D(label2dData);
    mapObject3D.add(labelObject2D);

    /**
     * 绘制点位
     */
    const { spotList, spotObject3D } = generateMapSpot(label2dData);
    mapObject3D.add(spotObject3D);

    // Models
    // coneUncompression.glb 是压缩过的模型，需要用dracoLoader加载
    // cone.glb 是未压缩，用 gltfLoader 加载即可

    const modelObject3D = new THREE.Object3D();
    // let mixer: any = null;
    let modelMixer: any = [];
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    loader.setDRACOLoader(dracoLoader);

    // loader.load("/models/coneUncompression.glb", (glb) => {
    loader.load("/models/cone.glb", (glb) => {
      label2dData.forEach((item: any) => {
        // console.log(item, "0-0-0-");
        const { featureCenterCoord } = item;
        const clonedModel = glb.scene.clone();
        const mixer = new THREE.AnimationMixer(clonedModel);
        const clonedAnimations = glb.animations.map((clip) => {
          return clip.clone();
        });
        clonedAnimations.forEach((clip) => {
          mixer.clipAction(clip).play();
        });

        // 添加每个model的mixer
        modelMixer.push(mixer);

        // 设置模型位置
        clonedModel.position.set(
          featureCenterCoord[0],
          -featureCenterCoord[1],
          mapConfig.spotZIndex
        );
        // 设置模型大小
        clonedModel.scale.set(0.3, 0.3, 0.6);
        // clonedModel.rotateX(-Math.PI / 8);
        modelObject3D.add(clonedModel);
      });

      mapObject3D.add(modelObject3D);
    });

    /**
     * 绘制连线（随机生成两个点位）
     */
    const MAX_LINE_COUNT = 5; // 随机生成5组线
    let connectLine: any[] = [];
    for (let count = 0; count < MAX_LINE_COUNT; count++) {
      const midIndex = Math.floor(label2dData.length / 2);
      const indexStart = Math.floor(Math.random() * midIndex);
      const indexEnd = Math.floor(Math.random() * midIndex) + midIndex - 1;
      connectLine.push({
        indexStart,
        indexEnd,
      });
    }

    /**
     * 绘制飞行的点
     */
    const flyObject3D = new THREE.Object3D();
    const flySpotList: any = [];
    connectLine.forEach((item: any) => {
      const { indexStart, indexEnd } = item;
      const { flyLine, flySpot } = drawLineBetween2Spot(
        label2dData[indexStart].featureCenterCoord,
        label2dData[indexEnd].featureCenterCoord
      );
      flyObject3D.add(flyLine);
      flyObject3D.add(flySpot);
      flySpotList.push(flySpot);
    });
    mapObject3D.add(flyObject3D);

    /**
     * 绘制雷达
     */
    radarData.forEach((item: RadarOption) => {
      const planeMesh = drawRadar(item, ratio);
      scene.add(planeMesh);
    });

    /**
     * 初始化 CameraHelper
     */
    scene.add(cameraHelper);

    /**
     * 初始化 AxesHelper
     */
    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

    /**
     * 初始化控制器
     */
    // new OrbitControls(camera, renderer.domElement);
    new OrbitControls(camera, labelRenderer.domElement);

    /**
     * 新增光源
     */
    const light = new THREE.PointLight(0xffffff, 1.5);
    light.position.set(0, -5, 30);
    scene.add(light);

    // 光源辅助线
    const lightHelper = new THREE.PointLightHelper(light);
    scene.add(lightHelper);

    // 视窗伸缩
    const onResizeEvent = () => {
      // 更新摄像头
      camera.aspect = currentDom.clientWidth / currentDom.clientHeight;
      // 更新摄像机的投影矩阵
      camera.updateProjectionMatrix();
      // 更新渲染器
      renderer.setSize(currentDom.clientWidth, currentDom.clientHeight);
      labelRenderer.setSize(currentDom.clientWidth, currentDom.clientHeight);
      // 设置渲染器的像素比例
      renderer.setPixelRatio(window.devicePixelRatio);
    };

    /**
     * 设置 raycaster
     */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // 鼠标移入事件
    const onMouseMoveEvent = (e: MouseEvent) => {
      const intersects = raycaster.intersectObjects(scene.children);
      pointer.x = (e.clientX / currentDom.clientWidth) * 2 - 1;
      pointer.y = -(e.clientY / currentDom.clientHeight) * 2 + 1;

      if (lastPick) {
        const originalColor = lastPick.object.userData.priceColor || mapConfig.mapColor;
        lastPick.object.material[0].color.set(originalColor);
        lastPick.object.material[0].opacity = mapConfig.mapOpacity;
      }
      lastPick = null;
      // lastPick = intersects.find(
      //   (item: any) => item.object.material && item.object.material.length === 2
      // );
      // 优化
      lastPick = intersects.find(
        (item: any) => item.object.userData.isChangeColor
      );

      if (lastPick) {
        const properties = lastPick.object.parent.customProperties;
        if (lastPick.object.material[0]) {
          lastPick.object.material[0].color.set(mapConfig.mapHoverColor);
          lastPick.object.material[0].opacity = 1;
        }

        if (toolTipRef.current && toolTipRef.current.style) {
          toolTipRef.current.style.left = e.clientX + 2 + "px";
          toolTipRef.current.style.top = e.clientY + 2 + "px";
          toolTipRef.current.style.visibility = "visible";
        }

        let price: number | null = null;
        let priceText = "房价: 暂无数据";
        if (showHeatmap) {
          price = getYearAveragePrice(properties.adcode, currentYear || "");
          priceText = price !== null ? `房价: ${price.toFixed(2)} 元/㎡ (${currentYear}年平均)` : "房价: 暂无数据";
        } else {
          price = getPriceByTime(properties.adcode, currentYear || "", currentMonth || "");
          priceText = price !== null ? `房价: ${price.toFixed(2)} 元/㎡` : "房价: 暂无数据";
        }
        setToolTipData({
          text: `${properties.name}\n${priceText}`,
        });
      } else {
        toolTipRef.current.style.visibility = "hidden";
      }
    };


    // 鼠标单击事件 - 支持多选（优化点击精度）
    let clickTimer: ReturnType<typeof setTimeout> | null = null;
    const onClickEvent = (e: MouseEvent) => {
      // 检查点击目标是否是按钮或其他UI元素
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || 
          target.closest('button') || 
          target.closest('[role="button"]') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('textarea') ||
          target.closest('a') ||
          target.closest('svg')) { // 排除SVG元素（图表）
        return;
      }
      
      // 检查点击目标是否是地图容器或其子元素
      if (!currentDom.contains(target) && !map2dRef.current?.contains(target)) {
        return;
      }
      
      // 更新射线投射器
      pointer.x = (e.clientX / currentDom.clientWidth) * 2 - 1;
      pointer.y = -(e.clientY / currentDom.clientHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      
      // 获取所有相交对象，按距离排序，选择最近的
      const intersects = raycaster.intersectObjects(scene.children, true);
      const mapTarget = intersects.find(
        (item: any) => item.object.userData.isChangeColor
      );
      
      if (mapTarget) {
        const obj: any = mapTarget.object.parent;
        if (!obj || !obj.customProperties) return;
        
        const p = obj.customProperties;
        const adcode = p.adcode;
        
        // 延迟执行，避免与双击冲突
        clickTimer = setTimeout(() => {
          if (onProvinceSelectChange) {
            // 多选逻辑：左键点击切换选中状态
            let newSelected: number[];
            if (selectedProvinces.includes(adcode)) {
              // 已选中，取消选中
              newSelected = selectedProvinces.filter(id => id !== adcode);
            } else {
              // 未选中，添加到选中列表（最多5个）
              if (selectedProvinces.length < 5) {
                newSelected = [...selectedProvinces, adcode];
              } else {
                newSelected = selectedProvinces; // 已达到上限
              }
            }
            onProvinceSelectChange(newSelected);
          }
          
          // 保留原有的onClickFn回调
          if (onClickFn) {
            onClickFn(p);
          }
        }, 200);
      }
    };

    // 鼠标右键事件 - 取消选中
    const onContextMenuEvent = (e: MouseEvent) => {
      e.preventDefault(); // 阻止默认右键菜单
      
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || 
          target.closest('button') || 
          target.closest('[role="button"]')) {
        return;
      }
      
      if (!currentDom.contains(target) && !map2dRef.current?.contains(target)) {
        return;
      }
      
      const intersects = raycaster.intersectObjects(scene.children);
      const mapTarget = intersects.find(
        (item: any) => item.object.userData.isChangeColor
      );
      
      if (mapTarget && onProvinceSelectChange) {
        const obj: any = mapTarget.object.parent;
        const p = obj.customProperties;
        const adcode = p.adcode;
        
        // 右键取消选中
        const newSelected = selectedProvinces.filter(id => id !== adcode);
        onProvinceSelectChange(newSelected);
      }
    };

    // 鼠标双击事件
    const onDblclickEvent = () => {
      // 清除单击定时器
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      const intersects = raycaster.intersectObjects(scene.children);
      const target = intersects.find(
        (item: any) => item.object.userData.isChangeColor
      );
      if (target) {
        const obj: any = target.object.parent;
        const p = obj.customProperties;
        dblClickFn(p);
      }
    };

    /**
     * 动画
     */
    gsap.to(mapObject3D.scale, { x: mapScale, y: mapScale, z: 1, duration: 1 });

    /**
     * Animate
     */
    const clock = new THREE.Clock();
    let previousTime = 0;
    const animate = function () {
      // const elapsedTime = clock.getElapsedTime();
      // const deltaTime = elapsedTime - previousTime;
      // previousTime = elapsedTime;

      // Update mixer
      // mixer?.update(deltaTime);
      const delta = clock.getDelta();
      modelMixer.map((item: any) => item.update(delta));

      // 雷达
      ratio.value += 0.01;

      requestAnimationFrame(animate);
      // 通过摄像机和鼠标位置更新射线
      raycaster.setFromCamera(pointer, camera);
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);

      // 圆环
      spotList.forEach((mesh: any) => {
        mesh._s += 0.01;
        mesh.scale.set(1 * mesh._s, 1 * mesh._s, 1 * mesh._s);
        if (mesh._s <= 2) {
          mesh.material.opacity = 2 - mesh._s;
        } else {
          mesh._s = 1;
        }
      });

      // 飞行的圆点
      flySpotList.forEach(function (mesh: any) {
        mesh._s += 0.003;
        let tankPosition = new THREE.Vector3();
        // getPointAt() 根据弧长在曲线上的位置。必须在范围[0，1]内。
        tankPosition = mesh.curve.getPointAt(mesh._s % 1);
        mesh.position.set(tankPosition.x, tankPosition.y, tankPosition.z);
      });
    };
    animate();

    window.addEventListener("resize", onResizeEvent, false);
    window.addEventListener("mousemove", onMouseMoveEvent, false);
    window.addEventListener("click", onClickEvent, false);
    window.addEventListener("dblclick", onDblclickEvent, false);
    window.addEventListener("contextmenu", onContextMenuEvent, false);

    // dat.GUI 已移除，颜色设置功能移至悬浮球按钮（ColorControlPanel组件）

    if (mapObject3DRef.current && currentYear && housePriceData) {
      setTimeout(() => {
        updateMapColors();
        updateSelectedProvincesHighlight();
      }, 100);
    }

    return () => {
      window.removeEventListener("resize", onResizeEvent);
      window.removeEventListener("mousemove", onMouseMoveEvent);
      window.removeEventListener("click", onClickEvent);
      window.removeEventListener("dblclick", onDblclickEvent);
      window.removeEventListener("contextmenu", onContextMenuEvent);
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
    };
  }, [geoJson, currentYear, currentMonth, housePriceData, showHeatmap, updateMapColors, selectedProvinces, onProvinceSelectChange, updateSelectedProvincesHighlight, onClickFn, dblClickFn, projectionFnParam]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div ref={map2dRef} />
      <div ref={mapRef} style={{ width: "100%", height: "100%" }}></div>
      <ToolTip innterRef={toolTipRef} data={toolTipData}></ToolTip>
    </div>
  );
}

export default Map3D;
