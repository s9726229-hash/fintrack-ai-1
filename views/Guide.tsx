import React from 'react';
import {
  ListTree, GitMerge, Sparkles, Activity, ShieldCheck, Cpu,
  Settings2, Eye, LayoutTemplate, TrendingUp, Zap, RefreshCw, BarChart2
} from 'lucide-react';

const FeatureSection = ({ title, date, color, children }: { title: string; date?: string; color: string; children?: React.ReactNode }) => (
    <div className="relative pl-8">
        <div className={`absolute left-0 top-1.5 w-3 h-3 bg-slate-700 rounded-full border-2 border-slate-900 ring-4 ${color.replace('text-', 'ring-')}`}></div>
        <div className="flex items-baseline gap-3 mb-6">
            <h3 className={`text-lg font-bold uppercase tracking-widest ${color}`}>{title}</h3>
            {date && <span className="text-xs text-slate-500 font-mono">{date}</span>}
        </div>
        <div className="space-y-6 bg-slate-800/30 p-6 rounded-2xl border border-slate-800/50">{children}</div>
    </div>
);

const FeatureItem = ({ icon: Icon, title, description }: { icon: any; title: string; description: string | React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="text-slate-400 bg-slate-800 p-2 rounded-xl border border-slate-700">
           <Icon size={20} />
        </div>
        <div>
            <h4 className="font-bold text-slate-200">{title}</h4>
            <div className="text-sm text-slate-400 mt-1 leading-relaxed">{description}</div>
        </div>
    </div>
);

export const GuideView: React.FC = () => {
  return (
    <div className="animate-fade-in p-2 md:p-6 pb-24">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <ListTree className="text-sky-400"/> 版本紀錄
        </h2>
        <p className="text-slate-400 mt-2">追蹤 FinTrack AI 的核心功能演進與系統更新紀錄。</p>
      </div>

      <div className="relative border-l-2 border-slate-800 space-y-12 ml-2 mt-8">

        <FeatureSection title="V7.6.6 醞釀邏輯修正 & 大盤指數顯示" date="Latest" color="text-violet-400">
            <FeatureItem icon={Zap} title="醞釀訊號改為任一條件達標即觸發" description="醞釀買進/醞釀停利不再要求乖離率優先進入門檻區，乖離、RSI、斜率任一項先達標即提示醞釀方向，並修正左側欄位背景燈色與醞釀條件小標的對齊問題。SELL 方向文字依是否持股分流：持股顯示「醞釀停利」，未持股（選股掃描）顯示「高位勿追」。" />
            <FeatureItem icon={BarChart2} title="欄位底色統一綠/紅二色" description="月乖離、乖離斜率、外資/投信買賣、融資增減六欄背景色統一為「正向(偏多)綠底、負向(偏空)紅底」，移除多餘的橙/琥珀色階；融資增減的背景判斷改用與籌碼燈號相同的「有無減少」條件，不再用 ±2% 門檻。訊號(籌碼)欄移除背景色，維持原本無底色。" />
            <FeatureItem icon={TrendingUp} title="大盤加權指數即時顯示" description="股票投資與選股掃描頁面的大盤模式燈號旁，新增顯示加權指數收盤點位、漲跌點數與百分比，跟個股「當前價格」同樣排版，分析/自動更新時同步刷新。" />
        </FeatureSection>

        <FeatureSection title="V7.6.5 訊號條件語意 & 欄位背景燈色" date="Recent" color="text-violet-400">
            <FeatureItem icon={Zap} title="觸發條件改顯示門檻值" description="技術訊號（強買/買進/停利/強制停利/停損/風險預警/順勢加碼）的條件小字從顯示當前數值改為對應參數門檻（如「乖離 ≥ +25%」），語意一致，方便對照設定頁。TREND_ADD 加碼條件依大/小型股分別取 biasMin～biasMax 與 RSI 範圍。" />
            <FeatureItem icon={BarChart2} title="訊號欄位背景燈色" description="投資組合與選股掃描的「訊號(技術)」與「訊號(籌碼)」欄位新增背景燈色：技術面依訊號嚴重度上色（停損→玫紅、強制停利→紅、停利/預警→琥珀/橙、買進→翠綠、加碼/籌碼共振→天藍）；籌碼面依 chipHint 標的語意上色，與右側訊號燈號視覺統一。" />
        </FeatureSection>

        <FeatureSection title="V7.6.4 籌碼疑慮暗化醞釀燈號" color="text-violet-400">
            <FeatureItem icon={Zap} title="NONE 訊號下籌碼疑慮提前顯示" description="技術面未到門檻但籌碼面有異常時，選股掃描與技術監控會顯示暗化版的接近訊號徽章（如 🟠 籌碼疑慮、🔴 法人棄守），並附上條件小標（已成立亮燈、未成立暗燈），取代原本的「無訊號觀察中」。觸發條件：外資連賣≥3日＋融資增幅≥2%（籌碼疑慮）；外資連賣≥3日＋投信連賣≥3日（法人棄守）。" />
            <FeatureItem icon={BarChart2} title="醞釀停利標籤語意更正" description="analyzeBrewing 的 SELL 類型 hint target 從「醞釀停利」改為「高位勿追」，選股掃描不再需要複寫標籤，前後語意一致。" />
        </FeatureSection>

        <FeatureSection title="V7.6.3 選股過熱語意 & 技術說明補完" date="Recent" color="text-violet-400">
            <FeatureItem icon={Zap} title="選股「高位勿追」燈號" description="乖離達停利門檻但斜率未轉跌時，選股掃描改顯示「高位勿追」取代「醞釀停利」，語意更直覺。停利門檻同時作為過熱判斷基準，可在設定頁調整。" />
            <FeatureItem icon={BarChart2} title="技術說明新增選股燈號章節" description="技術說明頁新增「選股掃描燈號」完整對照表，涵蓋高位勿追、高位過熱、極度過熱、嚴重過熱、籌碼疑慮、法人棄守等六種訊號的觸發條件、對應參數與籌碼規則。" />
            <FeatureItem icon={Sparkles} title="無訊號統一顯示「無訊號觀察中」" description="選股掃描與技術監控在無訊號時統一顯示「無訊號觀察中」，取代原本不一致的「👀 觀察中」與「--」。" />
        </FeatureSection>

        <FeatureSection title="V7.6.2 新增持股自動帶入中文名" date="Recent" color="text-sky-400">
            <FeatureItem icon={Sparkles} title="股票代號自動查詢中文名稱" description="新增持股時輸入代號後游標離開，自動透過 FinMind TaiwanStockInfo 查詢並填入中文股票名稱（如輸入 2303 自動顯示「聯電」），查不到時以代號儲存。" />
        </FeatureSection>

        <FeatureSection title="V7.6.1 加碼參數開放設定 & README 中文化" date="Recent" color="text-emerald-400">
            <FeatureItem icon={TrendingUp} title="順勢加碼（TREND_ADD）參數可調" description="上市/上櫃順勢加碼的乖離範圍（biasMin/biasMax）與 RSI 範圍（rsiMin/rsiMax）從 hardcoded 改為可在設定頁調整，冷卻期原本已可調整。" />
            <FeatureItem icon={BarChart2} title="README 全面中文化" description="README 改為繁體中文，新增 DSS V5.0 燈號對照表、技術棧說明、選股掃描/投資組合功能描述。" />
        </FeatureSection>

        <FeatureSection title="V7.6.0 DSS 決策引擎強化 & 系統穩定" date="Previous" color="text-violet-400">
            <FeatureItem
                icon={Zap}
                title="DSS V5.0 籌碼共振完整實作"
                description="全面實作 Track 2 籌碼共振/背離邏輯：技術偏多 + 外資投信連買≥3日 → 升級 STRONG_LAYOUT；技術偏多 + 外資連賣 + 融資大增 → 降級 WATCH_DIVERGE；技術偏弱 + 外資投信雙賣超 → 強制 SELL。"
            />
            <FeatureItem
                icon={TrendingUp}
                title="乖離斜率視窗擴展 & 計算修正"
                description="乖離斜率計算從固定 4 天擴展至 10 天視窗，連增/連降天數最多可顯示 9 棒。修正 hardcoded index 問題，改用動態 lastIdx，並為 checkSlopeDeteriorated 加入邊界保護。"
            />
            <FeatureItem
                icon={BarChart2}
                title="選股掃描燈號語意重新對應"
                description="選股掃描（無持倉）的燈號標籤全面調整：停利類訊號改為「高位過熱 勿追」、「嚴重過熱 切勿追高」；加碼類改為「積極進場」、「超跌布局」；籌碼背離改為「籌碼疑慮 暫緩進場」。"
            />
            <FeatureItem
                icon={RefreshCw}
                title="自動更新計時器架構修正"
                description="修正兩頁面（投資組合/選股掃描）同時 always-mounted 造成雙重 API 呼叫的問題，透過 isActiveView prop 確保只有當前顯示的頁面觸發更新。新增 storage 事件監聽實現跨頁開關即時同步。更新時間戳改為分析完成後才寫入。"
            />
            <FeatureItem
                icon={Sparkles}
                title="FORCE_SELL 籌碼共振提示 & 程式碼精簡"
                description="強制停利訊號遇到籌碼共振（外資投信同時連買≥3日）時，維持原訊號但在條件小框附加「⚡ 籌碼共振 可考慮布局」提示。同時消除 institutionalCache 冗餘讀取，移除無效的 WATCH 死碼。"
            />
        </FeatureSection>

        <FeatureSection title="V7.5.0 財務儀表板全面升級" date="Archived" color="text-amber-400">
            <FeatureItem 
                icon={LayoutTemplate}
                title="版面精簡與資訊整合" 
                description="移除原先佔據大量版面的獨立圓環倒數圖，將「寬限期警告」精煉成卡片徽章（Badge），並採用全寬卡片網格（Grid）重新排版負債清單，大幅提升首頁空間利用率與閱讀動線。"
            />
            <FeatureItem 
                icon={Activity}
                title="月度與年度收支結算" 
                description="新增「歷史月度收支」與「歷史年度收支」雙向直條圖。系統會自動追溯包含薪資、股票損益、一般消費以及「自動預估的各項貸款每月應繳本息」，讓真實現金流餘裕一目了然。"
            />
            <FeatureItem 
                icon={Sparkles}
                title="資產趨勢與除錯優化" 
                description="在資產趨勢圖中補齊了「淨資產」的藍色面積趨勢線。同時修復了技術監控頁面因快取舊版字串格式的 signalHint 而導致的畫面崩潰問題，提升系統強健度。"
            />
        </FeatureSection>

        <FeatureSection title="V7.4.0 自動化與精準監控" date="Recent" color="text-sky-400">
            <FeatureItem 
                icon={Activity}
                title="即時連動與自動掃描" 
                description="當使用者在「技術設定」儲存參數後，系統會自動標記狀態，並在切換回「觀察清單」或「投資組合」時背景自動觸發重新掃描，確保所有「文字訊號」與「底色高亮」零時差同步。"
            />
            <FeatureItem 
                icon={ShieldCheck}
                title="新股資料相容性強化" 
                description="優化底層量化引擎，將歷史資料的最小運算天數門檻從 60 天放寬至 23 天。讓剛上市滿一個月的新股（如 IPO 或新發行 ETF）也能透過 20MA 及乖離率順利算出短線轉折訊號，不因缺乏季線而無法運算。"
            />
            <FeatureItem 
                icon={LayoutTemplate}
                title="凍結標題列 UI 優化" 
                description="針對「投資組合技術監控」與「選股掃描觀察清單」加入 Sticky Header，在標的數量過多而向下捲動時，表頭會自動固定於頂端，提升大數據瀏覽體驗。"
            />
        </FeatureSection>

        <FeatureSection title="V7.3.0 雙引擎量化分析" date="Recent" color="text-indigo-400">
            <FeatureItem 
                icon={Cpu}
                title="投資組合技術監控" 
                description="全新實作投資組合專屬的量化分析儀表板，自動對持股庫存進行技術面評估（20MA、60MA、Bias20、乖離斜率連增與 RSI 等），將庫存健檢與資金控管完美結合。"
            />
            <FeatureItem 
                icon={Eye}
                title="選股掃描與觀察清單" 
                description="實作獨立的自選股分頁，透過 Yahoo Finance 即時撈取歷史報價並套用 AI 選股邏輯，輔助判斷最佳買賣點。加入大盤環境偵測（多頭/防禦/保守模式）動態調節訊號。"
            />
            <FeatureItem 
                icon={Settings2}
                title="技術參數後台" 
                description="將原先寫死的指標閥值全面解放！使用者可自由設定「乖離率停損停利門檻」、「乖離斜率買進條件」、「RSI 觸發門檻」與「大/小型股判定市值」，賦予極大化的個人交易彈性。"
            />
        </FeatureSection>

        <FeatureSection title="V7.2.0 PWA & 資料架構升級" date="Previous" color="text-emerald-500">
            <FeatureItem 
                icon={Sparkles}
                title="PWA 漸進式網頁應用" 
                description="全面支援 PWA 安裝，讓網頁應用可直接安裝為手機或電腦桌面的獨立 App，支援離線快取並提供更流暢的原生操作體驗。"
            />
            <FeatureItem 
                icon={GitMerge}
                title="交易紀錄與庫存整合" 
                description="強化 CSV 匯入機制，完整讀取股票中文名稱，並將收支記帳與股票資產深度綁定，達成全方位的個人財務管理。"
            />
        </FeatureSection>

      </div>
    </div>
  );
};