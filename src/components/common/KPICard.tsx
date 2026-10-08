'use client';
import { useRouter } from 'next/navigation';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  variant?: 'default' | 'danger' | 'success';
  subtitle?: string;
  link?: string;
  onClick?: () => void;
}

const VARIANT_STYLES = {
  default: {
    border: 'border-t-primary',
    headerBg: 'from-primary/8 to-primary/3',
    iconBg: 'bg-primary/10 text-primary ring-primary/15',
    valueColor: 'text-foreground',
    subtitleColor: 'text-primary/60',
    glow: 'hover:shadow-[0_12px_32px_hsl(var(--primary)/0.14)]',
    dot: 'bg-primary',
  },
  danger: {
    border: 'border-t-destructive',
    headerBg: 'from-destructive/8 to-destructive/3',
    iconBg: 'bg-destructive/10 text-destructive ring-destructive/15',
    valueColor: 'text-destructive',
    subtitleColor: 'text-destructive/60',
    glow: 'hover:shadow-[0_12px_32px_hsl(var(--destructive)/0.14)]',
    dot: 'bg-destructive',
  },
  success: {
    border: 'border-t-emerald-500',
    headerBg: 'from-emerald-500/8 to-emerald-500/3',
    iconBg: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/15',
    valueColor: 'text-foreground',
    subtitleColor: 'text-emerald-600/60',
    glow: 'hover:shadow-[0_12px_32px_rgba(16,185,129,0.14)]',
    dot: 'bg-emerald-500',
  },
};

export default function KPICard({
  title,
  value,
  icon: Icon,
  change,
  variant = 'default',
  subtitle,
  link,
  onClick,
}: KPICardProps) {
  const router = useRouter();
  const s = VARIANT_STYLES[variant];
  const isInteractive = !!(link || onClick);

  return (
    <div
      className={`relative rounded-2xl border border-border border-t-[3px] ${s.border} bg-card shadow-sm ${s.glow} transition-all duration-300 hover:-translate-y-1 ${isInteractive ? 'cursor-pointer' : ''} group overflow-hidden`}
      onClick={() => {
        if (onClick) onClick();
        else if (link) router.push(link);
      }}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          if (onClick) onClick();
          else if (link) router.push(link);
        }
      }}
    >
      {/* Subtle header gradient */}
      <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${s.headerBg} pointer-events-none`} />

      <div className="relative p-5 flex flex-col gap-4">
        {/* Top row: title + icon */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-muted-foreground leading-tight">{title}</p>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${s.iconBg} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </div>

        {/* Value */}
        <div>
          <p className={`text-4xl font-bold tracking-tight tabular-nums ${s.valueColor} leading-none`}>
            {value}
          </p>
        </div>

        {/* Bottom row: subtitle + change */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
          {subtitle && (
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              <span className={`text-[11px] font-medium ${s.subtitleColor} uppercase tracking-widest`}>
                {subtitle}
              </span>
            </div>
          )}
          {change && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${change.startsWith('+') ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-destructive bg-destructive/5 border border-destructive/20'}`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
