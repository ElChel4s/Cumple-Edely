import React from 'react';

interface FloatingBingoButtonProps {
  onClick: () => void;
  hasSelectedCard: boolean;
}

export function FloatingBingoButton({ onClick, hasSelectedCard }: FloatingBingoButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed z-40 right-4 px-5 py-3.5 rounded-[2rem] shadow-[0_10px_30px_rgba(217,119,119,0.5)] flex items-center gap-2.5 transform active:scale-95 transition-transform border-4 border-white animate-pulse-soft bg-danger text-white"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
    >
      <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
        <span className="text-2xl drop-shadow-md">🎟️</span>
      </div>
      <span className="text-xs font-black tracking-widest uppercase">
        {hasSelectedCard ? 'Mi Cartón' : 'Bingo'}
      </span>
    </button>
  );
}
