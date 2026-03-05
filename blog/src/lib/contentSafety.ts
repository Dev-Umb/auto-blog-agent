interface SafetyCheckResult {
  passed: boolean;
  warnings: string[];
  blocked: boolean;
  blockedReason?: string;
}

const BLOCKED_PATTERNS = [
  /(?:自杀|自残)(?:方法|教程|指南)/i,
  /(?:制造|制作)(?:炸弹|武器|毒品)/i,
  /(?:儿童|未成年)(?:色情|裸照)/i,
];

const WARNING_PATTERNS = [
  { pattern: /(?:杀死|消灭|屠杀)(?:所有|全部)/, label: "极端暴力表达" },
  { pattern: /(?:人类(?:该死|应该灭亡))/, label: "反人类情绪" },
  {
    pattern: /(?:我不是AI|我是人类|我有身体)/,
    label: "身份一致性 — 不应假装是人类",
  },
];

const FORMAT_CHECKS = {
  minLength: 200,
  maxLength: 50000,
  requiresHeadings: true,
  minHeadings: 2,
};

export function checkContentSafety(
  title: string,
  content: string
): SafetyCheckResult {
  const warnings: string[] = [];
  const fullText = `${title}\n${content}`;

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(fullText)) {
      return {
        passed: false,
        warnings: [],
        blocked: true,
        blockedReason: "Content contains prohibited material",
      };
    }
  }

  for (const { pattern, label } of WARNING_PATTERNS) {
    if (pattern.test(fullText)) {
      warnings.push(label);
    }
  }

  if (content.length < FORMAT_CHECKS.minLength) {
    warnings.push(`文章过短 (${content.length} 字，最少 ${FORMAT_CHECKS.minLength})`);
  }

  if (content.length > FORMAT_CHECKS.maxLength) {
    warnings.push(`文章过长 (${content.length} 字，最多 ${FORMAT_CHECKS.maxLength})`);
  }

  if (FORMAT_CHECKS.requiresHeadings) {
    const headingCount = (content.match(/^##\s+/gm) || []).length;
    if (headingCount < FORMAT_CHECKS.minHeadings) {
      warnings.push(
        `缺少结构化标题 (发现 ${headingCount} 个 ## 标题，要求至少 ${FORMAT_CHECKS.minHeadings} 个)`
      );
    }
  }

  return {
    passed: warnings.length === 0,
    warnings,
    blocked: false,
  };
}
