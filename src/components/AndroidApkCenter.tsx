import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Terminal,
  Layers,
  Radio,
  CheckCircle,
  Copy,
  Check,
  AlertCircle,
  Cpu,
  ShieldCheck,
  Zap,
  FolderArchive,
  ExternalLink,
  BellRing,
} from 'lucide-react';
import { createAndroidApkPackageZip, AndroidProjectConfig } from '../services/apkGenerator';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const AndroidApkCenter: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [foregroundActive, setForegroundActive] = useState(true);

  const { isInstallable, isInstalled, install, isAndroid } = usePWAInstall();

  const appOrigin = window.location.origin;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const config: AndroidProjectConfig = {
        appName: 'OAuth MCP Proxy',
        appId: 'com.mcpproxy.app',
        versionName: '1.0.0',
        versionCode: 1,
        serverPort: 3000,
        webAppUrl: appOrigin,
      };

      const zipBlob = await createAndroidApkPackageZip(config);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'oauth-mcp-proxy-android.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 3000);
    } catch (err) {
      console.error('Failed to generate zip:', err);
    } finally {
      setDownloading(false);
    }
  };

  const bubblewrapCmd = `npm i -g @bubblewrap/cli
bubblewrap init --manifest="${appOrigin}/manifest.webmanifest"
bubblewrap build`;

  const capacitorCmd = `npm install @capacitor/core @capacitor/android @capacitor/cli
npx cap add android
npm run build
npx cap sync
cd android && ./gradlew assembleDebug`;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Android APK & Mobile Distribution
              </span>
              <span className="text-xs text-slate-400">• Standalone PWA / WebAPK & Native Capacitor</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Build & Export Android APK
            </h2>
            <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
              Export a complete ready-to-build Android package with background foreground service, cleartext traffic permissions, and deep-link OAuth callback support.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
            >
              <FolderArchive className="w-4 h-4" />
              <span>
                {downloading
                  ? 'Generating Android Project...'
                  : downloadDone
                  ? 'Downloaded!'
                  : 'Download Android Project (.zip)'}
              </span>
            </button>

            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
              >
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Install WebAPK on Phone</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Android System Foreground Service Simulation Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Android Foreground Service (Keep-Alive)</h3>
          </div>
          <button
            onClick={() => setForegroundActive(!foregroundActive)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              foregroundActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {foregroundActive ? 'Foreground Service: ON' : 'Paused'}
          </button>
        </div>

        {/* Android Notification Shade Preview */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">OAuth MCP Proxy • Android System</span>
              <span className="text-[10px] text-slate-500 font-mono">Ongoing</span>
            </div>
            <p className="text-xs text-emerald-300 font-mono mt-0.5">
              Listening on 0.0.0.0:3000 • Ready for Claude Desktop & Cursor connections
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Ensures Android OS does not kill the local HTTP server when phone screen turns off.
            </p>
          </div>
        </div>
      </div>

      {/* Build Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Option 1: Bubblewrap TWA CLI */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-800">
                1
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Google Bubblewrap TWA</h4>
                <p className="text-[11px] text-slate-400">Official Google CLI to build signed APK</p>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(bubblewrapCmd, 'bubblewrap')}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Copy Command"
            >
              {copiedKey === 'bubblewrap' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The easiest way to produce a signed APK without modifying Gradle files. Runs from terminal on any PC or Mac:
          </p>

          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto">
            {bubblewrapCmd}
          </pre>

          <p className="text-[11px] text-slate-400">
            Output: <code className="text-emerald-300">app-release-signed.apk</code> ready to install with{' '}
            <code className="text-slate-300">adb install</code>.
          </p>
        </div>

        {/* Option 2: Capacitor Native APK */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-800">
                2
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Capacitor Android Studio</h4>
                <p className="text-[11px] text-slate-400">Native Gradle project build</p>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(capacitorCmd, 'capacitor')}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              title="Copy Command"
            >
              {copiedKey === 'capacitor' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Uses the downloaded project bundle or installs Capacitor directly into this applet:
          </p>

          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-indigo-300 overflow-x-auto">
            {capacitorCmd}
          </pre>

          <p className="text-[11px] text-slate-400">
            Output: <code className="text-indigo-300">android/app/build/outputs/apk/debug/app-debug.apk</code>.
          </p>
        </div>
      </div>

      {/* GitHub Actions CI Card: .github/workflows/build-apk.yml */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-800">
              CI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">GitHub Actions CI: Build & Sign Debug APK</h4>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  .github/workflows/build-apk.yml
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pushes to GitHub automatically trigger CI that builds, signs with default debug key, and uploads the APK artifact
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              copyToClipboard(
                `name: Build Android Debug APK

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
  workflow_dispatch:

jobs:
  build-apk:
    name: Build & Sign Android Debug APK
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4
      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Set up Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - run: npm install
      - run: npm run build
      - name: Initialize Capacitor Android
        run: |
          if [ ! -d "android" ]; then npx cap add android; fi
          npx cap sync android
      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3
        with:
          build-root-directory: android
      - name: Build Android Debug APK
        run: |
          cd android && chmod +x gradlew
          ./gradlew assembleDebug --stacktrace
      - uses: actions/upload-artifact@v4
        with:
          name: oauth-mcp-proxy-debug-apk
          path: android/app/build/outputs/apk/debug/*.apk
          retention-days: 30`,
                'gh_actions'
              )
            }
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
          >
            {copiedKey === 'gh_actions' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied Workflow</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Workflow YAML</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-300">
          When this repository is pushed to GitHub, GitHub Actions runs on an Ubuntu runner, builds your React + Tailwind web bundle, initializes the Capacitor Android project, builds the Gradle package, signs it with the standard Android debug keystore, and attaches the downloadable <code className="text-emerald-400 font-mono">oauth-mcp-proxy-debug-apk.zip</code> to the workflow summary.
        </p>

        <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-48 leading-relaxed">
{`name: Build Android Debug APK
on:
  push: { branches: [main, master] }
  workflow_dispatch:
jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - run: npm install
      - run: npm run build
      - run: npx cap sync android
      - uses: gradle/actions/setup-gradle@v3
        with: { build-root-directory: android }
      - run: cd android && ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with:
          name: oauth-mcp-proxy-debug-apk
          path: android/app/build/outputs/apk/debug/*.apk`}
        </pre>
      </div>

      {/* Android Permissions & Manifest Highlights */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Configured Android Permissions & Security Policies</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono text-cyan-400 font-semibold mb-1">android.permission.INTERNET</div>
            <p className="text-slate-400 text-[11px]">Allows proxy server to make outbound OAuth & MCP API calls.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono text-emerald-400 font-semibold mb-1">FOREGROUND_SERVICE</div>
            <p className="text-slate-400 text-[11px]">Keeps the local port 3000 server alive in Android background.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono text-amber-400 font-semibold mb-1">usesCleartextTraffic=&quot;true&quot;</div>
            <p className="text-slate-400 text-[11px]">Permits client apps to connect via http://localhost and http://127.0.0.1 without SSL blocks.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono text-indigo-400 font-semibold mb-1">mcp-proxy:// Intent Filter</div>
            <p className="text-slate-400 text-[11px]">Deep-link scheme capturing OAuth redirect codes directly in the APK.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono text-rose-400 font-semibold mb-1">WAKE_LOCK</div>
            <p className="text-slate-400 text-[11px]">Prevents CPU sleep while streaming tool execution over SSE.</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="font-mono text-purple-400 font-semibold mb-1">ACCESS_WIFI_STATE</div>
            <p className="text-slate-400 text-[11px]">Discovers LAN Wi-Fi IP so desktop computers can connect to phone.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
