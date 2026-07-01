import React, { useState } from 'react';
import { BookOpen, LineChart, ShieldAlert, CheckCircle2, TrendingUp, Lightbulb, Zap, FileText, GitBranch } from 'lucide-react';
import { getTechParameters } from '../services/storage';
import { SignalFlowchart } from '../components/SignalFlowchart';

export const TechDocs: React.FC = () => {
    const p = getTechParameters();
    const [activeTab, setActiveTab] = useState<'docs' | 'flow'>('docs');
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

            {/* 分頁切換 */}
            <div className="flex gap-2 border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('docs')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'docs' ? 'bg-slate-800/50 text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <FileText size={16} /> 文字說明
                </button>
                <button
                    onClick={() => setActiveTab('flow')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${activeTab === 'flow' ? 'bg-slate-800/50 text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <GitBranch size={16} /> 決策流程圖
                </button>
            </div>

            {activeTab === 'flow' ? <SignalFlowchart /> : <>

            {/* ── 1. 燈號快速對照（最重要，放最前） ── */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Zap className="text-amber-400" /> DSS 決策輔助燈號快速對照表
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* 買進類 */}
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-emerald-500/30">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">🚀 強力布局</span>
                        <p className="text-[11px] text-slate-400 mt-1.5">Bias≤強買門檻＋RSI＋斜率↑＋外資投信同買，最高優先做多訊號。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-emerald-500/20">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">🟢 適合布局</span>
                        <p className="text-[11px] text-slate-400 mt-1.5">Bias≤買進門檻＋斜率反轉＋RSI達標，技術面基礎布局條件成立。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-cyan-500/20">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400">🔵 適合加碼</span>
                        <p className="text-[11px] text-slate-400 mt-1.5">持倉中＋大盤平穩＋均線走揚＋乖離收斂的順勢右側加碼點（ETF 為不限大盤的左側攤平）。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-violet-500/20">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400">🟣 醞釀中</span>
                        <p className="text-[11px] text-slate-400 mt-1.5">乖離 / RSI / 斜率任一項已達門檻（不需乖離優先），條件小標逐項標示已達標（綠）／未達（灰）。持股顯示「醞釀停利」、未持股顯示「高位勿追」。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-amber-500/20">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">🟡 分批停利</span>
                        <p className="text-[11px] text-slate-400 mt-1.5">Bias≥停利門檻且斜率連降，正乖離過大、動能衰退，建議分批獲利。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-orange-500/20">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400">🟠 持續觀察</span>
                        <p className="text-[11px] text-slate-400 mt-1.5">原訊號偏多但外資連賣≥{p.chipInstDays}日＋融資連增≥{p.chipMarginDays}日，籌碼背離降級觀察。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-red-500/20">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">🔴 強制停利 / 建議賣出</span>
                        <p className="text-[11px] text-slate-400 mt-1.5">Bias≥強制門檻或法人雙向棄守，建議清倉出局。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-rose-700/50">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-700 text-white">⚠️ 停損預警 / 風險預警</span>
                        <p className="text-[11px] text-slate-400 mt-1.5">三層防護（ETF免除）：損益停損→乖離破底→乖離預警區（提示不強制）。</p>
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
                        { step: '3', color: 'sky', title: '第二軌 籌碼面', desc: 'FinMind API：外資投信連買賣天數（設定值）+ 融資連增/連減天數（設定值）' },
                        { step: '4', color: 'indigo', title: '共振 / 背離修正', desc: '法人共振→升級；外資賣+融資連增≥門檻→降級觀察' },
                        { step: '5', color: 'violet', title: '醞釀訊號分析', desc: '無訊號時，乖離/RSI/斜率任一項達標即提示醞釀方向' },
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
                                    Bias ≤ {p.etfBuyBias}%（普）/ ≤ {p.etfStrongBuyBias}%（強）<br/>
                                    <b className="text-white">且</b> 斜率反轉 <b className="text-white">且</b> RSI &lt; {p.etfBuyRsi}/{p.etfStrongBuyRsi}<br/>
                                    <span className="text-slate-500 text-[10px]">防禦模式下阻斷普通買進</span>
                                </td>
                                <td className="p-2 border border-slate-700">
                                    <b className="text-cyan-400">左側攤平（不限大盤）</b><br/>
                                    Bias ≤ {p.etfAdditionalBuyBias}% → 加碼<br/>
                                    Bias ≤ {p.etfStrongAdditionalBuyBias}% → 強加碼<br/>
                                    <span className="text-slate-500 text-[10px]">防禦模式下仍可觸發</span>
                                </td>
                                <td className="p-2 border border-slate-700">
                                    分批停利：Bias ≥ +{p.etfPartialSellBias}%<br/>
                                    第二批：Bias ≥ +{p.etfSecondPartialSellBias}%<br/>
                                    <span className="text-slate-500 text-[10px]">需斜率連降確認</span>
                                </td>
                                <td className="p-2 border border-slate-700 text-slate-500">無停損機制<br/>視為長線持有</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700 font-bold text-blue-400">上市（TSE）</td>
                                <td className="p-2 border border-slate-700">
                                    Bias ≤ {p.largeCapBuyBias}%（普）/ ≤ {p.largeCapStrongBuyBias}%（強）<br/>
                                    <b className="text-white">且</b> 斜率反轉 <b className="text-white">且</b> RSI &lt; {p.largeCapBuyRsi}/{p.largeCapStrongBuyRsi}
                                </td>
                                <td className="p-2 border border-slate-700">
                                    <b className="text-cyan-400">順勢加碼（需大盤平穩）</b><br/>
                                    持倉中 &amp;&amp; Bias {p.largeCapTrendAddBiasMin}% ~ {p.largeCapTrendAddBiasMax}%<br/>
                                    MA20↑ &amp;&amp; RSI {p.largeCapTrendAddRsiMin}~{p.largeCapTrendAddRsiMax}<br/>
                                    距上次買進 ≥ <b className="text-white">{p.largeCapTrendAddCoolDownDays} 日</b>
                                </td>
                                <td className="p-2 border border-slate-700">
                                    分批停利：Bias ≥ +{p.largeCapPartialSellBias}%<br/>
                                    強制停利：Bias ≥ +{p.largeCapForceSellBias}%
                                </td>
                                <td className="p-2 border border-slate-700">
                                    損益停損：≤ <b className="text-rose-400">{p.largeCapStopLossPnL}%</b><br/>
                                    乖離破底：≤ {p.largeCapStopLossBias}%<br/>
                                    風險預警：≤ {p.largeCapRiskAlertBias}%
                                </td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700 font-bold text-purple-400">上櫃（OTC）</td>
                                <td className="p-2 border border-slate-700">
                                    Bias ≤ {p.smallCapBuyBias}%（普）/ ≤ {p.smallCapStrongBuyBias}%（強）<br/>
                                    <b className="text-white">且</b> 斜率反轉 <b className="text-white">且</b> RSI &lt; {p.smallCapBuyRsi}/{p.smallCapStrongBuyRsi}
                                </td>
                                <td className="p-2 border border-slate-700">
                                    <b className="text-cyan-400">順勢加碼（需大盤平穩）</b><br/>
                                    持倉中 &amp;&amp; Bias {p.smallCapTrendAddBiasMin}% ~ {p.smallCapTrendAddBiasMax}%<br/>
                                    MA20↑ &amp;&amp; RSI {p.smallCapTrendAddRsiMin}~{p.smallCapTrendAddRsiMax}<br/>
                                    距上次買進 ≥ <b className="text-white">{p.smallCapTrendAddCoolDownDays} 日</b>
                                </td>
                                <td className="p-2 border border-slate-700">
                                    分批停利：Bias ≥ +{p.smallCapPartialSellBias}%<br/>
                                    強制停利：Bias ≥ +{p.smallCapForceSellBias}%
                                </td>
                                <td className="p-2 border border-slate-700">
                                    損益停損：≤ <b className="text-rose-400">{p.smallCapStopLossPnL}%</b><br/>
                                    乖離破底：≤ {p.smallCapStopLossBias}%<br/>
                                    風險預警：≤ {p.smallCapRiskAlertBias}%
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
                <p className="text-xs text-slate-400 mb-3">技術面燈號為「中性」或「風險預警」時，乖離 / RSI / 斜率任一項先達標即提示醞釀方向（不需乖離優先達標），條件小標逐項標示達標(綠)／未達(灰)，左側對應欄位同步亮底色，方便互相對照。<b className="text-slate-300"> 即使籌碼面將訊號覆寫（如降級為持續觀察），醞釀提示仍獨立顯示，讓技術面進場機會不被遮蓋。</b></p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-emerald-500/20">
                        <div className="text-emerald-400 font-bold text-sm mb-1">🟢 醞釀強買 / 醞釀買進</div>
                        <p className="text-xs text-slate-400">乖離 / RSI / 斜率任一達標，依乖離深度自動分強買或一般買進等級。</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-amber-500/20">
                        <div className="text-amber-400 font-bold text-sm mb-1">🟡 醞釀停利（持股）</div>
                        <p className="text-xs text-slate-400">有持股時，乖離或斜率任一達停利門檻即提示。</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-amber-500/20">
                        <div className="text-amber-400 font-bold text-sm mb-1">🟡 高位勿追（無持股）</div>
                        <p className="text-xs text-slate-400">選股掃描無持股情境下的同一邏輯，語意改為提醒勿追高。</p>
                    </div>
                </div>
            </div>

            {/* ── 5. 第二軌：籌碼面 ── */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <TrendingUp className="text-purple-400" /> 第二軌：籌碼面輔助確認邏輯
                </h3>
                <p className="text-xs text-slate-400 mb-4">資料來源：FinMind API。追蹤外資/投信連買賣天數（設定值 {p.chipInstDays} 日視為表態）與融資連增/連減天數（設定值 {p.chipMarginDays} 日）。</p>
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
                                    <b className="text-white">且</b> 外資連買 ≥ {p.chipInstDays}日<br/>
                                    <b className="text-white">且</b> 投信連買 ≥ {p.chipInstDays}日
                                </td>
                                <td className="p-2 border border-slate-700">升級為 <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">🚀 強力布局</span>，法人雙向認同，勝率顯著提升。</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-orange-400 font-bold">🟠 籌碼背離</span><br/><span className="text-slate-500 text-[10px]">降級</span></td>
                                <td className="p-2 border border-slate-700">
                                    原訊號偏多<br/>
                                    <b className="text-white">但</b> 外資連賣 ≥ {p.chipInstDays}日<br/>
                                    <b className="text-white">且</b> 融資連增 <b className="text-amber-400">≥ {p.chipMarginDays}日</b>（散戶追高）
                                </td>
                                <td className="p-2 border border-slate-700">降級為 <span className="text-orange-400 font-bold bg-orange-500/10 px-1 rounded">🟠 持續觀察</span>，法人出、散戶接，謹慎。</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-rose-400 font-bold">🔴 主力棄守</span><br/><span className="text-slate-500 text-[10px]">警報</span></td>
                                <td className="p-2 border border-slate-700">
                                    原訊號偏弱/中性<br/>
                                    <b className="text-white">且</b> 外資連賣 ≥ {p.chipInstDays}日<br/>
                                    <b className="text-white">且</b> 投信連賣 ≥ {p.chipInstDays}日
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

            {/* ── 6. 籌碼常駐偵測（ChipHint） ── */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <Zap className="text-purple-400" /> 籌碼常駐偵測（ChipHint）：獨立於主燈號之外
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                    ChipHint 對<b className="text-slate-300">所有訊號狀態</b>都持續維護，不被主燈號覆寫。即使主訊號是「強力布局」或「停損預警」，籌碼燈號欄仍會獨立顯示當前籌碼狀態。偵測優先順序：強烈警示 → 背離警示 → 中性評分。
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs">
                            <tr>
                                <th className="p-2 border border-slate-700 w-28">籌碼燈號</th>
                                <th className="p-2 border border-slate-700">觸發條件</th>
                                <th className="p-2 border border-slate-700">優先順序</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 text-xs">
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-red-400 font-bold">🔴 法人棄守</span></td>
                                <td className="p-2 border border-slate-700">外資連賣 ≥ {p.chipInstDays}日 <b className="text-white">且</b> 投信連賣 ≥ {p.chipInstDays}日</td>
                                <td className="p-2 border border-slate-700 text-slate-400">第 1 優先（最高警示）</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-orange-400 font-bold">🟠 籌碼疑慮</span></td>
                                <td className="p-2 border border-slate-700">外資連賣 ≥ {p.chipInstDays}日 <b className="text-white">且</b> 融資連增 ≥ {p.chipMarginDays}日</td>
                                <td className="p-2 border border-slate-700 text-slate-400">第 2 優先</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-emerald-400 font-bold">🟢 籌碼偏多</span></td>
                                <td className="p-2 border border-slate-700">三項中 ≥ 2 項成立：外資連買≥{p.chipInstDays}日、投信連買≥{p.chipInstDays}日、融資連增≥1日</td>
                                <td className="p-2 border border-slate-700 text-slate-400">中性評分（≥2項偏多）</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-cyan-400 font-bold">🔵 籌碼觀察</span></td>
                                <td className="p-2 border border-slate-700">三項中剛好 1 項成立</td>
                                <td className="p-2 border border-slate-700 text-slate-400">中性評分（1項偏多）</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-amber-400 font-bold">🟡 籌碼偏弱</span></td>
                                <td className="p-2 border border-slate-700">無偏多條件 <b className="text-white">且</b>（外資賣≥1日 <b className="text-white">或</b> 投信賣≥1日 <b className="text-white">或</b> 融資連減≥1日）</td>
                                <td className="p-2 border border-slate-700 text-slate-400">中性評分（偏弱跡象）</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-slate-400 font-bold">⚪ 籌碼中性</span></td>
                                <td className="p-2 border border-slate-700">以上皆不符合</td>
                                <td className="p-2 border border-slate-700 text-slate-400">中性評分（無明顯方向）</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700 text-xs text-slate-400">
                    <b className="text-slate-300">醞釀訊號與 ChipHint 的關係：</b>
                    當技術面顯示「醞釀買進/強買」但籌碼覆寫為「籌碼疑慮」或「法人棄守」時，醞釀提示仍會保留在訊號欄，ChipHint 同步顯示籌碼警示。兩者各自獨立，讓使用者同時掌握技術面機會與籌碼面風險。
                </div>
            </div>

            {/* ── 7. 選股掃描燈號 ── */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <Zap className="text-amber-400" /> 選股掃描燈號（無持倉語意）
                </h3>
                <p className="text-xs text-slate-400 mb-4">無持倉情境，停利類燈號語意轉為「過熱勿追」，門檻與設定頁停利參數共用。</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs">
                            <tr>
                                <th className="p-2 border border-slate-700">燈號</th>
                                <th className="p-2 border border-slate-700">觸發條件</th>
                                <th className="p-2 border border-slate-700">對應參數</th>
                                <th className="p-2 border border-slate-700">籌碼輔助</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300 text-xs">
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-amber-400 font-bold">🟡 高位勿追</span><br/><span className="text-slate-500 text-[10px]">醞釀過熱</span></td>
                                <td className="p-2 border border-slate-700">Bias20 ≥ 停利門檻<br/><b className="text-white">但</b> 斜率尚未連降（動能未止）</td>
                                <td className="p-2 border border-slate-700 font-mono text-[10px]">
                                    上市 ≥ +{p.largeCapPartialSellBias}%<br/>
                                    上櫃 ≥ +{p.smallCapPartialSellBias}%<br/>
                                    ETF ≥ +{p.etfPartialSellBias}%
                                </td>
                                <td className="p-2 border border-slate-700 text-slate-400">不受籌碼覆寫影響</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-amber-400 font-bold">🟡 高位過熱</span><br/><span className="text-slate-500 text-[10px]">過熱確認</span></td>
                                <td className="p-2 border border-slate-700">Bias20 ≥ 停利門檻<br/><b className="text-white">且</b> 斜率連降 N 天（動能衰退）</td>
                                <td className="p-2 border border-slate-700 font-mono text-[10px]">
                                    上市 ≥ +{p.largeCapPartialSellBias}% + 連降{p.largeCapPartialSellSlopeDays}天<br/>
                                    上櫃 ≥ +{p.smallCapPartialSellBias}% + 連降{p.smallCapPartialSellSlopeDays}天<br/>
                                    ETF ≥ +{p.etfPartialSellBias}% + 連降{p.etfPartialSellSlopeDays}天
                                </td>
                                <td className="p-2 border border-slate-700 text-slate-400">不受籌碼覆寫影響</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-orange-400 font-bold">🟠 極度過熱</span><br/><span className="text-slate-500 text-[10px]">ETF 專屬</span></td>
                                <td className="p-2 border border-slate-700">ETF Bias20 ≥ 再次減碼門檻</td>
                                <td className="p-2 border border-slate-700 font-mono text-[10px]">ETF ≥ +{p.etfSecondPartialSellBias}%</td>
                                <td className="p-2 border border-slate-700 text-slate-400">不受籌碼覆寫影響</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-red-400 font-bold">🔴 嚴重過熱</span><br/><span className="text-slate-500 text-[10px]">切勿追高</span></td>
                                <td className="p-2 border border-slate-700">Bias20 ≥ 強制停利門檻（無需斜率）</td>
                                <td className="p-2 border border-slate-700 font-mono text-[10px]">
                                    上市 ≥ +{p.largeCapForceSellBias}%<br/>
                                    上櫃 ≥ +{p.smallCapForceSellBias}%
                                </td>
                                <td className="p-2 border border-slate-700">
                                    外資投信同步連買時附註<br/><span className="text-emerald-400/70 text-[10px]">⚡ 籌碼共振（機構承接，仍屬高位）</span><br/>
                                    外資投信同步連賣時附註<br/><span className="text-rose-400/70 text-[10px]">⚡ 法人同步棄守 強烈建議出場</span>
                                </td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-orange-400 font-bold">🟠 籌碼疑慮</span></td>
                                <td className="p-2 border border-slate-700">原訊號偏多<br/><b className="text-white">但</b> 外資連賣 ≥ {p.chipInstDays}日 + 融資連增 ≥ {p.chipMarginDays}日</td>
                                <td className="p-2 border border-slate-700 font-mono text-[10px]">chipInstDays = {p.chipInstDays}日<br/>chipMarginDays = {p.chipMarginDays}日</td>
                                <td className="p-2 border border-slate-700 text-slate-400">籌碼背離強制降級</td>
                            </tr>
                            <tr>
                                <td className="p-2 border border-slate-700"><span className="text-red-400 font-bold">⛔ 法人棄守</span></td>
                                <td className="p-2 border border-slate-700">外資連賣 ≥ {p.chipInstDays}日<br/><b className="text-white">且</b> 投信連賣 ≥ {p.chipInstDays}日</td>
                                <td className="p-2 border border-slate-700 font-mono text-[10px]">chipInstDays = {p.chipInstDays}日</td>
                                <td className="p-2 border border-slate-700 text-slate-400">法人雙向棄守，強制覆寫</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── 7. 大盤三段式 ── */}
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

            </>}

        </div>
    );
};
