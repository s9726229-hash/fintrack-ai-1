import React, { PropsWithChildren } from 'react';

export const Card = ({ children, className = '', onClick, theme = 'dark', ...rest }: PropsWithChildren<{ className?: string, onClick?: () => void, theme?: 'dark' | 'warm', [key: string]: any }>) => {
  const themeStyle = theme === 'warm'
    ? 'bg-[#FFFDF7] border border-[#EDE4D6] rounded-xl shadow-[0_1px_2px_rgba(60,50,30,0.05)]'
    : 'bg-slate-800 border border-slate-700 rounded-2xl';
  return (
    <div className={`${themeStyle} p-6 ${className}`} onClick={onClick} {...rest}>
      {children}
    </div>
  );
};

// 全站統一的「分頁列」樣式：任何「切換後會改變下方資料內容」的 tab 都算分頁，
// 不分它實際上是切換整組資料集（如股票投資的庫存/交易/股息）、篩選子集（資產管理的類別）、
// 或選時間範圍（收支記帳的月/季/半年...），一律用這顆元件、放在頁面標題列正下方，維持全站視覺與位置一致。
export interface TabOption<T extends string = string> { value: T; label: string; }

export const Tabs = <T extends string = string>({
  options,
  active,
  onChange,
  rightSlot,
}: {
  options: TabOption<T>[];
  active: T;
  onChange: (value: T) => void;
  rightSlot?: React.ReactNode;
}) => {
  return (
    <div className="flex items-center justify-between border-b border-[#EDE4D6] flex-wrap gap-y-2">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-1 py-3 text-sm border-b-2 transition-all whitespace-nowrap shrink-0 ${
              active === opt.value
                ? 'text-[#C4523A] border-[#C4523A] font-bold'
                : 'text-[#A69B87] border-transparent hover:text-[#3D3428] font-medium'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {rightSlot && <div className="relative flex items-center gap-2 shrink-0">{rightSlot}</div>}
    </div>
  );
};

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  theme = 'dark',
  className = '',
  disabled = false,
  loading = false,
  as: Component = 'button',
  ...rest
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  theme?: 'dark' | 'warm';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  as?: React.ElementType;
  [x: string]: any;
}) => {
  const darkBaseStyle = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const darkVariants = {
    primary: "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50",
    ghost: "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
  };

  const warmBaseStyle = "px-4 py-2 rounded-full font-medium transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm";
  const warmVariants = {
    primary: "bg-[#C4523A] hover:bg-[#AD452F] text-white",
    secondary: "bg-white hover:bg-[#FBF7F0] text-[#8A7A63] border border-[#EDE4D6]",
    danger: "bg-white hover:bg-[#F6E4DE] text-[#B45B45] border border-[#EDE4D6]",
    ghost: "text-[#A69B87] hover:text-[#3D3428] hover:bg-[#FBF7F0]"
  };

  const baseStyle = theme === 'warm' ? warmBaseStyle : darkBaseStyle;
  const variants = theme === 'warm' ? warmVariants : darkVariants;

  const props = {
    ...rest,
    onClick,
    disabled: disabled || loading,
    className: `${baseStyle} ${variants[variant]} ${className}`
  };

  if (Component !== 'button') {
    delete (props as any).disabled;
  }
  
  return (
    <Component {...props}>
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"></span>
      )}
      {children}
    </Component>
  );
};

export const Input = ({ onChange, value, type, theme = 'dark', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { theme?: 'dark' | 'warm' }) => {
  const isNumeric = type === 'number';
  const [localValue, setLocalValue] = React.useState(value !== undefined ? String(value) : '');

  // Sync when external value changes (e.g. reset button)
  React.useEffect(() => {
    if (value !== undefined) setLocalValue(String(value));
  }, [value]);

  const themeClass = theme === 'warm'
    ? 'bg-white border border-[#EDE4D6] text-[#3D3428] placeholder:text-[#C4A98A] focus:outline-none focus:border-[#C4523A] focus:ring-1 focus:ring-[#C4523A]'
    : 'bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

  if (isNumeric) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setLocalValue(raw);
      // Only propagate when it's a complete valid number (not mid-typing "-" or empty)
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        const synth = { ...e, target: { ...e.target, value: String(num), valueAsNumber: num } };
        onChange?.(synth as React.ChangeEvent<HTMLInputElement>);
      }
    };
    return (
      <input
        {...props}
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        className={`w-full rounded-lg px-4 py-2 ${themeClass} ${props.className}`}
      />
    );
  }

  return (
    <input
      {...props}
      type={type}
      value={value}
      onChange={onChange}
      className={`w-full rounded-lg px-4 py-2 ${themeClass} ${props.className}`}
    />
  );
};

export const Select = ({ theme = 'dark', ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { theme?: 'dark' | 'warm' }) => {
  const themeClass = theme === 'warm'
    ? 'bg-white border border-[#EDE4D6] text-[#3D3428] focus:outline-none focus:border-[#C4523A] focus:ring-1 focus:ring-[#C4523A]'
    : 'bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';
  return (
    <select
      {...props}
      className={`w-full rounded-lg px-4 py-2 ${themeClass} ${props.className}`}
    >
      {props.children}
    </select>
  );
};

export const Modal = ({ isOpen, onClose, title, children, theme = 'dark' }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; theme?: 'dark' | 'warm' }) => {
  if (!isOpen) return null;
  const themeClass = theme === 'warm'
    ? { panel: 'bg-white border border-[#EDE4D6]', header: 'border-[#EDE4D6]', title: 'text-[#3D3428]', close: 'text-[#A69B87] hover:text-[#3D3428]' }
    : { panel: 'bg-slate-800 border border-slate-700', header: 'border-slate-700', title: 'text-white', close: 'text-slate-400 hover:text-white' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`${themeClass.panel} rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col`}>
        <div className={`flex justify-between items-center p-6 border-b ${themeClass.header} shrink-0`}>
          <h2 className={`text-xl font-bold ${themeClass.title}`}>{title}</h2>
          <button onClick={onClose} className={themeClass.close}>✕</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
