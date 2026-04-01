import { NavLink, useLocation } from "react-router-dom";
import { Home, BarChart3, Camera, FileText, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/monitor", icon: BarChart3, label: "Monitor" },
  { path: "/camera", icon: Camera, label: "Camera" },
  { path: "/logs", icon: FileText, label: "Logs" },
  { path: "/health", icon: Heart, label: "Health" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 shadow-[0_-2px_8px_0_hsl(152_55%_28%/0.06)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {TABS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 transition-colors",
                isActive ? "text-green-dark" : "text-text-faint"
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} className={isActive ? "opacity-100" : "opacity-50"} />
              <span className={cn("text-[9px] font-bold", isActive && "text-green-dark")}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
