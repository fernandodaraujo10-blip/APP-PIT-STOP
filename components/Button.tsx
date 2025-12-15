import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'golden' | 'danger' | 'ghost';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  fullWidth = false,
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-vivid-blue text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20",
    secondary: "bg-white text-navy border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    golden: "bg-golden text-navy hover:bg-yellow-400 shadow-md",
    danger: "bg-red-100 text-red-600 hover:bg-red-200",
    ghost: "bg-transparent text-slate-text hover:bg-slate-100"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
};