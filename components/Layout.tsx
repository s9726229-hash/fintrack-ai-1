
import React from 'react';
import { ViewState, ApiKeyStatus } from '../types';
import { Theme } from '../hooks/useTheme';
import { Sidebar } from './layout/Sidebar';
import { MobileHeader } from './layout/MobileHeader';
import { MobileBottomNav } from './layout/MobileBottomNav';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isEnrichingInBackground?: boolean;
  theme: Theme;
  onToggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, isEnrichingInBackground = false, theme, onToggleTheme }) => {
  return (
    <div className="min-h-screen bg-[#F5F0E3] text-[#3D3428] flex flex-col md:flex-row font-sans">

      {/* Desktop Sidebar */}
      <Sidebar currentView={currentView} onChangeView={onChangeView} isEnrichingInBackground={isEnrichingInBackground} theme={theme} onToggleTheme={onToggleTheme} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        {/* Mobile Header (Hidden on Desktop) */}
        <MobileHeader onChangeView={onChangeView} theme={theme} onToggleTheme={onToggleTheme} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
           {children}
        </div>
        
      </main>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <MobileBottomNav currentView={currentView} onChangeView={onChangeView} />
      
    </div>
  );
};
