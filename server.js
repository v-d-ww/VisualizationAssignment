// 代理服务器 - 解决CORS问题
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 代理AI API请求
app.post('/api/chat', async (req, res) => {
  try {
    const { question, dataSummary } = req.body;
    const API_KEY = process.env.REACT_APP_AI_API_KEY;
    const API_URL = process.env.REACT_APP_AI_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    const API_PROVIDER = process.env.REACT_APP_AI_PROVIDER || 'dashscope';

    if (!API_KEY) {
      return res.status(400).json({ error: 'API密钥未配置' });
    }

    const systemPrompt = `你是一个专业的房价数据分析助手。以下是可用的房价数据摘要：

${dataSummary}

请根据用户的问题，结合上述数据提供准确、专业的回答。如果数据中没有相关信息，请如实说明。`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ];

    let response;

    if (API_PROVIDER === 'dashscope' || API_URL.includes('dashscope')) {
      // 通义千问API
      response = await axios.post(
        API_URL,
        {
          model: 'qwen-turbo',
          input: {
            messages: messages.map(msg => ({
              role: msg.role === 'system' ? 'system' : msg.role,
              content: msg.content
            }))
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 2000
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'X-DashScope-SSE': 'disable'
          },
          timeout: 60000
        }
      );

      const result = response.data?.output?.text 
        || response.data?.output?.choices?.[0]?.message?.content
        || response.data?.output?.choices?.[0]?.content
        || response.data?.output?.message?.content;

      if (!result) {
        throw new Error('无法解析API响应');
      }

      // 提取request_id
      const requestId = response.data?.request_id || response.headers['x-request-id'] || 'N/A';
      
      // 输出request_id到控制台
      console.log('通义千问API调用成功 - Request ID:', requestId);
      console.log('响应数据:', JSON.stringify(response.data, null, 2));

      res.json({ 
        answer: result,
        requestId: requestId
      });
    } else {
      // OpenAI API
      response = await axios.post(
        API_URL,
        {
          model: process.env.REACT_APP_AI_MODEL || 'gpt-3.5-turbo',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          timeout: 30000
        }
      );

      const requestId = response.data?.id || response.headers['x-request-id'] || 'N/A';
      console.log('OpenAI API调用成功 - Request ID:', requestId);
      
      res.json({ 
        answer: response.data.choices[0]?.message?.content || '抱歉，无法获取回答。',
        requestId: requestId
      });
    }
  } catch (error) {
    console.error('代理服务器错误:', error.response?.data || error.message);
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401) {
        res.status(401).json({ error: 'API密钥无效' });
      } else if (status === 429) {
        res.status(429).json({ error: 'API请求频率过高，请稍后再试' });
      } else if (status === 403) {
        res.status(403).json({ error: 'API访问被拒绝，请检查账户余额' });
      } else if (data?.code) {
        res.status(status).json({ error: `API错误 (${data.code}): ${data.message || '未知错误'}` });
      } else {
        res.status(status).json({ error: data?.message || `API请求失败 (状态码: ${status})` });
      }
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: '请求超时' });
    } else {
      res.status(500).json({ error: error.message || '服务器错误' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
  console.log(`API密钥已加载: ${process.env.REACT_APP_AI_API_KEY ? '是' : '否'}`);
});
