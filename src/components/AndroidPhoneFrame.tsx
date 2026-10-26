import React from 'react';

interface AndroidPhoneFrameProps {
  children: React.ReactNode;
  enabled: boolean;
}

export const AndroidPhoneFrame: React.FC<AndroidPhoneFrameProps> = ({ children, enabled }) => {
  if (!enabled) {
    return <div className="min-h-screen bg-slate-950 flex flex-col">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 py-6 px-4 flex items-center justify-center">
      {/* Outer Phone Shell */}
      <div className="w-full max-w-[440px] h-[880px] bg-slate-900 rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] border-[6px] border-slate-700/80 relative flex flex-col overflow-hidden">
        {/* Hardware details: Speaker & Front Camera Hole */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full z-40 border border-slate-800 flex items-center justify-center pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-950/80" />
        </div>

        {/* Screen Bezel / Content Area */}
        <div className="w-full h-full bg-slate-950 rounded-[40px] flex flex-col overflow-hidden relative border border-slate-800">
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col no-scrollbar">
            {children}
          </div>

          {/* Android Gesture Navigation Pill at Bottom */}
          <div className="h-4 bg-slate-950 flex items-center justify-center pointer-events-none shrink-0 border-t border-slate-900">
            <div className="w-28 h-1 bg-slate-500 rounded-full opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
};
