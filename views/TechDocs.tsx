import React from 'react';
import { BookOpen, LineChart, ShieldAlert, CheckCircle2, TrendingUp } from 'lucide-react';

export const TechDocs: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6 pb-24">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <BookOpen size={24} className="text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">V5.0 DSS 決策輔助系統 (雙軌制)</h2>
                    <p className="text-slate-400">基於技術面乖離率與籌碼面共振的雙軌 AI 評估引擎 (非全自動化交易)</p>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="text-sky-400" /> 雙軌分析處理步驟 (Step-by-Step)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Step 1 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-emerald-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-emerald-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">1</span> 大盤狀態</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">抓取大盤，&le;-5% 保守模式，&le;-10% 防禦模式（凍結部分燈號）。</p>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-amber-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">2</span> 第一軌: 技術面</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">比對 20MA乖離率、均線斜率連增天數、與 RSI 產生基礎燈號。</p>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-sky-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-sky-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">3</span> 第二軌: 籌碼面</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">外資與投信近3-5日累積買賣超、融資餘額增減幅度。</p>
                    </div>

                    {/* Step 4 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-indigo-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-indigo-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">4</span> 訊號修正</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">根據籌碼共振(加分)或籌碼背離(扣分)，修正最終 DSS 輔助燈號。</p>
                    </div>

                    {/* Step 5 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 lg:col-span-2">
                        <h4 className="font-bold text-rose-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-rose-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">5</span> 最終決策 (人類)</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">系統提供一致性評估結果，最終是否執行交易仍由使用者自行判斷。</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <BookOpen className="text-emerald-400" /> 第一軌：技術面基礎判斷邏輯 (資產分類)
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs">
                            <tr>
                                <th className="p-2 border border-slate-700 w-24">分類</th>
                                <th className="p-2 border border-slate-700">🟢 買進 / 🚀 強買</th>
                                <th className="p-2 border border-slate-700">🔵 加碼 / 左側攤平</th>
                                <th className="p-2 border border-slate-700">🟡 停利 / 🔴 強制停利</th>
                                <th className="p-2 border border-slate-700">⚠️ 停損防護</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-emerald-400 font-bold">ETF</span></td>
                                <td className="p-2 border border-slate-700 text-xs">依賴 20MA 負乖離率、RSI 超賣與斜率反轉。<br/>(系統預設較淺的乖離即可觸發，如 Bias &le; -2%)</td>
                                <td className="p-2 border border-slate-700 text-xs">無冷卻期限制，越跌越買（左側攤平），依據更深的負乖離觸發。<br/>(預設: Bias &le; -4%, -6%)</td>
                                <td className="p-2 border border-slate-700 text-xs">正乖離過大且斜率連降時分批減碼。</td>
                                <td className="p-2 border border-slate-700 text-xs text-slate-500">無停損機制 (視為長線持有)</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-blue-400 font-bold">大型股</span></td>
                                <td className="p-2 border border-slate-700 text-xs">嚴格的負乖離與 RSI 雙重超賣確認，需斜率反轉。<br/>(預設需更深的負乖離如 Bias &le; -8%)</td>
                                <td className="p-2 border border-slate-700 text-xs">順勢加碼，需滿足冷卻期 (預設 5 個交易日) 且乖離收斂。</td>
                                <td className="p-2 border border-slate-700 text-xs">分批停利，極端正乖離時 (預設 25%) 觸發強制停利。</td>
                                <td className="p-2 border border-slate-700 text-xs">雙層停損機制：持倉虧損過大 (預設 -7%) 或 乖離破底 (預設 -20%)。</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-purple-400 font-bold">小型股</span></td>
                                <td className="p-2 border border-slate-700 text-xs">容許更高波動的負乖離門檻，捕捉主力洗盤反彈。<br/>(預設乖離如 Bias &le; -10%)</td>
                                <td className="p-2 border border-slate-700 text-xs">順勢加碼，冷卻期較短 (預設 3 個交易日) 且乖離收斂。</td>
                                <td className="p-2 border border-slate-700 text-xs">分批停利，極端正乖離時 (預設 35%) 觸發強制停利。</td>
                                <td className="p-2 border border-slate-700 text-xs">雙層停損機制：持倉虧損過大 (預設 -10%) 或 乖離破底 (預設 -25%)。</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <TrendingUp className="text-purple-400" /> 第二軌：籌碼面輔助確認邏輯
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs">
                            <tr>
                                <th className="p-2 border border-slate-700 w-32">情境</th>
                                <th className="p-2 border border-slate-700">觸發條件</th>
                                <th className="p-2 border border-slate-700">系統行為與燈號變化</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-emerald-400 font-bold">🟢 籌碼共振 (加分)</span></td>
                                <td className="p-2 border border-slate-700 text-xs">原訊號偏多 (適合布局/加碼)<br/><b className="text-white">且</b> 外資近3~5日累積買超<br/><b className="text-white">且</b> 投信近3~5日累積買超</td>
                                <td className="p-2 border border-slate-700 text-xs">燈號升級為 <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">高信心布局</span></td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-yellow-400 font-bold">🟡 籌碼背離 (扣分)</span></td>
                                <td className="p-2 border border-slate-700 text-xs">原訊號偏多 (適合布局/高信心)<br/><b className="text-white">但</b> 外資近3~5日累積賣超<br/><b className="text-white">且</b> 融資近5日增幅大於 0%</td>
                                <td className="p-2 border border-slate-700 text-xs">燈號降級為 <span className="text-yellow-400 font-bold bg-yellow-500/10 px-1 rounded">持續觀察</span> (散戶接盤)</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-rose-400 font-bold">🔴 主力棄守 (警報)</span></td>
                                <td className="p-2 border border-slate-700 text-xs">原訊號偏弱 (觀望/中立/賣出)<br/><b className="text-white">且</b> 外資近3~5日累積賣超<br/><b className="text-white">且</b> 投信近3~5日累積賣超</td>
                                <td className="p-2 border border-slate-700 text-xs">強制轉為 <span className="text-rose-400 font-bold bg-rose-500/10 px-1 rounded">建議賣出</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-amber-400" /> DSS 決策輔助燈號快速對照表
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">🟢 適合布局 / 高信心布局</span>
                        </div>
                        <p className="text-[11px] text-emerald-400/80 font-mono mb-1">Bias20 &le; 參數門檻 &amp;&amp; BiasSlope &gt; 0</p>
                        <p className="text-xs text-slate-400">乖離率跌深且斜率反轉向上。高信心布局代表籌碼面法人同步買超共振，勝率極高。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400">🔵 適合加碼</span>
                        </div>
                        <p className="text-[11px] text-cyan-400/80 font-mono mb-1">庫存&gt;0 &amp;&amp; Bias20收斂 &amp;&amp; 距上次買進&gt;冷卻期</p>
                        <p className="text-xs text-slate-400">大盤正常且負乖離再次收斂，提示安全的右側加碼點，或 ETF 的左側攤平點。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">🟡 分批停利</span>
                        </div>
                        <p className="text-[11px] text-amber-400/80 font-mono mb-1">Bias20 &ge; 停利門檻 (預設 20%)</p>
                        <p className="text-xs text-slate-400">短線正乖離過大且動能衰退，建議獲利了結部分部位以鎖定利潤。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">🔴 強制停利 / 建議賣出</span>
                        </div>
                        <p className="text-[11px] text-red-400/80 font-mono mb-1">Bias20 &ge; 強制門檻 或 主力棄守</p>
                        <p className="text-xs text-slate-400">股價極端狂飆面臨下殺風險，或法人籌碼全面棄守，建議清倉出局。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-rose-700/50 md:col-span-2">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-700 text-white shadow-lg">⚠️ 停損預警 / 風險預警</span>
                        </div>
                        <p className="text-[11px] text-rose-400/80 font-mono mb-1">未實現損益 &le; 停損門檻 || Bias20 &le; 破線門檻</p>
                        <p className="text-xs text-slate-400"><b>(防呆停損)</b> 持股虧損過大，或股價無底洞跌破乖離率底線，將觸發最高優先級防護，強制停損防接刀子。</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <LineChart className="text-sky-400" /> 大盤三段式雙軌制 (大盤狀態)
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs">
                            <tr>
                                <th className="p-2 border border-slate-700 w-24">模式</th>
                                <th className="p-2 border border-slate-700">觸發條件 (較保守者優先)</th>
                                <th className="p-2 border border-slate-700">對個股的影響</th>
                                <th className="p-2 border border-slate-700">對 ETF 的影響</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-slate-400 font-bold">平穩模式</span></td>
                                <td className="p-2 border border-slate-700 text-xs">Bias20 &gt; -5% <b className="text-white">且</b> 單日跌幅 &gt; -3%</td>
                                <td className="p-2 border border-slate-700 text-xs">允許買進與加碼</td>
                                <td className="p-2 border border-slate-700 text-xs">允許買進與加碼</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-amber-400 font-bold">🟡 保守模式</span></td>
                                <td className="p-2 border border-slate-700 text-xs">Bias20: -5% ~ -10%<br/><b className="text-white">或</b> 單日跌幅: -3% ~ -5%<br/><b className="text-white">或</b> 觸發連虧鎖定</td>
                                <td className="p-2 border border-slate-700 text-xs"><b className="text-amber-400">阻斷「順勢加碼」</b><br/>允許「買進 (搶反彈)」</td>
                                <td className="p-2 border border-slate-700 text-xs"><b className="text-emerald-400">豁免單日跌幅限制</b><br/>允許買進、加碼</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-rose-400 font-bold">🔴 防禦模式</span></td>
                                <td className="p-2 border border-slate-700 text-xs">Bias20 &le; -10%<br/><b className="text-white">或</b> 單日跌幅 &le; -5%</td>
                                <td className="p-2 border border-slate-700 text-xs"><b className="text-rose-400">只出不進</b><br/>阻斷所有買進與加碼</td>
                                <td className="p-2 border border-slate-700 text-xs"><b className="text-cyan-400">僅放行加碼/強加碼</b><br/>阻斷普通買進</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};
