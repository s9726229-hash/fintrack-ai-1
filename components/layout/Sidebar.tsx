

import React from 'react';
import { ViewState, ApiKeyStatus } from '../../types';
import {
  LayoutGrid, PieChart, ScrollText, Target, CalendarClock,
  Bot, Settings, TrendingUp, Loader2, ListTree
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isEnrichingInBackground?: boolean;
}

const ApiKeyStatusIndicator = ({ status }: { status: ApiKeyStatus }) => {
    const statusConfig = {
        unchecked: { color: 'bg-slate-500', textColor: 'text-slate-500', pulse: false, label: '未啟用', tooltip: 'AI 未啟用：未設定 API Key' },
        verifying: { color: 'bg-amber-500', textColor: 'text-amber-500', pulse: true, label: '驗證中', tooltip: 'AI 狀態：正在驗證...' },
        valid: { color: 'bg-emerald-500', textColor: 'emerald-500', pulse: false, label: 'AI 上線', tooltip: 'AI 上線：金鑰有效' },
        invalid: { color: 'bg-red-500', textColor: 'text-red-500', pulse: false, label: 'AI 離線', tooltip: 'AI 離線：金鑰無效' },
    };
    const { color, textColor, pulse, label, tooltip } = statusConfig[status];

    return (
        <div title={tooltip} className="flex items-center gap-1.5 ml-2 cursor-help">
            <div className={`w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''} transition-colors`}></div>
            <span className={`text-[10px] font-bold ${textColor}`}>{label}</span>
        </div>
    );
};

const NavItem = ({ 
  view, current, icon: Icon, label, onClick, loading = false
}: { 
  view: ViewState; current: ViewState; icon: any; label: string; onClick: (v: ViewState) => void; loading?: boolean 
}) => {
  const isActive = view === current;
  return (
    <button
      onClick={() => onClick(view)}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center justify-between w-full p-3 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-[#FBEAEA] text-[#C4523A] border border-[#C4523A]/30'
          : 'text-[#A69B87] hover:bg-[#FBF7F0] hover:text-[#3D3428] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="font-medium tracking-wide">{label}</span>
      </div>
      {loading && <Loader2 size={16} className="animate-spin text-[#A69B87]" />}
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isEnrichingInBackground = false }) => {
  const [apiStatus, setApiStatus] = React.useState({ finmind: 'online' });

  React.useEffect(() => {
    const handleStatusChange = (e: any) => {
      setApiStatus(prev => ({ ...prev, [e.detail.api]: e.detail.status }));
    };
    window.addEventListener('api-status-change', handleStatusChange);
    return () => window.removeEventListener('api-status-change', handleStatusChange);
  }, []);

  return (
    <aside className="hidden md:flex flex-col w-64 p-6 border-r border-[#EDE4D6] h-screen sticky top-0 bg-white shrink-0">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 rounded-xl bg-[#C4523A] flex items-center justify-center">
          <span className="font-bold text-white text-lg">FT</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#3D3428]">
            FinTrack AI
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            <span className="text-[11px] text-[#A69B87] bg-[#FBF7F0] px-1.5 py-0.5 rounded">V7.11.1</span>
            <div className="flex items-center gap-1" title={apiStatus.finmind === 'online' ? "FinMind API 連線正常" : "FinMind API 連線失敗"}>
                <div className={`w-1.5 h-1.5 rounded-full ${apiStatus.finmind === 'online' ? 'bg-[#6B9080]' : 'bg-red-500'}`}></div>
                <span className={`text-[10px] font-bold ${apiStatus.finmind === 'online' ? 'text-[#6B9080]' : 'text-red-500/80'}`}>FinMind</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <NavItem view="DASHBOARD" current={currentView} icon={LayoutGrid} label="總覽儀表板" onClick={onChangeView} />
        <NavItem view="ASSETS" current={currentView} icon={PieChart} label="資產管理" onClick={onChangeView} />
        <NavItem view="INVESTMENTS" current={currentView} icon={TrendingUp} label="股票投資" onClick={onChangeView} loading={isEnrichingInBackground} />
        <NavItem view="TRANSACTIONS" current={currentView} icon={ScrollText} label="收支記帳" onClick={onChangeView} />
        <NavItem view="BUDGET" current={currentView} icon={Target} label="預算與分析" onClick={onChangeView} />
        <NavItem view="RECURRING" current={currentView} icon={CalendarClock} label="固定收支" onClick={onChangeView} />

        <div className="pt-4 mt-2 border-t border-[#EDE4D6] space-y-2">
          <NavItem view="GUIDE" current={currentView} icon={ListTree} label="版本紀錄" onClick={onChangeView} />
        </div>
      </nav>

      <div className="p-4 mt-auto">
         <button onClick={() => onChangeView('SETTINGS')} aria-label="系統設定" className="flex items-center justify-center w-full text-[#A69B87] hover:text-[#3D3428] transition-colors py-2 bg-[#FBF7F0] rounded-lg border border-[#EDE4D6] hover:border-[#C4A98A]">
           <Settings size={16} className="mr-2"/> <span className="text-sm">系統設定</span>
         </button>
      </div>
    </aside>
  );
};