import { NavLink, useLocation } from "react-router-dom";
import { Home, BarChart3, Camera, FileText, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSensorAlerts } from "@/hooks/useSensorAlerts";

const TABS = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/monitor", icon: BarChart3, label: "Monitor" },
  { path: "/camera", icon: Camera, label: "Camera" },
  { path: "/logs", icon: FileText, label: "Logs" },
  { path: "/health", icon: Heart, label: "Health" },
];

export default function BottomNav() {
  const location = useLocation();
  const alerts = useSensorAlerts();
  const hasSensorIssue = alerts.length > 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 shadow-[0_-2px_8px_0_hsl(152_55%_28%/0.06)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {TABS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const showBadge = path === "/monitor" && hasSensorIssue;
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 transition-all duration-200 hover:scale-105",
                isActive ? "text-green-dark" : "text-text-faint"
              )}
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className={cn("transition-opacity", isActive ? "opacity-100" : "opacity-50")}
                />
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-danger text-primary-foreground text-[9px] font-extrabold flex items-center justify-center border border-card animate-pulse"
                    aria-label={`${alerts.length} sensor alert${alerts.length > 1 ? "s" : ""}`}
                  >
                    !
                  </span>
                )}
              </div>
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
