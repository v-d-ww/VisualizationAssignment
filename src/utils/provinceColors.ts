// 省份颜色映射工具 - 统一所有图表的颜色编码
// 确保同一省份在所有图表中使用相同的颜色

import housePriceData from "../data/housePriceData.json";

type ProvinceRecord = {
  adcode: number;
  name: string;
};

// 预定义的颜色方案（最多支持5个省份）
export const PROVINCE_COLORS = [
  { 
    primary: "#3b82f6", // 蓝色
    light: "rgba(59,130,246,0.3)",
    dark: "#2563eb"
  },
  { 
    primary: "#22c55e", // 绿色
    light: "rgba(34,197,94,0.3)",
    dark: "#16a34a"
  },
  { 
    primary: "#f59e0b", // 橙色
    light: "rgba(245,158,11,0.3)",
    dark: "#d97706"
  },
  { 
    primary: "#ef4444", // 红色
    light: "rgba(239,68,68,0.3)",
    dark: "#dc2626"
  },
  { 
    primary: "#a855f7", // 紫色
    light: "rgba(168,85,247,0.3)",
    dark: "#9333ea"
  },
];

/**
 * 根据省份adcode获取对应的颜色
 * @param adcode 省份adcode
 * @param selectedProvinces 选中的省份列表（按顺序）
 * @returns 颜色配置对象
 */
export function getProvinceColor(
  adcode: number,
  selectedProvinces: number[]
): { primary: string; light: string; dark: string } {
  const index = selectedProvinces.indexOf(adcode);
  if (index === -1 || index >= PROVINCE_COLORS.length) {
    // 如果不在选中列表中，返回默认灰色
    return {
      primary: "#94a3b8",
      light: "rgba(148,163,184,0.2)",
      dark: "#64748b"
    };
  }
  return PROVINCE_COLORS[index];
}

/**
 * 获取省份名称
 */
export function getProvinceName(adcode: number): string {
  const data = housePriceData as ProvinceRecord[];
  const province = data.find((p) => p.adcode === adcode);
  return province?.name || "未知省份";
}

/**
 * 创建颜色映射对象（用于快速查找）
 */
export function createColorMap(selectedProvinces: number[]): Map<number, { primary: string; light: string; dark: string }> {
  const colorMap = new Map();
  selectedProvinces.forEach((adcode, index) => {
    if (index < PROVINCE_COLORS.length) {
      colorMap.set(adcode, PROVINCE_COLORS[index]);
    }
  });
  return colorMap;
}

