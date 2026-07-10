// 融智桥 DEMO - 演示数据集
// ⚠️ 所有数据均为模拟数据，仅用于DEMO展示

export interface Expert {
  id: string;
  name: string;
  avatar: string;
  title: string;
  industry: string;
  years: number;
  phone: string;
  wechat: string;
  intro: string;
  achievements: string[];
  tags: string[];
}

export interface AiTalent {
  id: string;
  name: string;
  avatar: string;
  title: string;
  stack: string[];
  experience: number;
  projects: string[];
  phone: string;
  wechat: string;
  intro: string;
}

export interface Enterprise {
  id: string;
  name: string;
  industry: string;
  scale: string;
  revenue: string;
  contact: string;
  phone: string;
  painPoints: string[];
}

export interface SkillPack {
  id: string;
  name: string;
  version: string;
  industry: string;
  expert: string;
  aiTalent: string;
  price: number;
  description: string;
  highlights: string[];
}

export interface PlatformStats {
  expertCount: number;
  enterpriseCount: number;
  aiTalentCount: number;
  productCount: number;
  demoCount: number;
  dailyTxn: number;
  weeklyTxn: number;
  monthlyTxn: number;
  yearlyTxn: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  role: string;
  score: number;
  referrals: number;
}

// ============ 模拟数据 ============

export const experts: Expert[] = [
  {
    id: "exp-001",
    name: "张建国",
    avatar: "👤",
    title: "制造业运营副总裁",
    industry: "制造业",
    years: 28,
    phone: "138****6789",
    wechat: "zhangjianguo_mfg",
    intro:
      "28年制造业运营管理经验，曾任职于某上市公司（年营收50亿+）运营副总裁。精通精益生产、供应链优化、智能排产。主导过3个工厂从0到1的建设，推动交付准时率从72%提升至94%。",
    achievements: [
      "推动某上市公司交付准时率从72%提升至94%",
      "主导3个工厂从0到1建设",
      "精益生产项目累计降本2.3亿元",
      "获得省级智能制造专家认证",
    ],
    tags: ["精益生产", "供应链优化", "智能排产", "质量管理"],
  },
  {
    id: "exp-002",
    name: "李芳",
    avatar: "👤",
    title: "零售运营总监",
    industry: "零售/消费",
    years: 22,
    phone: "139****8901",
    wechat: "lifang_retail",
    intro:
      "22年连锁零售运营经验，曾管理全国300+门店、年营收15亿的零售品牌。擅长门店标准化运营、私域流量搭建、客户体验设计。帮助3个品牌完成从区域到全国的扩张。",
    achievements: [
      "管理全国300+门店，年营收15亿",
      "帮助3个品牌完成全国扩张",
      "搭建私域流量池，复购率提升40%",
      "门店标准化运营SOP获行业奖项",
    ],
    tags: ["连锁运营", "私域流量", "门店标准化", "客户体验"],
  },
  {
    id: "exp-003",
    name: "王德明",
    avatar: "👤",
    title: "财务总监/CFO",
    industry: "财务/金融",
    years: 25,
    phone: "136****3456",
    wechat: "wangdm_cfo",
    intro:
      "25年财务管理经验，曾任2家上市公司CFO。精通全面预算管理、成本管控、税务筹划、财务数字化转型。主导过ERP系统上线和财务共享中心建设。",
    achievements: [
      "2家上市公司CFO经验",
      "主导财务共享中心建设，年节约成本3000万",
      "税务筹划累计节税超1.5亿",
      "注册会计师+注册税务师双证",
    ],
    tags: ["预算管理", "成本管控", "税务筹划", "财务数字化"],
  },
  {
    id: "exp-004",
    name: "陈秀兰",
    avatar: "👤",
    title: "人力资源副总裁",
    industry: "人力资源",
    years: 20,
    phone: "137****7890",
    wechat: "chenxl_hr",
    intro:
      "20年人力资源管理经验，曾任大型制造集团HRVP。擅长组织架构设计、绩效体系搭建、人才梯队建设、企业文化建设。服务过5000人+规模的企业。",
    achievements: [
      "搭建5000人+企业人力资源体系",
      "设计绩效体系，人均效能提升35%",
      "建立企业大学，年培训5000+人次",
      "主导3次企业并购中的人力整合",
    ],
    tags: ["组织设计", "绩效体系", "人才梯队", "企业文化"],
  },
];

export const aiTalents: AiTalent[] = [
  {
    id: "ai-001",
    name: "李明",
    avatar: "🤖",
    title: "AI全栈工程师",
    stack: ["Python", "LangChain", "FastAPI", "Docker", "PostgreSQL"],
    experience: 5,
    projects: ["制造业智能排产Agent", "零售智能客服Bot", "供应链预测模型"],
    phone: "185****1234",
    wechat: "liming_ai",
    intro:
      "5年企业AI落地经验，擅长将行业know-how转化为可部署的AI Agent。曾为3家制造业企业交付智能排产系统，平均降低排产时间70%。",
  },
  {
    id: "ai-002",
    name: "赵雪",
    avatar: "🤖",
    title: "NLP工程师",
    stack: ["Python", "PyTorch", "HuggingFace", "向量数据库", "RAG"],
    experience: 4,
    projects: ["智能客服知识库", "企业文档问答系统", "多语言翻译Pipeline"],
    phone: "186****2345",
    wechat: "zhaoxue_nlp",
    intro:
      "4年NLP工程经验，专注企业级RAG和智能客服。交付过日处理10万+对话的客服系统，准确率95%+。",
  },
  {
    id: "ai-003",
    name: "刘洋",
    avatar: "🤖",
    title: "数据分析师/AI工程师",
    stack: ["Python", "Pandas", "Scikit-learn", "Tableau", "SQL"],
    experience: 6,
    projects: ["销售预测模型", "客户画像系统", "供应链优化分析"],
    phone: "187****3456",
    wechat: "liuyang_data",
    intro:
      "6年数据分析与AI经验，擅长从企业数据中挖掘insight并构建预测模型。曾为零售企业搭建客户画像系统，精准营销ROI提升3倍。",
  },
];

export const enterprises: Enterprise[] = [
  {
    id: "ent-001",
    name: "某精密制造有限公司",
    industry: "制造业",
    scale: "200-500人",
    revenue: "5000万-2亿",
    contact: "王总",
    phone: "139****0001",
    painPoints: ["订单波动大，排产跟不上", "质检靠人工，漏检率高", "库存积压严重"],
  },
  {
    id: "ent-002",
    name: "某连锁零售品牌",
    industry: "零售/消费",
    scale: "100-200人",
    revenue: "2000万-5000万",
    contact: "李总",
    phone: "138****0002",
    painPoints: ["获客成本高", "客户复购率低", "门店运营不标准"],
  },
  {
    id: "ent-003",
    name: "某餐饮供应链企业",
    industry: "餐饮/供应链",
    scale: "50-100人",
    revenue: "1000万-5000万",
    contact: "刘总",
    phone: "137****0003",
    painPoints: ["食材损耗率高", "配送路线不优化", "需求预测不准"],
  },
];

export const skillPacks: SkillPack[] = [
  {
    id: "sp-001",
    name: "制造业AI排产优化",
    version: "v1.0",
    industry: "制造业",
    expert: "张建国",
    aiTalent: "李明",
    price: 3000,
    description: "基于28年制造业运营经验+AI排产Agent，帮助中小制造企业实现智能排产。",
    highlights: ["订单优先级动态排序", "换线成本最小化", "产能弹性模型", "交付预警"],
  },
  {
    id: "sp-002",
    name: "零售智能客服知识库",
    version: "v2.1",
    industry: "零售/消费",
    expert: "李芳",
    aiTalent: "赵雪",
    price: 2500,
    description: "基于22年零售经验+企业级RAG技术，快速搭建品牌专属智能客服。",
    highlights: ["品牌知识库自动构建", "多平台接入（微信/小程序）", "人工无缝接管", "转化率追踪"],
  },
  {
    id: "sp-003",
    name: "餐饮供应链优化",
    version: "v1.3",
    industry: "餐饮/供应链",
    expert: "王德明",
    aiTalent: "刘洋",
    price: 4000,
    description: "基于25年财务管理经验+数据分析模型，降低餐饮企业食材损耗和配送成本。",
    highlights: ["需求预测模型", "库存优化算法", "配送路线规划", "损耗预警"],
  },
];

export const platformStats: PlatformStats = {
  expertCount: 85,
  enterpriseCount: 120,
  aiTalentCount: 63,
  productCount: 47,
  demoCount: 23,
  dailyTxn: 12,
  weeklyTxn: 68,
  monthlyTxn: 245,
  yearlyTxn: 2940,
};

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "张建国", role: "制造业专家", score: 86, referrals: 38 },
  { rank: 2, name: "李明", role: "AI全栈工程师", score: 72, referrals: 31 },
  { rank: 3, name: "李芳", role: "零售专家", score: 68, referrals: 29 },
  { rank: 4, name: "王总", role: "企业代表（某精密制造）", score: 54, referrals: 22 },
  { rank: 5, name: "赵雪", role: "NLP工程师", score: 48, referrals: 19 },
  { rank: 6, name: "陈秀兰", role: "HR专家", score: 42, referrals: 16 },
  { rank: 7, name: "刘洋", role: "数据分析师", score: 36, referrals: 13 },
  { rank: 8, name: "李总", role: "企业代表（某连锁零售）", score: 30, referrals: 10 },
];

// ============ 在线沟通模拟脚本 ============

export interface ChatMessage {
  sender: "expert" | "user";
  text: string;
  delay?: number; // 模拟延迟（ms）
}

export interface ChatScenario {
  expertId: string;
  expertName: string;
  messages: ChatMessage[];
  userOptions: { label: string; value: string; nextMessages: ChatMessage[] }[];
}

export const chatScenario: ChatScenario = {
  expertId: "exp-001",
  expertName: "张建国",
  messages: [
    {
      sender: "expert",
      text: "您好！我是张建国，28年制造业运营管理经验。了解到贵公司在生产排产方面有痛点，能具体说说吗？",
    },
  ],
  userOptions: [
    {
      label: "我们订单波动大，排产总是跟不上",
      value: "order_volatility",
      nextMessages: [
        {
          sender: "expert",
          text: "订单波动是制造业常见难题。关键不是预测订单，而是建立弹性排产能力。我建议分三步：\n\n1️⃣ 梳理订单类型和切换成本\n2️⃣ 建立产能弹性模型\n3️⃣ 用AI做动态排产\n\n我的AI搭档李明已经在类似场景做过排产Agent，帮一家企业把交付准时率从72%提升到94%。你们目前用什么工具排产？",
        },
      ],
    },
    {
      label: "工人效率参差不齐，产能算不准",
      value: "worker_efficiency",
      nextMessages: [
        {
          sender: "expert",
          text: "产能算不准的根因通常是数据采集环节的问题。让我猜猜——你们还在用Excel手工统计？\n\n这是最典型的AI可替代场景。我们可以：\n1️⃣ 先做工序标准化（我来出标准）\n2️⃣ 用IoT+AI实时采集产能数据\n3️⃣ 自动生成排产建议\n\n这个方案投入不大，但见效很快。一般2-3周就能看到初步结果。",
        },
      ],
    },
    {
      label: "我想先了解您之前做过什么案例",
      value: "case_study",
      nextMessages: [
        {
          sender: "expert",
          text: "好的！分享一个最近的案例：\n\n某汽车零部件企业（300人规模），面临的问题和你们类似。我们做了三件事：\n\n✅ 梳理了12条产线的换线时间，发现平均每次换线浪费45分钟\n✅ 用AI排产Agent重新编排订单顺序，换线次数减少60%\n✅ 交付准时率从72%提升到94%，年节省成本约280万\n\n整个过程3个月，投入产出比1:8。这是脱敏后的方案摘要，您可以看看。",
        },
      ],
    },
  ],
};
