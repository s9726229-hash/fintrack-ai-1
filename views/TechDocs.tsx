import React from 'react';
import { BookOpen, LineChart, ShieldAlert } from 'lucide-react';

export const TechDocs: React.FC = () => {
    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in p-2 md:p-6 pb-24 md:pb-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                    <BookOpen size={24} className="text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">技術面監控系統說明</h2>
                    <p className="text-slate-400">了解雙引擎（個股與ETF）的背後運算邏輯與買賣訊號意義</p>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <LineChart className="text-sky-400" /> 個股技術分析邏輯
                </h3>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                    個股因為有基本面變化的風險，因此操作邏輯更強調「確認轉折」與「嚴格停損」。買進訊號需要更深的負乖離率，且賣出訊號較為敏感，以保護資金。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-emerald-400 font-bold mb-2">買進訊號 (做多)</h4>
                        <ul className="text-sm text-slate-300 space-y-2">
                            <li><span className="font-bold text-white">🟢 買進訊號：</span>乖離率 &le; -10% + 連續 2 天轉向向上 + RSI &lt; 40。</li>
                            <li><span className="font-bold text-white">🚀 強力買進：</span>乖離率 &le; -15% + 連續 3 天轉向向上 + RSI &lt; 35。</li>
                            <li><span className="text-slate-400">邏輯：不接正在下跌的刀子，必須等到底部收斂並開始向上轉折才進場。</span></li>
                        </ul>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-amber-400 font-bold mb-2">賣出與停損訊號 (風險控管)</h4>
                        <ul className="text-sm text-slate-300 space-y-2">
                            <li><span className="font-bold text-white">🟡 部分停利：</span>乖離率 &ge; +25%。漲多容易拉回，建議獲利了結部分部位。</li>
                            <li><span className="font-bold text-white">🔴 強制停利：</span>乖離率 &ge; +30%。極度過熱，強烈建議賣出。</li>
                            <li><span className="font-bold text-white">⚠️ 停損警示：</span>乖離率 &lt; -25%。跌勢過深可能基本面有問題，建議停損出場。</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-emerald-400" /> ETF 技術分析邏輯
                </h3>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                    ETF（如 0050, 00878 等）具有分散風險、長期趨勢向上的特性。系統採用「越跌越買、分批減碼」的長期投資邏輯，取消了停損機制，將深跌視為加碼的黃金機會。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-emerald-400 font-bold mb-2">買進與加碼訊號 (長期累積)</h4>
                        <ul className="text-sm text-slate-300 space-y-2">
                            <li><span className="font-bold text-white">🟢 買進訊號：</span>乖離率 &le; -7% + 連續 1 天向上 + RSI &lt; 45。條件較個股寬鬆，避免錯失上車機會。</li>
                            <li><span className="font-bold text-white">🚀 強力買進：</span>乖離率 &le; -10% + 連續 2 天向上 + RSI &lt; 40。</li>
                            <li><span className="font-bold text-white">💰 加碼訊號：</span>乖離率 &le; -15%。逢低大筆買進。</li>
                            <li><span className="font-bold text-white">🔥 強力加碼：</span>乖離率 &le; -20%。極度超跌，千載難逢的加碼點。</li>
                        </ul>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-amber-400 font-bold mb-2">減碼訊號 (波段操作)</h4>
                        <ul className="text-sm text-slate-300 space-y-2">
                            <li><span className="font-bold text-white">🟡 減碼 1/3：</span>乖離率 &ge; +15% 且連續兩天向下轉折。</li>
                            <li><span className="font-bold text-white">🟠 再減碼 1/3：</span>乖離率 &ge; +20% 且連續兩天向下轉折。</li>
                            <li><span className="text-slate-400">邏輯：不提供強制全賣訊號，建議保留 1/3 核心部位，避免錯過後續多頭行情。</span></li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4">核心技術指標說明</h3>
                <div className="space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">1. 20MA 乖離率 (Bias20)</h4>
                        <p className="text-sm text-slate-400">計算股價與 20 日移動平均線 (月線) 的距離百分比。正乖離過大代表股價過熱（漲太快），負乖離過大代表股價超跌（跌太深）。</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">2. 轉折斜率 (Slope)</h4>
                        <p className="text-sm text-slate-400">計算今日乖離率與昨日乖離率的差值。若為正數（↗ 紅色），代表跌勢收斂或漲勢擴大；若為負數（↘ 綠色），代表跌勢擴大或漲勢收斂。系統用此來確認股價是否真正落底，避免接刀。</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">3. 相對強弱指標 (RSI)</h4>
                        <p className="text-sm text-slate-400">衡量股票近期漲跌幅度的強弱。一般來說，小於 30 代表極度超賣，大於 70 代表極度超買。系統採用標準的 14 日 Wilder 平滑法計算。</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
