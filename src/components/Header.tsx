import React from 'react';
import { ShieldCheck, Wifi, BatteryCharging, Radio, Smartphone, Monitor, Download, HardDrive } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  isPhoneFrame: boolean;
  onToggleFrame: () => void;
  serverCount: number;
  activeCount: number;
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isPhoneFrame,
  onToggleFrame,
  serverCount,
  activeCount,
  currentTab,
  onSelectTab,
}) => {
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();

  // Current time for Android status bar
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      {/* Android System Status Bar Simulation */}
      <div className="px-4 py-1 flex items-center justify-between text-[11px] text-slate-400 font-mono border-b border-slate-800/60 bg-slate-950/80">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">{timeStr}</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-cyan-400 font-medium">5G</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="text-[10px] hidden sm:inline">Port 3000 Active</span>
          </div>
          <Wifi className="w-3.5 h-3.5 text-slate-300" />
          <div className="flex items-center gap-1">
            <span>98%</span>
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Main App Bar */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                OAuth MCP Proxy
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Android APK Ready
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Local endpoint bridge for OAuth-protected Model Context Protocol servers
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Frame Viewport Toggle */}
          <button
            onClick={onToggleFrame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title={isPhoneFrame ? 'Switch to Fullscreen view' : 'Switch to Android Pixel Phone frame view'}
          >
            {isPhoneFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Pixel Frame</span>
              </>
            )}
          </button>

          {/* In-App Install Prompt */}
          {isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install PWA</span>
            </button>
          )}

          {isIOS && !isInstalled && (
            <button
              onClick={() => onSelectTab('apk')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"
            >
              <span>Install Guide</span>
            </button>
          )}

          {/* Quick APK tab trigger */}
          <button
            onClick={() => onSelectTab('apk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              currentTab === 'apk'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Build APK</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex px-4 gap-1 overflow-x-auto no-scrollbar border-t border-slate-800/80 bg-slate-950/40">
        {[
          { id: 'servers', label: 'MCP Servers', count: serverCount },
          { id: 'local_address', label: 'Local Addresses & Configs' },
          { id: 'tools', label: 'Tool Explorer & Test' },
          { id: 'logs', label: 'Traffic Logs' },
          { id: 'apk', label: 'Android APK Center' },
        ].map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
