import React from 'react';
import { BookOpen, LineChart, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const TechDocs: React.FC = () => {
    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in p-2 md:p-6 pb-24 md:pb-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <BookOpen size={24} className="text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">V4.0 全自動決策邏輯解析</h2>
                    <p className="text-slate-400">了解系統在按下「分析」時，背後執行的 5 大關卡步驟</p>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="text-sky-400" /> 分析處理步驟 (Step-by-Step)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Step 1 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-emerald-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-emerald-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">1</span> 大盤濾網</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">抓取大盤，&le;-5% 保守模式，&le;-10% 防禦模式（凍結買進）。</p>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-amber-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">2</span> 連虧鎖定</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">偵測歷史紀錄，若連 3 筆賣出虧損，強制暫停積極買進。</p>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-sky-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-sky-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">3</span> 股票分級</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">大型股(&le;-7%) / 小型股(&le;-10%) / ETF(只買不賣)。</p>
                    </div>

                    {/* Step 4 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-indigo-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-indigo-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">4</span> 指標計算</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">計算 20MA乖離、連續斜率、RSI、散戶融資變化。</p>
                    </div>

                    {/* Step 5 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 lg:col-span-2">
                        <h4 className="font-bold text-rose-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-rose-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">5</span> 庫存感知</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">對照現有庫存，觸發「順勢加碼」或「停損警示」。</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-amber-400" /> 訊號燈號快速對照表
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">🟢 買進 / 🚀 強力買進</span>
                        </div>
                        <p className="text-[11px] text-emerald-400/80 font-mono mb-1">Bias20 &le; 參數門檻 &amp;&amp; BiasSlope &gt; 0</p>
                        <p className="text-xs text-slate-400">乖離率跌深且斜率反轉向上。強力買進代表 RSI 極低且量能配合，勝率極高。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400">💰 加碼 / 🔥 強力加碼</span>
                        </div>
                        <p className="text-[11px] text-cyan-400/80 font-mono mb-1">Bias20 &le; 參數門檻 (限ETF)</p>
                        <p className="text-xs text-slate-400"><b>(ETF 專屬)</b> 不看趨勢轉折，純粹依照左側交易紀律越跌越買、無腦攤平。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">🔵 順勢加碼</span>
                        </div>
                        <p className="text-[11px] text-blue-400/80 font-mono mb-1">庫存&gt;0 &amp;&amp; Bias20收斂 &amp;&amp; 距上次買進&gt;3天</p>
                        <p className="text-xs text-slate-400"><b>(庫存專屬)</b> 您已持有此股，大盤正常且負乖離再次收斂，提示安全的右側加碼點。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">🟡 部分減碼</span>
                        </div>
                        <p className="text-[11px] text-amber-400/80 font-mono mb-1">Bias20 &ge; 停利門檻 (預設 20%)</p>
                        <p className="text-xs text-slate-400">短線正乖離過大且動能衰退，建議獲利了結 1/3 或 1/2 鎖定利潤。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">🔴 強制停利</span>
                        </div>
                        <p className="text-[11px] text-red-400/80 font-mono mb-1">Bias20 &ge; 強制停利門檻 (預設 25%)</p>
                        <p className="text-xs text-slate-400">股價出現極端不合理的狂飆（正乖離過大），面臨均值回歸下殺風險，建議清倉。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-rose-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-700 text-white shadow-lg">⚠️ 停損警示</span>
                        </div>
                        <p className="text-[11px] text-rose-400/80 font-mono mb-1">庫存&gt;0 &amp;&amp; Bias20 &le; 停損門檻 (預設 -20%)</p>
                        <p className="text-xs text-slate-400"><b>(庫存專屬)</b> 負乖離跌破極限門檻（大型 -20% / 小型 -25%），建議立即審視風險。</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
