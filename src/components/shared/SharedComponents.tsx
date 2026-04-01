import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  type?: 'success' | 'warning' | 'danger' | 'default';
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ label, type = 'default', size = 'md', className }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full font-semibold whitespace-nowrap backdrop-blur-sm";
  const sizeStyles = size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  const typeStyles = {
    success: 'bg-success-bg/80 text-green-dark border border-success-border/60',
    warning: 'bg-warning-bg/80 text-warning border border-warning-border/60',
    danger: 'bg-danger-bg/80 text-danger border border-danger-border/60',
    default: 'bg-card-alt/80 text-text-muted border border-border/60',
  };

  return (
    <span className={cn(baseStyles, sizeStyles, typeStyles[type], className)}>
      {label}
    </span>
  );
}

interface WidgetCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function WidgetCard({ children, className, onClick }: WidgetCardProps) {
  return (
    <div
      className={cn("widget-card p-4", onClick && "cursor-pointer active:scale-[0.98]", className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function AppCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <WidgetCard className={className}>{children}</WidgetCard>;
}

interface CardLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function CardLabel({ children, className }: CardLabelProps) {
  return (
    <h3 className={cn("text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3", className)}>
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
    <div className={cn("h-2 bg-muted rounded-full overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
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
      "rounded-2xl px-4 py-3 mb-3 text-sm font-medium border backdrop-blur-sm",
      type === 'warning' && "bg-warning-bg/80 border-warning-border/60 text-warning",
      type === 'danger' && "bg-danger-bg/80 border-danger-border/60 text-danger",
    )}>
      {message}
    </div>
  );
}

interface MetricWidgetProps {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  status?: 'success' | 'warning' | 'danger';
  className?: string;
  onClick?: () => void;
}

export function MetricWidget({ icon, label, value, unit, subtitle, status = 'success', className, onClick }: MetricWidgetProps) {
  const statusDot = {
    success: 'bg-green',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };

  return (
    <WidgetCard className={cn("flex flex-col", className)} onClick={onClick}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-light to-accent flex items-center justify-center">
          <span className="text-lg">{icon}</span>
        </div>
        <div className={cn("w-2 h-2 rounded-full", statusDot[status])} />
      </div>
      <p className="text-[11px] font-medium text-text-muted mb-1">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <span className="text-2xl font-bold text-text-primary tracking-tight">{value}</span>
        {unit && <span className="text-xs font-medium text-text-faint">{unit}</span>}
      </div>
      {subtitle && <p className="text-[10px] text-text-faint mt-1">{subtitle}</p>}
    </WidgetCard>
  );
}
