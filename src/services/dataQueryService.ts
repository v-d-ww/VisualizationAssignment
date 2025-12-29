import housePriceData from '../data/housePriceData.json';

export interface QueryResult {
  type: 'text' | 'chart' | 'table' | 'action';
  data?: any;
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  message: string;
  actions?: Array<{
    label: string;
    action: string;
    params?: Record<string, any>;
  }>;
}

// 解析自然语言查询
export const parseDataQuery = (query: string): QueryResult | null => {
  const lowerQuery = query.toLowerCase();
  
  // 查询特定省份的房价
  const provinceMatch = lowerQuery.match(/(北京|上海|天津|重庆|河北|山西|内蒙古|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|广西|海南|四川|贵州|云南|西藏|陕西|甘肃|青海|宁夏|新疆)/);
  if (provinceMatch) {
    const provinceName = provinceMatch[1];
    const data = housePriceData as any[];
    const province = data.find(p => p.name === provinceName);
    
    if (province) {
      const years = Object.keys(province.data || {}).sort();
      const prices = years.map(year => ({
        year,
        price: province.data[year]?.average || 0
      }));
      
      return {
        type: 'chart',
        chartType: 'line',
        data: prices,
        message: `已为您查询${provinceName}的房价趋势`,
        actions: [
          { label: '显示热力图', action: 'showHeatmap', params: { province: provinceName } },
          { label: '显示雷达图', action: 'showRadar', params: { province: provinceName } }
        ]
      };
    }
  }
  
  // 查询价格范围
  const priceMatch = lowerQuery.match(/(\d+)\s*万|(\d+)\s*元/);
  if (priceMatch) {
    const price = parseInt(priceMatch[1] || priceMatch[2]) * (priceMatch[1] ? 10000 : 1);
    const data = housePriceData as any[];
    const matches = data.filter(p => {
      const latestYear = Object.keys(p.data || {}).sort().pop();
      if (!latestYear) return false;
      const avgPrice = p.data[latestYear]?.average || 0;
      return avgPrice >= price * 0.9 && avgPrice <= price * 1.1;
    });
    
    return {
      type: 'table',
      data: matches.map(p => ({
        name: p.name,
        price: Object.keys(p.data || {}).sort().pop() ? 
          p.data[Object.keys(p.data || {}).sort().pop()!]?.average : 0
      })),
      message: `找到${matches.length}个价格接近${priceMatch[0]}的地区`,
      actions: []
    };
  }
  
  // 查询涨幅
  if (lowerQuery.includes('涨幅') || lowerQuery.includes('增长') || lowerQuery.includes('上涨')) {
    const data = housePriceData as any[];
    const increases = data.map(p => {
      const years = Object.keys(p.data || {}).sort();
      if (years.length < 2) return null;
      const first = p.data[years[0]]?.average || 0;
      const last = p.data[years[years.length - 1]]?.average || 0;
      if (first === 0) return null;
      return {
        name: p.name,
        increase: ((last - first) / first) * 100,
        firstPrice: first,
        lastPrice: last
      };
    }).filter(Boolean).sort((a: any, b: any) => b.increase - a.increase);
    
    return {
      type: 'chart',
      chartType: 'bar',
      data: increases.slice(0, 10),
      message: `已为您查询涨幅最大的10个地区`,
      actions: []
    };
  }
  
  // 查询对比
  if (lowerQuery.includes('对比') || lowerQuery.includes('比较')) {
    const provinces = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉'];
    const matched = provinces.filter(p => lowerQuery.includes(p));
    
    if (matched.length >= 2) {
      const data = housePriceData as any[];
      const compareData = matched.map(name => {
        const province = data.find(p => p.name === name);
        if (!province) return null;
        const years = Object.keys(province.data || {}).sort();
        return {
          name,
          data: years.map(year => ({
            year,
            price: province.data[year]?.average || 0
          }))
        };
      }).filter(Boolean);
      
      return {
        type: 'chart',
        chartType: 'line',
        data: compareData,
        message: `已为您对比${matched.join('、')}的房价趋势`,
        actions: []
      };
    }
  }
  
  return null;
};

// 获取数据统计摘要
export const getDataSummary = () => {
  const data = housePriceData as any[];
  const provinces = data.filter(p => p.adcode !== 100000);
  
  const prices = provinces.map(p => {
    const years = Object.keys(p.data || {}).sort();
    const latestYear = years[years.length - 1];
    return p.data[latestYear]?.average || 0;
  }).filter(p => p > 0);
  
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  const maxProvince = provinces.find(p => {
    const years = Object.keys(p.data || {}).sort();
    return p.data[years[years.length - 1]]?.average === maxPrice;
  });
  
  return {
    totalProvinces: provinces.length,
    maxPrice,
    minPrice,
    avgPrice,
    maxProvince: maxProvince?.name || '未知',
    dataRange: `${Object.keys(provinces[0]?.data || {}).sort()[0]} - ${Object.keys(provinces[0]?.data || {}).sort().pop()}`
  };
};

