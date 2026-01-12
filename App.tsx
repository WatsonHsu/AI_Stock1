
import React, { useState, useCallback } from 'react';
import { Search, Info, ExternalLink, Activity, Loader2, AlertCircle, FileText, Printer, TrendingUp, BarChart3, ChevronRight } from 'lucide-react';
import { analyzeStock } from './services/geminiService';
import { StockAnalysis, LoadingStatus } from './types';

// Enhanced content renderer that handles Markdown elements
const AnalysisContent: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentTable: string[][] = [];

  const flushTable = (index: number) => {
    if (currentTable.length > 0) {
      elements.push(
        <div key={`table-${index}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 print:border-slate-300">
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
    
    if (isTableRow) {
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      currentTable.push(cells);
    } else {
      flushTable(i);
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        elements.push(<h3 key={i} className="text-xl font-bold mt-8 mb-4 text-slate-800 flex items-center gap-2 border-l-4 border-indigo-500 pl-3 print:border-l-4 print:border-black">
          {trimmed.replace('###', '').trim()}
        </h3>);
      } else if (trimmed.startsWith('##')) {
        elements.push(<h2 key={i} className="text-2xl font-bold mt-12 mb-6 text-indigo-700 border-b-2 border-indigo-100 pb-2 print:text-black print:border-black">{trimmed.replace('##', '').trim()}</h2>);
      } else if (trimmed.startsWith('# ')) {
        elements.push(<h1 key={i} className="text-3xl font-black mt-4 mb-8 text-slate-900 border-b-4 border-slate-900 pb-4">{trimmed.replace('#', '').trim()}</h1>);
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        elements.push(
          <div key={i} className="flex gap-3 ml-4 mb-3">
            <ChevronRight size={16} className="text-indigo-500 shrink-0 mt-1 print:hidden" />
            <p className="text-slate-600 print:text-slate-900 leading-relaxed">{trimmed.substring(1).trim()}</p>
          </div>
        );
      } else if (trimmed === '') {
        // Skip
      } else {
        elements.push(<p key={i} className="text-slate-600 print:text-slate-900 mb-4 leading-relaxed">{line}</p>);
      }
    }
  });
  flushTable(lines.length);

  return <div className="analysis-report print:text-black">{elements}</div>;
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
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 print:bg-white">
      {/* Header (Hidden on print) */}
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

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {status === LoadingStatus.IDLE && (
          <div className="text-center py-24 print:hidden">
            <div className="max-w-xl mx-auto">
              <div className="mb-8 relative inline-block">
                <div className="absolute inset-0 bg-indigo-100 blur-3xl rounded-full scale-150 opacity-50"></div>
                <Activity size={80} className="relative text-indigo-600 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-4">掌握台股脈動，精準預測未來</h2>
              <p className="text-lg text-slate-500 leading-relaxed mb-8">
                輸入代碼獲取 AI 深度研究報告：含法人籌碼、2年技術趨勢文字分析、新聞彙整及股利表。
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
              <p className="text-slate-500 mt-2">正在搜尋法人動態、技術走勢、與近一個月重大新聞...</p>
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
            <button
              onClick={() => handleSearch()}
              className="px-8 py-3 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
              重新搜尋
            </button>
          </div>
        )}

        {status === LoadingStatus.SUCCESS && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column - Main Analysis */}
            <div className="lg:col-span-8 space-y-8 print:col-span-12">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                {/* Desktop/Web Header */}
                <div className="bg-slate-50/50 border-b border-slate-200 px-8 py-6 flex items-center justify-between print:hidden">
                  <div className="flex items-center gap-3 text-slate-800 font-bold text-lg">
                    <FileText size={22} className="text-indigo-600" />
                    專業深度分析報告
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handlePrint}
                      title="列印報告或存為 PDF"
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-100 active:scale-95"
                    >
                      <Printer size={18} /> 列印 / 存為 PDF
                    </button>
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-3 py-1 rounded-full">
                      代碼: {analysis.stockCode}
                    </span>
                  </div>
                </div>

                {/* Print Header (Visible only on PDF/Print) */}
                <div className="hidden print:block mb-10 pb-6 border-b-2 border-slate-900">
                  <div className="flex justify-between items-end mb-4">
                    <h1 className="text-4xl font-black text-slate-900">台股深度研究報告</h1>
                    <div className="text-right">
                      <p className="text-lg font-bold">市場標的：{analysis.stockCode}</p>
                      <p className="text-sm text-slate-500">報告日期：{new Date().toLocaleDateString('zh-TW')}</p>
                    </div>
                  </div>
                  <p className="text-sm italic text-slate-400">本報告由 AI 自動生成，數據來自公開市場資訊，僅供內部參考。</p>
                </div>

                <div className="px-8 py-10 print:px-0 print:py-0">
                  {/* Analysis Text Body */}
                  <AnalysisContent text={analysis.overview} />
                  
                  {/* External Links Section */}
                  <div className="mt-12 pt-8 border-t border-slate-100 print:mt-12 print:pt-8 print:border-t-2 print:border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 size={22} className="text-indigo-600 print:text-black" />
                        詳細圖表數據參考
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
                      <a 
                        href={`https://tw.stock.yahoo.com/quote/${analysis.stockCode}.TW`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-white transition-all group print:border-slate-300"
                      >
                        <div>
                          <p className="font-bold text-slate-700 group-hover:text-indigo-700 print:text-black">Yahoo 股市資訊</p>
                          <p className="text-xs text-slate-400 print:text-slate-600">即時報價、技術走勢與財務比率</p>
                        </div>
                        <ExternalLink size={18} className="text-slate-300 group-hover:text-indigo-500 print:hidden" />
                      </a>
                      <a 
                        href={`https://www.tradingview.com/symbols/TWSE-${analysis.stockCode}/`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-white transition-all group print:border-slate-300"
                      >
                        <div>
                          <p className="font-bold text-slate-700 group-hover:text-indigo-700 print:text-black">TradingView 技術分析</p>
                          <p className="text-xs text-slate-400 print:text-slate-600">全功能互動 K 線圖與技術指標</p>
                        </div>
                        <ExternalLink size={18} className="text-slate-300 group-hover:text-indigo-500 print:hidden" />
                      </a>
                    </div>
                  </div>

                  {/* Print Footer Disclaimer */}
                  <div className="hidden print:block mt-20 pt-10 border-t border-slate-200 text-[10pt] text-slate-500 leading-relaxed italic">
                    <p className="mb-2 font-bold text-slate-800">【重要法律聲明】</p>
                    <p>本文件內容係基於人工智慧收集之公開資訊，僅提供作為一般性參考用途，不應被視為投資建議。作者與系統不保證資訊之準確性，對於任何投資損失不負責任。股市投資有風險，申購前應詳閱公開說明書。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Sidebars - Hidden on print) */}
            <div className="lg:col-span-4 space-y-6 print:hidden">
              <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white rounded-3xl p-8 shadow-xl shadow-indigo-100 border border-indigo-500/20">
                <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-200" />
                  籌碼面分析精華
                </h4>
                <p className="text-indigo-100 text-sm leading-relaxed mb-6">
                  報告已彙整法人買賣超數據。特別注意外資與投信的同步買盤，通常為趨勢發動的關鍵。
                </p>
                <div className="pt-6 border-t border-indigo-500/30">
                  <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest mb-1">分析引擎</p>
                  <p className="text-sm font-medium">Gemini Pro 2025 v2</p>
                </div>
              </div>

              {analysis.sourceUrls.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <ExternalLink size={18} className="text-indigo-600" />
                      引用來源 ({analysis.sourceUrls.length})
                    </div>
                  </div>
                  <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {analysis.sourceUrls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 p-3 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-2xl transition-all"
                      >
                        <div className="w-7 h-7 shrink-0 bg-slate-100 group-hover:bg-indigo-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <span className="block text-sm font-semibold text-slate-700 group-hover:text-indigo-700 truncate">
                            {url.title}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-amber-800 text-sm mb-1">使用提醒</h5>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      若要儲存報告，請點擊上方「列印 / 存為 PDF」按鈕，並在印表機目的地選擇「另存為 PDF」。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer (Hidden on print) */}
      <footer className="bg-white border-t border-slate-200 py-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-lg">
                <Activity size={20} className="text-slate-600" />
              </div>
              <span className="text-slate-900 font-bold tracking-tight">Taiwan Stock Analyst AI</span>
            </div>
            <div className="text-sm text-slate-400 max-w-sm">
              AI 工具僅供分析，不構成投資建議。投資一定有風險，申購前應詳閱公開說明書。
            </div>
            <div className="flex gap-8 text-sm font-medium text-slate-500">
              <a href="#" className="hover:text-indigo-600 transition-colors">隱私權政策</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">關於本站</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-100 text-center text-[10px] text-slate-300 uppercase tracking-[0.2em]">
            &copy; 2025 AI Investment Research. powered by gemini-3-pro.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
