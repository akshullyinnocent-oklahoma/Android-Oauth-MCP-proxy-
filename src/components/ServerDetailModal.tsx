import React, { useState } from 'react';
import {
  X,
  Shield,
  Key,
  Globe,
  Lock,
  Layers,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Info,
} from 'lucide-react';
import { MCPServerConfig } from '../types/mcp';

interface ServerDetailModalProps {
  server: MCPServerConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: MCPServerConfig) => void;
  onInitiateOAuth: (server: MCPServerConfig) => void;
  onSimulateOAuth: (server: MCPServerConfig) => void;
}

export const ServerDetailModal: React.FC<ServerDetailModalProps> = ({
  server,
  isOpen,
  onClose,
  onSave,
  onInitiateOAuth,
  onSimulateOAuth,
}) => {
  const [formData, setFormData] = useState<MCPServerConfig>({ ...server });
  const [showToken, setShowToken] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [scopesInput, setScopesInput] = useState(server.oauth.scopes.join(', '));

  if (!isOpen) return null;

  const callbackUrl = `${window.location.origin}/auth/callback`;

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedScopes = scopesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      ...formData,
      oauth: {
        ...formData.oauth,
        scopes: updatedScopes,
        redirectUri: callbackUrl,
      },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 font-bold">
              {formData.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Configure MCP Server & OAuth</h2>
              <p className="text-xs text-slate-400">Settings and authentication credentials for proxying</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Server Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Remote MCP Server Endpoint</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Server Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Transport Protocol</label>
                <select
                  value={formData.transportType}
                  onChange={(e) => setFormData({ ...formData, transportType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="sse">Server-Sent Events (SSE) - Recommended</option>
                  <option value="http_post">Standard HTTP JSON-RPC POST</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Upstream Remote URL</label>
              <input
                type="url"
                value={formData.serverUrl}
                onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                placeholder="https://remote-mcp.example.com/sse"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                The actual remote MCP server that requires OAuth authentication.
              </p>
            </div>
          </div>

          {/* Section 2: OAuth 2.0 Settings */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>OAuth 2.0 Credentials & Flow</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSimulateOAuth(formData)}
                  className="text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-950/70 border border-indigo-800/80 px-2 py-1 rounded flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Use Simulated Auth</span>
                </button>
              </div>
            </div>

            {/* Mandatory OAuth Callback Notification per skill */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span className="font-semibold text-cyan-300">Required OAuth Callback URI</span>
                <button
                  type="button"
                  onClick={handleCopyCallback}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                >
                  {copiedCallback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCallback ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="text-xs font-mono text-emerald-300 break-all select-all">{callbackUrl}</code>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Add this exact callback URL in your OAuth Provider app settings (e.g. GitHub Developer Settings, Slack API).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">OAuth Client ID</label>
                <input
                  type="text"
                  value={formData.oauth.clientId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      oauth: { ...formData.oauth, clientId: e.target.value },
                    })
                  }
                  placeholder="e.g. Iv1.xxx or client_abc123"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  OAuth Client Secret <span className="text-slate-500">(Optional for PKCE)</span>
                </label>
                <input
                  type="password"
                  value={formData.oauth.clientSecret || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      oauth: { ...formData.oauth, clientSecret: e.target.value },
                    })
                  }
                  placeholder="Secret key (if confidential client)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Authorization Endpoint URL</label>
                <input
                  type="url"
                  value={formData.oauth.authEndpoint}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      oauth: { ...formData.oauth, authEndpoint: e.target.value },
                    })
                  }
                  placeholder="https://provider.com/oauth/authorize"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Token Exchange Endpoint URL</label>
                <input
                  type="url"
                  value={formData.oauth.tokenEndpoint}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      oauth: { ...formData.oauth, tokenEndpoint: e.target.value },
                    })
                  }
                  placeholder="https://provider.com/oauth/token"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                OAuth Scopes <span className="text-slate-500">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={scopesInput}
                onChange={(e) => setScopesInput(e.target.value)}
                placeholder="repo, user, read:org"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* PKCE Toggle */}
            <div className="flex items-center gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <input
                type="checkbox"
                id="use-pkce"
                checked={formData.oauth.usePkce}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    oauth: { ...formData.oauth, usePkce: e.target.checked },
                  })
                }
                className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-900"
              />
              <label htmlFor="use-pkce" className="text-xs text-slate-300 cursor-pointer">
                <strong>Enable PKCE (RFC 7636)</strong> — Recommended for Mobile & Android apps. Cryptographically secures
                token exchange without leaking client secrets.
              </label>
            </div>
          </div>

          {/* Section 3: Active Token Status */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              <span>Active Authentication Credential</span>
            </h3>

            {formData.authSession?.accessToken ? (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Token Injected & Valid
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showToken ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>

                <div className="font-mono text-xs text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 break-all select-all">
                  {showToken
                    ? formData.authSession.accessToken
                    : formData.authSession.accessToken.substring(0, 10) + '••••••••••••••••••••••••••••'}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>
                    Authenticated:{' '}
                    {new Date(formData.authSession.lastAuthenticatedAt).toLocaleTimeString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, authSession: undefined });
                    }}
                    className="text-rose-400 hover:underline"
                  >
                    Clear Token
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <p className="text-xs text-slate-400 mb-3">No active OAuth token. Authorize to start proxying.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onInitiateOAuth(formData)}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition"
                  >
                    Open OAuth Popup Login
                  </button>
                  <button
                    type="button"
                    onClick={() => onSimulateOAuth(formData)}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 text-xs font-medium transition"
                  >
                    Simulate Demo Token
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
