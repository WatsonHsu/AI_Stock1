
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Info, ExternalLink, Activity, Loader2, AlertCircle, FileText, Printer, TrendingUp, BarChart3, ChevronRight, AreaChart, Maximize2, RefreshCw, Target, Zap } from 'lucide-react';
import { analyzeStock } from './services/geminiService';
import { StockAnalysis, LoadingStatus } from './types';

// TradingView Interactive Chart Component
const InteractiveTechnicalChart: React.FC<{ symbol: string; exchange: 'TWSE' | 'TPEX' }> = ({ symbol, exchange }) => {
  const container = useRef<HTMLDivElement>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!container.current) return;
    container.current.innerHTML = '';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    const tvSymbol = `${exchange}:${symbol}`;
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": tvSymbol,
      "interval": "D",
      "timezone": "Asia/Taipei",
      "theme": "light",
      "style": "1",
      "locale": "zh_TW",
      "toolbar_bg": "#f1f3f6",
      "enable_publishing": false,
      "hide_top_toolbar": false,
      "hide_legend": false,
      "save_image": false,
      "container_id": "tradingview_advanced_chart",
      "studies": [
        "MASimple@tv-basicstudies",
        "RSI@tv-basicstudies",
        "MACD@tv-basicstudies"
      ],
      "show_popup_button": true,
      "popup_width": "1000",
      "popup_height": "650"
    });
    container.current.appendChild(script);
  }, [symbol, exchange, retryKey]);

  return (
    <div className="my-8 w-full h-[500px] border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-white relative print:hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2 shadow-sm pointer-events-none">
          <Maximize2 size={14} className="text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">互動式技術圖表 ({exchange}:{symbol})</span>
        </div>
        <button 
          onClick={() => setRetryKey(k => k + 1)}
          className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg border border-slate-200 hover:bg-white transition-colors shadow-sm"
          title="重新整理圖表"
        >
          <RefreshCw size={14} className="text-slate-500" />
        </button>
      </div>
      <div id="tradingview_advanced_chart" ref={container} className="w-full h-full" />
    </div>
  );
};

// Backup SVG Static Chart Component
const StaticSVGChart: React.FC<{ data: { labels: string[], prices: number[] } }> = ({ data }) => {
  const { prices, labels } = data;
  if (!prices || prices.length < 2) return null;
  const width = 800;
  const height = 200;
  const padding = 30;
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;
  const priceRange = maxPrice - minPrice;
  const points = prices.map((price, i) => {
    const x = padding + (i / (prices.length - 1)) * (width - padding * 2);
    const y = height - padding - ((price - minPrice) / priceRange) * (height - padding * 2);
    return { x, y };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <div className="hidden print:block my-6 border border-slate-300 p-4">
      <p className="text-xs font-bold mb-2">歷史價格走勢圖 (列印版)</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <path d={linePath} fill="none" stroke="#000" strokeWidth="1.5" />
        {points.filter((_, i) => i % 6 === 0).map((p, i) => (
          <text key={i} x={p.x} y={height - 5} fontSize="8" textAnchor="middle">{labels[i*6] || labels[i]}</text>
        ))}
      </svg>
    </div>
  );
};

// Enhanced content renderer with Buy Strategy highlighting
const AnalysisContent: React.FC<{ text: string; stockCode: string; exchange: 'TWSE' | 'TPEX' }> = ({ text, stockCode, exchange }) => {
  const dataMatch = text.match(/\[DATA_START\]([\s\S]*?)\[DATA_END\]/);
  const cleanText = text.replace(/\[DATA_START\][\s\S]*?\[DATA_END\]/, '').trim();
  
  let backupChartData = null;
  if (dataMatch && dataMatch[1]) {
    try { backupChartData = JSON.parse(dataMatch[1].trim()); } catch (e) {}
  }

  const lines = cleanText.split('\n');
  const elements: React.ReactNode[] = [];
  let currentTable: string[][] = [];
  let isInsideBuyStrategy = false;
  let buyStrategyLines: React.ReactNode[] = [];

  const flushTable = (index: number) => {
    if (currentTable.length > 0) {
      elements.push(
        <div key={`table-${index}`} className="my-6 overflow-x-auto print:overflow-visible rounded-xl border border-slate-200 print:border-slate-300">
          <table className="min-w-full divide-y divide-slate-200 print:divide-slate-300">
            <thead className="bg-slate-50 print:bg-slate-100">
              <tr>
                {currentTable[0].map((cell, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-bold text-slate-500 print:text-slate-800 uppercase tracking-wider">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200 print:divide-slate-300">
              {currentTable.slice(1).filter(row => row.some(c => c.includes('---')) === false).map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3 text-sm text-slate-600 print:text-slate-900">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = [];
    }
  };

  lines.forEach((line, i) => {
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
    const trimmed = line.trim();
    
    if (trimmed.includes('建議買入價格') || trimmed.includes('交易時機')) {
      flushTable(i);
      isInsideBuyStrategy = true;
      return;
    } else if (isInsideBuyStrategy && (trimmed.startsWith('##') || trimmed.match(/^[*]*7\./) || trimmed.match(/^[*]*8\./))) {
      elements.push(
        <div key={`buy-strategy-box-${i}`} className="buy-strategy-box my-10 bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 relative overflow-hidden print:border-slate-300 print:bg-white print:p-6">
          <div className="absolute top-0 right-0 p-4 opacity-10 print:hidden">
            <Target size={120} className="text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-200 print:shadow-none print:text-black print:bg-transparent print:p-0">
                <Zap size={20} className="print:hidden" />
              </div>
              <h2 className="text-2xl font-black text-emerald-900 print:text-black">建議買入價格與時機策略</h2>
            </div>
            <div className="space-y-4">
              {buyStrategyLines}
            </div>
          </div>
        </div>
      );
      buyStrategyLines = [];
      isInsideBuyStrategy = false;
    }

    if (isTableRow) {
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      currentTable.push(cells);
    } else {
      if (!isInsideBuyStrategy) flushTable(i);
      
      const content = (
        <React.Fragment key={i}>
          {trimmed.startsWith('###') ? (
            <h3 className="text-xl font-bold mt-8 mb-4 text-slate-800 flex items-center gap-2 border-l-4 border-indigo-500 pl-3 print:border-l-4 print:border-black">
              {trimmed.replace('###', '').trim()}
            </h3>
          ) : trimmed.startsWith('##') ? (
            <h2 className="text-2xl font-bold mt-12 mb-6 text-indigo-700 border-b-2 border-indigo-100 pb-2 print:text-black print:border-black">
              {trimmed.replace('##', '').trim()}
            </h2>
          ) : trimmed.startsWith('# ') ? (
            <h1 className="text-3xl font-black mt-4 mb-8 text-slate-900 border-b-4 border-slate-900 pb-4">
              {trimmed.replace('#', '').trim()}
            </h1>
          ) : trimmed.startsWith('-') || trimmed.startsWith('*') ? (
            <div className="flex gap-3 ml-4 mb-3">
              <ChevronRight size={16} className={`${isInsideBuyStrategy ? 'text-emerald-500' : 'text-indigo-500'} shrink-0 mt-1 print:hidden`} />
              <p className={`${isInsideBuyStrategy ? 'text-emerald-900 font-medium' : 'text-slate-600'} print:text-slate-900 leading-relaxed`}>
                {trimmed.replace(/^[-*]\s*/, '').trim()}
              </p>
            </div>
          ) : trimmed === '' ? null : (
            <p className={`${isInsideBuyStrategy ? 'text-emerald-800 font-bold text-lg' : 'text-slate-600'} print:text-slate-900 mb-4 leading-relaxed`}>
              {line}
            </p>
          )}
        </React.Fragment>
      );

      if (isInsideBuyStrategy) {
        if (content) buyStrategyLines.push(content);
      } else {
        if ((trimmed.includes('技術走勢分析') || trimmed.includes('技術面分析'))) {
          elements.push(<h2 key={`h2-${i}`} className="text-2xl font-bold mt-12 mb-6 text-indigo-700 border-b-2 border-indigo-100 pb-2 print:text-black print:border-black">{trimmed.replace(/#+/g, '').trim()}</h2>);
          elements.push(<InteractiveTechnicalChart key={`int-chart-${i}`} symbol={stockCode} exchange={exchange} />);
          if (backupChartData) elements.push(<StaticSVGChart key={`static-chart-${i}`} data={backupChartData} />);
          return;
        }
        if (content) elements.push(content);
      }
    }
  });
  
  if (isInsideBuyStrategy && buyStrategyLines.length > 0) {
    elements.push(
      <div key={`buy-strategy-final`} className="buy-strategy-box my-10 bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 relative overflow-hidden print:border-slate-300 print:bg-white print:p-6">
        <div className="absolute top-0 right-0 p-4 opacity-10 print:hidden">
          <Target size={120} className="text-emerald-600" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-200 print:bg-transparent print:p-0 print:text-black print:shadow-none">
              <Zap size={20} className="print:hidden" />
            </div>
            <h2 className="text-2xl font-black text-emerald-900 print:text-black">建議買入價格與時機策略</h2>
          </div>
          <div className="space-y-4">
            {buyStrategyLines}
          </div>
        </div>
      </div>
    );
  }

  flushTable(lines.length);
  return <div className="analysis-report print:text-black print:overflow-visible">{elements}</div>;
};

const App: React.FC = () => {
  const [stockCode, setStockCode] = useState('');
  const [status, setStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!stockCode.trim()) return;
    setStatus(LoadingStatus.LOADING);
    setError(null);
    try {
      const result = await analyzeStock(stockCode);
      setAnalysis(result);
      setStatus(LoadingStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError('分析過程發生錯誤。這可能是由於網路問題或 API 限制，請稍後再試。');
      setStatus(LoadingStatus.ERROR);
    }
  }, [stockCode]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 print:bg-white print:block print:h-auto">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md bg-white/90 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">台股 AI 智慧分析</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Taiwan Stock Intelligence</p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <input
              type="text"
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="請輸入台股代碼 (如: 9904, 2330)..."
              className="w-full px-5 py-3 pr-14 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none bg-slate-50 text-slate-900 placeholder-slate-400 transition-all shadow-sm"
            />
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={status === LoadingStatus.LOADING}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md shadow-indigo-100"
            >
              {status === LoadingStatus.LOADING ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
          </form>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full print:py-0 print:px-0 print:max-w-none">
        {status === LoadingStatus.IDLE && (
          <div className="text-center py-24 print:hidden">
            <div className="max-w-xl mx-auto">
              <div className="mb-8 relative inline-block">
                <div className="absolute inset-0 bg-indigo-100 blur-3xl rounded-full scale-150 opacity-50"></div>
                <Activity size={80} className="relative text-indigo-600 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-4">掌握台股脈動，精準預測未來</h2>
              <p className="text-lg text-slate-500 leading-relaxed mb-8">
                輸入代碼獲取 AI 深度研究報告：含具體買點建議、互動式走勢圖、與 5 年 EPS 成長分析。
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {['2330', '9904', '2317', '2454', '2603'].map(code => (
                  <button 
                    key={code}
                    onClick={() => { setStockCode(code); }}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                  >
                    熱門搜尋: {code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {status === LoadingStatus.LOADING && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 print:hidden">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <Activity size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-800">正在生成深度分析報告</p>
              <p className="text-slate-500 mt-2">正在計算買進區間並評估交易時機策略...</p>
            </div>
          </div>
        )}

        {status === LoadingStatus.ERROR && (
          <div className="max-w-2xl mx-auto bg-white border border-red-100 rounded-3xl p-10 text-center shadow-xl shadow-red-50 print:hidden">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">無法完成分析</h3>
            <p className="text-slate-500 mb-8">{error}</p>
            <button onClick={() => handleSearch()} className="px-8 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all">重新搜尋</button>
          </div>
        )}

        {status === LoadingStatus.SUCCESS && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start print:block">
            <div className="lg:col-span-8 space-y-8 print:col-span-12 print:space-y-0">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:overflow-visible">
                <div className="bg-slate-50/50 border-b border-slate-200 px-8 py-6 flex items-center justify-between print:hidden">
                  <div className="flex items-center gap-3 text-slate-800 font-bold text-lg">
                    <FileText size={22} className="text-indigo-600" />
                    專業深度分析報告
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95">
                      <Printer size={18} /> 列印 / 存為 PDF
                    </button>
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-3 py-1 rounded-full">
                      {analysis.exchange}: {analysis.stockCode}
                    </span>
                  </div>
                </div>
                <div className="hidden print:block mb-10 pb-6 border-b-2 border-slate-900">
                  <div className="flex justify-between items-end mb-4">
                    <h1 className="text-4xl font-black text-slate-900">台股深度研究報告</h1>
                    <div className="text-right">
                      <p className="text-lg font-bold">市場標的：{analysis.exchange}:{analysis.stockCode}</p>
                      <p className="text-sm text-slate-500">報告日期：{new Date().toLocaleDateString('zh-TW')}</p>
                    </div>
                  </div>
                </div>
                <div className="px-8 py-10 print:px-0 print:py-0 print:overflow-visible">
                  <AnalysisContent text={analysis.overview} stockCode={analysis.stockCode} exchange={analysis.exchange} />
                </div>
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6 print:hidden">
              <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white rounded-3xl p-8 shadow-xl">
                <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-200" />
                  交易策略模組
                </h4>
                <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                  報告已鎖定 <span className="font-black text-white">{analysis.exchange}</span> 交易所。本次分析特別強化了「建議買入區間」，幫助您在波動市場中尋找相對安全的防禦位與進攻點。
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
