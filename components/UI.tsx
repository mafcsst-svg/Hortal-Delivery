import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', isLoading, ...props }: any) => {
  const baseClass = "px-4 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95";
  const variants: any = {
    primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-100",
    outline: "border-2 border-brand-100 text-brand-500 hover:bg-brand-50 hover:border-brand-200",
    ghost: "text-stone-500 hover:bg-stone-100",
    secondary: "bg-stone-800 text-white hover:bg-stone-700",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200",
    danger: "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200"
  };
  return (
    <button className={`${baseClass} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {isLoading && <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"/>}
      {children}
    </button>
  );
};

export const Input = ({ label, icon, error, ...props }: any) => (
  <div className="space-y-1.5 w-full text-left">
    {label && <label className="text-xs font-bold uppercase text-stone-500 tracking-wider ml-1">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">{icon}</div>}
      <input 
        className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3 rounded-xl bg-white border outline-none focus:ring-4 transition-all font-medium text-stone-700 placeholder:text-stone-300 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-50' : 'border-stone-200 focus:border-brand-500 focus:ring-brand-50/50'}`}
        {...props}
      />
    </div>
    {error && <span className="text-xs text-red-500 font-medium ml-1">{error}</span>}
  </div>
);
