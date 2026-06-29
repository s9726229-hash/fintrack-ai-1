import React from 'react';
import { BookOpen, LineChart, ShieldAlert, CheckCircle2, TrendingUp, Lightbulb, Zap } from 'lucide-react';

export const TechDocs: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in p-2 md:p-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <BookOpen size={24} className="text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">V5.0 DSS 決策輔助系統 (雙軌制)</h2>
                    <p className="text-slate-400">基於技術面乖離率與籌碼面共振的雙軌 AI 評估引擎｜最終交易決策由使用者自行判斷</p>
                </div>
            </div>

            {/* ── 1. 燈號快速對照（最重要，放最前） ── */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Zap className="text-amber-400" /> DSS 決策輔助燈號快速對照表
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* 買進類 */}
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-emerald-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">🚀 強力布局</span>
                            <span className="text-[10px] text-slate-500">技術面 × 籌碼共振</span>
                        </div>
                        <p className="text-[11px] text-emerald-400/80 font-mono mb-1">Bias20 ≤ 強買門檻 &amp;&amp; RSI達標 &amp;&amp; 斜率↑ &amp;&amp; 外資+投信同買</p>
                        <p className="text-xs text-slate-400">乖離深、斜率反轉、法人雙向共振。系統最高優先度的做多訊號。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">🟢 適合布局</span>
                        </div>
                        <p className="text-[11px] text-emerald-400/80 font-mono mb-1">Bias20 ≤ 買進門檻 &amp;&amp; BiasSlope↑ &amp;&amp; RSI&lt;門檻</p>
                        <p className="text-xs text-slate-400">乖離率跌深且斜率反轉向上，滿足技術面基礎布局條件。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-cyan-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400">🔵 適合加碼</span>
                        </div>
                        <p className="text-[11px] text-cyan-400/80 font-mono mb-1">持倉中 &amp;&amp; MA20↑ &amp;&amp; Bias收斂 &amp;&amp; RSI 40~65 &amp;&amp; 冷卻期滿</p>
                        <p className="text-xs text-slate-400">大盤平穩、均線走揚、乖離收斂，順勢右側加碼點。ETF 則採左側攤平（不受大盤限制）。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-violet-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400">🟣 醞釀中</span>
                            <span className="text-[10px] text-slate-500">尚未完全觸發</span>
                        </div>
                        <p className="text-[11px] text-violet-400/80 font-mono mb-1">乖離達門檻，但 RSI 或斜率條件未完全滿足</p>
                        <p className="text-xs text-slate-400">「醞釀強買」/ 「醞釀買進」/ 「醞釀停利」。條件標籤顯示哪些達標（綠）哪些未達（灰）。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">🟡 分批停利</span>
                        </div>
                        <p className="text-[11px] text-amber-400/80 font-mono mb-1">Bias20 ≥ 停利門檻 &amp;&amp; 斜率連降</p>
                        <p className="text-xs text-slate-400">短線正乖離過大且動能衰退，建議分批獲利了結部分部位。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-orange-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400">🟠 持續觀察</span>
                            <span className="text-[10px] text-slate-500">籌碼背離降級</span>
                        </div>
                        <p className="text-[11px] text-orange-400/80 font-mono mb-1">原訊號偏多，但外資連賣 &amp;&amp; 融資大增≥+2%</p>
                        <p className="text-xs text-slate-400">技術面看多，但法人出、散戶接盤，籌碼背離，降級保守觀察。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-red-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">🔴 強制停利 / 建議賣出</span>
                        </div>
                        <p className="text-[11px] text-red-400/80 font-mono mb-1">Bias20 ≥ 強制門檻 或 主力棄守（外資+投信同步連賣）</p>
                        <p className="text-xs text-slate-400">股價極端狂飆，或法人籌碼全面棄守，建議清倉出局。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-rose-700/50">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-700 text-white">⚠️ 停損預警 / 風險預警</span>
                        </div>
                        <p className="text-[11px] text-rose-400/80 font-mono mb-1">未實現損益 ≤ 停損門檻（大型-8% / 小型-10%）或 Bias20 ≤ 破底門檻</p>
                        <p className="text-xs text-slate-400"><b>三層防護（ETF免除）：</b>① 損益停損 → ② 乖離破底 → ③ 乖離進入預警區（提示但不強制）。</p>
                    </div>
                </div>
            </div>

            {/* ── 2. 處理流程 ── */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="text-sky-400" /> 雙軌分析處理步驟 (Step-by-Step)
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                    {[
                        { step: '1', color: 'emerald', title: '大盤偵測', desc: 'TWII Bias20：≤-5% 保守、≤-10% 防禦、連虧鎖定' },
                        { step: '2', color: 'amber', title: '第一軌 技術面', desc: '依資產類別比對乖離率 / 斜率 / RSI，產生基礎燈號' },
                        { step: '3', color: 'sky', title: '第二軌 籌碼面', desc: 'FinMind API：外資投信近5日買賣超 + 融資增減幅' },
                        { step: '4', color: 'indigo', title: '共振 / 背離修正', desc: '法人共振→升級；外資賣+融資大增→降級觀察' },
                        { step: '5', color: 'violet', title: '醞釀訊號分析', desc: 'NONE/RISK_ALERT 時顯示條件缺口標籤' },
                        { step: '6', color: 'rose', title: '最終決策（人類）', desc: '系統輔助，買賣操作仍由使用者自行判斷' },
                    ].map(({ step, color, title, desc }) => (
                        <div key={step} className={`flex-1 bg-slate-900/50 p-3 rounded-xl border border-${color}-500/20 flex flex-col gap-1`}>
                            <div className={`text-xs font-bold text-${color}-400 flex items-center gap-1`}>
                                <span className={`bg-${color}-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px]`}>{step}</span>
                                {title}
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── 3. 第一軌：技術面 ── */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <BookOpen className="text-emerald-400" /> 第一軌：技術面基礎判斷邏輯（依資產分類）
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs">
                            <tr>
                                <th className="p-2 border border-slate-700 w-20">分類</th>
                                <th className="p-2 border border-slate-700">🟢 買進 / 強買</th>
                                <th className="p-2 border border-slate-700">🔵 加碼方式</th>
                                <th className="p-2 border border-slate-700">🟡 停利 / 🔴 強制停利</th>
                                <th className="p-2 border border-slate-700">⚠️ 停損防護</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 text-xs">
                            <tr>
                                <td className="p-2 border border-slate-700 font-bold text-emerald-400">ETF</td>
                                <td className="p-2 border border-slate-700">
                                    Bias ≤ -7%（普）/ ≤ -10%（強）<br/>
                                    <b className="text-white">且</b> 斜率反轉 <b className="text-white">且</b> RSI &lt; 45/40<br/>
                                    <span className="text-slate-500 text-[10px]">防禦模式下阻斷普通買進</span>
                                </td>
                                <td className="p-2 border border-slate-700">
                                    <b className="text-cyan-400">左側攤平（不限大盤）</b><br/>
                                    Bias ≤ -15% → 加碼<br/>
                                    Bias ≤ -20% → 強加碼<br/>
                                    <span className="text-slate-500 text-[10px]">防禦模式下仍可觸發</span>
                                </td>
                                <td className="p-2 border border-slate-700">
                                    分批停利：Bias ≥ +15%<br/>
                                    第二批：Bias ≥ +20%<br/>
                                    <span className="text-slate-500 text-[10px]">需斜率連降確認</span>
                                </td>
                                <td className="p-2 border border-slate-700 text-slate-500">無停損機制<br/>視為長線持有</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700 font-bold text-blue-400">大型股</td>
                                <td className="p-2 border border-slate-700">
                                    Bias ≤ -7%（普）/ ≤ -10%（強）<br/>
                                    <b className="text-white">且</b> 斜率反轉 <b className="text-white">且</b> RSI &lt; 45/40
                                </td>
                                <td className="p-2 border border-slate-700">
                                    <b className="text-cyan-400">順勢加碼（需大盤平穩）</b><br/>
                                    持倉中 &amp;&amp; Bias 0 ~ -10%<br/>
                                    MA20↑ &amp;&amp; RSI 40~65<br/>
                                    距上次買進 ≥ <b className="text-white">5 日</b>
                                </td>
                                <td className="p-2 border border-slate-700">
                                    分批停利：Bias ≥ +20%<br/>
                                    強制停利：Bias ≥ +25%
                                </td>
                                <td className="p-2 border border-slate-700">
                                    損益停損：≤ <b className="text-rose-400">-8%</b><br/>
                                    乖離破底：≤ -20%<br/>
                                    風險預警：≤ -15%
                                </td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700 font-bold text-purple-400">小型股</td>
                                <td className="p-2 border border-slate-700">
                                    Bias ≤ -10%（普）/ ≤ -15%（強）<br/>
                                    <b className="text-white">且</b> 斜率反轉 <b className="text-white">且</b> RSI &lt; 40/35
                                </td>
                                <td className="p-2 border border-slate-700">
                                    <b className="text-cyan-400">順勢加碼（需大盤平穩）</b><br/>
                                    持倉中 &amp;&amp; Bias 0 ~ -15%<br/>
                                    MA20↑ &amp;&amp; RSI 40~60<br/>
                                    距上次買進 ≥ <b className="text-white">5 日</b>
                                </td>
                                <td className="p-2 border border-slate-700">
                                    分批停利：Bias ≥ +25%<br/>
                                    強制停利：Bias ≥ +30%
                                </td>
                                <td className="p-2 border border-slate-700">
                                    損益停損：≤ <b className="text-rose-400">-10%</b><br/>
                                    乖離破底：≤ -25%<br/>
                                    風險預警：≤ -18%
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── 4. 醞釀訊號 ── */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <Lightbulb className="text-violet-400" /> 醞釀訊號（SignalHint）：觀望期間的條件追蹤
                </h3>
                <p className="text-xs text-slate-400 mb-4">當燈號為「中性 (NONE)」或「風險預警」時，系統自動分析距各門檻的距離，並顯示條件達標標籤（綠色 = 達標 / 灰色 = 未達）。</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-emerald-500/20">
                        <div className="text-emerald-400 font-bold text-sm mb-1">🟢 醞釀強買</div>
                        <p className="text-xs text-slate-400">乖離已達強買門檻，等待 RSI 超賣或斜率確認中。</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-emerald-500/20">
                        <div className="text-emerald-400 font-bold text-sm mb-1">🟢 醞釀買進</div>
                        <p className="text-xs text-slate-400">乖離達普通買進門檻，尚缺 RSI 或斜率條件。</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-amber-500/20">
                        <div className="text-amber-400 font-bold text-sm mb-1">🟡 醞釀停利</div>
                        <p className="text-xs text-slate-400">正乖離進入停利觀察區，等待斜率連降確認轉弱。</p>
                    </div>
                </div>
            </div>

            {/* ── 5. 第二軌：籌碼面 ── */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <TrendingUp className="text-purple-400" /> 第二軌：籌碼面輔助確認邏輯
                </h3>
                <p className="text-xs text-slate-400 mb-4">資料來源：FinMind API（需 Token，每小時300次）。追蹤近 5 個交易日外資與投信買賣超（連續 3 日以上才視為表態），以及當日融資增減幅 (%)。</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs">
                            <tr>
                                <th className="p-2 border border-slate-700 w-28">情境</th>
                                <th className="p-2 border border-slate-700">觸發條件</th>
                                <th className="p-2 border border-slate-700">系統行為與燈號變化</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 text-xs">
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-emerald-400 font-bold">🟢 籌碼共振</span><br/><span className="text-slate-500 text-[10px]">升級</span></td>
                                <td className="p-2 border border-slate-700">
                                    原訊號偏多<br/>
                                    <b className="text-white">且</b> 外資近5日中 ≥ 3日買超<br/>
                                    <b className="text-white">且</b> 投信近5日中 ≥ 3日買超
                                </td>
                                <td className="p-2 border border-slate-700">升級為 <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">🚀 強力布局</span>，法人雙向認同，勝率顯著提升。</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-orange-400 font-bold">🟠 籌碼背離</span><br/><span className="text-slate-500 text-[10px]">降級</span></td>
                                <td className="p-2 border border-slate-700">
                                    原訊號偏多<br/>
                                    <b className="text-white">但</b> 外資近5日中 ≥ 3日賣超<br/>
                                    <b className="text-white">且</b> 融資增幅 <b className="text-amber-400">≥ +2%</b>（散戶追高）
                                </td>
                                <td className="p-2 border border-slate-700">降級為 <span className="text-orange-400 font-bold bg-orange-500/10 px-1 rounded">🟠 持續觀察</span>，法人出、散戶接，謹慎。</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-rose-400 font-bold">🔴 主力棄守</span><br/><span className="text-slate-500 text-[10px]">警報</span></td>
                                <td className="p-2 border border-slate-700">
                                    原訊號偏弱/中性<br/>
                                    <b className="text-white">且</b> 外資近5日中 ≥ 3日賣超<br/>
                                    <b className="text-white">且</b> 投信近5日中 ≥ 3日賣超
                                </td>
                                <td className="p-2 border border-slate-700">強制轉為 <span className="text-rose-400 font-bold bg-rose-500/10 px-1 rounded">🔴 建議賣出</span>，外資投信同步撤退。</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700 text-xs text-slate-400">
                    <b className="text-slate-300">UI 顯示：</b> 外資/投信/融資若觸發條件，欄位會亮起底色，並顯示小文字提示，例如
                    <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded mx-1">連買3日</span>
                    <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded mx-1">連賣</span>
                    <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded mx-1">融資大增</span>
                </div>
            </div>

            {/* ── 6. 大盤三段式 ── */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <LineChart className="text-sky-400" /> 大盤三段式模式（影響所有個股燈號）
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs">
                            <tr>
                                <th className="p-2 border border-slate-700 w-24">模式</th>
                                <th className="p-2 border border-slate-700">觸發條件</th>
                                <th className="p-2 border border-slate-700">對個股的影響</th>
                                <th className="p-2 border border-slate-700">對 ETF 的影響</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 text-xs">
                            <tr>
                                <td className="p-2 border border-slate-700 font-bold text-slate-300">⚪ 平穩</td>
                                <td className="p-2 border border-slate-700">Bias20 &gt; -5% <b className="text-white">且</b> 單日跌 &gt; -3%</td>
                                <td className="p-2 border border-slate-700">允許買進、順勢加碼、所有燈號正常運作</td>
                                <td className="p-2 border border-slate-700">允許買進、左側攤平、所有燈號正常運作</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700 font-bold text-amber-400">🟡 保守</td>
                                <td className="p-2 border border-slate-700">
                                    Bias20 -5% ~ -10%<br/>
                                    <b className="text-white">或</b> 單日跌 -3% ~ -5%<br/>
                                    <b className="text-white">或</b> 觸發連虧鎖定
                                </td>
                                <td className="p-2 border border-slate-700"><b className="text-amber-400">阻斷順勢加碼</b><br/>允許普通買進（搶反彈）</td>
                                <td className="p-2 border border-slate-700"><b className="text-emerald-400">豁免單日跌幅限制</b><br/>允許買進、左側攤平</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700 font-bold text-rose-400">🔴 防禦</td>
                                <td className="p-2 border border-slate-700">
                                    Bias20 ≤ -10%<br/>
                                    <b className="text-white">或</b> 單日跌 ≤ -5%
                                </td>
                                <td className="p-2 border border-slate-700"><b className="text-rose-400">只出不進</b><br/>阻斷所有買進與加碼</td>
                                <td className="p-2 border border-slate-700"><b className="text-cyan-400">僅放行左側加碼 / 強加碼</b><br/>阻斷普通買進</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700 text-xs text-slate-400">
                    <b className="text-slate-300">ETF 豁免機制：</b> ETF（以00開頭）採用獨立大盤判斷邏輯，在防禦模式下仍允許「左側加碼」與「強加碼」，體現 ETF 越跌越買、長線攤平的策略定位。
                </div>
            </div>

        </div>
    );
};
