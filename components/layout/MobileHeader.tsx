
import React from 'react';
import { ViewState } from '../../types';
import { Settings, ListTree } from 'lucide-react';

interface MobileHeaderProps {
  onChangeView: (view: ViewState) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onChangeView }) => {
  return (
    <header className="md:hidden h-16 bg-white/90 backdrop-blur-md border-b border-[#EDE4D6] flex items-center justify-between px-6 z-20 shrink-0 sticky top-0">
      <div className="font-bold text-lg flex items-center gap-2 text-[#3D3428]">
        <div className="w-8 h-8 rounded-lg bg-[#C4523A] flex items-center justify-center">
           <span className="font-bold text-white text-xs">FT</span>
        </div>
        FinTrack AI
      </div>

      <div className="ml-auto flex items-center gap-1">
         <button onClick={() => onChangeView('GUIDE')} className="p-2.5 text-[#A69B87] hover:text-[#3D3428] transition-colors" title="版本紀錄" aria-label="版本紀錄">
            <ListTree size={22} />
         </button>
         <button onClick={() => onChangeView('SETTINGS')} className="p-2.5 text-[#A69B87] hover:text-[#3D3428] transition-colors" title="系統設定" aria-label="系統設定">
            <Settings size={24} />
         </button>
      </div>
    </header>
  );
};
