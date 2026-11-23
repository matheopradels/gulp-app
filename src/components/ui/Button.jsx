import React from 'react';

const VARIANTS = {
  primary: 'bg-[#CEFF00] text-black font-bold active:bg-[#b8e600]',
  secondary: 'bg-zinc-800 text-white active:bg-zinc-700',
  danger: 'bg-red-600 text-white active:bg-red-700',
  outline: 'border border-[#CEFF00] text-[#CEFF00] active:bg-[#CEFF00] active:text-black',
};

export default function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  ariaLabel,
  type = 'button',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`px-6 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
