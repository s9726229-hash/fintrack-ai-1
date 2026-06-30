import React, { PropsWithChildren } from 'react';

export const Card = ({ children, className = '', onClick, ...rest }: PropsWithChildren<{ className?: string, onClick?: () => void, [key: string]: any }>) => (
  <div className={`bg-slate-800 border border-slate-700 rounded-2xl p-6 ${className}`} onClick={onClick} {...rest}>
    {children}
  </div>
);

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  loading = false,
  as: Component = 'button',
  ...rest
}: { 
  children?: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; 
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  as?: React.ElementType;
  [x: string]: any;
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50",
    ghost: "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
  };

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

export const Input = ({ onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // For number inputs, skip update when value is empty (user is mid-typing a negative number like "-7")
    if (props.type === 'number' && e.target.value === '') return;
    onChange?.(e);
  };
  return (
    <input
      {...props}
      onChange={handleChange}
      className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${props.className}`}
    />
  );
};

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${props.className}`}
  >
    {props.children}
  </select>
);

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-700 shrink-0">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
