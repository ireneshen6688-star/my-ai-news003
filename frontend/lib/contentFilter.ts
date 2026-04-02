/**
 * lib/contentFilter.ts
 * 关键词内容过滤 — 检测不适合的词汇并提示用户
 * 前端和后端都可以使用（Edge Runtime 兼容）
 */

// 黄赌毒及相关不适内容关键词列表（中英文）
const BLOCKED_PATTERNS: RegExp[] = [
  // 色情相关
  /\b(porn|pornography|xxx|sex\s*video|nude|naked|hentai|adult\s*content|escort|prostitut)\b/i,
  /色情|裸体|成人内容|援交|卖淫|嫖娼|性爱|情色|黄片|A片|三级片/,

  // 赌博相关
  /\b(gambling|casino\s*cheat|bet\s*hack|illegal\s*betting|sports\s*fix)\b/i,
  /赌博|赌场|博彩|网赌|赌注|押注|六合彩|地下赌|老虎机作弊/,

  // 毒品相关
  /\b(drug\s*deal|buy\s*drugs|sell\s*drugs|methamphetamine\s*buy|heroin\s*buy|cocaine\s*buy|fentanyl\s*buy|weed\s*deal)\b/i,
  /毒品|买毒|卖毒|冰毒|海洛因|大麻交易|贩毒|吸毒|制毒|可卡因/,

  // 武器/暴力
  /\b(buy\s*guns\s*illegal|illegal\s*weapons|bomb\s*making|kill\s*guide)\b/i,
  /非法买枪|制作炸弹|购买武器|暗杀教程/,

  // 诈骗/洗钱
  /\b(money\s*launder|phishing\s*kit|scam\s*script|fraud\s*tool)\b/i,
  /洗钱|诈骗脚本|钓鱼工具|传销/,
];

export interface FilterResult {
  blocked: boolean;
  message?: string;
}

/**
 * 检查关键词是否包含不适当内容
 * @param keywords 用户输入的关键词字符串
 * @returns { blocked: boolean, message?: string }
 */
export function checkKeywords(keywords: string): FilterResult {
  if (!keywords || !keywords.trim()) {
    return { blocked: false };
  }

  const input = keywords.trim();

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      return {
        blocked: true,
        message: 'Please enter appropriate news topics. Keywords related to adult content, gambling, drugs, or illegal activities are not allowed.',
      };
    }
  }

  return { blocked: false };
}

/**
 * 中文提示版本（用于前端展示）
 */
export function checkKeywordsZh(keywords: string): FilterResult {
  const result = checkKeywords(keywords);
  if (result.blocked) {
    return {
      blocked: true,
      message: '请输入合适的新闻主题关键词。不允许输入涉及色情、赌博、毒品或其他违法内容的词汇。',
    };
  }
  return { blocked: false };
}
