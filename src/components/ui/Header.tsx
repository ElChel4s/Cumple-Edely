import React from 'react';
import Link from 'next/link';

interface HeaderProps {
  playerName?: string;
}

export function Header({ playerName }: HeaderProps) {
  return (
    <header className="relative z-30 px-4 py-3 flex justify-between items-center bg-white/60 backdrop-blur-md border-b border-white/30 shadow-xs sticky top-0">
      <div className="flex items-center gap-2">
        <span className="text-xl bg-beige p-1.5 rounded-full shadow-sm">🌿</span>
        <h1 className="text-base sm:text-lg font-serif font-bold italic tracking-wide text-coffee">
          Felices 23 Edely
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {playerName && (
          <div className="flex items-center gap-1.5 bg-pistachio/20 px-2.5 py-1 rounded-full border border-pistachio/30">
            <div className="w-2 h-2 rounded-full bg-pistachio animate-pulse" />
            <span className="text-xs font-bold text-pistachio-dark truncate max-w-[120px] sm:max-w-[180px]">{playerName}</span>
          </div>
        )}
      </div>
    </header>
  );
}
