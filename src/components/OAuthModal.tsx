import React, { useState } from 'react';
import {
  X,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
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

  if (!isOpen) return null;

  const callbackUrl = `${window.location.origin}/auth/callback`;

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const handleLaunchPopup = async () => {
    setAuthError(null);
    setAuthInProgress(true);

    try {
      if (!server.oauth.clientId) {
        setAuthError(
          'OAuth Client ID is empty. Please enter your OAuth Client ID or use the "Simulate Demo Token" button below to test without developer credentials.'
        );
        setAuthInProgress(false);
        return;
      }

      // Generate PKCE if enabled
      let verifier: string | undefined;
      let challenge: string | undefined;
      if (server.oauth.usePkce) {
        verifier = generateCodeVerifier();
        challenge = await generateCodeChallenge(verifier);
        sessionStorage.setItem(`pkce_verifier_${server.id}`, verifier);
      }

      const state = generateRandomState();
      sessionStorage.setItem(`oauth_state_${server.id}`, state);

      // Build authorization URL pointing directly to the OAuth provider (per oauth-integration skill)
      const authUrl = buildOAuthAuthorizeUrl({
        authEndpoint: server.oauth.authEndpoint,
        clientId: server.oauth.clientId,
        redirectUri: callbackUrl,
        scopes: server.oauth.scopes,
        state,
        codeChallenge: challenge,
      });

      // Open OAuth provider in popup
      const popup = window.open(
        authUrl,
        'oauth_login_popup',
        'width=600,height=720,menubar=no,toolbar=no,location=no,status=no'
      );

      if (!popup) {
        setAuthError(
          'Popup was blocked by your browser. Please allow popups for this site, or use the Simulate Demo Token option.'
        );
        setAuthInProgress(false);
        return;
      }

      // Message listener for popup postMessage
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          setAuthInProgress(false);
          const code = event.data.code;
          const returnedState = event.data.state;
          const savedVerifier = sessionStorage.getItem(`pkce_verifier_${server.id}`) || undefined;

          if (event.data.error) {
            setAuthError(event.data.error_description || event.data.error);
            return;
          }

          onSuccess(code, returnedState, savedVerifier);
          onClose();
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (err: any) {
      setAuthError(err.message);
      setAuthInProgress(false);
    }
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

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Target Server Info */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>Upstream MCP Server:</span>
              <span className="font-mono text-cyan-400">{server.serverUrl}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Auth Mode:</span>
              <span className="font-semibold text-slate-200">
                {server.oauth.usePkce ? 'OAuth 2.0 with PKCE (S256)' : 'OAuth 2.0 Authorization Code'}
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
              Ensure this exact URL is configured in your provider developer console.
            </p>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="p-3 bg-rose-950/30 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Authorization Error</p>
                <p className="mt-0.5">{authError}</p>
              </div>
            </div>
          )}

          {/* Scopes pill list */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Requested OAuth Scopes ({server.oauth.scopes.length})
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
            {/* Real OAuth Popup */}
            <button
              onClick={handleLaunchPopup}
              disabled={authInProgress}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>
                {authInProgress ? 'Waiting for popup authentication...' : 'Open OAuth Provider Login (Popup)'}
              </span>
            </button>

            {/* Quick Demo Simulator */}
            <button
              onClick={() => {
                onSimulateSuccess(server);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 text-xs font-medium transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Simulate Instant Token (No Developer App Needed)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
