const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/openai',
    createProxyMiddleware({
      target: 'https://api.openai.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api/openai': '', // 移除 /api/openai 前缀
      },
      onProxyReq: (proxyReq, req, res) => {
        // 从环境变量或请求头获取API密钥
        const apiKey = process.env.REACT_APP_AI_API_KEY;
        if (apiKey) {
          proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
        }
      },
    })
  );
};
