import { useState } from "react";
import { StatusBadge } from "@/components/shared/SharedComponents";
import { MOCK_LOGS } from "@/utils/mockData";
import { Settings } from "lucide-react";

const FILTERS = ['All', 'Optimal', 'Warning', 'Critical'] as const;

export default function LogsScreen() {
  const [filter, setFilter] = useState<string>('All');
  const filtered = filter === 'All' ? MOCK_LOGS : MOCK_LOGS.filter(l => l.status === filter);

  return (
    <div className="p-4 pb-10 no-scrollbar overflow-auto">
      <div className="flex justify-between items-start mb-1 mt-2">
        <div>
          <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">Records & Logs</h1>
          <p className="text-text-muted text-xs">{MOCK_LOGS.length} entries recorded</p>
        </div>
        <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-1">
          <Settings size={16} className="text-text-muted" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 my-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
              filter === f
                ? 'bg-green-dark border-green-dark text-primary-foreground'
                : 'bg-card border-border text-text-muted'
            }`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden shadow-[0_1px_4px_0_hsl(152_55%_28%/0.05)]">
        {/* Header */}
        <div className="flex bg-card-alt border-b border-border">
          {['Timestamp', 'Temp °C', 'Hum %', 'pH', 'TDS ppm', 'Status'].map(h => (
            <div key={h} className="flex-1 p-2 text-[9px] font-bold text-text-muted uppercase tracking-wide">
              {h}
            </div>
          ))}
        </div>
        {/* Rows */}
        {filtered.map((log, i) => (
          <div key={i} className={`flex border-b border-green-light/50 ${i % 2 === 1 ? 'bg-[hsl(140,20%,98%)]' : ''}`}>
            <div className="flex-1 p-2 text-[10px] text-text-muted">{log.timestamp}</div>
            <div className="flex-1 p-2 text-xs text-text-primary">{log.temp}</div>
            <div className="flex-1 p-2 text-xs text-text-primary">{log.humidity}</div>
            <div className="flex-1 p-2 text-xs text-text-primary">{log.ph}</div>
            <div className="flex-1 p-2 text-xs text-text-primary">{log.tds}</div>
            <div className="flex-1 p-2 flex items-center">
              <StatusBadge
                label={log.status}
                type={log.status === 'Optimal' ? 'success' : log.status === 'Warning' ? 'warning' : 'danger'}
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
