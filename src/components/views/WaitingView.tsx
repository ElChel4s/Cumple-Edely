'use client';

import React from 'react';
import type { Player } from '@/types/database';

interface WaitingViewProps {
  userData: Player;
}

export function WaitingView({ userData }: WaitingViewProps) {
  const hasRealPartner = userData.partner && userData.partner.trim() !== '';

  return (
    <div className="animate-fade-in flex flex-col items-center space-y-6 mt-4 w-full">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-serif mb-2 text-coffee">Hola, {userData.name}</h2>
        <p className="flex items-center justify-center gap-2 text-sm px-6 text-coffee-light">
          <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-pistachio" />
          La cumpleañera está preparando la siguiente dinámica...
        </p>
      </div>

      {/* Ticket de Sorteo */}
      <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-beige relative">
        {/* Half-circle cutouts */}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-beige-lighter shadow-inner" />
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-beige-lighter shadow-inner" />

        {/* Tarjeta Superior: Grupo (Máximo 2 personas) */}
        <div className="p-8 text-center border-b border-dashed border-coffee-light/20 bg-beige">
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-coffee-light">Asignación de Mesa</span>
          <div className="my-4 animate-pulse-soft flex justify-center">
            <div className="w-20 h-20 rounded-full bg-white/60 border border-white/80 shadow-md flex items-center justify-center">
              <span className="text-4xl">🐾</span>
            </div>
          </div>
          <p className="text-xs uppercase font-bold tracking-widest text-coffee-light mb-1">
            Eres parte del grupo...
          </p>
          <h3 className="text-3xl sm:text-4xl font-serif font-black text-coffee">
            {userData.group_name ? userData.group_name : 'Asignando...'}
          </h3>
        </div>

        {/* Tarjeta Inferior: Pareja */}
        <div className="p-8 text-center bg-white/90">
          <p className="font-bold text-lg leading-tight text-pistachio-dark">
            Hoy te sentarás con... <br />
            {hasRealPartner ? (
              <span className="text-2xl sm:text-3xl font-serif text-coffee underline decoration-gold decoration-4 mt-2 block animate-fade-scale">
                {userData.partner}
              </span>
            ) : (
              <span className="text-lg sm:text-xl font-serif text-coffee-light/80 italic mt-3 flex items-center justify-center gap-1">
                Esperando compañero
                <span className="inline-flex tracking-widest text-coffee font-black">
                  <span className="animate-bounce inline-block" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce inline-block" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce inline-block" style={{ animationDelay: '300ms' }}>.</span>
                </span>
              </span>
            )}
          </p>

          <div className="mt-6 pt-4 border-t border-beige">
            {hasRealPartner ? (
              <span className="inline-flex items-center gap-1.5 bg-pistachio/20 text-pistachio-dark text-xs font-bold px-3 py-1.5 rounded-full border border-pistachio/30">
                <span>✨</span> ¡Pareja completa (2/2)!
              </span>
            ) : (
              <p className="text-xs italic text-coffee-light/70">
                Tu grupo es de 2 personas. Se asignará en cuanto llegue tu compañero de mesa.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
