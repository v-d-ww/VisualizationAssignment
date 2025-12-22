import { useEffect, useMemo, useState } from "react";
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
const stopWords = [
  "政策",
  "市场",
  "房地产",
  "住房",
  "购房",
  "商品房",
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
  "全国",
  "地方",
  "城市",
  "地区",
  "家庭",
  "个人",
  "企业",
  "银行",
  "贷款",
  "首付",
  "比例",
];

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
  // 提取连续的中文词，长度2-4
  const matches = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  return matches;
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

    const addWord = (w: string, policy: PolicyItem) => {
      if (stopWords.includes(w)) return;
      if (!freq.has(w)) freq.set(w, { count: 0, policies: [] });
      const item = freq.get(w)!;
      item.count += 1;
      if (!item.policies.find((p) => p.id === policy.id)) {
        item.policies.push(policy);
      }
    };

    policies.forEach((p) => {
      const text = `${p.title} ${p.content} ${p.impact || ""}`;
      const words = tokenize(text);
      words.forEach((w) => addWord(w, p));
      // 确保预置关键词被统计
      seededKeywords.forEach((seed) => {
        if (text.includes(seed)) addWord(seed, p);
      });
    });

    const list: KeywordInfo[] = Array.from(freq.entries()).map(
      ([word, value]) => ({
        word,
        count: value.count,
        policies: value.policies,
      })
    );

    return list
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
    return (
      minSize + ((count - min) / (max - min)) * (maxSize - minSize)
    );
  };

  const colors = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#38bdf8", "#f97316"];
  const getColor = (idx: number) => colors[idx % colors.length];

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
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
          backgroundColor: "#0f172a",
          borderRadius: 12,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          padding: 20,
          position: "relative",
          overflow: "hidden",
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
            marginBottom: 12,
          }}
        >
          <div
            style={{
              color: "#e2e8f0",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            政策关键词词云
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            inset: 70,
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
              <span
                key={item.word}
                style={{
                  fontSize: getFontSize(item.count),
                  color: getColor(idx),
                  cursor: "pointer",
                  lineHeight: 1.2,
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
              >
                {item.word}
              </span>
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
              borderRadius: 8,
              padding: 12,
              maxWidth: 360,
              maxHeight: 240,
              overflow: "auto",
              zIndex: 10000,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
            onMouseEnter={() => setHovered(hovered)}
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

