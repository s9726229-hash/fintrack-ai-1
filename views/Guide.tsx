import React from 'react';
import { 
  ListTree, GitMerge, Sparkles, Activity, ShieldCheck, Cpu, 
  Settings2, Eye, LayoutTemplate
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
    <div className="animate-fade-in max-w-3xl mx-auto pb-20">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <ListTree className="text-sky-400"/> 版本紀錄
        </h2>
        <p className="text-slate-400 mt-2">追蹤 FinTrack AI 的核心功能演進與系統更新紀錄。</p>
      </div>

      <div className="relative border-l-2 border-slate-800 space-y-12 ml-2 mt-8">
        
        <FeatureSection title="V7.4.0 自動化與精準監控" date="Latest" color="text-sky-400">
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