import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center space-x-2 bg-[#4E9B36] hover:bg-[#344B36] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer group"
      >
        <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center space-x-2 border border-[#4E9B36] text-[#4E9B36] hover:bg-[#4E9B36]/5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Add to Home Screen</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#FBF9F4] p-6 shadow-2xl border border-[#0A3D62]/10 relative animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center text-center space-y-4 pt-2">
                <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-md border border-[#0A3D62]/5 mb-2">
                  <img src="/pwa-192x192.png" alt="Eirvan Foods" className="w-full h-full object-contain rounded-lg" />
                </div>
                
                <h3 className="text-lg font-serif font-bold text-[#0A3D62]">Install on iPhone / iPad</h3>
                <p className="text-sm text-[#15222E]/80 leading-relaxed">
                  To install Eirvan Foods as an app for easy access to your favorite dry fruits:
                </p>
                
                <div className="w-full space-y-3 text-left">
                  <div className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-[#0A3D62]/5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0A3D62] text-white flex items-center justify-center text-xs font-bold">1</span>
                    <p className="text-xs text-[#15222E]">Tap the <strong className="font-bold">Share</strong> button in the bottom Safari toolbar.</p>
                  </div>
                  <div className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-[#0A3D62]/5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0A3D62] text-white flex items-center justify-center text-xs font-bold">2</span>
                    <p className="text-xs text-[#15222E]">Scroll down and tap <strong className="font-bold">Add to Home Screen</strong>.</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-4 w-full rounded-xl bg-[#0A3D62] py-3 text-sm font-bold text-white shadow-md hover:bg-[#072B47] transition-all"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
