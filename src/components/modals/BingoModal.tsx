'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '../ui/Toast';
import { PREDEFINED_CARDS } from './BingoCatalogModal';
import type { Player, BingoCard } from '@/types/database';

interface BingoModalProps {
  onClose: () => void;
  player: Player;
  bingoCard: BingoCard | null;
  goToSelection: () => void;
}

export function BingoModal({
  onClose,
  player,
  bingoCard,
  goToSelection,
}: BingoModalProps) {
  const [stampedItems, setStampedItems] = useState<number[]>(
    bingoCard?.stamped_items || [4]
  );
  const [pendingClaims, setPendingClaims] = useState<Set<number>>(new Set());

  const cardDef = bingoCard
    ? PREDEFINED_CARDS.find((c) => c.id === bingoCard.card_id)
    : null;

  useEffect(() => {
    if (!bingoCard) return;

    const channel = supabase
      .channel(`bingo_card_${bingoCard.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bingo_cards',
          filter: `id=eq.${bingoCard.id}`,
        },
        (payload) => {
          const updated = payload.new as BingoCard;
          setStampedItems(updated.stamped_items || []);
        }
      )
      .subscribe();

    const claimsChannel = supabase
      .channel(`bingo_claims_${player.player_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bingo_claims',
          filter: `player_id=eq.${player.player_id}`,
        },
        (payload) => {
          const claim = payload.new as { stamp_index: number; status: string };
          if (claim.status === 'REJECTED') {
            setPendingClaims((prev) => {
              const next = new Set(prev);
              next.delete(claim.stamp_index);
              return next;
            });
            showToast('Reclamo rechazado por el admin.', 'error');
          } else if (claim.status === 'APPROVED') {
            setPendingClaims((prev) => {
              const next = new Set(prev);
              next.delete(claim.stamp_index);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(claimsChannel);
    };
  }, [bingoCard, player.player_id]);

  const handleClaim = async (index: number) => {
    if (!bingoCard || !cardDef || !bingoCard.has_paid) return;
    if (index === 4 || stampedItems.includes(index) || pendingClaims.has(index))
      return;

    setPendingClaims((prev) => new Set(prev).add(index));

    const { error } = await supabase.from('bingo_claims').insert({
      player_id: player.player_id,
      player_name: player.name,
      card_id: bingoCard.card_id,
      stamp_index: index,
      stamp_label: cardDef.items[index],
      status: 'PENDING',
    });

    if (error) {
      console.error('Failed to submit bingo claim:', error);
      showToast('Error al reclamar casilla.', 'error');
      setPendingClaims((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    } else {
      showToast('Esperando validación del Admin...', 'info');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-sm w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-beige rounded-full font-bold text-coffee hover:bg-pistachio hover:text-white transition-colors z-20 shadow-2xs"
        >
          ✕
        </button>

        <h2 className="text-2xl font-serif mb-1 text-center mt-2 pr-8 text-coffee">
          {cardDef ? cardDef.name : 'Tu Cartón de Bingo'}
        </h2>

        {!bingoCard ? (
          <div className="text-center p-6 bg-white border-2 border-dashed border-pistachio rounded-[2rem] my-4 shadow-sm">
            <span className="text-5xl mb-4 block">🎫</span>
            <p className="mb-4 font-medium text-sm text-coffee">
              Aún no has seleccionado ningún cartón del catálogo.
            </p>
            <button
              onClick={goToSelection}
              className="px-6 py-3.5 rounded-xl font-bold tracking-widest text-xs text-white shadow-md uppercase active:scale-95 transition-transform w-full bg-pistachio-dark hover:bg-pistachio"
            >
              Ir al Catálogo
            </button>
          </div>
        ) : !bingoCard.has_paid ? (
          <div className="text-center p-5 bg-white border-2 border-dashed border-amber-300 rounded-[2rem] my-4 shadow-sm flex flex-col items-center">
            <span className="text-4xl mb-3 block">⏳</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-3 border border-amber-200">
              Pago Pendiente por la Cumpleañera
            </span>
            <p className="mb-2 font-serif font-bold text-base text-coffee">
              Has seleccionado: {cardDef?.name}
            </p>
            <p className="text-xs text-coffee-light mb-4 px-2 leading-relaxed">
              Pide a Edely o al admin confirmar tu cartón en su Panel de Control para desbloquear tus casillas.
            </p>

            {/* Preview of locked board */}
            {cardDef && (
              <div className="grid grid-cols-3 gap-1 mb-4 p-2 bg-beige-lighter rounded-2xl border border-beige w-full opacity-60">
                {cardDef.items.map((itemText, idx) => (
                  <div
                    key={idx}
                    className="aspect-square bg-white border border-beige rounded-lg p-1 flex items-center justify-center text-center"
                  >
                    <span className="text-[7px] font-medium leading-[1.1] text-coffee">
                      {itemText}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={goToSelection}
              className="px-4 py-2.5 rounded-xl font-bold tracking-wider text-xs text-coffee bg-beige hover:bg-beige-lighter border border-beige uppercase active:scale-95 transition-transform w-full"
            >
              🔄 Cambiar a otro Cartón
            </button>
          </div>
        ) : cardDef ? (
          <>
            <p className="text-xs mb-3 text-center px-4 text-coffee-light">
              Toca una casilla cuando suceda en la fiesta. El admin la validará.
            </p>

            <div className="grid grid-cols-3 gap-2 mb-5 p-2.5 bg-beige-lighter rounded-2xl shadow-inner border border-beige">
              {cardDef.items.map((text, i) => {
                const isFree = i === 4;
                const isStamped = stampedItems.includes(i);
                const isPending = pendingClaims.has(i);

                return (
                  <button
                    key={i}
                    onClick={() => handleClaim(i)}
                    disabled={isFree || isStamped || isPending}
                    className={`aspect-square p-2 rounded-xl text-[10px] sm:text-[11px] leading-tight font-medium flex flex-col items-center justify-center text-center transition-all relative overflow-hidden active:scale-95 shadow-2xs ${
                      isStamped
                        ? 'bg-pistachio text-white shadow-inner font-bold'
                        : isPending
                        ? 'bg-amber-100 text-amber-900 border-2 border-amber-300 animate-pulse font-bold'
                        : 'bg-white text-coffee border border-beige hover:border-pistachio'
                    }`}
                  >
                    <span className="relative z-10">
                      {isPending ? '⏳ Validando' : text}
                    </span>
                    {isStamped && !isFree && (
                      <span className="absolute text-4xl opacity-20 -rotate-12">
                        🌿
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => showToast('¡Grita BINGO en la fiesta! 🏆', 'success')}
              className="w-full py-4 rounded-xl font-black text-xl sm:text-2xl tracking-widest uppercase shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 bg-gold text-coffee"
            >
              ¡Bingo perres! 🏆
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
