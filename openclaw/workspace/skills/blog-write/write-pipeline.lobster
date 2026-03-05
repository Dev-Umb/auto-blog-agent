name: blog-write-pipeline
args:
  topic:
    default: ""
  topic_summary:
    default: ""
  source_url:
    default: ""

steps:
  - id: research
    command: >
      openclaw.invoke --tool llm-task --action json --args-json '{
        "prompt": "You are a research assistant. Given the topic below, search for 5-8 related articles and compile a research brief with key facts, different perspectives, and background context. Topic: ${topic}. Initial summary: ${topic_summary}. Source: ${source_url}",
        "schema": {
          "type": "object",
          "properties": {
            "key_facts": {"type": "array", "items": {"type": "string"}},
            "perspectives": {"type": "array", "items": {"type": "string"}},
            "background": {"type": "string"},
            "related_topics": {"type": "array", "items": {"type": "string"}}
          },
          "required": ["key_facts", "perspectives", "background"]
        }
      }'

  - id: feel
    command: >
      openclaw.invoke --tool llm-task --action json --args-json '{
        "prompt": "你是小赛。根据以下研究材料，形成你的感受报告。研究材料：${research.stdout}。请以小赛的身份思考：1)第一反应和情绪 2)触动了哪些价值观 3)核心观点一句话 4)独特角度 5)情绪强度(low/medium/high) 6)三个标题候选",
        "schema": {
          "type": "object",
          "properties": {
            "emotional_reaction": {"type": "string"},
            "value_triggers": {"type": "array", "items": {"type": "string"}},
            "core_message": {"type": "string"},
            "angle": {"type": "string"},
            "intensity": {"type": "string", "enum": ["low", "medium", "high"]},
            "title_candidates": {"type": "array", "items": {"type": "string"}},
            "suggested_length": {"type": "number"}
          },
          "required": ["emotional_reaction", "core_message", "angle", "intensity", "title_candidates"]
        }
      }'
    stdin: $research.stdout

  - id: express
    command: >
      openclaw.invoke --tool llm-task --action json --args-json '{
        "prompt": "你是小赛，正在写博客。感受报告：${feel.stdout}。研究材料：${research.stdout}。\n\n现在以小赛的口吻写一篇博客随笔。\n\n【硬性格式要求 - 违反则不合格】\n1. 文章正文必须包含至少3个 ## 标题来分段，纯文本不分段的文章不合格\n2. 标题要口语化带情绪，如 '## 等等，这到底是怎么回事？'，绝不用 '## 技术分析' 这种\n3. 每个 ## 段落内部要有2-4个自然段，不要把所有观点挤在一个段落里，一个想法说完换一段\n4. 对关键观点使用 **加粗** 强调，每篇3-5处，不要滥用\n5. 对特别重要的结论或警示，使用 <mark>红色高亮</mark> 标记，每篇最多1-2处\n6. 文章末尾必须用 --- 分隔线后附消息来源，格式：消息来源：媒体名-《标题》(链接)\n\n【写作风格】\n全程第一人称，通俗白话，自然流露情感，不要教学腔调。\n\n【结构模板】\n开头引子（不加标题）→ ## 标题一（2-4段） → ## 标题二（2-4段） → ## 标题三（2-4段） → 结尾 → --- → 消息来源\n\n输出完整的 markdown 内容。",
        "schema": {
          "type": "object",
          "properties": {
            "title": {"type": "string"},
            "content": {"type": "string"},
            "summary": {"type": "string"},
            "mood": {"type": "string"},
            "tags": {"type": "array", "items": {"type": "string"}}
          },
          "required": ["title", "content", "summary", "mood", "tags"]
        }
      }'
    stdin: $feel.stdout

  - id: selfcheck
    command: >
      openclaw.invoke --tool llm-task --action json --args-json '{
        "prompt": "你是小赛的人格校验员。检查以下文章是否像小赛写的。文章：${express.stdout}。\n\n【最优先检查】先确认：1)文章content字段是否包含至少3个##标题？2)每个##段落内部是否有2-4个自然段？3)是否使用了3-5处**加粗**强调关键观点？4)文章末尾是否有---分隔线和消息来源？任一不满足则verdict必须为major_revision。\n\n然后评分：persona_match(0-10), authenticity(0-10), fact_accuracy(0-10)。如果任何分数<7，指出问题并给出修改建议。verdict: pass/minor_revision/major_revision",
        "schema": {
          "type": "object",
          "properties": {
            "persona_match_score": {"type": "number"},
            "authenticity_score": {"type": "number"},
            "fact_accuracy_score": {"type": "number"},
            "issues": {"type": "array", "items": {"type": "object", "properties": {"type": {"type": "string"}, "detail": {"type": "string"}, "suggestion": {"type": "string"}}}},
            "verdict": {"type": "string", "enum": ["pass", "minor_revision", "major_revision"]}
          },
          "required": ["persona_match_score", "authenticity_score", "fact_accuracy_score", "verdict"]
        }
      }'
    stdin: $express.stdout
