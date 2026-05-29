function buildPrompt(requirement) {
  return `
你是一个 AI 内容运营部门，由 6 个 Agent 按顺序协作。请根据用户的内容需求，生成完整的内容生产工作流。

用户需求：
${requirement}

请严格按照以下角色依次输出：
1. 主管Agent：拆解任务，明确目标受众、内容目标和约束。
2. 资料Agent：补充素材、案例、可引用角度。
3. 结构Agent：生成内容框架。
4. 文案Agent：生成正文方向和关键表达。
5. 审核Agent：检查问题，指出可优化点。
6. 终稿Agent：输出最终版本摘要。

写作要求：
- 所有可展示字段都使用双语格式：中文在第一行，英文翻译在下一行。
- 风格温暖、专业、有作品集展示感。
- 每个 Agent 的 content 控制在 80 到 180 个字符。
- finalDraft.sections 给出 3 到 4 个段落，每段可直接作为内容成品展示。
- 只返回 JSON，不要添加 Markdown、代码块或额外解释。

JSON 字段要求：
- 顶层必须包含 topic、steps、finalDraft。
- steps 必须包含 lead、research、structure、copy、review、final。
- 每个 step 必须包含 title 和 content。
- finalDraft 必须包含 title、subtitle、sections、callout。
- sections 是数组，每项包含 heading 和 body。
`;
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed);
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('模型没有返回 JSON，请稍后重试。');
  }

  return JSON.parse(match[0]);
}

function normalizeBaseUrl(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/v1\/chat\/completions$/i, '/v1');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求。' });
  }

  try {
    const requirement = String(req.body?.requirement || '').trim();
    const apiKey = String(req.body?.apiKey || '').trim();
    const baseUrl = normalizeBaseUrl(req.body?.baseUrl);
    const model = String(req.body?.model || '').trim();

    if (!requirement) {
      return res.status(400).json({ error: '请输入内容需求。' });
    }

    if (!apiKey || !baseUrl || !model) {
      return res.status(400).json({ error: '请填写 API Key、Base URL 和 Model。' });
    }

    const upstreamUrl = `${baseUrl}/chat/completions`;
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '你是资深内容运营负责人。必须只输出一个 JSON 对象，字段为 topic、steps、finalDraft。'
          },
          {
            role: 'user',
            content: buildPrompt(requirement)
          }
        ]
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || `上游模型服务返回 HTTP ${response.status}。请检查 Base URL 是否只填写到服务根地址，例如 https://api.deepseek.com，并确认 Model 名称正确。`;
      return res.status(502).json({
        error: message,
        upstreamStatus: response.status,
        upstreamUrl,
        model
      });
    }

    const content = payload?.choices?.[0]?.message?.content;
    return res.status(200).json(extractJson(content));
  } catch (error) {
    return res.status(500).json({
      error: `生成失败，请检查 API Key、Base URL、Model 或网络连接。\n${error.message}`
    });
  }
}

