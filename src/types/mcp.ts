export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      default?: any;
    }>;
    required?: string[];
  };
  source?: 'remote' | 'cached' | 'preset';
}

export interface OAuthConfig {
  authMode: 'oauth2_pkce' | 'oauth2_code' | 'bearer_token';
  authEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  scopes: string[];
  usePkce: boolean;
  redirectUri: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // epoch ms
  tokenType?: string;
  scope?: string;
  userProfile?: {
    username?: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
  lastAuthenticatedAt: number;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'developer' | 'productivity' | 'communication' | 'custom';
  serverUrl: string; // Remote upstream MCP URL
  transportType: 'sse' | 'http_post';
  oauth: OAuthConfig;
  authSession?: AuthSession;
  customHeaders?: Record<string, string>;
  isProxyActive: boolean;
  mockToolsEnabled: boolean;
  discoveredTools: MCPTool[];
  createdAt: number;
  lastConnectedAt?: number;
}

export interface LogItem {
  id: string;
  timestamp: string;
  serverId: string;
  method: string;
  path: string;
  clientIp: string;
  status: number;
  durationMs: number;
  requestSnippet?: any;
  responseSnippet?: any;
}

export interface NetworkInfo {
  port: number;
  appUrl: string;
  addresses: { iface: string; address: string; family: string; isLocal: boolean }[];
  platform: string;
  androidEmulatorHost: string;
  localhost: string;
}

export interface PresetServerTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'developer' | 'productivity' | 'communication' | 'custom';
  defaultServerUrl: string;
  defaultAuthEndpoint: string;
  defaultTokenEndpoint: string;
  defaultScopes: string[];
  requiresClientSecret: boolean;
  sampleTools: MCPTool[];
}
