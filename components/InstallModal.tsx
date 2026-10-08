'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Download, Monitor, Smartphone, Apple, CheckCircle2, 
  Share, PlusSquare, ArrowRight, ShieldCheck, Laptop 
} from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onPromptAccepted?: () => void;
}

export default function InstallModal({ 
  isOpen, 
  onClose, 
  deferredPrompt, 
  onPromptAccepted 
}: InstallModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'windows' | 'android' | 'ios'>('windows');
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setInstallSuccess(true);
          if (onPromptAccepted) onPromptAccepted();
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
    >
      <div 
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl relative my-auto flex flex-col max-h-[90vh] space-y-4 animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-800 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5 pt-1 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-[#08101E] p-2 flex items-center justify-center mx-auto shadow-md border border-slate-700">
            <img src="/favicon.svg" alt="Lactis Icon" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Install Lactis App
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
            Standalone desktop software on Windows/Mac & fast offline APK on Android tablets.
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto space-y-3.5 flex-1 pr-0.5">
          {/* 1-Click Browser Trigger Banner if available */}
          {deferredPrompt && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black text-emerald-950">1-Click Direct Install</h4>
                  <p className="text-[10px] text-emerald-800 font-medium">Ready for instant browser installation.</p>
                </div>
              </div>
              <button
                onClick={handleNativeInstall}
                disabled={installSuccess}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                {installSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Installed!
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" /> Install Now
                  </>
                )}
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('windows')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'windows'
                  ? 'bg-white text-[#0B6AB5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Windows</span>
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iPhone/iPad</span>
            </button>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'windows' && (
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-700" />
                  <h4 className="font-bold text-xs text-blue-950">Windows Desktop / PC</h4>
                </div>
                <ol className="text-[11px] text-blue-900 space-y-1.5 list-decimal list-inside font-medium leading-relaxed">
                  <li>In <strong>Google Chrome</strong> or <strong>Edge</strong>, look at the right side of the address bar.</li>
                  <li>Click the <strong>Install App icon (⊕ or computer monitor)</strong>.</li>
                  <li>Click <strong>Install</strong> to create a dedicated Desktop shortcut!</li>
                </ol>
              </div>
            )}

            {activeTab === 'android' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <h4 className="font-bold text-xs text-emerald-950">Android Phone & Tablet</h4>
                </div>
                <ol className="text-[11px] text-emerald-900 space-y-1.5 list-decimal list-inside font-medium leading-relaxed">
                  <li>In <strong>Chrome</strong> or <strong>Samsung Internet</strong>, tap the <strong>3 dots (⋮)</strong> menu.</li>
                  <li>Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
                  <li>Lactis will install as an offline APK on your device!</li>
                </ol>
              </div>
            )}

            {activeTab === 'ios' && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Apple className="w-4 h-4 text-slate-800" />
                  <h4 className="font-bold text-xs text-slate-950">Apple iOS (Safari)</h4>
                </div>
                <ol className="text-[11px] text-slate-800 space-y-1.5 list-decimal list-inside font-medium leading-relaxed">
                  <li>In <strong>Safari</strong>, tap the <strong>Share</strong> button at the bottom.</li>
                  <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                  <li>Tap <strong>Add</strong> at top right to place Lactis on your home screen.</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Footer Button */}
        <div className="pt-1 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-[#0B6AB5] hover:bg-[#085491] text-white font-bold py-3 rounded-xl transition-all shadow-sm text-xs cursor-pointer active:scale-98"
          >
            Close & Continue
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
