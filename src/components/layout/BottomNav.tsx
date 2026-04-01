import { NavLink, useLocation } from "react-router-dom";
import { Home, BarChart3, Camera, FileText, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/monitor", icon: BarChart3, label: "Monitor" },
  { path: "/camera", icon: Camera, label: "Camera" },
  { path: "/logs", icon: FileText, label: "Logs" },
  { path: "/health", icon: Heart, label: "Health" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto">
      <div className="flex items-center justify-around h-16 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 shadow-[var(--shadow-float)]">
        {TABS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200",
                isActive
                  ? "text-green-dark"
                  : "text-text-faint hover:text-text-muted"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                isActive && "bg-green-light"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
              </div>
              <span className={cn("text-[9px] font-semibold", isActive && "font-bold text-green-dark")}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
