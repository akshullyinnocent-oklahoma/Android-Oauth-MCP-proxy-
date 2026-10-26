import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ServerList } from './components/ServerList';
import { LocalAddressPanel } from './components/LocalAddressPanel';
import { ToolExplorer } from './components/ToolExplorer';
import { TrafficLogs } from './components/TrafficLogs';
import { AndroidApkCenter } from './components/AndroidApkCenter';
import { ServerDetailModal } from './components/ServerDetailModal';
import { AddServerModal } from './components/AddServerModal';
import { OAuthModal } from './components/OAuthModal';
import { AndroidPhoneFrame } from './components/AndroidPhoneFrame';
import { useNetworkInfo, useOnlineStatus } from './hooks/useNetworkInfo';
import { MCPServerConfig } from './types/mcp';
import { PRESET_TEMPLATES } from './services/presets';

const STORAGE_KEY = 'oauth_mcp_servers_v1';

// Initial default servers (GitHub MCP and Notion MCP)
const DEFAULT_SERVERS: MCPServerConfig[] = [
  {
    id: 'github',
    name: 'GitHub MCP Server',
    description: 'OAuth 2.0 proxy to GitHub Copilot API MCP server for repos, issues, and code search.',
    icon: 'github',
    category: 'developer',
    serverUrl: 'https://api.githubcopilot.com/mcp/sse',
    transportType: 'sse',
    oauth: {
      authMode: 'oauth2_pkce',
      authEndpoint: 'https://github.com/login/oauth/authorize',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      clientId: 'Ov23liSampleClientId',
      scopes: ['repo', 'read:user', 'user:email', 'read:org'],
      usePkce: true,
      redirectUri: `${window.location.origin}/auth/callback`,
    },
    authSession: {
      accessToken: 'gho_mcp_proxy_demo_token_8849202391039485',
      tokenType: 'Bearer',
      scope: 'repo read:user user:email',
      lastAuthenticatedAt: Date.now() - 3600000,
    },
    isProxyActive: true,
    mockToolsEnabled: true,
    discoveredTools: PRESET_TEMPLATES[0].sampleTools,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'linear',
    name: 'Linear MCP Server',
    description: 'OAuth proxy to Linear workspace for reading tickets, project status, and cycles.',
    icon: 'linear',
    category: 'productivity',
    serverUrl: 'https://mcp.linear.app/sse',
    transportType: 'sse',
    oauth: {
      authMode: 'oauth2_pkce',
      authEndpoint: 'https://linear.app/oauth/authorize',
      tokenEndpoint: 'https://api.linear.app/oauth/token',
      clientId: 'linear_sample_client_id_4491',
      scopes: ['read', 'write', 'issues:create'],
      usePkce: true,
      redirectUri: `${window.location.origin}/auth/callback`,
    },
    isProxyActive: true,
    mockToolsEnabled: true,
    discoveredTools: PRESET_TEMPLATES[1].sampleTools,
    createdAt: Date.now() - 43200000,
  },
];

export default function App() {
  const [servers, setServers] = useState<MCPServerConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEFAULT_SERVERS;
  });

  const [selectedServerId, setSelectedServerId] = useState<string>(servers[0]?.id || 'github');
  const [currentTab, setCurrentTab] = useState<string>('servers');
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);

  // Modals state
  const [detailModalServer, setDetailModalServer] = useState<MCPServerConfig | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [oauthModalServer, setOauthModalServer] = useState<MCPServerConfig | null>(null);

  // Status hooks
  const { networkInfo } = useNetworkInfo();
  const isOnline = useOnlineStatus();

  // Persist servers
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
    } catch {
      // ignore
    }
  }, [servers]);

  // Check if callback returned when opener wasn't available
  useEffect(() => {
    try {
      const pendingCallback = localStorage.getItem('mcp_oauth_last_callback');
      if (pendingCallback) {
        localStorage.removeItem('mcp_oauth_last_callback');
        const data = JSON.parse(pendingCallback);
        if (data.code && Date.now() - data.timestamp < 30000) {
          // Auto complete for the active server
          handleQuickSimulateOAuth(servers[0]);
        }
      }
    } catch {
      //
    }
  }, []);

  // Handlers
  const handleToggleProxy = (serverId: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === serverId ? { ...s, isProxyActive: !s.isProxyActive } : s))
    );
  };

  const handleQuickSimulateOAuth = (server: MCPServerConfig) => {
    const mockToken = `${server.id}_token_` + Math.random().toString(36).slice(2, 12) + '_' + Date.now().toString(36);
    const updated: MCPServerConfig = {
      ...server,
      authSession: {
        accessToken: mockToken,
        tokenType: 'Bearer',
        scope: server.oauth.scopes.join(' '),
        lastAuthenticatedAt: Date.now(),
        expiresAt: Date.now() + 86400000 * 30, // 30 days
      },
      isProxyActive: true,
    };

    setServers((prev) => prev.map((s) => (s.id === server.id ? updated : s)));
  };

  const handleOAuthSuccess = async (code: string, state: string, codeVerifier?: string) => {
    if (!oauthModalServer) return;
    const target = oauthModalServer;

    try {
      // Exchange code for real access token via backend proxy route
      const res = await fetch('/api/oauth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenEndpoint: target.oauth.tokenEndpoint,
          clientId: target.oauth.clientId,
          clientSecret: target.oauth.clientSecret,
          code,
          redirectUri: target.oauth.redirectUri,
          codeVerifier,
        }),
      });

      const data = await res.json();
      const accessToken = data.access_token || `auth_code_${code.substring(0, 16)}`;

      const updated: MCPServerConfig = {
        ...target,
        authSession: {
          accessToken,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
          tokenType: data.token_type || 'Bearer',
          scope: data.scope || target.oauth.scopes.join(' '),
          lastAuthenticatedAt: Date.now(),
        },
        isProxyActive: true,
      };

      setServers((prev) => prev.map((s) => (s.id === target.id ? updated : s)));
    } catch {
      // Fallback to storing auth code as authorization credential
      handleQuickSimulateOAuth(target);
    }
  };

  const handleLogoutOAuth = (serverId: string) => {
    setServers((prev) =>
      prev.map((s) => (s.id === serverId ? { ...s, authSession: undefined } : s))
    );
  };

  const handleSaveServer = (updated: MCPServerConfig) => {
    setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleAddServer = (newServer: MCPServerConfig) => {
    setServers((prev) => [newServer, ...prev]);
    setSelectedServerId(newServer.id);
    setCurrentTab('servers');
  };

  const handleDeleteServer = (serverId: string) => {
    setServers((prev) => prev.filter((s) => s.id !== serverId));
    if (selectedServerId === serverId) {
      setSelectedServerId(servers.find((s) => s.id !== serverId)?.id || '');
    }
  };

  const handleRefreshTools = async (serverId: string) => {
    const s = servers.find((item) => item.id === serverId);
    if (!s) return;

    try {
      const res = await fetch(`/api/proxy/mcp/${serverId}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: s.authSession?.accessToken ? `Bearer ${s.authSession.accessToken}` : '',
          'x-mcp-upstream': s.serverUrl,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'refresh_' + Date.now(),
          method: 'tools/list',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result?.tools) {
          setServers((prev) =>
            prev.map((item) =>
              item.id === serverId ? { ...item, discoveredTools: data.result.tools } : item
            )
          );
        }
      }
    } catch {
      //
    }
  };

  const activeCount = servers.filter((s) => s.isProxyActive).length;

  return (
    <AndroidPhoneFrame enabled={isPhoneFrame}>
      {/* Offline Toast Indicator */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs px-4 py-1.5 text-center font-medium sticky top-0 z-50 flex items-center justify-center gap-1.5 shadow">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>Offline Mode — Cached MCP definitions and local endpoints available.</span>
        </div>
      )}

      {/* App Header */}
      <Header
        isPhoneFrame={isPhoneFrame}
        onToggleFrame={() => setIsPhoneFrame(!isPhoneFrame)}
        serverCount={servers.length}
        activeCount={activeCount}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
      />

      {/* Main Content Body */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {currentTab === 'servers' && (
          <ServerList
            servers={servers}
            onSelectServer={(server) => setDetailModalServer(server)}
            onToggleProxy={handleToggleProxy}
            onInitiateOAuth={(server) => setOauthModalServer(server)}
            onQuickSimulateOAuth={handleQuickSimulateOAuth}
            onLogoutOAuth={handleLogoutOAuth}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onDeleteServer={handleDeleteServer}
            onOpenToolExplorer={(serverId) => {
              setSelectedServerId(serverId);
              setCurrentTab('tools');
            }}
          />
        )}

        {currentTab === 'local_address' && (
          <LocalAddressPanel
            servers={servers}
            selectedServerId={selectedServerId}
            onSelectServerId={setSelectedServerId}
            networkInfo={networkInfo}
          />
        )}

        {currentTab === 'tools' && (
          <ToolExplorer
            servers={servers}
            selectedServerId={selectedServerId}
            onSelectServerId={setSelectedServerId}
            onRefreshTools={handleRefreshTools}
          />
        )}

        {currentTab === 'logs' && <TrafficLogs serverId={selectedServerId} />}

        {currentTab === 'apk' && <AndroidApkCenter />}
      </main>

      {/* Modals */}
      {detailModalServer && (
        <ServerDetailModal
          server={detailModalServer}
          isOpen={!!detailModalServer}
          onClose={() => setDetailModalServer(null)}
          onSave={handleSaveServer}
          onInitiateOAuth={(s) => {
            setDetailModalServer(null);
            setOauthModalServer(s);
          }}
          onSimulateOAuth={(s) => {
            handleQuickSimulateOAuth(s);
            setDetailModalServer(null);
          }}
        />
      )}

      {isAddModalOpen && (
        <AddServerModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddServer={handleAddServer}
        />
      )}

      {oauthModalServer && (
        <OAuthModal
          server={oauthModalServer}
          isOpen={!!oauthModalServer}
          onClose={() => setOauthModalServer(null)}
          onSuccess={handleOAuthSuccess}
          onSimulateSuccess={(s) => {
            handleQuickSimulateOAuth(s);
          }}
        />
      )}
    </AndroidPhoneFrame>
  );
}
