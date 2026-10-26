import React, { useState, useEffect } from 'react';
import {
  Activity,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LogItem } from '../types/mcp';

interface TrafficLogsProps {
  serverId?: string;
}

export const TrafficLogs: React.FC<TrafficLogsProps> = ({ serverId }) => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const fetchLogs = async () => {
    try {
      const url = serverId ? `/api/logs?serverId=${serverId}` : '/api/logs';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {
      // offline or dev error
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [serverId, autoRefresh]);

  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch {
      //
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (methodFilter === 'all') return true;
    return log.method.toLowerCase().includes(methodFilter.toLowerCase());
  });

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Proxy Traffic & Audit Logs</span>
            <span className="text-xs font-normal text-slate-400">({logs.length} events)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time JSON-RPC and SSE requests routed through this proxy
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-slate-950 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
          >
            <option value="all">All Operations</option>
            <option value="initialize">initialize</option>
            <option value="tools/list">tools/list</option>
            <option value="tools/call">tools/call</option>
            <option value="sse">SSE Stream</option>
          </select>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              autoRefresh
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {autoRefresh ? 'Live Auto-Poll ON' : 'Auto-Poll OFF'}
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClearLogs}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 transition"
            title="Clear all logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No traffic recorded yet. Connect a client or test a tool to see live traffic.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              const isSuccess = log.status >= 200 && log.status < 300;
              return (
                <div key={log.id} className="p-3.5 hover:bg-slate-850/50 transition">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                          isSuccess
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {log.status}
                      </span>

                      <span className="font-mono text-xs font-semibold text-cyan-300">{log.method}</span>

                      <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                        {log.path}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="font-mono text-[11px] text-slate-400">{log.durationMs}ms</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Payload Inspector */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      {/* Request */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-cyan-400">
                          Request Payload
                        </span>
                        <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto max-h-48">
                          {JSON.stringify(log.requestSnippet || {}, null, 2)}
                        </pre>
                      </div>

                      {/* Response */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-emerald-400">
                          Response Payload
                        </span>
                        <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto max-h-48">
                          {JSON.stringify(log.responseSnippet || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
