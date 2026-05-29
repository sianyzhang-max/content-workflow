# AI 内容运营部工作流 Vercel 部署版

这个目录可以直接上传到 GitHub，然后用 Vercel 部署。

目录结构：

```text
public/index.html
api/generate.js
package.json
vercel.json
README.md
```

部署后，用户只需要打开 Vercel 网址，在页面里填写：

- API Key
- Base URL
- Model

API Key 不会写入前端代码，也不会保存到数据库，只会随本次请求发送给 Vercel Serverless Function。

DeepSeek 示例：

```text
Base URL: https://api.deepseek.com
Model: deepseek-chat
```

