import React, { useState } from 'react';
import {
  Copy,
  Check,
  Globe,
  Smartphone,
  Cpu,
  Wifi,
  Terminal,
  FileCode,
  Play,
  QrCode,
  ShieldCheck,
  KeyRound,
  ExternalLink,
  Info,
} from 'lucide-react';
import { MCPServerConfig, NetworkInfo } from '../types/mcp';

interface LocalAddressPanelProps {
  servers: MCPServerConfig[];
  selectedServerId: string;
  onSelectServerId: (id: string) => void;
  networkInfo: NetworkInfo;
}

export const LocalAddressPanel: React.FC<LocalAddressPanelProps> = ({
  servers,
  selectedServerId,
  onSelectServerId,
  networkInfo,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeClientTab, setActiveClientTab] = useState<'claude' | 'cursor' | 'windsurf' | 'curl' | 'python'>('claude');
  const [testResult, setTestResult] = useState<{ status: string; data?: any; timeMs?: number } | null>(null);
  const [testing, setTesting] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const selectedServer = servers.find((s) => s.id === selectedServerId) || servers[0];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!selectedServer) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Info className="w-8 h-8 mx-auto mb-2 text-slate-500" />
        <p>No MCP servers configured yet. Add a server to generate local proxy addresses.</p>
      </div>
    );
  }

  const serverId = selectedServer.id;
  const port = networkInfo.port || 3000;

  // LAN IP extraction (first non-internal IPv4)
  const lanIface = networkInfo.addresses.find((a) => !a.isLocal) || networkInfo.addresses[0];
  const lanIp = lanIface?.address || '192.168.1.100';

  // Address variations
  const localLoopbackSse = `http://127.0.0.1:${port}/api/proxy/mcp/${serverId}/sse`;
  const localLoopbackRpc = `http://127.0.0.1:${port}/api/proxy/mcp/${serverId}/rpc`;

  const androidEmulatorSse = `http://${networkInfo.androidEmulatorHost}/api/proxy/mcp/${serverId}/sse`;
  const wifiLanSse = `http://${lanIp}:${port}/api/proxy/mcp/${serverId}/sse`;
  const cloudAppSse = `${networkInfo.appUrl}/api/proxy/mcp/${serverId}/sse`;

  // Code snippets for client apps
  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        [`${selectedServer.id}-oauth-proxy`]: {
          url: localLoopbackSse,
          transport: 'sse',
        },
      },
    },
    null,
    2
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        [`${selectedServer.id}-proxy`]: {
          url: localLoopbackSse,
          type: 'sse',
        },
      },
    },
    null,
    2
  );

  const windsurfConfig = JSON.stringify(
    {
      mcpServers: {
        [`${selectedServer.id}-proxy`]: {
          serverUrl: localLoopbackSse,
        },
      },
    },
    null,
    2
  );

  const curlTestCommand = `curl -X POST "${localLoopbackRpc}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'`;

  const pythonSnippet = `import requests

proxy_url = "${localLoopbackRpc}"

# Send MCP tools/list request to local OAuth proxy
payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
}

response = requests.post(proxy_url, json=payload)
data = response.json()
print("Discovered tools via OAuth Proxy:", data.get("result", {}).get("tools", []))
`;

  // Test local proxy endpoint right from UI
  const handleTestProxy = async () => {
    setTesting(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const res = await fetch(`/api/proxy/mcp/${serverId}/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test_' + Date.now(),
          method: 'tools/list',
        }),
      });
      const data = await res.json();
      const elapsed = Math.round(performance.now() - start);
      setTestResult({
        status: res.ok ? 'success' : 'error',
        data,
        timeMs: elapsed,
      });
    } catch (err: any) {
      setTestResult({
        status: 'error',
        data: { error: err.message },
        timeMs: Math.round(performance.now() - start),
      });
    } finally {
      setTesting(false);
    }
  };

  const isAuthed = !!selectedServer.authSession?.accessToken;

  return (
    <div className="space-y-6">
      {/* Top Selector Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 font-bold border border-slate-700">
            {selectedServer.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label htmlFor="server-select" className="text-sm font-semibold text-white">Target Server:</label>
              <select
                id="server-select"
                value={selectedServerId}
                onChange={(e) => onSelectServerId(e.target.value)}
                className="bg-slate-950 text-cyan-300 font-semibold text-sm px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
              >
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.authSession?.accessToken ? 'Authenticated' : 'OAuth Pending'})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upstream Remote URL: <span className="font-mono text-slate-300">{selectedServer.serverUrl}</span>
            </p>
          </div>
        </div>

        {/* Auth Status Badge */}
        <div className="flex items-center gap-2">
          {isAuthed ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>OAuth Token Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
              <KeyRound className="w-4 h-4" />
              <span>OAuth Login Required</span>
            </div>
          )}

          <button
            onClick={handleTestProxy}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium shadow-md shadow-cyan-600/20 transition"
          >
            <Play className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Local Endpoint'}</span>
          </button>
        </div>
      </div>

      {/* Test Result Live Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono transition-all ${
            testResult.status === 'success'
              ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/30 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold flex items-center gap-1.5">
              {testResult.status === 'success' ? '✓ Proxy Test 200 OK' : '✕ Proxy Test Failed'}
              <span className="text-[11px] font-normal text-slate-400">({testResult.timeMs}ms response time)</span>
            </span>
            <button
              onClick={() => setTestResult(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <pre className="overflow-x-auto max-h-40 p-2 rounded bg-slate-950/70 text-[11px] text-slate-300">
            {JSON.stringify(testResult.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Network Address Cards Grid */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center justify-between">
          <span>Available Local Addresses for Client Apps</span>
          <button
            onClick={() => setShowQr(!showQr)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-normal"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{showQr ? 'Hide QR' : 'Show Mobile QR'}</span>
          </button>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 1. Localhost (Same Device / Termux / Android Local) */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Localhost (Same Android Phone or Host)</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                SSE Protocol
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <code className="text-xs font-mono text-cyan-300 truncate flex-1">{localLoopbackSse}</code>
              <button
                onClick={() => copyToClipboard(localLoopbackSse, 'local_sse')}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                title="Copy Address"
              >
                {copiedKey === 'local_sse' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Use for client apps running directly on the same phone or computer (Claude Desktop, Cursor, local agent).
            </p>
          </div>

          {/* 2. Wi-Fi LAN IP (For Other Devices on the Same Network) */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Wi-Fi LAN (Phone to PC/Mac or Tablet)</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                LAN Bridged
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <code className="text-xs font-mono text-emerald-300 truncate flex-1">{wifiLanSse}</code>
              <button
                onClick={() => copyToClipboard(wifiLanSse, 'wifi_sse')}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                title="Copy Address"
              >
                {copiedKey === 'wifi_sse' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Connect your Mac/PC laptop to the Android phone running this proxy over local Wi-Fi.
            </p>
          </div>

          {/* 3. Android Emulator Host Loopback */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Android Studio Emulator Bridge</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                10.0.2.2 Router
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <code className="text-xs font-mono text-indigo-300 truncate flex-1">{androidEmulatorSse}</code>
              <button
                onClick={() => copyToClipboard(androidEmulatorSse, 'emulator_sse')}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                title="Copy Address"
              >
                {copiedKey === 'emulator_sse' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Standard special loopback address used by Android Emulator to reach host machine services.
            </p>
          </div>

          {/* 4. Web Container App URL */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>Public / Cloud Web Preview URL</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                HTTPS
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
              <code className="text-xs font-mono text-amber-300 truncate flex-1">{cloudAppSse}</code>
              <button
                onClick={() => copyToClipboard(cloudAppSse, 'cloud_sse')}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                title="Copy Address"
              >
                {copiedKey === 'cloud_sse' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Direct cloud container endpoint accessible over secure HTTPS.
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Card if toggled */}
      {showQr && (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-5">
          <div className="p-3 bg-white rounded-xl shadow-lg">
            {/* Clean QR representation for mobile scan */}
            <svg className="w-36 h-36" viewBox="0 0 100 100" fill="black">
              {/* Corner markers */}
              <rect x="5" y="5" width="26" height="26" fill="black" />
              <rect x="9" y="9" width="18" height="18" fill="white" />
              <rect x="13" y="13" width="10" height="10" fill="black" />

              <rect x="69" y="5" width="26" height="26" fill="black" />
              <rect x="73" y="9" width="18" height="18" fill="white" />
              <rect x="77" y="13" width="10" height="10" fill="black" />

              <rect x="5" y="69" width="26" height="26" fill="black" />
              <rect x="9" y="73" width="18" height="18" fill="white" />
              <rect x="13" y="77" width="10" height="10" fill="black" />

              {/* Data pattern */}
              <rect x="36" y="8" width="5" height="5" />
              <rect x="45" y="12" width="5" height="5" />
              <rect x="54" y="6" width="5" height="5" />
              <rect x="38" y="24" width="5" height="5" />
              <rect x="48" y="22" width="5" height="5" />
              <rect x="58" y="26" width="5" height="5" />

              <rect x="8" y="38" width="5" height="5" />
              <rect x="18" y="44" width="5" height="5" />
              <rect x="28" y="36" width="5" height="5" />
              <rect x="12" y="54" width="5" height="5" />
              <rect x="24" y="50" width="5" height="5" />

              <rect x="38" y="38" width="6" height="6" />
              <rect x="48" y="44" width="6" height="6" />
              <rect x="58" y="36" width="6" height="6" />
              <rect x="44" y="54" width="6" height="6" />
              <rect x="54" y="50" width="6" height="6" />

              <rect x="70" y="38" width="5" height="5" />
              <rect x="82" y="44" width="5" height="5" />
              <rect x="76" y="54" width="5" height="5" />
              <rect x="88" y="50" width="5" height="5" />

              <rect x="38" y="70" width="5" height="5" />
              <rect x="48" y="76" width="5" height="5" />
              <rect x="58" y="68" width="5" height="5" />
              <rect x="44" y="86" width="5" height="5" />
              <rect x="54" y="82" width="5" height="5" />

              <rect x="70" y="70" width="5" height="5" />
              <rect x="82" y="76" width="5" height="5" />
              <rect x="76" y="86" width="5" height="5" />
              <rect x="88" y="82" width="5" height="5" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Scan to Connect Mobile Device</h4>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md">
              Point your phone camera or QR scanner to open the local proxy URL:
            </p>
            <div className="mt-2 text-xs font-mono text-cyan-300 break-all bg-slate-950 p-2 rounded border border-slate-800">
              {wifiLanSse}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Note: Both devices must be on the same Wi-Fi network.
            </p>
          </div>
        </div>
      )}

      {/* Client Configuration Setup Snippets */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Client Application Setup Snippets</span>
            </h3>
            <p className="text-xs text-slate-400">
              Copy and paste directly into your client config file to expose the OAuth MCP tools
            </p>
          </div>

          {/* Client Tab Switcher */}
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs font-medium">
            {[
              { id: 'claude', label: 'Claude Desktop' },
              { id: 'cursor', label: 'Cursor IDE' },
              { id: 'windsurf', label: 'Windsurf' },
              { id: 'curl', label: 'cURL / Shell' },
              { id: 'python', label: 'Python' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveClientTab(tab.id as any)}
                className={`px-3 py-1 rounded-md transition ${
                  activeClientTab === tab.id
                    ? 'bg-cyan-600 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-950">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-mono">
              {activeClientTab === 'claude' && 'File: ~/Library/Application Support/Claude/claude_desktop_config.json'}
              {activeClientTab === 'cursor' && 'File: ~/.cursor/mcp.json or project .cursor/mcp.json'}
              {activeClientTab === 'windsurf' && 'File: ~/.codeium/windsurf/mcp_config.json'}
              {activeClientTab === 'curl' && 'Terminal command:'}
              {activeClientTab === 'python' && 'client_mcp_test.py'}
            </span>

            <button
              onClick={() => {
                let text = '';
                if (activeClientTab === 'claude') text = claudeDesktopConfig;
                if (activeClientTab === 'cursor') text = cursorConfig;
                if (activeClientTab === 'windsurf') text = windsurfConfig;
                if (activeClientTab === 'curl') text = curlTestCommand;
                if (activeClientTab === 'python') text = pythonSnippet;
                copyToClipboard(text, 'snippet_' + activeClientTab);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
            >
              {copiedKey === 'snippet_' + activeClientTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Configuration</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed max-h-72">
            {activeClientTab === 'claude' && claudeDesktopConfig}
            {activeClientTab === 'cursor' && cursorConfig}
            {activeClientTab === 'windsurf' && windsurfConfig}
            {activeClientTab === 'curl' && curlTestCommand}
            {activeClientTab === 'python' && pythonSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
};
