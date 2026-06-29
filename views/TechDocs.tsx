import React from 'react';
import { BookOpen, LineChart, ShieldAlert, CheckCircle2, TrendingUp, Lightbulb } from 'lucide-react';

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

            {/* 處理流程 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="text-sky-400" /> 雙軌分析處理步驟 (Step-by-Step)
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-emerald-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-emerald-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">1</span> 大盤狀態偵測</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">計算加權指數 20MA 乖離率 (Bias20)。&le;-5% 進入保守模式，&le;-10% 或單日跌 &le;-5% 進入防禦模式。連續虧損鎖定亦強制進入保守模式。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-amber-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">2</span> 第一軌：技術面</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">依個股類別 (ETF / 大型股 / 小型股) 比對：20MA 乖離率、均線斜率連增/連降天數、RSI 超買超賣，產生技術面基礎燈號。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-sky-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-sky-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">3</span> 第二軌：籌碼面</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">透過 FinMind API 抓取近 5 個交易日的外資與投信買賣超數據，並計算融資餘額當日增減幅度 (%)。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-indigo-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-indigo-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">4</span> 訊號共振 / 背離修正</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">籌碼面與技術面訊號一致時（共振）升級燈號；籌碼背離技術面時（外資賣超 + 融資大增 &ge;2%）降級為「持續觀察」。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <h4 className="font-bold text-violet-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-violet-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">5</span> 醞釀訊號 (SignalHint)</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">當技術面為「中性/觀望 (NONE)」或「風險預警」時，系統仍會分析距離買進/停利門檻的距離，顯示「🟢 醞釀強買」、「🟢 醞釀買進」、「🟡 醞釀停利」提示，並以條件標籤顯示尚缺哪些條件。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-rose-700/30">
                        <h4 className="font-bold text-rose-400 mb-1 text-sm flex items-center gap-1.5"><span className="bg-rose-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]">6</span> 最終決策 (人類)</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">系統僅提供一致性評估結果與輔助燈號。<b className="text-white">最終是否買進、加碼、停利或停損，仍由使用者自行判斷。</b></p>
                    </div>
                </div>
            </div>

            {/* 第一軌 */}
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
                                <td className="p-2 border border-slate-700 text-xs">
                                    乖離率達門檻 (預設 Bias &le; -2%) <b className="text-white">且</b> 斜率連增 <b className="text-white">且</b> RSI 未超買，產生買進訊號。<br/>
                                    <span className="text-slate-500">（大盤防禦模式下阻斷普通買進）</span>
                                </td>
                                <td className="p-2 border border-slate-700 text-xs">
                                    ETF 採「左側攤平」策略，<b className="text-white">不需要大盤條件</b>，越跌越買。<br/>
                                    • <b className="text-cyan-400">ADDITIONAL_BUY</b>：Bias &le; -4%<br/>
                                    • <b className="text-cyan-400">STRONG_ADDITIONAL_BUY</b>：Bias &le; -6%<br/>
                                    <span className="text-slate-500">（防禦模式下仍可觸發）</span>
                                </td>
                                <td className="p-2 border border-slate-700 text-xs">正乖離過大且斜率連降時分批減碼 (PARTIAL_SELL / SECOND_PARTIAL_SELL)。</td>
                                <td className="p-2 border border-slate-700 text-xs text-slate-500">無停損機制 (視為長線持有)</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-blue-400 font-bold">大型股</span></td>
                                <td className="p-2 border border-slate-700 text-xs">
                                    Bias &le; -8% (強買) / &le; -5% (普買)<br/>
                                    <b className="text-white">且</b> 斜率反轉向上連增<br/>
                                    <b className="text-white">且</b> RSI &lt; 超賣門檻
                                </td>
                                <td className="p-2 border border-slate-700 text-xs">
                                    <b className="text-cyan-400">TREND_ADD (順勢加碼)</b>：<br/>
                                    持倉中 <b className="text-white">且</b> Bias 在 0 ~ -10% 區間<br/>
                                    <b className="text-white">且</b> MA20 斜率 &gt; 0 <b className="text-white">且</b> Bias 斜率 &gt; 0<br/>
                                    <b className="text-white">且</b> RSI 40~65 <b className="text-white">且</b> 距上次買進 &ge; 冷卻期 (預設 5 日)<br/>
                                    <b className="text-white">且</b> 大盤平穩模式
                                </td>
                                <td className="p-2 border border-slate-700 text-xs">分批停利 (預設 Bias &ge; 20%)，極端正乖離 (預設 &ge; 25%) 觸發強制停利 (FORCE_SELL)。</td>
                                <td className="p-2 border border-slate-700 text-xs">三層防護：持倉虧損 &le; -7% / 乖離破底 &le; -20% → 停損；乖離預警區 → 風險預警。</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-purple-400 font-bold">小型股</span></td>
                                <td className="p-2 border border-slate-700 text-xs">
                                    容許更大波動的門檻：Bias &le; -10% (強買) / &le; -7% (普買)<br/>
                                    <b className="text-white">且</b> 斜率反轉向上連增<br/>
                                    <b className="text-white">且</b> RSI &lt; 超賣門檻
                                </td>
                                <td className="p-2 border border-slate-700 text-xs">
                                    <b className="text-cyan-400">TREND_ADD (順勢加碼)</b>：<br/>
                                    持倉中 <b className="text-white">且</b> Bias 在 0 ~ -15% 區間<br/>
                                    <b className="text-white">且</b> MA20 斜率 &gt; 0 <b className="text-white">且</b> Bias 斜率 &gt; 0<br/>
                                    <b className="text-white">且</b> RSI 40~60 <b className="text-white">且</b> 距上次買進 &ge; 冷卻期 (預設 3 日)<br/>
                                    <b className="text-white">且</b> 大盤平穩模式
                                </td>
                                <td className="p-2 border border-slate-700 text-xs">分批停利 (預設 Bias &ge; 25%)，極端正乖離 (預設 &ge; 35%) 觸發強制停利 (FORCE_SELL)。</td>
                                <td className="p-2 border border-slate-700 text-xs">三層防護：持倉虧損 &le; -10% / 乖離破底 &le; -25% → 停損；乖離預警區 → 風險預警。</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 醞釀訊號 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Lightbulb className="text-violet-400" /> 醞釀訊號 (SignalHint)：觀望期間的條件追蹤
                </h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">當技術面燈號為「中性 (NONE)」或「風險預警 (RISK_ALERT)」時，系統會啟動醞釀分析，追蹤目前距各類訊號門檻的距離，並在持倉/掃描清單上顯示以下標籤：</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-emerald-500/20">
                        <div className="text-emerald-400 font-bold text-sm mb-1">🟢 醞釀強買</div>
                        <p className="text-xs text-slate-400">乖離率已達強買門檻，但 RSI 或斜率條件未完全滿足。條件標籤會亮起已滿足者 (綠色)，標出未達標者 (灰色)。</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-emerald-500/20">
                        <div className="text-emerald-400 font-bold text-sm mb-1">🟢 醞釀買進</div>
                        <p className="text-xs text-slate-400">乖離率達普通買進門檻，等待 RSI 超賣或斜率反轉確認。已滿足條件會以綠色標籤顯示。</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-amber-500/20">
                        <div className="text-amber-400 font-bold text-sm mb-1">🟡 醞釀停利</div>
                        <p className="text-xs text-slate-400">正乖離已達停利觀察區，但斜率尚未連降確認。提示需要留意動能是否轉弱。</p>
                    </div>
                </div>
            </div>

            {/* 第二軌 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <TrendingUp className="text-purple-400" /> 第二軌：籌碼面輔助確認邏輯
                </h3>
                <p className="text-xs text-slate-400 mb-4">籌碼資料來源：FinMind API（需 Token）。追蹤近 5 個交易日的外資與投信買賣超，以及當日融資增減幅度 (%)。</p>
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
                                <td className="p-2 border border-slate-700 text-xs">
                                    原訊號偏多 (適合布局/加碼)<br/>
                                    <b className="text-white">且</b> 外資近 5 日中有 3 日以上買超<br/>
                                    <b className="text-white">且</b> 投信近 5 日中有 3 日以上買超
                                </td>
                                <td className="p-2 border border-slate-700 text-xs">燈號升級為 <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">高信心布局</span>，代表法人雙向同步認同，勝率顯著提升。</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-yellow-400 font-bold">🟡 籌碼背離 (扣分)</span></td>
                                <td className="p-2 border border-slate-700 text-xs">
                                    原訊號偏多 (適合布局/高信心)<br/>
                                    <b className="text-white">但</b> 外資近 5 日中有 3 日以上賣超<br/>
                                    <b className="text-white">且</b> 融資當日增幅 <b className="text-amber-400">&ge; +2%</b>（散戶大量融資追高）
                                </td>
                                <td className="p-2 border border-slate-700 text-xs">燈號降級為 <span className="text-yellow-400 font-bold bg-yellow-500/10 px-1 rounded">持續觀察</span>（法人出、散戶接盤，需謹慎）</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-rose-400 font-bold">🔴 主力棄守 (警報)</span></td>
                                <td className="p-2 border border-slate-700 text-xs">
                                    原訊號偏弱 (觀望/中立/賣出)<br/>
                                    <b className="text-white">且</b> 外資近 5 日中有 3 日以上賣超<br/>
                                    <b className="text-white">且</b> 投信近 5 日中有 3 日以上賣超
                                </td>
                                <td className="p-2 border border-slate-700 text-xs">強制轉為 <span className="text-rose-400 font-bold bg-rose-500/10 px-1 rounded">建議賣出</span>（外資投信同步撤出，法人棄守訊號）</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700 text-xs text-slate-400">
                    <b className="text-slate-300">籌碼觸發顯示說明：</b> 在持倉清單與掃描結果中，外資/投信/融資若有觸發條件（如連買、連賣、大增、大減），欄位會亮起對應底色，並顯示小文字說明（例：<span className="bg-emerald-500/20 text-emerald-400 px-1 rounded">連買 3日</span> 或 <span className="bg-red-500/20 text-red-400 px-1 rounded">融資大增</span>）。
                </div>
            </div>

            {/* DSS 燈號對照表 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-amber-400" /> DSS 決策輔助燈號快速對照表
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">🟢 適合布局 / 高信心布局</span>
                        </div>
                        <p className="text-[11px] text-emerald-400/80 font-mono mb-1">Bias20 &le; 門檻 &amp;&amp; BiasSlope &gt; 0 &amp;&amp; RSI &lt; 門檻</p>
                        <p className="text-xs text-slate-400">乖離率跌深且斜率反轉向上。<b className="text-white">高信心布局</b>代表技術面達標且法人（外資+投信）同步買超共振，為最高優先做多訊號。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400">🔵 適合加碼 / 順勢加碼</span>
                        </div>
                        <p className="text-[11px] text-cyan-400/80 font-mono mb-1">庫存&gt;0 &amp;&amp; MA20↑ &amp;&amp; Bias收斂 &amp;&amp; RSI 40~65 &amp;&amp; 冷卻期滿</p>
                        <p className="text-xs text-slate-400">大盤平穩時，已持倉個股出現均線走揚、負乖離收斂的順勢加碼機會。ETF 則採左側攤平（不限大盤狀態）。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">🟡 分批停利</span>
                        </div>
                        <p className="text-[11px] text-amber-400/80 font-mono mb-1">Bias20 &ge; 停利門檻 (預設 ETF:+8%, 大型:+20%, 小型:+25%)</p>
                        <p className="text-xs text-slate-400">短線正乖離過大且動能衰退（斜率連降），建議獲利了結部分部位以鎖定利潤。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">🔴 強制停利 / 建議賣出</span>
                        </div>
                        <p className="text-[11px] text-red-400/80 font-mono mb-1">Bias20 &ge; 強制門檻 或 主力棄守 (外資+投信同步賣超)</p>
                        <p className="text-xs text-slate-400">股價極端狂飆面臨下殺風險，或法人籌碼全面棄守，建議清倉出局。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-rose-700/50 md:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-700 text-white shadow-lg">⚠️ 停損 / 風險預警</span>
                        </div>
                        <p className="text-[11px] text-rose-400/80 font-mono mb-2">三層停損機制（ETF 不適用）：</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-400">
                            <div className="bg-rose-900/20 rounded p-2 border border-rose-700/30">
                                <b className="text-rose-300">第一層：損益停損</b><br/>
                                未實現損益 &le; 停損門檻<br/>
                                (大型 -7% / 小型 -10%)
                            </div>
                            <div className="bg-rose-900/20 rounded p-2 border border-rose-700/30">
                                <b className="text-rose-300">第二層：乖離破底</b><br/>
                                Bias20 &le; 破底門檻<br/>
                                (大型 -20% / 小型 -25%)
                            </div>
                            <div className="bg-amber-900/20 rounded p-2 border border-amber-700/30">
                                <b className="text-amber-300">第三層：風險預警</b><br/>
                                Bias20 進入預警區<br/>
                                系統提示但不強制停損
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 大盤模式 */}
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
                                <td className="p-2 border border-slate-700 text-xs">允許買進、加碼、順勢加碼</td>
                                <td className="p-2 border border-slate-700 text-xs">允許買進、加碼、左側攤平</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-amber-400 font-bold">🟡 保守模式</span></td>
                                <td className="p-2 border border-slate-700 text-xs">
                                    Bias20: -5% ~ -10%<br/>
                                    <b className="text-white">或</b> 單日跌幅: -3% ~ -5%<br/>
                                    <b className="text-white">或</b> 觸發連虧鎖定（連續實現虧損）
                                </td>
                                <td className="p-2 border border-slate-700 text-xs"><b className="text-amber-400">阻斷「順勢加碼 (TREND_ADD)」</b><br/>允許「買進 (搶反彈)」</td>
                                <td className="p-2 border border-slate-700 text-xs"><b className="text-emerald-400">豁免單日跌幅限制</b><br/>允許買進、左側攤平</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-rose-400 font-bold">🔴 防禦模式</span></td>
                                <td className="p-2 border border-slate-700 text-xs">
                                    Bias20 &le; -10%<br/>
                                    <b className="text-white">或</b> 單日跌幅 &le; -5%
                                </td>
                                <td className="p-2 border border-slate-700 text-xs"><b className="text-rose-400">只出不進</b><br/>阻斷所有買進與加碼訊號</td>
                                <td className="p-2 border border-slate-700 text-xs"><b className="text-cyan-400">僅放行左側加碼/強加碼</b><br/>阻斷普通買進訊號</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};
