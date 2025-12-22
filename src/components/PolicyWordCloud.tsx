import { useMemo, useState } from "react";
import policyData from "../data/policyData.json";

interface PolicyWordCloudProps {
  visible: boolean;
  onClose?: () => void;
}

type PolicyItem = {
  id: string;
  title: string;
  content: string;
  impact?: string;
};

type KeywordInfo = {
  word: string;
  count: number;
  policies: PolicyItem[];
};

// 常见停用词，避免无意义的高频词
const stopWords = new Set([
  // 通用虚词/口水词
  "政策",
  "规定",
  "相关",
  "办法",
  "意见",
  "方案",
  "文件",
  "通知",
  "措施",
  "出台",
  "实施",
  "支持",
  "促进",
  "健康",
  "发展",
  "建设",
  "要求",
  "包括",
  "以及",
  "以下",
  "以上",
  "进一步",
  "加强",
  "提高",
  "全面",
  "有效",
  "鼓励",
  "完善",
  // 地理/泛指
  "全国",
  "地方",
  "城市",
  "地区",
  "省份",
  "区域",
  "居民",
  "群众",
  "家庭",
  "个人",
  "企业",
  "机构",
  // 房地产常见非关键信息
  "市场",
  "房地产",
  "住房",
  "购房",
  "商品房",
  "土地",
  "房屋",
  "不动产",
  "贷款",
  "首付",
  "比例",
  "利率",
  "公积金",
  // 低信息词根
  "工作",
  "推进",
  "落实",
  "重点",
  "领域",
  "保障",
  "服务",
  "水平",
  "基础",
  "机制",
]);

// 预置一些关键术语，保证出现
const seededKeywords = [
  "限购",
  "限售",
  "限价",
  "房产税",
  "契税",
  "公积金",
  "棚改",
  "以旧换新",
  "首付",
  "贷款",
  "人才",
  "补贴",
  "保障性住房",
  "现房销售",
  "三道红线",
  "金融16条",
];

// 优先保留的短语（避免被拆开）
const phraseWhitelist = [
  "房产税",
  "契税",
  "公积金",
  "保障性住房",
  "棚改",
  "以旧换新",
  "三道红线",
  "金融16条",
  "二套房",
  "二手房",
  "共有产权",
  "城市更新",
  "租购并举",
];

const extractPolicies = (): PolicyItem[] => {
  const items: PolicyItem[] = [];
  (policyData as any[]).forEach((period) => {
    (period.policies || []).forEach((p: any) => {
      items.push({
        id: p.id,
        title: p.title,
        content: p.content || "",
        impact: p.impact || "",
      });
    });
  });
  return items;
};

const tokenize = (text: string) => {
  const tokens: string[] = [];

  // 先匹配短语白名单
  phraseWhitelist.forEach((p) => {
    if (text.includes(p)) tokens.push(p);
  });

  // 提取连续中文 2-6 字
  const words = text.match(/[\u4e00-\u9fa5]{2,6}/g) || [];

  // 将相邻词拼成 bigram，提升“短语”概率
  for (let i = 0; i < words.length; i++) {
    tokens.push(words[i]);
    if (i < words.length - 1) {
      const bi = words[i] + words[i + 1];
      if (bi.length <= 8) tokens.push(bi);
    }
  }

  return tokens;
};

function PolicyWordCloud({ visible, onClose }: PolicyWordCloudProps) {
  const [hovered, setHovered] = useState<{
    keyword: string;
    x: number;
    y: number;
  } | null>(null);

  const keywordList = useMemo<KeywordInfo[]>(() => {
    const policies = extractPolicies();
    const freq = new Map<string, { count: number; policies: PolicyItem[] }>();

    const addWord = (w: string, policy: PolicyItem, weight = 1) => {
      if (stopWords.has(w)) return;
      if (/^\d+$/.test(w)) return; // 纯数字跳过
      if (w.length < 2) return;
      if (!freq.has(w)) freq.set(w, { count: 0, policies: [] });
      const item = freq.get(w)!;
      item.count += weight;
      if (!item.policies.some((p) => p.id === policy.id)) {
        item.policies.push(policy);
      }
    };

    policies.forEach((p) => {
      const text = `${p.title} ${p.content} ${p.impact || ""}`.replaceAll(
        /[，。、“”‘’：；（）()\[\]【】\s]/g,
        " "
      );

      // 标题词给予更高权重
      tokenize(p.title || "").forEach((w) => addWord(w, p, 2));

      const words = tokenize(text);
      words.forEach((w) => addWord(w, p, 1));

      // 预置关键词保证出现且权重要高
      seededKeywords.forEach((seed) => {
        if (text.includes(seed)) addWord(seed, p, 2);
      });
    });

    const list: KeywordInfo[] = Array.from(freq.entries()).map(
      ([word, value]) => ({
        word,
        count: value.count,
        policies: value.policies,
      })
    );

    return [...list]
      .sort((a, b) => b.count - a.count)
      .slice(0, 80)
      .map((item, idx) => {
        // 保持顺序但轻微打散
        return { ...item, count: item.count + (80 - idx) * 0.01 };
      });
  }, []);

  const fontSizeRange = useMemo(() => {
    if (keywordList.length === 0) return { min: 14, max: 36 };
    const counts = keywordList.map((k) => k.count);
    return { min: Math.min(...counts), max: Math.max(...counts) };
  }, [keywordList]);

  const getFontSize = (count: number) => {
    const minSize = 14;
    const maxSize = 40;
    const { min, max } = fontSizeRange;
    if (max === min) return (minSize + maxSize) / 2;
    return minSize + ((count - min) / (max - min)) * (maxSize - minSize);
  };

  const colors = [
    "#60a5fa",
    "#34d399",
    "#fbbf24",
    "#f472b6",
    "#a78bfa",
    "#38bdf8",
    "#f97316",
  ];
  const getColor = (idx: number) => colors[idx % colors.length];

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.18), rgba(15,23,42,0.95))",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        style={{
          width: "90%",
          height: "85%",
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,41,59,0.88))",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          padding: 20,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 15,
            right: 15,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backgroundColor: "rgba(239, 68, 68, 0.2)",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
          }}
        >
          ×
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              color: "#e2e8f0",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            政策关键词词云
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            inset: 72,
            overflow: "auto",
            padding: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignContent: "flex-start",
            }}
          >
            {keywordList.map((item, idx) => (
              <button
                key={item.word}
                type="button"
                style={{
                  fontSize: getFontSize(item.count),
                  color: getColor(idx),
                  cursor: "pointer",
                  lineHeight: 1.2,
                  padding: "4px 6px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.03)",
                  transition: "all 0.2s ease",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setHovered({
                    keyword: item.word,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
                onMouseLeave={() => setHovered(null)}
                onFocus={(e) => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setHovered({
                    keyword: item.word,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
                onBlur={() => setHovered(null)}
                onMouseOver={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "rgba(255,255,255,0.08)";
                  el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.28)";
                }}
                onMouseOut={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "rgba(255,255,255,0.03)";
                  el.style.boxShadow = "none";
                }}
              >
                {item.word}
              </button>
            ))}
          </div>
        </div>

        {hovered && (
          <div
            style={{
              position: "fixed",
              left: hovered.x,
              top: hovered.y + 8,
              transform: "translateX(-50%)",
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 10,
              padding: 12,
              maxWidth: 360,
              maxHeight: 240,
              overflow: "auto",
              zIndex: 10000,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
            onMouseEnter={() => setHovered((prev) => prev)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              style={{
                color: "#e2e8f0",
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              {hovered.keyword} 相关政策
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {keywordList
                .find((k) => k.word === hovered.keyword)
                ?.policies.slice(0, 12)
                .map((p) => (
                  <a
                    key={p.id}
                    href={`https://baike.baidu.com/item/${encodeURIComponent(
                      p.title
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#a5b4fc",
                      fontSize: 12,
                      textDecoration: "none",
                      lineHeight: 1.4,
                      display: "block",
                    }}
                  >
                    • {p.title}
                  </a>
                ))}
            </div>
            <div
              style={{
                color: "#64748b",
                fontSize: 11,
                marginTop: 6,
              }}
            >
              点击条目将在新窗口打开百度百科
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PolicyWordCloud;

