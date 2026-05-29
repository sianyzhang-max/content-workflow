/**
 * Vercel Serverless Function — /api/generate
 *
 * 接收前端请求，向上游 LLM（DeepSeek / OpenAI 兼容接口）发起调用，
 * 模拟六个 Agent 分步协作，返回结构化 JSON 供前端渲染。
 */

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { requirement, apiKey, baseUrl, model } = req.body;

  if (!requirement || !apiKey || !baseUrl || !model) {
    return res.status(400).json({ error: '缺少必要参数：requirement / apiKey / baseUrl / model' });
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;

  // ── Agent 定义 ──────────────────────────────────────────────
  const agentPrompts = [
    {
      id: 'lead',
      systemPrompt: '你是内容运营主管，擅长拆解内容生产任务。请用2-3句话简洁地说明本次任务的核心目标和执行重点。',
    },
    {
      id: 'research',
      systemPrompt: '你是内容资料员，负责为内容提供素材支撑。请列出3-4个与主题高度相关的具体案例、数据或参考角度，每条一句话。',
    },
    {
      id: 'structure',
      systemPrompt: '你是内容结构师，负责设计内容骨架。请给出一份包含标题方向和3-5个核心段落要点的内容结构，条目式输出。',
    },
    {
      id: 'copy',
      systemPrompt: '你是资深文案，负责撰写内容正文。请根据已有结构，输出一段流畅、有感染力的正文草稿（200字左右），可使用符合平台风格的语气。',
    },
    {
      id: 'review',
      systemPrompt: '你是内容审核员，负责检查质量。请指出上述草稿中存在的1-3个问题或改进点，并简要说明修改建议。',
    },
    {
      id: 'final',
      systemPrompt: `你是终稿整合师，负责汇总所有 Agent 的输出并生成最终成品。
请严格按以下 JSON 格式输出，不要输出任何多余内容：
{
  "title": "内容标题",
  "subtitle": "一句话副标题或简介",
  "sections": [
    { "heading": "段落标题1", "body": "段落正文1" },
    { "heading": "段落标题2", "body": "段落正文2" },
    { "heading": "段落标题3", "body": "段落正文3" }
  ],
  "callout": "结尾行动号召或互动引导语"
}`,
    },
  ];

  // ── 依次调用每个 Agent ──────────────────────────────────────
  const steps = {};
  let conversationContext = `用户需求：${requirement}`;

  try {
    for (const agent of agentPrompts) {
      const isFinal = agent.id === 'final';

      const messages = [
        { role: 'system', content: agent.systemPrompt },
        {
          role: 'user',
          content: isFinal
            ? `${conversationContext}\n\n请根据以上所有 Agent 的输出，生成最终 JSON 成品。`
            : conversationContext,
        },
      ];

      const upstreamRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          ...(isFinal ? { response_format: { type: 'json_object' } } : {}),
          max_tokens: isFinal ? 1200 : 400,
          temperature: 0.7,
        }),
      });

      if (!upstreamRes.ok) {
        const errText = await upstreamRes.text().catch(() => '');
        return res.status(502).json({
          error: `上游模型服务返回 ${upstreamRes.status}：${errText.slice(0, 200)}`,
          upstreamUrl: endpoint,
          model,
        });
      }

      const upstreamData = await upstreamRes.json();
      const content = upstreamData?.choices?.[0]?.message?.content || '';

      steps[agent.id] = { content };

      // 把这个 Agent 的输出拼入上下文，供下一个 Agent 参考
      conversationContext += `\n\n【${agent.id} Agent 输出】\n${content}`;
    }
  } catch (err) {
    return res.status(500).json({ error: `服务器内部错误：${err.message}` });
  }

  // ── 解析终稿 JSON ───────────────────────────────────────────
  let finalDraft = null;
  try {
    const raw = steps['final']?.content || '{}';
    // 兼容模型在 json_object 模式下仍然包裹代码块的情况
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    finalDraft = JSON.parse(cleaned);
  } catch {
    finalDraft = {
      title: '内容已生成',
      subtitle: '终稿解析异常，请查看各 Agent 原始输出。',
      sections: [],
      callout: steps['final']?.content || '',
    };
  }

  return res.status(200).json({ steps, finalDraft });
}
