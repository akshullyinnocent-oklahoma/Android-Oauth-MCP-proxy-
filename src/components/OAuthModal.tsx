import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Key,
  Info,
} from 'lucide-react';
import { MCPServerConfig } from '../types/mcp';
import {
  buildOAuthAuthorizeUrl,
  generateCodeVerifier,
  generateCodeChallenge,
  generateRandomState,
} from '../services/pkce';

interface OAuthModalProps {
  server: MCPServerConfig;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (code: string, state: string, codeVerifier?: string) => void;
  onSimulateSuccess: (server: MCPServerConfig) => void;
}

export const OAuthModal: React.FC<OAuthModalProps> = ({
  server,
  isOpen,
  onClose,
  onSuccess,
  onSimulateSuccess,
}) => {
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [activeMode, setActiveMode] = useState<'flow' | 'manual'>('flow');

  const callbackUrl = `${window.location.origin}/auth/callback`;

  useEffect(() => {
    if (!isOpen) return;

    // Build the authorization URL asynchronously with PKCE
    const initAuthUrl = async () => {
      try {
        let verifier: string | undefined;
        let challenge: string | undefined;
        if (server.oauth.usePkce) {
          verifier = generateCodeVerifier();
          challenge = await generateCodeChallenge(verifier);
          sessionStorage.setItem(`pkce_verifier_${server.id}`, verifier);
        }

        const state = generateRandomState();
        sessionStorage.setItem(`oauth_state_${server.id}`, state);

        const url = buildOAuthAuthorizeUrl({
          authEndpoint: server.oauth.authEndpoint,
          clientId: server.oauth.clientId || 'YOUR_CLIENT_ID',
          redirectUri: callbackUrl,
          scopes: server.oauth.scopes,
          state,
          codeChallenge: challenge,
        });

        setAuthUrl(url);
      } catch (err: any) {
        console.error('Failed to construct auth URL:', err);
      }
    };

    initAuthUrl();
  }, [isOpen, server, callbackUrl]);

  // Listen for popup callback message
  useEffect(() => {
    if (!isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setAuthInProgress(false);
        const code = event.data.code;
        const returnedState = event.data.state;
        const savedVerifier = sessionStorage.getItem(`pkce_verifier_${server.id}`) || undefined;

        if (event.data.error) {
          setAuthError(event.data.error_description || event.data.error);
          return;
        }

        if (code) {
          onSuccess(code, returnedState, savedVerifier);
          onClose();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, server.id, onSuccess, onClose]);

  if (!isOpen) return null;

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const handleLaunchPopup = () => {
    setAuthError(null);
    if (!server.oauth.clientId) {
      setAuthError(
        'OAuth Client ID is empty. Please enter your OAuth Client ID in server settings, or use "Simulate Demo Token" below.'
      );
      return;
    }

    setAuthInProgress(true);
    try {
      const popup = window.open(
        authUrl,
        'oauth_login_popup',
        'width=600,height=720,menubar=no,toolbar=no,location=no,status=no'
      );

      if (!popup) {
        // In iframe environment if window.open is restricted, inform user to click the direct link
        setAuthError(
          'Popup was blocked by the browser. Please click the "Open in New Tab" link below instead.'
        );
        setAuthInProgress(false);
      }
    } catch {
      setAuthError(
        'Unable to launch popup directly. Please use the direct link below or the simulated demo token.'
      );
      setAuthInProgress(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const savedVerifier = sessionStorage.getItem(`pkce_verifier_${server.id}`) || undefined;
    onSuccess(manualCode.trim(), 'manual_state', savedVerifier);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">OAuth Authorization</h2>
              <p className="text-xs text-slate-400">Authenticate with {server.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 px-5 pt-3 bg-slate-950/40 text-xs font-medium gap-4">
          <button
            onClick={() => setActiveMode('flow')}
            className={`pb-2 border-b-2 transition ${
              activeMode === 'flow'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            OAuth Provider Login
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`pb-2 border-b-2 transition ${
              activeMode === 'manual'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Code or Token Directly
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {activeMode === 'flow' ? (
            <>
              {/* Target Server Info */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Remote MCP Server:</span>
                  <span className="font-mono text-cyan-400 truncate max-w-[240px]">{server.serverUrl}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Auth Protocol:</span>
                  <span className="font-semibold text-slate-200">
                    {server.oauth.usePkce ? 'OAuth 2.0 PKCE (S256)' : 'OAuth 2.0 Auth Code'}
                  </span>
                </div>
              </div>

              {/* Callback URL reminder per skill */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">OAuth Callback URL for Provider:</span>
                  <button
                    onClick={handleCopyCallback}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    {copiedCallback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCallback ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <code className="text-xs font-mono text-emerald-300 break-all block">{callbackUrl}</code>
                <p className="text-[11px] text-slate-400">
                  Add this exact callback URL in your OAuth Provider app settings.
                </p>
              </div>

              {/* Error Banner */}
              {authError && (
                <div className="p-3 bg-rose-950/30 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-rose-200">Authorization Notice</p>
                    <p className="mt-0.5">{authError}</p>
                  </div>
                </div>
              )}

              {/* Scopes pill list */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Requested Scopes ({server.oauth.scopes.length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {server.oauth.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Direct Link (Bypasses popup blocker) */}
                  <a
                    href={authUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setAuthInProgress(true)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 text-center transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in New Tab</span>
                  </a>

                  {/* Popup Option */}
                  <button
                    type="button"
                    onClick={handleLaunchPopup}
                    disabled={authInProgress}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                  >
                    <span>Launch Popup Window</span>
                  </button>
                </div>

                {authInProgress && (
                  <div className="p-2.5 bg-cyan-950/30 border border-cyan-800 rounded-lg text-center text-xs text-cyan-300 animate-pulse">
                    Waiting for authorization completion from popup/tab...
                  </div>
                )}

                {/* Quick Demo Simulator */}
                <button
                  type="button"
                  onClick={() => {
                    onSimulateSuccess(server);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 text-xs font-medium transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Simulate Instant Demo Token (No Credentials Needed)</span>
                </button>
              </div>
            </>
          ) : (
            /* Manual Code or Token Input */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <p className="text-xs text-slate-300">
                If you already have an OAuth authorization code or personal access token for this MCP server, paste it directly:
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Authorization Code or Access Token
                </label>
                <textarea
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste code or token (e.g. ghp_... or code_...)"
                  rows={3}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMode('flow')}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  Apply Credential
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
