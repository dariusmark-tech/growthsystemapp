import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Settings } from "lucide-react";

export default function LogoutButton() {
  const { signOut, profile } = useAuth();
  const [open, setOpen] = useState(false);

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
      >
        {initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[140px]">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-bold text-text-primary truncate">{profile?.display_name || "User"}</p>
            </div>
            <button
              onClick={async () => { setOpen(false); await signOut(); }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold text-danger hover:bg-muted rounded-lg transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
