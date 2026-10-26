import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Support JSON bodies & URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enable CORS for MCP client apps (Claude Desktop, Cursor, local tools)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-MCP-Session');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Cache for active SSE clients
interface SSEClient {
  id: string;
  res: Response;
  serverId: string;
}
const sseClients: Map<string, SSEClient> = new Map();

// Recent proxy request log buffer (in-memory for live UI inspect)
interface LogEntry {
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
const trafficLogs: LogEntry[] = [];
const MAX_LOGS = 150;

function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
  const log: LogEntry = {
    ...entry,
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
  };
  trafficLogs.unshift(log);
  if (trafficLogs.length > MAX_LOGS) {
    trafficLogs.pop();
  }
}

// 1. Network & Host Info API
app.get('/api/network-info', (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  const addresses: { iface: string; address: string; family: string; isLocal: boolean }[] = [];

  for (const [name, netList] of Object.entries(networkInterfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4') {
        addresses.push({
          iface: name,
          address: net.address,
          family: net.family,
          isLocal: net.internal,
        });
      }
    }
  }

  res.json({
    port: PORT,
    appUrl: process.env.APP_URL || `http://localhost:${PORT}`,
    addresses,
    platform: process.platform,
    androidEmulatorHost: `10.0.2.2:${PORT}`,
    localhost: `127.0.0.1:${PORT}`,
  });
});

// 2. Traffic Logs API
app.get('/api/logs', (req, res) => {
  const { serverId } = req.query;
  if (serverId && typeof serverId === 'string') {
    return res.json(trafficLogs.filter((l) => l.serverId === serverId));
  }
  res.json(trafficLogs);
});

app.delete('/api/logs', (req, res) => {
  trafficLogs.length = 0;
  res.json({ success: true, count: 0 });
});

// 3. OAuth Callback Handler (per oauth-integration skill)
const callbackHandler = (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>OAuth Authentication Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            text-align: center;
          }
          .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 32px 24px;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          }
          .icon {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: ${error ? '#ef4444' : '#10b981'};
            color: white;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin-bottom: 16px;
          }
          h2 { margin: 0 0 8px 0; font-size: 20px; }
          p { color: #94a3b8; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5; }
          .badge {
            background: #0f172a;
            color: #38bdf8;
            padding: 8px 12px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${error ? '✕' : '✓'}</div>
          <h2>${error ? 'Authorization Failed' : 'Authorization Complete!'}</h2>
          <p>${
            error
              ? (error_description as string) || (error as string)
              : 'OAuth credential acquired. Returning token to your MCP proxy...'
          }</p>
          <div class="badge">${code ? 'Auth Code: ' + String(code).substring(0, 16) + '...' : (error as string) || 'Authorized'}</div>
        </div>
        <script>
          const payload = {
            type: 'OAUTH_AUTH_SUCCESS',
            code: ${JSON.stringify(code || null)},
            state: ${JSON.stringify(state || null)},
            error: ${JSON.stringify(error || null)},
            error_description: ${JSON.stringify(error_description || null)},
          };

          if (window.opener) {
            window.opener.postMessage(payload, '*');
            setTimeout(() => {
              window.close();
            }, 800);
          } else {
            // Standalone or redirected without opener
            localStorage.setItem('mcp_oauth_last_callback', JSON.stringify({ ...payload, timestamp: Date.now() }));
            setTimeout(() => {
              window.location.href = '/';
            }, 1200);
          }
        </script>
      </body>
    </html>
  `);
};

app.get(['/auth/callback', '/auth/callback/'], callbackHandler);

// 4. OAuth Code Token Exchange Proxy
app.post('/api/oauth/exchange', async (req: Request, res: Response) => {
  const { tokenEndpoint, clientId, clientSecret, code, redirectUri, codeVerifier } = req.body;

  if (!tokenEndpoint) {
    return res.status(400).json({ error: 'Missing tokenEndpoint' });
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    if (code) params.append('code', code);
    if (clientId) params.append('client_id', clientId);
    if (clientSecret) params.append('client_secret', clientSecret);
    if (redirectUri) params.append('redirect_uri', redirectUri);
    if (codeVerifier) params.append('code_verifier', codeVerifier);

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };

    // Basic Auth support for confidential clients
    if (clientId && clientSecret) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    }

    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    const data = await tokenRes.json();
    return res.status(tokenRes.status).json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Token exchange failed',
      details: err.message,
    });
  }
});

// 5. OAuth Token Refresh Proxy
app.post('/api/oauth/refresh', async (req: Request, res: Response) => {
  const { tokenEndpoint, clientId, clientSecret, refreshToken } = req.body;

  if (!tokenEndpoint || !refreshToken) {
    return res.status(400).json({ error: 'Missing tokenEndpoint or refreshToken' });
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    if (clientId) params.append('client_id', clientId);
    if (clientSecret) params.append('client_secret', clientSecret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };

    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    const data = await tokenRes.json();
    return res.status(tokenRes.status).json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Token refresh failed',
      details: err.message,
    });
  }
});

// 6. MCP Protocol Handlers - SSE Transport
app.get('/api/proxy/mcp/:id/sse', (req: Request, res: Response) => {
  const { id } = req.params;
  const sessionId = 'mcp_sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  sseClients.set(sessionId, { id: sessionId, res, serverId: id });

  addLog({
    serverId: id,
    method: 'GET',
    path: `/api/proxy/mcp/${id}/sse`,
    clientIp: req.ip || req.socket.remoteAddress || 'unknown',
    status: 200,
    durationMs: 1,
    requestSnippet: { event: 'Client connected to SSE stream', sessionId },
  });

  // Per MCP SSE specification: emit 'endpoint' event telling the client where to send POST messages
  const messageEndpoint = `/api/proxy/mcp/${id}/messages?sessionId=${sessionId}`;
  res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);

  // Keep-alive ping
  const interval = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(interval);
    sseClients.delete(sessionId);
    addLog({
      serverId: id,
      method: 'CLOSED',
      path: `/api/proxy/mcp/${id}/sse`,
      clientIp: req.ip || req.socket.remoteAddress || 'unknown',
      status: 200,
      durationMs: 0,
      requestSnippet: { event: 'Client closed SSE stream', sessionId },
    });
  });
});

// 7. MCP Protocol Messages (POST)
app.post(['/api/proxy/mcp/:id/messages', '/api/proxy/mcp/:id/rpc'], async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { id } = req.params;
  const { sessionId } = req.query;
  const rpcBody = req.body;

  // Authorization token can be provided via header or query or stored session
  const clientToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || (req.query.token as string);
  const upstreamUrl = (req.headers['x-mcp-upstream'] as string) || (req.query.upstream as string);

  const method = rpcBody?.method || 'unknown';
  const rpcId = rpcBody?.id ?? null;

  // If client sends initialize:
  if (method === 'initialize') {
    const initResponse = {
      jsonrpc: '2.0',
      id: rpcId,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: {
          name: `OAuth MCP Proxy [${id}]`,
          version: '1.2.0',
        },
      },
    };

    addLog({
      serverId: id,
      method: `MCP: ${method}`,
      path: req.path,
      clientIp: req.ip || req.socket.remoteAddress || 'unknown',
      status: 200,
      durationMs: Date.now() - startTime,
      requestSnippet: rpcBody,
      responseSnippet: initResponse,
    });

    // If connected via SSE session, emit message event to stream
    if (sessionId && typeof sessionId === 'string' && sseClients.has(sessionId)) {
      const client = sseClients.get(sessionId)!;
      client.res.write(`event: message\ndata: ${JSON.stringify(initResponse)}\n\n`);
      return res.status(202).send('Accepted');
    }

    return res.json(initResponse);
  }

  // If client sends notifications/initialized or ping:
  if (method === 'notifications/initialized') {
    return res.status(202).send('Accepted');
  }

  if (method === 'ping') {
    const pingResponse = { jsonrpc: '2.0', id: rpcId, result: {} };
    return res.json(pingResponse);
  }

  // If live upstream MCP URL is configured: forward request with injected OAuth token
  if (upstreamUrl && upstreamUrl.startsWith('http')) {
    try {
      const upstreamHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      };
      if (clientToken) {
        upstreamHeaders['Authorization'] = `Bearer ${clientToken}`;
      }

      const forwardRes = await fetch(upstreamUrl, {
        method: 'POST',
        headers: upstreamHeaders,
        body: JSON.stringify(rpcBody),
      });

      const responseData = await forwardRes.json().catch(() => ({}));

      addLog({
        serverId: id,
        method: `MCP: ${method}`,
        path: req.path,
        clientIp: req.ip || req.socket.remoteAddress || 'unknown',
        status: forwardRes.status,
        durationMs: Date.now() - startTime,
        requestSnippet: rpcBody,
        responseSnippet: responseData,
      });

      if (sessionId && typeof sessionId === 'string' && sseClients.has(sessionId)) {
        const client = sseClients.get(sessionId)!;
        client.res.write(`event: message\ndata: ${JSON.stringify(responseData)}\n\n`);
        return res.status(202).send('Accepted');
      }

      return res.status(forwardRes.status).json(responseData);
    } catch (err: any) {
      const errResponse = {
        jsonrpc: '2.0',
        id: rpcId,
        error: {
          code: -32603,
          message: `Upstream error: ${err.message}`,
        },
      };

      addLog({
        serverId: id,
        method: `MCP: ${method}`,
        path: req.path,
        clientIp: req.ip || req.socket.remoteAddress || 'unknown',
        status: 502,
        durationMs: Date.now() - startTime,
        requestSnippet: rpcBody,
        responseSnippet: errResponse,
      });

      return res.status(502).json(errResponse);
    }
  }

  // If no upstream is configured or testing local tools emulation:
  // Return mock tool lists or results based on method
  let result: any = {};
  if (method === 'tools/list') {
    result = {
      tools: [
        {
          name: 'get_authenticated_user',
          description: 'Fetch profile and permissions of the user authenticated via OAuth.',
          inputSchema: {
            type: 'object',
            properties: {
              include_permissions: { type: 'boolean', description: 'Whether to return granular OAuth scopes' },
            },
          },
        },
        {
          name: 'query_remote_resource',
          description: 'Query remote API resource authenticated with the injected OAuth bearer token.',
          inputSchema: {
            type: 'object',
            properties: {
              endpoint: { type: 'string', description: 'Relative resource endpoint path' },
              params: { type: 'object', description: 'Query parameters' },
            },
            required: ['endpoint'],
          },
        },
        {
          name: 'mcp_proxy_health_check',
          description: 'Verify proxy status, OAuth token validity, and upstream response latency.',
          inputSchema: {
            type: 'object',
            properties: {
              verbose: { type: 'boolean', description: 'Include network interfaces and SSL status' },
            },
          },
        },
      ],
    };
  } else if (method === 'tools/call') {
    const toolName = rpcBody?.params?.name;
    const args = rpcBody?.params?.arguments || {};
    result = {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              status: 'success',
              tool: toolName,
              executedAt: new Date().toISOString(),
              authMode: clientToken ? 'OAuth2 Bearer Injected' : 'Unauthenticated',
              tokenPrefix: clientToken ? clientToken.substring(0, 10) + '...' : null,
              argumentsReceived: args,
              result: `Tool "${toolName}" executed successfully through local OAuth MCP Proxy.`,
            },
            null,
            2
          ),
        },
      ],
    };
  } else {
    result = { acknowledged: true, method };
  }

  const responseJson = {
    jsonrpc: '2.0',
    id: rpcId,
    result,
  };

  addLog({
    serverId: id,
    method: `MCP: ${method}`,
    path: req.path,
    clientIp: req.ip || req.socket.remoteAddress || 'unknown',
    status: 200,
    durationMs: Date.now() - startTime,
    requestSnippet: rpcBody,
    responseSnippet: responseJson,
  });

  if (sessionId && typeof sessionId === 'string' && sseClients.has(sessionId)) {
    const client = sseClients.get(sessionId)!;
    client.res.write(`event: message\ndata: ${JSON.stringify(responseJson)}\n\n`);
    return res.status(202).send('Accepted');
  }

  return res.json(responseJson);
});

// 8. Forward Upstream Test Endpoint (Direct tool check from UI)
app.post('/api/proxy/forward', async (req: Request, res: Response) => {
  const { url, token, payload, headers: customHeaders } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing target URL' });
  }

  const startTime = Date.now();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(customHeaders || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const upstreamRes = await fetch(url, {
      method: payload ? 'POST' : 'GET',
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const contentType = upstreamRes.headers.get('content-type') || '';
    let data: any;
    if (contentType.includes('application/json')) {
      data = await upstreamRes.json();
    } else {
      data = { text: await upstreamRes.text() };
    }

    addLog({
      serverId: 'forward',
      method: payload ? 'POST' : 'GET',
      path: url,
      clientIp: req.ip || 'ui',
      status: upstreamRes.status,
      durationMs: Date.now() - startTime,
      requestSnippet: payload,
      responseSnippet: data,
    });

    res.status(upstreamRes.status).json({
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      data,
      durationMs: Date.now() - startTime,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Upstream request failed',
      details: err.message,
      durationMs: Date.now() - startTime,
    });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OAuth MCP Proxy Server running on port ${PORT} (0.0.0.0:${PORT})`);
    console.log(`Local MCP Proxy Endpoint: http://localhost:${PORT}/api/proxy/mcp/:serverId/sse`);
  });
}

startServer();
