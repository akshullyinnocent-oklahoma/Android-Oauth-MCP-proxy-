import React, { useState } from 'react';
import {
  Server,
  Plus,
  Play,
  Pause,
  KeyRound,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Settings,
  Trash2,
  Wrench,
  Radio,
  Sparkles,
  RefreshCw,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { MCPServerConfig } from '../types/mcp';

interface ServerListProps {
  servers: MCPServerConfig[];
  onSelectServer: (server: MCPServerConfig) => void;
  onToggleProxy: (serverId: string) => void;
  onInitiateOAuth: (server: MCPServerConfig) => void;
  onQuickSimulateOAuth: (server: MCPServerConfig) => void;
  onLogoutOAuth: (serverId: string) => void;
  onOpenAddModal: () => void;
  onDeleteServer: (serverId: string) => void;
  onOpenToolExplorer: (serverId: string) => void;
}

export const ServerList: React.FC<ServerListProps> = ({
  servers,
  onSelectServer,
  onToggleProxy,
  onInitiateOAuth,
  onQuickSimulateOAuth,
  onLogoutOAuth,
  onOpenAddModal,
  onDeleteServer,
  onOpenToolExplorer,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyAddress = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Configured MCP Servers</span>
            <span className="text-xs font-normal text-slate-400">({servers.length} configured)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Servers with active OAuth tokens expose local proxy endpoints for client tools
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add MCP Server</span>
        </button>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {servers.map((server) => {
          const isAuthed = !!server.authSession?.accessToken;
          const localAddress = `${window.location.origin}/api/proxy/mcp/${server.id}/sse`;
          const toolCount = server.discoveredTools.length;

          return (
            <div
              key={server.id}
              className={`rounded-2xl border p-4 transition-all duration-200 ${
                server.isProxyActive
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-md shadow-slate-950/40 hover:border-cyan-500/50'
                  : 'bg-slate-900/40 border-slate-800/80 opacity-80'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${
                      isAuthed
                        ? 'bg-gradient-to-br from-emerald-500 to-cyan-600 text-slate-950 shadow-emerald-500/10'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {server.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">{server.name}</h3>
                      {server.isProxyActive && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.2 rounded-full">
                          <Radio className="w-2.5 h-2.5 animate-pulse" />
                          <span>ACTIVE</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{server.description}</p>
                  </div>
                </div>

                {/* Proxy Enable Toggle */}
                <button
                  onClick={() => onToggleProxy(server.id)}
                  className={`p-2 rounded-xl transition ${
                    server.isProxyActive
                      ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                  title={server.isProxyActive ? 'Pause Local Proxy' : 'Enable Local Proxy'}
                >
                  {server.isProxyActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              {/* Upstream Remote URL */}
              <div className="mb-3 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="text-[10px] uppercase font-mono font-semibold tracking-wider">Remote MCP URL</span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    {server.transportType.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-cyan-200 truncate">{server.serverUrl}</div>
              </div>

              {/* Local Proxy Address */}
              <div className="mb-3.5 px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/60 text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-0.5">
                  <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-emerald-400">
                    Local Proxy Address
                  </span>
                  <button
                    onClick={() => copyAddress(localAddress, server.id)}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    {copiedId === server.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Address</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-slate-300 text-[11px] truncate">{localAddress}</div>
              </div>

              {/* Auth Status & Controls */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isAuthed ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authorized</span>
                      {server.authSession?.scope && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {server.authSession.scope.split(' ').length} Scopes
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                      <KeyRound className="w-4 h-4" />
                      <span>OAuth Login Required</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {isAuthed ? (
                    <>
                      <button
                        onClick={() => onOpenToolExplorer(server.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 transition"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Tools ({toolCount})</span>
                      </button>

                      <button
                        onClick={() => onLogoutOAuth(server.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        title="Revoke / Disconnect OAuth"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Real OAuth Popup */}
                      <button
                        onClick={() => onInitiateOAuth(server)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>OAuth Login</span>
                      </button>

                      {/* Quick Simulated Auth (for instant prototyping) */}
                      <button
                        onClick={() => onQuickSimulateOAuth(server)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 transition"
                        title="Simulate token without developer app credentials"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>Quick Demo Auth</span>
                      </button>
                    </>
                  )}

                  {/* Settings / Edit */}
                  <button
                    onClick={() => onSelectServer(server)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Edit Configuration"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteServer(server.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                    title="Delete Server"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
