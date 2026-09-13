'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Toast {
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentToast, setCurrentToast] = useState<Toast | null>(null);

  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setCurrentToast({ message, type });
  }, []);

  useEffect(() => {
    if (!currentToast) return;
    const timer = setTimeout(() => {
      setCurrentToast(null);
    }, 2000); // Exactly 2 seconds auto-dismiss per Estavo spec

    return () => clearTimeout(timer);
  }, [currentToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {currentToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium shadow-2xl backdrop-blur-[40px] border ${
              currentToast.type === 'error'
                ? 'bg-[#1A1A1A] border-[#E74C3C]/40 text-[#E74C3C]'
                : currentToast.type === 'info'
                ? 'bg-[#1A1A1A] border-[#3B82F6]/40 text-[#3B82F6]'
                : 'bg-[#111111] border-[#2A2A2A] text-white'
            }`}
          >
            <span>{currentToast.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
