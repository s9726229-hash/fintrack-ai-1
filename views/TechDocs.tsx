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
                <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="text-sky-400" /> 分析處理步驟 (Step-by-Step)
                </h3>
                
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                    
                    {/* Step 1 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-emerald-500 text-slate-900 font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            1
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900/80 p-4 rounded-xl border border-slate-700/50 shadow-lg">
                            <h4 className="font-bold text-emerald-400 mb-1">大盤濾網 (Market Regime)</h4>
                            <p className="text-sm text-slate-400">掃描前先抓取 `^TWII` 大盤。若大盤 Bias20 在 -5% ~ -10% 為「保守模式」，會停止加碼並扣減分數；若小於 -10% 為「防禦模式」，全面凍結買進，僅執行停損/停利。</p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-amber-500 text-slate-900 font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            2
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900/80 p-4 rounded-xl border border-slate-700/50 shadow-lg">
                            <h4 className="font-bold text-amber-400 mb-1">歷史連虧鎖定 (Loss Lock)</h4>
                            <p className="text-sm text-slate-400">即時調閱您的歷史交易紀錄。若發現最近「連續 3 筆賣出」皆為實質虧損，強制啟動「保守鎖定」，限制系統再發出積極買進訊號，避免情緒性過度交易。</p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-sky-500 text-slate-900 font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            3
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900/80 p-4 rounded-xl border border-slate-700/50 shadow-lg">
                            <h4 className="font-bold text-sky-400 mb-1">股票分級 (Categorization)</h4>
                            <p className="text-sm text-slate-400">根據個股屬性分為三軌：<br/><b>大型股：</b>跌破 -7% 即可視為落底。<br/><b>小型股：</b>股性活潑，須跌破 -10% 才安全。<br/><b>ETF：</b>只買不賣，遇跌加碼攤平。</p>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-indigo-500 text-slate-900 font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            4
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900/80 p-4 rounded-xl border border-slate-700/50 shadow-lg">
                            <h4 className="font-bold text-indigo-400 mb-1">基礎指標與籌碼計算</h4>
                            <p className="text-sm text-slate-400">綜合計算 <b>20MA 乖離率</b>、<b>連續 3 日斜率反轉</b>、<b>RSI 超賣區間</b>。若發現「股價下跌但融資減少」(散戶退場)，或「跌破 60MA 季線」(長線走空)，會分別加分或扣減 20% 總分。</p>
                        </div>
                    </div>

                    {/* Step 5 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-rose-500 text-slate-900 font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            5
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-900/80 p-4 rounded-xl border border-slate-700/50 shadow-lg">
                            <h4 className="font-bold text-rose-400 mb-1">訊號判定與庫存感知</h4>
                            <p className="text-sm text-slate-400">總分達標即產生買賣訊號。接著讀取「庫存狀態」，若已持有且乖離收斂，轉為「🔵 順勢加碼」；若已持有且跌破極限門檻 (-20%)，轉為「⚠️ 停損警示」。</p>
                        </div>
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
                        <p className="text-xs text-slate-400">乖離率跌深且斜率反轉向上。強力買進代表 RSI 極低且量能配合，勝率極高。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400">💰 加碼 / 🔥 強力加碼</span>
                        </div>
                        <p className="text-xs text-slate-400"><b>(ETF 專屬)</b> 不看趨勢轉折，純粹依照左側交易紀律越跌越買、無腦攤平。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">🔵 順勢加碼</span>
                        </div>
                        <p className="text-xs text-slate-400"><b>(庫存專屬)</b> 您已持有此股，大盤正常且負乖離再次收斂，提示安全的右側加碼點。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">🟡 部分減碼</span>
                        </div>
                        <p className="text-xs text-slate-400">短線正乖離過大且動能衰退，建議獲利了結 1/3 或 1/2 鎖定利潤。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">🔴 強制停利</span>
                        </div>
                        <p className="text-xs text-slate-400">股價出現極端不合理的狂飆（正乖離過大），面臨均值回歸下殺風險，建議清倉。</p>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-rose-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-700 text-white shadow-lg">⚠️ 停損警示</span>
                        </div>
                        <p className="text-xs text-slate-400"><b>(庫存專屬)</b> 負乖離跌破極限門檻（大型 -20% / 小型 -25%），建議立即審視風險。</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
