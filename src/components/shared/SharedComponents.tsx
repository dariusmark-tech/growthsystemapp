import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  type?: 'success' | 'warning' | 'danger' | 'default';
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ label, type = 'default', size = 'md', className }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full font-bold whitespace-nowrap";
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  const typeStyles = {
    success: 'bg-success-bg text-green-dark border border-success-border',
    warning: 'bg-warning-bg text-warning border border-warning-border',
    danger: 'bg-danger-bg text-danger border border-danger-border',
    default: 'bg-card-alt text-text-muted border border-border',
  };

  return (
    <span className={cn(baseStyles, sizeStyles, typeStyles[type], className)}>
      {label}
    </span>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function AppCard({ children, className }: CardProps) {
  return (
    <div className={cn(
      "bg-card rounded-lg border border-border p-4 shadow-[0_1px_4px_0_hsl(152_55%_28%/0.05)]",
      className
    )}>
      {children}
    </div>
  );
}

interface CardLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function CardLabel({ children, className }: CardLabelProps) {
  return (
    <h3 className={cn("text-xs font-bold text-text-muted uppercase tracking-wider mb-3", className)}>
      {children}
    </h3>
  );
}

interface SensorBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
}

export function SensorBar({ value, max, color, className }: SensorBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={cn("h-2 bg-green-light rounded-full overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          backgroundColor: color || 'hsl(var(--green))',
        }}
      />
    </div>
  );
}

interface AlertBannerProps {
  message: string;
  type: 'warning' | 'danger';
}

export function AlertBanner({ message, type }: AlertBannerProps) {
  return (
    <div className={cn(
      "rounded-lg px-4 py-3 mb-3 text-sm font-semibold border",
      type === 'warning' && "bg-warning-bg border-warning-border text-warning",
      type === 'danger' && "bg-danger-bg border-danger-border text-danger",
    )}>
      {message}
    </div>
  );
}
