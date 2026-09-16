import React from 'react';
import { BotanicalSVG } from './SVGs';

export function LoadingScreen() {
  return (
    <div className="h-screen-safe flex flex-col items-center justify-center bg-beige-lighter relative overflow-hidden">
      <BotanicalSVG
        className="absolute -top-20 -left-20 w-72 h-72 animate-spin-slow text-pistachio opacity-20 pointer-events-none"
      />
      <div className="animate-float mb-6">
        <span className="text-6xl block">🌿</span>
      </div>
      <h1 className="text-2xl font-serif font-bold text-coffee animate-fade-in">
        Felices 23 Edely
      </h1>
      <p className="text-sm text-coffee-light mt-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
        Conectando con la fiesta...
      </p>
      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-pistachio animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-pistachio animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-pistachio animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="h-screen-safe flex flex-col items-center justify-center bg-beige-lighter p-8 text-center">
      <span className="text-5xl mb-4">⚠️</span>
      <h2 className="text-xl font-serif font-bold text-coffee mb-2">Algo salió mal</h2>
      <p className="text-sm text-coffee-light mb-6">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-pistachio-dark text-white rounded-xl font-bold text-sm uppercase tracking-widest active:scale-95 transition-transform"
      >
        Reintentar
      </button>
    </div>
  );
}
