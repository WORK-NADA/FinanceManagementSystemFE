import React from 'react';
import { cn } from '@/lib/cn';

export interface VyaparLogoProps {
  /** Logo size presets */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color theme adaptation */
  variant?: 'on-dark' | 'on-light' | 'monochrome';
  /** Whether to show the 'व्यापार' text lockup */
  showText?: boolean;
  /** Whether to show the 'ENTERPRISE ERP' subtitle */
  showSubtitle?: boolean;
  /** Custom class for outer wrapper */
  className?: string;
  /** Custom class for the 'व्यापार' typography */
  textClassName?: string;
  /** Optional click handler (e.g. navigate to dashboard) */
  onClick?: () => void;
}

const sizeConfig = {
  xs: {
    iconSize: 24,
    textSize: 'text-base',
    subtitleSize: 'text-[7.5px]',
    gap: 'gap-2',
    subOffset: '-mt-0.5',
  },
  sm: {
    iconSize: 30,
    textSize: 'text-xl',
    subtitleSize: 'text-[8.5px]',
    gap: 'gap-2.5',
    subOffset: '-mt-1',
  },
  md: {
    iconSize: 38,
    textSize: 'text-2xl',
    subtitleSize: 'text-[10px]',
    gap: 'gap-3',
    subOffset: '-mt-1',
  },
  lg: {
    iconSize: 46,
    textSize: 'text-3xl',
    subtitleSize: 'text-[11px]',
    gap: 'gap-3.5',
    subOffset: '-mt-0.5',
  },
  xl: {
    iconSize: 58,
    textSize: 'text-4xl',
    subtitleSize: 'text-xs',
    gap: 'gap-4',
    subOffset: 'mt-0',
  },
};

/**
 * Bespoke vector emblem for 'व्यापार'
 * Communicates:
 * - Architectural Shirorekha & Ledger column (stability, audited accounts, governance)
 * - Devanagari 'व' (Va) loop (continuous circulation of trade and capital)
 * - Dynamic ascending trade vector (financial momentum and compounding growth)
 * - Golden prosperity seal (wealth generation, liquidity, enterprise trust)
 */
export const VyaparIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 38,
  className,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 select-none transition-transform duration-200 group-hover:scale-[1.03]',
        className
      )}
      aria-hidden="true"
    >
      <defs>
        {/* Emerald Base Foundation Gradients */}
        <linearGradient id="vyaparBgGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#05241B" />
          <stop offset="35%" stopColor="#0D644B" />
          <stop offset="70%" stopColor="#12956F" />
          <stop offset="100%" stopColor="#074433" />
        </linearGradient>

        <linearGradient id="vyaparBorderGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.65" />
          <stop offset="30%" stopColor="#34D399" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#042017" stopOpacity="0.8" />
        </linearGradient>

        {/* Warm Gold Prosperity Gradients */}
        <linearGradient id="vyaparGoldGrad" x1="31" y1="10" x2="39" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="30%" stopColor="#F59E0B" />
          <stop offset="75%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Dynamic Growth Trajectory Gradient */}
        <linearGradient id="vyaparArrowGrad" x1="27" y1="28" x2="36" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Subtle Specular Top Highlight */}
        <linearGradient id="vyaparShine" x1="12" y1="4" x2="36" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Outer Shadow Filter */}
        <filter id="vyaparShadow" x="0" y="2" width="48" height="48" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* ── 1. Squircle Shield / Foundation ── */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="11"
        fill="url(#vyaparBgGrad)"
        stroke="url(#vyaparBorderGrad)"
        strokeWidth="1.5"
        filter="url(#vyaparShadow)"
      />

      {/* Specular Bevel Highlight Arc */}
      <path
        d="M 13 4.5 Q 24 3.5 35 4.5 Q 43.5 13 44.5 24"
        stroke="url(#vyaparShine)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── 2. The Architectural Shirorekha / Top Horizon ── */}
      <path
        d="M 11 14.5 H 29"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── 3. Devanagari 'व' Core Loop (Assets, Trade Loop, Vault) ── */}
      <path
        d="M 27 24.5 C 27 29.5 22.8 33.5 18 33.5 C 13.5 33.5 11 29.8 11 24.5 C 11 19.2 13.8 15.8 18 15.8 C 22.5 15.8 26.5 19.2 27 23.5"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Subtle emerald core illumination for the 'व' loop */}
      <circle
        cx="18"
        cy="24.5"
        r="4.2"
        fill="#34D399"
        fillOpacity="0.2"
      />

      {/* ── 4. Main Vertical Ledger Stem (Audit Trail & Structural Governance) ── */}
      <path
        d="M 27 14.5 V 33.5"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* ── 5. Dynamic Ascending Trade Vector (Surging upward growth) ── */}
      <path
        d="M 27 28.5 L 34.8 20.2"
        stroke="url(#vyaparArrowGrad)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Secondary momentum line */}
      <path
        d="M 31.5 29.5 L 36.8 23.8"
        stroke="#FDE68A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />

      {/* ── 6. The Golden Prosperity Coin / Seal (Wealth, Capital, Liquidity) ── */}
      <g>
        {/* Outer ambient glow */}
        <circle
          cx="35.5"
          cy="14.5"
          r="5.5"
          fill="#F59E0B"
          fillOpacity="0.28"
        />
        {/* Main Gold Coin */}
        <circle
          cx="35.5"
          cy="14.5"
          r="4.2"
          fill="url(#vyaparGoldGrad)"
          stroke="#FFFBEB"
          strokeWidth="0.8"
        />
        {/* Inner coin seal core */}
        <circle
          cx="35.5"
          cy="14.5"
          r="1.8"
          fill="#FFFFFF"
          fillOpacity="0.5"
        />
      </g>
    </svg>
  );
};

export const VyaparLogo: React.FC<VyaparLogoProps> = ({
  size = 'md',
  variant = 'on-dark',
  showText = true,
  showSubtitle = false,
  className,
  textClassName,
  onClick,
}) => {
  const cfg = sizeConfig[size];

  const textColorClass = {
    'on-dark': 'text-white tracking-wide group-hover:text-emerald-50 transition-colors',
    'on-light': 'text-gray-900 tracking-wide group-hover:text-emerald-900 transition-colors',
    'monochrome': 'text-gray-900 tracking-wide',
  }[variant];

  const subtitleColorClass = {
    'on-dark': 'text-emerald-400 font-semibold',
    'on-light': 'text-[#0F7B5C] font-semibold',
    'monochrome': 'text-gray-500 font-medium',
  }[variant];

  const content = (
    <div
      className={cn(
        'inline-flex items-center select-none group',
        cfg.gap,
        onClick && 'cursor-pointer rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/50 p-1 -m-1 transition-all active:scale-[0.98]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label="व्यापार Enterprise ERP"
    >
      <VyaparIcon size={cfg.iconSize} />

      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <span
            className={cn(
              'font-devanagari font-bold leading-tight select-none',
              cfg.textSize,
              textColorClass,
              textClassName
            )}
            style={{
              letterSpacing: '0.015em',
            }}
          >
            व्यापार
          </span>

          {showSubtitle && (
            <span
              className={cn(
                'font-sans tracking-[0.22em] uppercase select-none',
                cfg.subtitleSize,
                cfg.subOffset,
                subtitleColorClass
              )}
            >
              Enterprise ERP
            </span>
          )}
        </div>
      )}
    </div>
  );

  return content;
};

export default VyaparLogo;
