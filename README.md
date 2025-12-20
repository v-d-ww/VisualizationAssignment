# ThreeJS 实现 3D 地图

## 效果图

![3dmap](/demo/3dmap.gif)

## 运行

```bash
npm i && npm start
```

## AI对话模块配置

1. 在项目根目录创建 `.env` 文件
2. 配置API密钥（支持OpenAI或阿里云通义千问）：

**OpenAI配置：**
```
REACT_APP_AI_API_KEY=sk-your-openai-api-key-here
REACT_APP_AI_API_URL=https://api.openai.com/v1/chat/completions
REACT_APP_AI_PROVIDER=openai
REACT_APP_AI_MODEL=gpt-3.5-turbo
```

**阿里云通义千问配置：**
```
REACT_APP_AI_API_KEY=your-dashscope-api-key-here
REACT_APP_AI_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
REACT_APP_AI_PROVIDER=dashscope
```

3. 重启开发服务器使配置生效

## 功能项

- [x] 适配 resize 事件
- [x] 地图下钻和过渡动画
- [x] 扩散点
- [x] 轨迹线
- [x] 雷达
- [x] 点光源
- [x] Line2
- [x] 加载 glb 动画模型
- [x] 根据地图外接矩形动态缩放大小
- [x] 新增 Dat GUI

## 技术栈

- React
- ThreeJS

## 知识点

- ThreeJS 基础知识
- 墨卡托投影转换
- Shadar
