import { useState } from "react";
import { WidgetCard, StatusBadge } from "@/components/shared/SharedComponents";
import { MOCK_LOGS } from "@/utils/mockData";
import { Settings } from "lucide-react";

const FILTERS = ['All', 'Optimal', 'Warning', 'Critical'] as const;

export default function LogsScreen() {
  const [filter, setFilter] = useState<string>('All');
  const filtered = filter === 'All' ? MOCK_LOGS : MOCK_LOGS.filter(l => l.status === filter);

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto">
      <div className="flex justify-between items-center mb-5 mt-3">
        <div>
          <p className="text-text-faint text-xs font-medium mb-0.5">{MOCK_LOGS.length} entries</p>
          <h1 className="text-[26px] font-bold text-text-primary tracking-tight">Records</h1>
        </div>
        <button className="w-9 h-9 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 flex items-center justify-center shadow-sm">
          <Settings size={16} className="text-text-muted" />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`px-4 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 ${
              filter === f
                ? 'bg-green-dark text-primary-foreground shadow-sm'
                : 'bg-card/80 backdrop-blur-sm border border-border/60 text-text-muted'
            }`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Log entries as widget cards */}
      <div className="space-y-2">
        {filtered.map((log, i) => (
          <WidgetCard key={i} className="!p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-text-faint font-medium">{log.timestamp}</span>
              <StatusBadge
                label={log.status}
                type={log.status === 'Optimal' ? 'success' : log.status === 'Warning' ? 'warning' : 'danger'}
                size="sm"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Temp', value: `${log.temp}°C`, icon: '🌡️' },
                { label: 'Humidity', value: `${log.humidity}%`, icon: '💧' },
                { label: 'pH', value: `${log.ph}`, icon: '🧪' },
                { label: 'TDS', value: `${log.tds}`, icon: '⚡' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-card-alt/50 rounded-lg p-2 text-center border border-border/30">
                  <span className="text-[10px]">{icon}</span>
                  <p className="text-[12px] font-bold text-text-primary mt-0.5">{value}</p>
                  <p className="text-[9px] text-text-faint">{label}</p>
                </div>
              ))}
            </div>
          </WidgetCard>
        ))}
      </div>
    </div>
  );
}
