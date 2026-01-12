
import { GoogleGenAI } from "@google/genai";
import { StockAnalysis } from "../types";

export const analyzeStock = async (stockCode: string): Promise<StockAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    請針對台灣股票代碼 ${stockCode} 進行深度專業分析。
    請務必全程使用「繁體中文 (zh-TW)」。
    
    分析報告必須嚴格包含以下七個部分：
    1. **公司基本資料**：完整名稱、所屬產業及核心業務。
    2. **營運概況與未來前景**：分析公司目前的獲利能力及未來的發展潛力（是否能繼續賺錢）。
    3. **法人買賣超動向 (近一週)**：分析「過去一週」法人（外資、投信、自營商）的具體買賣超走向、籌碼集中度觀察，說明市場主力動態。
    4. **技術走勢分析 (2年日線/月線描述)**：文字描述過去「兩年」來的日線與月線技術走勢。說明目前的均線型態、支撐壓力區間。
    5. **3-6 個月股價趨勢預測**：明確給出方向（看漲、看跌或持平），並提供詳細理由與依據。
    6. **近一個月重要新聞與公告**：彙整最近 30 天內的重要新聞、財報表現或重大訊息。
    7. **過去 5 年股利與獲利數據表格**：請使用 Markdown 表格呈現（含年度、當時股價、股利、EPS、盈餘分配率）。

    請利用 Google Search 工具獲取最新的籌碼數據與市場動態。
    報告風格應維持客觀、專業、深入。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "無法生成分析報告。";
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
