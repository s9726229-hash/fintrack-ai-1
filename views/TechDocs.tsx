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
                    <h2 className="text-2xl font-bold text-white">技術面監控系統說明 (V4.0 全自動決策版)</h2>
                    <p className="text-slate-400">結合長線趨勢、短線慣性與主力籌碼的量化交易輔助系統</p>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <LineChart className="text-sky-400" /> 股票分級機制
                </h3>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                    不同市值的股票具有截然不同的股性，因此系統採用三軌分離的評分邏輯，大幅提升訊號的勝率。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-emerald-400 font-bold mb-2">大型股</h4>
                        <ul className="text-sm text-slate-300 space-y-2">
                            <li><span className="font-bold text-white">包含：</span>台灣 50 等頂級權值股</li>
                            <li><span className="font-bold text-white">買進門檻：</span>乖離率 &le; -7%</li>
                            <li><span className="font-bold text-white">特性：</span>跌深機會少，採用較寬鬆的抄底標準，避免錯過上車機會。</li>
                        </ul>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-sky-400 font-bold mb-2">小型股</h4>
                        <ul className="text-sm text-slate-300 space-y-2">
                            <li><span className="font-bold text-white">包含：</span>非大型權值的上市櫃個股</li>
                            <li><span className="font-bold text-white">買進門檻：</span>乖離率 &le; -10%</li>
                            <li><span className="font-bold text-white">特性：</span>暴漲暴跌，採用最嚴格的標準，要求更深的負乖離率與量能確認。</li>
                        </ul>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-violet-400 font-bold mb-2">ETF</h4>
                        <ul className="text-sm text-slate-300 space-y-2">
                            <li><span className="font-bold text-white">包含：</span>00 開頭或含 ETF 字樣標的</li>
                            <li><span className="font-bold text-white">買進門檻：</span>乖離率 &le; -7%</li>
                            <li><span className="font-bold text-white">特性：</span>取消停損機制，越跌越買（強力加碼），高檔只做波段減碼不強制全賣。</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-amber-400" /> 訊號燈號含意與操作建議
                </h3>
                <div className="space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">買進訊號</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">強力買進</span>
                        </div>
                        <p className="text-sm text-slate-400"><span className="font-bold text-white">買進訊號：</span>乖離率達到初步跌深門檻，且斜率反轉向上，可嘗試建倉試單。<br/><span className="font-bold text-white">強力買進：</span>乖離率與 RSI 皆達到極度超跌，且連續兩天以上斜率向上，底部確認度高，勝率極大，為主力佈局時機。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">加碼訊號</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500 text-white">強力加碼</span>
                        </div>
                        <p className="text-sm text-slate-400"><span className="font-bold text-white">(僅限 ETF)</span> 大盤或 ETF 遇恐慌性下殺時觸發。不看趨勢轉折，純粹依照左側交易紀律「越跌越買、無腦攤平」，建構長線低成本部位。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">順勢加碼</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">最後加碼</span>
                        </div>
                        <p className="text-sm text-slate-400"><span className="font-bold text-white">(V4.0 庫存連動)</span> 當系統偵測到您「已持有」該檔個股，且目前大盤處於「正常模式」，加上該股負乖離收斂並距離上次買進達一定天數時，系統會提示您這是一個安全的右側加碼點。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">部分減碼</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">再次減碼</span>
                        </div>
                        <p className="text-sm text-slate-400">股價短線漲幅過大產生「正乖離」，且乖離率斜率連續兩天向下（動能衰退）。建議將部位先行獲利了結 1/3 或 1/2，以鎖定利潤並收回資金。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">強制停利</span>
                        </div>
                        <p className="text-sm text-slate-400"><span className="font-bold text-white">(僅限 個股)</span> 股價出現極端不合理的狂飆（正乖離過高），隨時可能面臨劇烈的均值回歸下殺（A轉）。看到此訊號建議果斷清倉或大幅減碼，不賺最後一個銅板。</p>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-xl border border-rose-700/50">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-700 text-white border border-rose-500 shadow-lg shadow-rose-900/50">⚠️ 停損警示</span>
                        </div>
                        <p className="text-sm text-slate-400"><span className="font-bold text-white">(V4.0 庫存連動)</span> 當系統偵測到您「已持有」該個股，但目前股價的負乖離率持續擴大並跌破系統安全閾值（大型股 -20%，小型股 -25%）時，將觸發最高級別的停損警示，建議立即審視部位風險。</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-emerald-400" /> V4.0 全自動大盤避險與庫存感知機制
                </h3>
                <div className="space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">1. 大盤狀態濾網 (Market Regime)</h4>
                        <p className="text-sm text-slate-400">系統掃描前會自動比對 <b>^TWII 台灣加權指數</b>。若大盤乖離率跌至 -5% ~ -10%，系統切換至「🟡 保守模式」，將扣減所有個股分數並停止提示加碼；若大盤跌破 -10%，切換至「🔴 防禦模式」，將凍結所有買進訊號，純粹執行停利與停損。</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">2. 連虧鎖定防禦 (Consecutive Loss Lock)</h4>
                        <p className="text-sm text-slate-400">系統即時監控您的歷史交易紀錄。當偵測到您「連續 3 筆賣出」皆為實質虧損時，系統會自動判定目前盤感不佳或市場處於極端狀態，並強制切換至「🔒 保守鎖定模式」，限制系統再發出積極買進訊號。</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <ShieldAlert className="text-amber-400" /> V3.0 進階核心機制
                </h3>
                <div className="space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">1. MA60 趨勢懲罰機制 (季線過濾)</h4>
                        <p className="text-sm text-slate-400">當股票目前的收盤價「跌破 60 日均線 (季線)」時，代表長線趨勢已經走弱。此時不論短期乖離或 RSI 多麼誘人，系統會直接將總分「乘以 0.8 倍」作為懲罰，藉此過濾掉深不見底的空頭走勢。</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">2. 融資籌碼動向 (散戶指標)</h4>
                        <p className="text-sm text-slate-400">俗話說「散戶死在融資」。當股票處於下跌區間 (Bias20 &lt; 0) 時，系統會自動抓取台灣證交所與櫃買中心的融資日報：如果「融資餘額減少」，代表散戶正在停損退場、籌碼沉澱，此時系統會大幅加 15 分，提高抄底勝率。</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">3. MA20 斜率 (月線慣性)</h4>
                        <p className="text-sm text-slate-400">不僅看股價與月線的距離，更看月線本身的彎曲方向。如果 MA20 斜率轉正，代表中期趨勢已經開始向上翻揚，此時買進的安全性遠高於月線下彎的標的。</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-200 mb-4">基礎技術指標說明</h3>
                <div className="space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">20MA 乖離率 (Bias20)</h4>
                        <p className="text-sm text-slate-400">計算股價與 20 日移動平均線 (月線) 的距離百分比。正乖離過大代表股價過熱（漲太快），負乖離過大代表股價超跌（跌太深）。</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">轉折斜率 (Bias Slope)</h4>
                        <p className="text-sm text-slate-400">計算今日乖離率與昨日乖離率的差值。若連續 2~3 天為正數，代表跌勢收斂並轉向向上，系統用此來確認股價是否真正落底，避免接刀。</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                        <h4 className="text-white font-bold mb-1">相對強弱指標 (RSI) & 量能比 (VolumeRatio)</h4>
                        <p className="text-sm text-slate-400">RSI 衡量股票近期漲跌幅度的強弱。小於 30 代表極度超賣，大於 70 代表極度超買。VolumeRatio 則比較今日成交量與 20 日均量的倍數，用於確認底部是否有大量買盤承接。</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
