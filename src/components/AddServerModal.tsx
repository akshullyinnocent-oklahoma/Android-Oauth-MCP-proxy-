import React, { useState } from 'react';
import { X, Plus, Sparkles, Check, ArrowRight } from 'lucide-react';
import { MCPServerConfig } from '../types/mcp';
import { PRESET_TEMPLATES } from '../services/presets';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddServer: (newServer: MCPServerConfig) => void;
}

export const AddServerModal: React.FC<AddServerModalProps> = ({ isOpen, onClose, onAddServer }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('github');
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  if (!isOpen) return null;

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = PRESET_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setCustomName(tmpl.name);
      setCustomUrl(tmpl.defaultServerUrl);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const tmpl = PRESET_TEMPLATES.find((t) => t.id === selectedTemplateId) || PRESET_TEMPLATES[0];

    const uniqueId =
      tmpl.id === 'custom'
        ? 'custom_' + Date.now().toString(36)
        : `${tmpl.id}_${Math.random().toString(36).slice(2, 6)}`;

    const newServer: MCPServerConfig = {
      id: uniqueId,
      name: customName || tmpl.name,
      description: tmpl.description,
      icon: tmpl.icon,
      category: tmpl.category,
      serverUrl: customUrl || tmpl.defaultServerUrl,
      transportType: 'sse',
      oauth: {
        authMode: tmpl.requiresClientSecret ? 'oauth2_code' : 'oauth2_pkce',
        authEndpoint: tmpl.defaultAuthEndpoint,
        tokenEndpoint: tmpl.defaultTokenEndpoint,
        clientId: '',
        clientSecret: '',
        scopes: tmpl.defaultScopes,
        usePkce: !tmpl.requiresClientSecret,
        redirectUri: `${window.location.origin}/auth/callback`,
      },
      isProxyActive: true,
      mockToolsEnabled: true,
      discoveredTools: tmpl.sampleTools,
      createdAt: Date.now(),
    };

    onAddServer(newServer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Add Remote MCP Server</span>
            </h2>
            <p className="text-xs text-slate-400">
              Select a pre-configured OAuth MCP template or connect a custom URL
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-5">
          {/* Preset Cards Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              Choose Template or Custom
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition text-left flex items-start gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tmpl.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{tmpl.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{tmpl.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuration Inputs */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Server Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. My GitHub MCP Proxy"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Remote MCP Server URL</label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://remote-mcp.company.com/sse"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                The local proxy will automatically intercept calls and inject the OAuth Bearer token to this URL.
              </p>
            </div>
          </div>

          {/* Footer */}
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/20 transition"
            >
              <span>Add & Configure</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
