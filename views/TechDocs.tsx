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

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <BookOpen className="text-violet-400" /> 各分類訊號觸發條件清單 (包含隱藏條件)
                </h3>
                
                {/* ETF */}
                <div className="mb-6">
                    <h4 className="font-bold text-emerald-400 mb-2 border-b border-slate-700 pb-1">🟢 ETF 專屬邏輯 (長期投資、越跌越買)</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-900/50 text-slate-400 text-xs">
                                <tr><th className="p-2 border border-slate-700 w-28">燈號</th><th className="p-2 border border-slate-700">觸發條件 (需同時滿足)</th><th className="p-2 border border-slate-700">底層邏輯</th></tr>
                            </thead>
                            <tbody className="text-slate-300">
                                <tr><td className="p-2 border border-slate-700"><span className="text-emerald-400 font-bold">🟢 買進</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &le; 買進乖離率<br/>2. RSI &lt; 買進RSI<br/>3. 連續 [1] 天斜率向上</td><td className="p-2 border border-slate-700 text-xs text-slate-400">跌深且出現止跌回升第一天。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-emerald-400 font-bold">🚀 強買</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &le; 強買乖離率 (-10%)<br/>2. RSI &lt; 強買RSI (40)<br/>3. 連續 [2] 天斜率向上</td><td className="p-2 border border-slate-700 text-xs text-slate-400">更深跌幅，更嚴格反轉確認。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-cyan-400 font-bold">💰 加碼</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &le; 加碼乖離率 (-15%)</td><td className="p-2 border border-slate-700 text-xs text-slate-400">跌破-15%無需等反轉，左側進場。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-cyan-400 font-bold">🔥 強加碼</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &le; 強加碼乖離率 (-20%)</td><td className="p-2 border border-slate-700 text-xs text-slate-400">系統性崩盤極端值，無腦攤平。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-amber-400 font-bold">🟡 部分停利</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &ge; 減碼乖離率 (15%)<br/>2. 連續 2 天斜率向下</td><td className="p-2 border border-slate-700 text-xs text-slate-400">漲多趨勢轉弱，獲利入袋。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-orange-400 font-bold">🟠 再次減碼</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &ge; 再次減碼乖離率 (20%)<br/>2. 連續 2 天斜率向下</td><td className="p-2 border border-slate-700 text-xs text-slate-400">乖離過大且轉弱，再次提示減碼。</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 大型股 */}
                <div className="mb-6">
                    <h4 className="font-bold text-blue-400 mb-2 border-b border-slate-700 pb-1">🔵 大型股專屬邏輯 (順勢加碼、嚴格停損)</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-900/50 text-slate-400 text-xs">
                                <tr><th className="p-2 border border-slate-700 w-28">燈號</th><th className="p-2 border border-slate-700">觸發條件 (需同時滿足)</th><th className="p-2 border border-slate-700">底層邏輯</th></tr>
                            </thead>
                            <tbody className="text-slate-300">
                                <tr><td className="p-2 border border-slate-700"><span className="text-emerald-400 font-bold">🟢 買進</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &le; 買進乖離率<br/>2. RSI &lt; 買進RSI<br/>3. 連續 [1] 天斜率向上</td><td className="p-2 border border-slate-700 text-xs text-slate-400">回檔至均線下方的首日反轉。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-emerald-400 font-bold">🚀 強買</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &le; 強買乖離率 (-10%)<br/>2. RSI &lt; 強買RSI (40)<br/>3. 連續 [2] 天斜率向上</td><td className="p-2 border border-slate-700 text-xs text-slate-400">超跌後連續兩天反轉，確認支撐。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-blue-400 font-bold">🔵 順勢加碼</span></td><td className="p-2 border border-slate-700 text-xs">1. 庫存持有中 &amp;&amp; 大盤正常<br/>2. 0% &ge; Bias20 &gt; -10%<br/>3. 月線向上 &amp;&amp; 斜率向上<br/>4. RSI(40~65)<br/>5. 距上次買進 &gt; [3] 天 (冷卻期)</td><td className="p-2 border border-slate-700 text-xs text-slate-400">右側動能交易，確認獲利趨勢向上時再放大部位。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-amber-400 font-bold">🟡 部分停利</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &ge; 停利乖離率 (20%)<br/>2. 連續 2 天斜率向下</td><td className="p-2 border border-slate-700 text-xs text-slate-400">漲勢衰退，了結一半。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-red-400 font-bold">🔴 強制停利</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &ge; 強制停利乖離率 (25%)</td><td className="p-2 border border-slate-700 text-xs text-slate-400">短線過熱，面臨泡沫化回檔風險。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-rose-400 font-bold">⚠️ 停損警示</span></td><td className="p-2 border border-slate-700 text-xs">1. 庫存持有中<br/>2. Bias20 &le; 停損乖離率 (-20%)</td><td className="p-2 border border-slate-700 text-xs text-slate-400">最高優先級防護，強制停損。</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 小型股 */}
                <div>
                    <h4 className="font-bold text-purple-400 mb-2 border-b border-slate-700 pb-1">🟣 小型股專屬邏輯 (極度震盪、最嚴防騙)</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-900/50 text-slate-400 text-xs">
                                <tr><th className="p-2 border border-slate-700 w-28">燈號</th><th className="p-2 border border-slate-700">觸發條件 (需同時滿足)</th><th className="p-2 border border-slate-700">底層邏輯</th></tr>
                            </thead>
                            <tbody className="text-slate-300">
                                <tr><td className="p-2 border border-slate-700"><span className="text-emerald-400 font-bold">🟢 買進</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &le; 買進乖離率<br/>2. RSI &lt; 買進RSI<br/>3. 連續 [2] 天斜率向上</td><td className="p-2 border border-slate-700 text-xs text-slate-400">小型股易假突破，需連兩天上漲。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-emerald-400 font-bold">🚀 強買</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &le; 強買乖離率 (-15%)<br/>2. RSI &lt; 強買RSI (35)<br/>3. 連續 [3] 天斜率向上</td><td className="p-2 border border-slate-700 text-xs text-slate-400">必須連三天上漲確認洗盤結束才重倉。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-blue-400 font-bold">🔵 順勢加碼</span></td><td className="p-2 border border-slate-700 text-xs">1. 庫存持有中 &amp;&amp; 大盤正常<br/>2. 0% &ge; Bias20 &gt; -15%<br/>3. 月線向上 &amp;&amp; 斜率向上<br/>4. RSI(40~60)<br/>5. 距上次買進 &gt; [5] 天 (冷卻期)</td><td className="p-2 border border-slate-700 text-xs text-slate-400">波動大，加碼冷卻期拉長防頻繁洗盤。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-amber-400 font-bold">🟡 部分停利</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &ge; 停利乖離率 (25%)<br/>2. 連續 2 天斜率向下</td><td className="p-2 border border-slate-700 text-xs text-slate-400">容忍較大漲幅才停利，讓利潤奔跑。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-red-400 font-bold">🔴 強制停利</span></td><td className="p-2 border border-slate-700 text-xs">1. Bias20 &ge; 強制停利乖離率 (30%)</td><td className="p-2 border border-slate-700 text-xs text-slate-400">短線飆漲達 30%，面臨爆發點下車。</td></tr>
                                <tr><td className="p-2 border border-slate-700"><span className="text-rose-400 font-bold">⚠️ 停損警示</span></td><td className="p-2 border border-slate-700 text-xs">1. 庫存持有中<br/>2. Bias20 &le; 停損乖離率 (-25%)</td><td className="p-2 border border-slate-700 text-xs text-slate-400">容忍更深洗盤跌幅，但破線仍須斷然停損。</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-4">* 註：表內的 [ ] 天數或數值，皆可至「系統設定 &gt; 技術面參數設定 &gt; 進階設定」中手動修改。</p>
            </div>
        </div>
    );
};
