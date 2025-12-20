import axios from 'axios';
import housePriceData from '../data/housePriceData.json';

export const callAIAPI = async (question: string): Promise<{ answer: string; requestId: string }> => {
  const dataSummary = generateDataSummary();
  
  // 使用本地代理服务器避免CORS问题
  const PROXY_URL = process.env.REACT_APP_PROXY_URL || 'http://localhost:3001';
  
  try {
    const response = await axios.post(
      `${PROXY_URL}/api/chat`,
      {
        question,
        dataSummary
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const requestId = response.data.requestId || 'N/A';
    console.log('AI API调用成功 - Request ID:', requestId);
    
    return {
      answer: response.data.answer || '抱歉，无法获取回答。',
      requestId: requestId
    };
  } catch (error: any) {
    console.error('AI API调用错误:', error);
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('无法连接到代理服务器。请确保已启动代理服务器：npm run server');
    } else if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401) {
        throw new Error('API密钥无效，请检查.env文件中的REACT_APP_AI_API_KEY配置');
      } else if (status === 429) {
        throw new Error('API请求频率过高，请稍后再试');
      } else if (status === 403) {
        throw new Error('API访问被拒绝，请检查API密钥权限或账户余额');
      } else {
        throw new Error(data?.error || `请求失败 (状态码: ${status})`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('请求超时，请检查网络连接');
    } else {
      throw new Error(error.message || '调用失败，请检查网络连接');
    }
  }
};

const generateDataSummary = (): string => {
  const data = housePriceData as any[];
  const summary: string[] = [];

  data.forEach((item) => {
    const { name, data: yearData } = item;
    if (!yearData) return;

    const years = Object.keys(yearData).sort();
    const priceRanges: string[] = [];

    years.forEach((year) => {
      const yearInfo = yearData[year];
      if (yearInfo?.average) {
        priceRanges.push(`${year}年: ${yearInfo.average.toFixed(2)}元/㎡`);
      }
    });

    if (priceRanges.length > 0) {
      summary.push(`${name}: ${priceRanges.join(', ')}`);
    }
  });

  return summary.join('\n');
};
