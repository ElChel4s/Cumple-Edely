'use client';

import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '../ui/Toast';
import { PREDEFINED_CARDS, type PredefinedBingoCard } from '@/lib/bingoCards';
import type { Player } from '@/types/database';

export { PREDEFINED_CARDS };

interface BingoCatalogModalProps {
  player: Player;
  selectedCardId: number | null;
  onCardSelected: (cardId: number) => void;
}

export function BingoCatalogModal({
  player,
  selectedCardId,
  onCardSelected,
}: BingoCatalogModalProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRange, setSelectedRange] = useState<'ALL' | '1-10' | '11-20' | '21-30' | '31-40' | '41-50'>('ALL');

  // Filtered cards based on search and range
  const filteredCards = useMemo(() => {
    return PREDEFINED_CARDS.filter((card) => {
      // Range filter
      if (selectedRange === '1-10' && (card.id < 1 || card.id > 10)) return false;
      if (selectedRange === '11-20' && (card.id < 11 || card.id > 20)) return false;
      if (selectedRange === '21-30' && (card.id < 21 || card.id > 30)) return false;
      if (selectedRange === '31-40' && (card.id < 31 || card.id > 40)) return false;
      if (selectedRange === '41-50' && (card.id < 41 || card.id > 50)) return false;

      // Text / Number search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchesId = card.id.toString() === q || `carton #${card.id}`.includes(q) || `#${card.id}`.includes(q);
      const matchesItem = card.items.some((item) => item.toLowerCase().includes(q));
      return matchesId || matchesItem;
    });
  }, [searchQuery, selectedRange]);

  const handleSelect = async (cardId: number) => {
    if (isSelecting) return;
    setIsSelecting(true);

    const { data: existing } = await supabase
      .from('bingo_cards')
      .select('id, has_paid')
      .eq('player_id', player.player_id)
      .maybeSingle();

    if (existing) {
      if (existing.has_paid) {
        showToast('Tu cartón ya está pagado y habilitado.', 'info');
        setIsSelecting(false);
        return;
      }
      const { error } = await supabase
        .from('bingo_cards')
        .update({ card_id: cardId, stamped_items: [4] })
        .eq('id', existing.id);

      if (error) {
        showToast('Error al cambiar cartón.', 'error');
      } else {
        showToast(`¡Cambiado al Cartón #${cardId}! Pide confirmación al admin.`, 'success');
        onCardSelected(cardId);
      }
    } else {
      const { error } = await supabase.from('bingo_cards').insert({
        player_id: player.player_id,
        card_id: cardId,
        has_paid: false,
        stamped_items: [4],
      });

      if (error) {
        console.error('Failed to select bingo card:', error);
        showToast('Error al seleccionar cartón.', 'error');
      } else {
        showToast(`¡Cartón #${cardId} seleccionado! Pide a Edely confirmar tu pago.`, 'success');
        onCardSelected(cardId);
      }
    }

    setIsSelecting(false);
  };

  const handlePickRandom = () => {
    const randomId = Math.floor(Math.random() * 50) + 1;
    handleSelect(randomId);
  };

  return (
    <div className="animate-fade-in w-full pb-12">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-5xl mb-2 block">🎟️</span>
        <h2 className="text-3xl font-serif font-bold text-coffee">Catálogo de Bingo</h2>
        <p className="text-xs text-coffee-light px-2 mt-1">
          50 combinaciones únicas de 8 frases. Elige tu cartón favorito o prueba tu suerte.
        </p>
      </div>

      {/* Quick Controls: Random + Search */}
      <div className="bg-white p-4 rounded-[2rem] border border-beige shadow-sm mb-6 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="🔍 Buscar por número (#1..#50) o frase..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-beige-lighter px-4 py-2.5 rounded-xl text-xs font-medium border border-beige/80 focus:outline-none focus:border-pistachio-dark transition-colors placeholder:text-coffee-light/60"
          />
          <button
            onClick={handlePickRandom}
            disabled={isSelecting}
            className="px-3.5 py-2.5 rounded-xl bg-gold hover:bg-gold/90 text-white font-bold text-xs shrink-0 active:scale-95 transition-transform flex items-center gap-1.5 shadow-xs"
            title="Elegir un cartón aleatorio"
          >
            <span>🎲</span>
            <span className="hidden sm:inline">Al Azar</span>
          </button>
        </div>

        {/* Range Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {(['ALL', '1-10', '11-20', '21-30', '31-40', '41-50'] as const).map((rng) => (
            <button
              key={rng}
              onClick={() => setSelectedRange(rng)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors shrink-0 ${
                selectedRange === rng
                  ? 'bg-pistachio-dark text-white shadow-xs'
                  : 'bg-beige/60 text-coffee hover:bg-beige'
              }`}
            >
              {rng === 'ALL' ? 'Todos (50)' : rng}
            </button>
          ))}
        </div>
      </div>

      {/* Active Selection Banner if any */}
      {selectedCardId && (
        <div className="bg-gold/15 border-2 border-gold/40 rounded-2xl p-3.5 mb-6 text-center animate-fade-scale flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-coffee-light block">
              Tu Selección Actual:
            </span>
            <span className="font-serif font-bold text-sm text-coffee">
              Cartón #{selectedCardId}
            </span>
          </div>
          <span className="text-xs bg-gold text-white font-bold px-3 py-1 rounded-full shadow-2xs">
            ✓ Guardado
          </span>
        </div>
      )}

      {/* Cards List */}
      <div className="space-y-6">
        {filteredCards.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-beige">
            <p className="text-xs text-coffee-light italic">
              No se encontraron cartones con &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        ) : (
          filteredCards.map((card: PredefinedBingoCard) => {
            const isSelected = selectedCardId === card.id;

            return (
              <div
                key={card.id}
                className={`bg-white rounded-[2rem] p-5 transition-all duration-300 relative overflow-hidden ${
                  isSelected
                    ? 'border-4 border-gold shadow-xl scale-[1.01]'
                    : 'border-2 border-beige shadow-sm hover:border-pistachio/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 bg-gold text-white text-[10px] font-black uppercase tracking-widest py-1 px-4 rounded-bl-xl z-10 shadow-2xs">
                    Tu Selección
                  </div>
                )}

                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-coffee">
                      {card.name}
                    </h3>
                    <p className="text-[10px] text-coffee-light">
                      8 frases únicas de Edely + Centro FREE
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-beige text-coffee">
                    #{card.id} / 50
                  </span>
                </div>

                {/* Preview 3x3 grid */}
                <div className="grid grid-cols-3 gap-1.5 mb-4 p-2.5 bg-beige-lighter rounded-2xl border border-beige shadow-inner relative z-10">
                  {card.items.map((itemText, idx) => (
                    <div
                      key={idx}
                      className={`aspect-square rounded-xl p-1.5 flex items-center justify-center text-center shadow-2xs ${
                        idx === 4
                          ? 'bg-gold/25 border-2 border-gold/40 text-coffee font-black text-[10px]'
                          : 'bg-white border border-beige/80 text-coffee'
                      }`}
                    >
                      <span className="text-[8px] sm:text-[9px] font-medium leading-[1.1]">
                        {itemText}
                      </span>
                    </div>
                  ))}
                </div>

                {isSelected ? (
                  <div className="w-full py-3 bg-beige/80 rounded-xl text-center font-bold text-coffee text-xs flex items-center justify-center gap-2 relative z-10 border border-beige">
                    <span>✅</span> Cartón #{card.id} Seleccionado
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelect(card.id)}
                    disabled={isSelecting}
                    className="w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-transform relative z-10 shadow-md bg-pistachio-dark hover:bg-pistachio text-white active:scale-95 disabled:opacity-50"
                  >
                    {isSelecting ? 'Guardando...' : `Elegir Cartón #${card.id}`}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedCardId && (
        <p className="text-center mt-6 text-xs text-danger font-bold animate-pulse px-4">
          ⚠️ Recuerda avisar a Edely o al admin para que confirme tu pago y desbloquee tu cartón.
        </p>
      )}
    </div>
  );
}
