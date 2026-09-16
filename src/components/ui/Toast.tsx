'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'info' | 'error';
}

// Singleton event system so any component can fire a toast
type ToastListener = (msg: ToastMessage) => void;
const listeners: Set<ToastListener> = new Set();

export function showToast(text: string, type: 'success' | 'info' | 'error' = 'info') {
  const msg: ToastMessage = { id: crypto.randomUUID(), text, type };
  listeners.forEach((fn) => fn(msg));
}

const ICONS: Record<ToastMessage['type'], string> = {
  success: '✅',
  info: '💬',
  error: '❌',
};

const BG: Record<ToastMessage['type'], string> = {
  success: 'bg-pistachio-dark',
  info: 'bg-coffee',
  error: 'bg-danger',
};

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((msg: ToastMessage) => {
    setToasts((prev) => [...prev, msg]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== msg.id));
    }, 3000);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => { listeners.delete(addToast); };
  }, [addToast]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${BG[t.type]} text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium animate-slide-up pointer-events-auto`}
        >
          <span className="text-lg">{ICONS[t.type]}</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
