// 简单的代理服务器，用于解决CORS问题
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { question, dataSummary } = req.body;
    const API_KEY = process.env.REACT_APP_AI_API_KEY;
    const API_URL = process.env.REACT_APP_AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    const API_MODEL = process.env.REACT_APP_AI_MODEL || 'gpt-3.5-turbo';

    if (!API_KEY) {
      return res.status(400).json({ error: 'API密钥未配置' });
    }

    const systemPrompt = `你是一个专业的房价数据分析助手。以下是可用的房价数据摘要：

${dataSummary}

请根据用户的问题，结合上述数据提供准确、专业的回答。如果数据中没有相关信息，请如实说明。`;

    const response = await axios.post(
      API_URL,
      {
        model: API_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );

    res.json({ answer: response.data.choices[0]?.message?.content || '抱歉，无法获取回答。' });
  } catch (error) {
    console.error('代理服务器错误:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error?.message || error.message || '服务器错误'
    });
  }
});

app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
});
