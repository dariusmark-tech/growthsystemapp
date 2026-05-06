import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  className?: string;
  label?: string;
}

export default function LogoLoader({ size = 48, className, label }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <img
        src={logo}
        alt="Loading"
        style={{ width: size, height: size }}
        className="object-contain animate-pulse"
      />
      {label && <p className="text-text-muted text-xs">{label}</p>}
    </div>
  );
}
