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
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium shadow-xl border ${
              currentToast.type === 'error'
                ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                : currentToast.type === 'info'
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white'
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
