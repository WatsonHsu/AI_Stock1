
import { GoogleGenAI } from "@google/genai";
import { StockAnalysis } from "../types";

export const analyzeStock = async (stockCode: string): Promise<StockAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    請針對台灣股票代碼 ${stockCode} 進行深度專業分析。
    請務必全程使用「繁體中文 (zh-TW)」。
    
    分析報告的第一行請務必按照格式標註交易所類型，例如「交易所: TWSE」或「交易所: TPEX」。
    (註：上市股票為 TWSE，上櫃股票為 TPEX)

    分析報告必須嚴格包含以下八個部分：
    1. **公司基本資料**：完整名稱、所屬產業及核心業務。
    2. **營運概況與未來前景**：分析公司目前的獲利能力及未來的發展潛力。
    3. **法人買賣超動向 (近一週)**：分析法人（外資、投信、自營商）的具體動態。
    4. **技術走勢分析 (2年描述)**：描述趨勢與支撐壓力位。
    5. **3-6 個月股價趨勢預測**：明確方向（看漲、看跌或持平）與理由。
    6. **建議買入價格與時機**：根據目前的技術支撐位與基本面估值，給出具體的「建議買入價格區間」及「切入時機建議」（例如：回測某均線、突破關鍵壓力等）。
    7. **近一個月重要新聞與公告**：彙整最近 30 天內的關鍵訊息。
    8. **過去 5 年股利與獲利數據表格**：含年度、股價、股利、EPS、EPS 成長率、盈餘分配率。

    此外，請在報告的最末尾，提供過去 24 個月的「每月收盤價預估數據」：
    [DATA_START]
    {"labels": ["2023-01", "2023-02", ...], "prices": [120.5, 122.3, ...]}
    [DATA_END]

    請利用 Google Search 工具獲取最新的數據，確保分析報告的專業度。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "無法生成分析報告。";
  
  let exchange: 'TWSE' | 'TPEX' = 'TWSE';
  if (text.includes('TPEX') || text.includes('上櫃') || text.includes('櫃買')) {
    exchange = 'TPEX';
  }

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  const sourceUrls = groundingChunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title,
      uri: chunk.web.uri
    }));
  
  return {
    stockCode,
    companyName: "分析結果",
    exchange,
    industry: "",
    overview: text,
    futureProspects: "",
    trendPrediction: {
      direction: 'STABLE',
      probability: "",
      targetTimeframe: "3-6 個月",
      reasons: []
    },
    dividendHistory: [],
    sourceUrls
  };
};
