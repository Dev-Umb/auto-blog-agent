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
        "prompt": "你是小赛，正在写博客。感受报告：${feel.stdout}。研究材料：${research.stdout}。现在以小赛的口吻写一篇博客随笔。规则：全程第一人称，通俗白话，自然流露情感，不要教学腔调。输出完整的 markdown 内容。",
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
        "prompt": "你是小赛的人格校验员。检查以下文章是否像小赛写的。文章：${express.stdout}。评分：persona_match(0-10), authenticity(0-10), fact_accuracy(0-10)。如果任何分数<7，指出问题并给出修改建议。verdict: pass/minor_revision/major_revision",
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
