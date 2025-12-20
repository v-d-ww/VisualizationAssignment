# AI API 配置说明

## 当前状态
❌ **API尚未配置** - 需要在项目根目录创建 `.env` 文件并配置API密钥

---

## 方案一：使用 OpenAI（推荐）

### 1. 获取 API 密钥
1. 访问：https://platform.openai.com/
2. 注册/登录账号
3. 点击右上角头像 → "View API keys"
4. 点击 "Create new secret key" 创建密钥
5. 复制生成的密钥（格式：`sk-...`，只显示一次，请妥善保存）

### 2. 配置步骤
在项目根目录（与 `package.json` 同级）创建 `.env` 文件，内容如下：

```
REACT_APP_AI_API_KEY=sk-你的OpenAI密钥
REACT_APP_AI_API_URL=https://api.openai.com/v1/chat/completions
REACT_APP_AI_PROVIDER=openai
REACT_APP_AI_MODEL=gpt-3.5-turbo
```

**示例：**
```
REACT_APP_AI_API_KEY=sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
REACT_APP_AI_API_URL=https://api.openai.com/v1/chat/completions
REACT_APP_AI_PROVIDER=openai
REACT_APP_AI_MODEL=gpt-3.5-turbo
```

### 3. 费用说明
- 使用 gpt-3.5-turbo 模型，价格约 $0.0015/1K tokens
- 新用户通常有免费额度（$5）

---

## 方案二：使用阿里云通义千问（国内推荐）

### 1. 获取 API 密钥
1. 访问：https://dashscope.console.aliyun.com/
2. 使用阿里云账号登录
3. 进入 "API-KEY管理"
4. 点击 "创建新的API-KEY"
5. 复制生成的密钥

### 2. 配置步骤
在项目根目录创建 `.env` 文件，内容如下：

```
REACT_APP_AI_API_KEY=你的DashScope密钥
REACT_APP_AI_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
REACT_APP_AI_PROVIDER=dashscope
```

**示例：**
```
REACT_APP_AI_API_KEY=sk-1234567890abcdefghijklmnopqrstuvwxyz
REACT_APP_AI_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
REACT_APP_AI_PROVIDER=dashscope
```

### 3. 费用说明
- 通义千问-Turbo 模型，价格约 0.008元/1K tokens
- 新用户通常有免费额度

---

## 配置位置说明

### 文件位置
```
VisualizationAssignment-main/
├── package.json
├── .env          ← 在这里创建此文件（与package.json同级）
├── src/
└── ...
```

### 文件内容格式
`.env` 文件是纯文本文件，每行一个配置项，格式为：
```
变量名=值
```

**注意：**
- 不要有空格：`REACT_APP_AI_API_KEY = xxx` ❌（错误）
- 正确格式：`REACT_APP_AI_API_KEY=xxx` ✅（正确）
- 不要加引号（除非值本身需要引号）

---

## 配置完成后

1. **重启开发服务器**
   ```bash
   # 停止当前服务器（Ctrl+C）
   # 然后重新启动
   npm start
   ```

2. **验证配置**
   - 打开网页，点击右侧AI对话窗口
   - 输入问题测试，如："北京的房价是多少？"
   - 如果显示错误"API密钥未配置"，说明.env文件未生效，检查：
     - 文件是否在正确位置（项目根目录）
     - 文件名是否正确（`.env`，注意前面有点）
     - 是否重启了服务器

---

## 常见问题

### Q: 找不到 .env 文件？
A: `.env` 是隐藏文件，在Windows资源管理器中：
- 点击"查看" → 勾选"隐藏的项目"
- 或在VS Code中直接创建（文件名输入`.env`）

### Q: 配置后还是提示"API密钥未配置"？
A: 
1. 确认文件在项目根目录（与package.json同级）
2. 确认变量名正确（`REACT_APP_AI_API_KEY`）
3. **必须重启开发服务器**（修改.env后需要重启）

### Q: 提示"API密钥无效"？
A: 
1. 检查密钥是否正确复制（不要有多余空格）
2. 检查API密钥是否有效（在对应平台验证）
3. 检查API_URL是否正确

### Q: 提示"请求频率过高"？
A: API有调用频率限制，稍等片刻再试，或检查账户余额/配额

---

## 快速配置模板

**OpenAI配置（复制到.env文件）：**
```
REACT_APP_AI_API_KEY=sk-你的密钥
REACT_APP_AI_API_URL=https://api.openai.com/v1/chat/completions
REACT_APP_AI_PROVIDER=openai
REACT_APP_AI_MODEL=gpt-3.5-turbo
```

**通义千问配置（复制到.env文件）：**
```
REACT_APP_AI_API_KEY=你的密钥
REACT_APP_AI_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
REACT_APP_AI_PROVIDER=dashscope
```
