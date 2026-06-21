import React from 'react';
import { 
  BookOpen, Mic, Sparkles, BrainCircuit, Wand2, Calculator, Target, 
  LayoutGrid, PieChart, ScrollText, CalendarClock, Cloud,
  UploadCloud, FilePenLine, Pencil, Wifi, TrendingUp, Zap, Info,
  Clock, UserCheck, ShieldCheck, GitMerge, Scissors, AppWindow, Columns, Archive, FileSearch, Layers, Paintbrush, Split, ReceiptText, ListTree, ArrowRightLeft, Key, Filter, FileText, GitBranch, ClipboardList, SlidersHorizontal
} from 'lucide-react';

const FeatureSection = ({ title, color, children }: { title: string; color: string; children?: React.ReactNode }) => (
    <div className="relative pl-8">
        <div className="absolute left-0 top-1.5 w-3 h-3 bg-slate-700 rounded-full border-2 border-slate-900 ring-4 ring-slate-700"></div>
        <h3 className={`text-sm font-bold uppercase tracking-widest mb-6 ${color}`}>{title}</h3>
        <div className="space-y-8">{children}</div>
    </div>
);

const FeatureItem = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <div className="flex items-start gap-4">
        <div className="text-slate-500">
           <Icon size={24} />
        </div>
        <div>
            <h4 className="font-bold text-white">{title}</h4>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>
    </div>
);

export const GuideView: React.FC = () => {
  return (
    <div className="animate-fade-in max-w-3xl mx-auto pb-20">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="text-primary"/> 功能導覽
        </h2>
        <p className="text-slate-400 mt-2">探索 FinTrack AI 的核心功能與最新 AI 技術整合。</p>
      </div>

      <div className="relative border-l-2 border-slate-800 space-y-12">
        <FeatureSection title="V7.0.3 PWA & 資料精準匯入" color="text-emerald-500">
            <FeatureItem 
                icon={AppWindow}
                title="PWA App 安裝" 
                description="支援將網頁直接安裝為手機或電腦的獨立 App，提供更原生、更流暢的操作體驗。"
            />
            <FeatureItem 
                icon={FileSearch}
                title="股票名稱精準解析" 
                description="強化 CSV 匯入機制，完整讀取並儲存股票中文名稱，確保交易紀錄的名稱顯示正確不遺失。"
            />
        </FeatureSection>

        <FeatureSection title="V6.9.0 股息儀表板" color="text-slate-500">
            <FeatureItem 
                icon={PieChart}
                title="股息儀表板" 
                description="追蹤已領與預期股息，支援月/季/年配頻率分析。"
            />
        </FeatureSection>
        
        <FeatureSection title="V6.8.0 股票更新優化" color="text-slate-500">
            <FeatureItem 
                icon={Split}
                title="雙軌更新機制" 
                description="區分『快速報價』與『深度股息分析』，您可以選擇僅更新即時股價以獲得最快回應，或執行包含股息、殖利率的完整分析，提升操作效率與資料精確度。"
            />
        </FeatureSection>
        
        <FeatureSection title="V6.7.2 架構最終優化" color="text-slate-500">
            <FeatureItem 
                icon={BrainCircuit}
                title="AI 補全模組化" 
                description="將股票 AI 補全邏輯抽離至 useStockEnrichment Hook，專責處理背景數據抓取與狀態管理。"
            />
            <FeatureItem 
                icon={Clock}
                title="每日快照模組化" 
                description="將每日自動快照邏輯移至 useDailySnapshot Hook，簡化主程式並確保資料一致性。"
            />
        </FeatureSection>
        
        <FeatureSection title="核心功能" color="text-slate-500">
            <FeatureItem icon={BrainCircuit} title="AI 補完持股資訊" description="在您輸入完股票基本資料後，點擊一下，AI 會在背景為所有不完整的持股批次補上「名稱、現價、類別、殖利率」等詳細數據。" />
            <FeatureItem icon={UploadCloud} title="電子發票 CSV 匯入" description="從財政部平台下載發票 CSV 檔後，可一鍵匯入所有交易，並利用 AI 智慧判斷消費類別。" />
            <FeatureItem icon={Cloud} title="雲端同步 & 備份" description="透過您的個人 Google Drive 帳號，安全地在雲端備份與還原您的所有財務資料。" />
        </FeatureSection>
      </div>
    </div>
  );
};