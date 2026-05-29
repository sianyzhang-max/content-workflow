# AI 内容运营部工作流

Multi-Agent Content Operations Workflow，支持一键部署到 Vercel。

## 项目结构

```
├── public/
│   └── index.html        # 前端页面
├── api/
│   └── generate.js       # Vercel Serverless Function（API 代理）
├── vercel.json           # Vercel 路由配置
└── package.json
```

## 部署到 Vercel（三步完成）

### 方法一：拖拽上传（最简单，无需 Git）

1. 打开 [vercel.com](https://vercel.com) → 注册/登录
2. 点击 **Add New → Project**，选择 **"Deploy without a Git repository"**（或拖拽文件夹）
3. 上传本文件夹，点击 **Deploy**，等待约 30 秒即可

### 方法二：GitHub 自动部署（推荐，方便后续更新）

1. 把本文件夹推送到 GitHub 仓库
2. 打开 [vercel.com](https://vercel.com) → **Add New → Project** → 选择该仓库
3. 框架预设选 **Other**，直接点 **Deploy**
4. 之后每次 push，Vercel 会自动重新部署

## 使用说明

部署完成后，打开 Vercel 分配的域名，填入：

| 字段 | 说明 |
|---|---|
| API Key | 你在 DeepSeek / OpenAI 等平台申请的 Key |
| Base URL | 服务商的 API 地址，如 `https://api.deepseek.com` |
| Model | 模型名称，如 `deepseek-chat` 或 `gpt-4o` |

> **安全说明**：API Key 仅保存在你自己浏览器的 sessionStorage，关闭标签页即清除，不会上传到服务器持久存储。

## 支持的模型服务

任何兼容 OpenAI `/v1/chat/completions` 接口的服务均可使用，例如：

- DeepSeek：`https://api.deepseek.com` + `deepseek-chat`
- OpenAI：`https://api.openai.com` + `gpt-4o`
- 硅基流动、火山方舟、月之暗面等国内服务商
