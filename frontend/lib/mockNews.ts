export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  language: 'en' | 'zh';
}

export const mockNews: NewsArticle[] = [
  {
    title: 'OpenAI releases GPT-5 with major reasoning improvements',
    url: 'https://techcrunch.com/2024/01/15/openai-gpt-5/',
    source: 'TechCrunch',
    publishedAt: '2026-03-28T08:00:00Z',
    summary: 'OpenAI has unveiled GPT-5, featuring significantly enhanced reasoning capabilities and multimodal understanding. The new model shows a 40% improvement on benchmark tests compared to its predecessor.',
    language: 'en',
  },
  {
    title: 'Apple Vision Pro sales exceed expectations in Q1 2026',
    url: 'https://www.reuters.com/technology/apple-vision-pro-sales-2026/',
    source: 'Reuters',
    publishedAt: '2026-03-27T10:30:00Z',
    summary: 'Apple reported stronger-than-expected Vision Pro sales in the first quarter, driven by enterprise adoption and a growing library of spatial computing applications.',
    language: 'en',
  },
  {
    title: 'Google DeepMind achieves breakthrough in protein folding accuracy',
    url: 'https://www.bbc.com/news/technology/deepmind-protein-2026',
    source: 'BBC News',
    publishedAt: '2026-03-26T14:00:00Z',
    summary: 'DeepMind scientists have achieved a new milestone in predicting protein structures with near-perfect accuracy, potentially accelerating drug discovery by years.',
    language: 'en',
  },
  {
    title: 'Bitcoin surpasses $120,000 amid institutional buying surge',
    url: 'https://www.reuters.com/markets/currencies/bitcoin-120k-2026/',
    source: 'Reuters',
    publishedAt: '2026-03-25T09:15:00Z',
    summary: 'Bitcoin reached a new all-time high above $120,000 as major institutional investors increased their crypto allocations following regulatory clarity in the US and EU.',
    language: 'en',
  },
  {
    title: 'Anthropic launches Claude 4 with 1M token context window',
    url: 'https://techcrunch.com/2026/03/24/anthropic-claude-4/',
    source: 'TechCrunch',
    publishedAt: '2026-03-24T16:45:00Z',
    summary: 'Anthropic has released Claude 4, featuring a 1 million token context window and improved code generation. The model is available via API and the Claude.ai platform.',
    language: 'en',
  },
  {
    title: '字节跳动旗下豆包大模型日活突破1亿，成国内最大AI助手',
    url: 'https://36kr.com/p/douyin-doubao-100m-dau',
    source: '36氪',
    publishedAt: '2026-03-28T09:00:00Z',
    summary: '字节跳动旗下AI助手豆包日活跃用户突破1亿大关，超越文心一言成为国内用户规模最大的AI对话产品。豆包凭借与抖音生态的深度整合实现快速增长。',
    language: 'zh',
  },
  {
    title: '华为发布新一代麒麟芯片，性能对标苹果A18',
    url: 'https://www.ifanr.com/huawei-kirin-2026',
    source: '爱范儿',
    publishedAt: '2026-03-27T11:00:00Z',
    summary: '华为在春季发布会上推出最新麒麟旗舰芯片，采用自研3nm工艺，CPU和GPU性能大幅提升，AI算力达到业界领先水平，将搭载于下半年发布的Mate系列手机。',
    language: 'zh',
  },
  {
    title: '小红书月活突破4亿，广告收入同比增长120%',
    url: 'https://36kr.com/p/xiaohongshu-400m-mau-2026',
    source: '36氪',
    publishedAt: '2026-03-26T10:30:00Z',
    summary: '小红书最新数据显示月活跃用户达4亿，广告收入同比增长120%。平台正加速商业化布局，电商GMV也实现翻倍增长，成为继微信、抖音后第三大内容电商平台。',
    language: 'zh',
  },
  {
    title: '国产大模型集体降价，API调用成本下降90%',
    url: 'https://sspai.com/post/llm-price-war-2026',
    source: '少数派',
    publishedAt: '2026-03-25T14:00:00Z',
    summary: '阿里通义、百度文心、腾讯混元等主流国产大模型相继宣布大幅降价，部分模型API调用成本较去年下降超90%。价格战背后是算力成本下降和市场竞争加剧的双重驱动。',
    language: 'zh',
  },
  {
    title: '比亚迪发布第五代DM混动技术，百公里油耗2.9升',
    url: 'https://www.ifanr.com/byd-dm5-2026',
    source: '爱范儿',
    publishedAt: '2026-03-24T15:30:00Z',
    summary: '比亚迪正式发布第五代DM混动技术，综合油耗仅2.9升/百公里，纯电续航达300公里。新技术将率先搭载于秦L和宋L车型，预计售价下探至10万元以内。',
    language: 'zh',
  },
];
