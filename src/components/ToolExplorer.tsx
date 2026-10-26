import React, { useState } from 'react';
import {
  Wrench,
  Play,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Code,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { MCPServerConfig, MCPTool } from '../types/mcp';

interface ToolExplorerProps {
  servers: MCPServerConfig[];
  selectedServerId: string;
  onSelectServerId: (id: string) => void;
  onRefreshTools: (serverId: string) => Promise<void>;
}

export const ToolExplorer: React.FC<ToolExplorerProps> = ({
  servers,
  selectedServerId,
  onSelectServerId,
  onRefreshTools,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    status: 'success' | 'error';
    data: any;
    durationMs: number;
    executedAt: string;
  } | null>(null);

  const selectedServer = servers.find((s) => s.id === selectedServerId) || servers[0];
  const tools = selectedServer?.discoveredTools || [];

  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTool = (tool: MCPTool) => {
    setSelectedTool(tool);
    setExecutionResult(null);

    // Initialize default arguments from schema
    const initialArgs: Record<string, any> = {};
    if (tool.inputSchema?.properties) {
      for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
        if (prop.default !== undefined) {
          initialArgs[key] = prop.default;
        } else if (prop.type === 'string') {
          initialArgs[key] = '';
        } else if (prop.type === 'number') {
          initialArgs[key] = 0;
        } else if (prop.type === 'boolean') {
          initialArgs[key] = false;
        } else if (prop.type === 'object') {
          initialArgs[key] = '{}';
        }
      }
    }
    setToolArgs(initialArgs);
  };

  const handleRefresh = async () => {
    if (!selectedServer) return;
    setRefreshing(true);
    try {
      await onRefreshTools(selectedServer.id);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExecuteTool = async () => {
    if (!selectedTool || !selectedServer) return;
    setExecuting(true);
    setExecutionResult(null);
    const start = performance.now();

    try {
      // Process JSON arguments if any object strings
      const cleanedArgs: Record<string, any> = { ...toolArgs };
      for (const [key, val] of Object.entries(cleanedArgs)) {
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try {
            cleanedArgs[key] = JSON.parse(val);
          } catch {
            // keep as string
          }
        }
      }

      const res = await fetch(`/api/proxy/mcp/${selectedServer.id}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: selectedServer.authSession?.accessToken
            ? `Bearer ${selectedServer.authSession.accessToken}`
            : '',
          'x-mcp-upstream': selectedServer.serverUrl,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'tool_call_' + Date.now(),
          method: 'tools/call',
          params: {
            name: selectedTool.name,
            arguments: cleanedArgs,
          },
        }),
      });

      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);

      setExecutionResult({
        status: res.ok && !data.error ? 'success' : 'error',
        data,
        durationMs: elapsed,
        executedAt: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setExecutionResult({
        status: 'error',
        data: { error: err.message },
        durationMs: Math.round(performance.now() - start),
        executedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setExecuting(false);
    }
  };

  if (!selectedServer) {
    return <div className="p-8 text-center text-slate-400">No server selected.</div>;
  }

  const isAuthed = !!selectedServer.authSession?.accessToken;

  return (
    <div className="space-y-5">
      {/* Top Bar with Server Selector & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex items-center justify-center font-bold">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label htmlFor="tool-server-select" className="text-sm font-semibold text-white">Target MCP Server:</label>
              <select
                id="tool-server-select"
                value={selectedServerId}
                onChange={(e) => {
                  onSelectServerId(e.target.value);
                  setSelectedTool(null);
                  setExecutionResult(null);
                }}
                className="bg-slate-950 text-cyan-300 font-semibold text-sm px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.discoveredTools.length} tools)
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400">
              {tools.length} tools available via local address{' '}
              <span className="font-mono text-cyan-300">
                :3000/api/proxy/mcp/{selectedServer.id}/sse
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{refreshing ? 'Querying...' : 'Refresh tools/list'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Tools List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools by name or description..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Tools Cards */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredTools.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-xs">No tools found matching &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              filteredTools.map((tool) => {
                const isSelected = selectedTool?.name === tool.name;
                const propCount = Object.keys(tool.inputSchema?.properties || {}).length;
                return (
                  <div
                    key={tool.name}
                    onClick={() => handleSelectTool(tool)}
                    className={`p-3 rounded-xl border cursor-pointer transition text-left ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-cyan-300 truncate">
                        {tool.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {propCount} param{propCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{tool.description}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Interactive Execution Playground (7 cols) */}
        <div className="lg:col-span-7">
          {selectedTool ? (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-5">
              {/* Tool Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-mono text-white">{selectedTool.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      tools/call
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{selectedTool.description}</p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded ${
                      isAuthed
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {isAuthed ? 'OAuth Token Attached' : 'Unauthenticated'}
                  </span>
                </div>
              </div>

              {/* Dynamic Arguments Input Fields */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Input Arguments (JSON Schema)</span>
                </h4>

                {Object.keys(selectedTool.inputSchema?.properties || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-950 p-3 rounded-lg border border-slate-800">
                    This tool takes no parameters.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(selectedTool.inputSchema?.properties || {}).map(([key, prop]) => {
                      const isRequired = selectedTool.inputSchema?.required?.includes(key);
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <label className="font-mono text-slate-200 flex items-center gap-1">
                              <span>{key}</span>
                              {isRequired && <span className="text-rose-400 font-bold">*</span>}
                            </label>
                            <span className="text-[10px] font-mono text-slate-400">
                              {prop.type}
                              {prop.enum ? ` (one of: ${prop.enum.join(', ')})` : ''}
                            </span>
                          </div>

                          {prop.description && (
                            <p className="text-[11px] text-slate-400">{prop.description}</p>
                          )}

                          {prop.enum ? (
                            <select
                              value={toolArgs[key] || ''}
                              onChange={(e) => setToolArgs({ ...toolArgs, [key]: e.target.value })}
                              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                            >
                              {prop.enum.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : prop.type === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={!!toolArgs[key]}
                              onChange={(e) => setToolArgs({ ...toolArgs, [key]: e.target.checked })}
                              className="rounded border-slate-700 text-cyan-600 bg-slate-950"
                            />
                          ) : prop.type === 'number' ? (
                            <input
                              type="number"
                              value={toolArgs[key] ?? 0}
                              onChange={(e) => setToolArgs({ ...toolArgs, [key]: Number(e.target.value) })}
                              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={toolArgs[key] || ''}
                              onChange={(e) => setToolArgs({ ...toolArgs, [key]: e.target.value })}
                              placeholder={`Enter ${key}...`}
                              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Execute Button */}
              <div className="pt-2">
                <button
                  onClick={handleExecuteTool}
                  disabled={executing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition"
                >
                  <Play className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
                  <span>{executing ? 'Executing via Local Proxy...' : `Execute "${selectedTool.name}"`}</span>
                </button>
              </div>

              {/* Execution Result Output */}
              {executionResult && (
                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      {executionResult.status === 'success' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Tool Execution Successful</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span className="text-rose-400">Execution Error</span>
                        </>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {executionResult.durationMs}ms at {executionResult.executedAt}
                    </span>
                  </div>

                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-200 overflow-x-auto max-h-60 leading-relaxed">
                    {JSON.stringify(executionResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900/50 border border-slate-800/80 p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[360px]">
              <Wrench className="w-10 h-10 text-slate-600 mb-3" />
              <h4 className="text-sm font-semibold text-slate-300 mb-1">Select a Tool to Test</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose any tool from the list on the left to inspect its parameters and run a real JSON-RPC call through the local proxy.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
