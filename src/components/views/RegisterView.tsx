'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BotanicalCrestSVG } from '../ui/SVGs';
import { showToast } from '../ui/Toast';
import { assignGroupAndPartner } from '@/lib/constants';
import type { Player } from '@/types/database';

interface RegisterViewProps {
  onRegistered: (player: Player) => void;
}

export function RegisterView({ onRegistered }: RegisterViewProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);

    // Fetch existing players for balanced group and companion matching
    const { data: existingData } = await supabase
      .from('players')
      .select('player_id, name, group_name, partner');

    const existingPlayers = (existingData || []) as {
      player_id: string;
      name: string;
      group_name: string;
      partner?: string | null;
    }[];

    const { group_name, partner, matchedTeammateId } = assignGroupAndPartner(
      trimmed,
      existingPlayers
    );

    const { data, error } = await supabase
      .from('players')
      .insert({
        name: trimmed,
        group_name,
        partner,
      })
      .select()
      .single();

    if (error) {
      console.error('Registration failed:', error);
      showToast('Error al registrarse. Intenta de nuevo.', 'error');
      setIsSubmitting(false);
      return;
    }

    // If we paired with a waiting teammate, update their partner in Supabase too
    if (matchedTeammateId) {
      await supabase
        .from('players')
        .update({ partner: trimmed })
        .eq('player_id', matchedTeammateId);
    }

    const player = data as Player;
    localStorage.setItem('edely_player_id', player.player_id);
    showToast(`¡Bienvenido/a, ${player.name}!`, 'success');
    onRegistered(player);
  };

  return (
    <div className="animate-fade-in w-full flex flex-col justify-center mt-4">
      <div className="glass-card rounded-[2.5rem] p-8 text-center border-t border-l border-white/60 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
          <BotanicalCrestSVG size="120" color="var(--color-coffee)" />
        </div>

        <div className="inline-block p-4 rounded-full mb-6 relative bg-white/60 shadow-sm animate-float">
          <span className="text-5xl block">🪴</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-serif mb-2 text-coffee">Bienvenido bebe</h2>
        <p className="mb-10 font-light tracking-wide text-sm px-2 text-coffee-light">
          Gracias por venir, regístrate para empezar.
        </p>

        <form className="space-y-8 text-left relative z-10" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] font-bold mb-2 block text-pistachio-dark">
              Tu Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Valentina"
              className="input-elegant text-xl font-serif"
              required
              disabled={isSubmitting}
              autoComplete="name"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-4 rounded-xl font-serif text-lg font-bold tracking-widest shadow-lg transition-transform active:scale-95 uppercase bg-coffee text-beige-lighter disabled:opacity-50 disabled:scale-100"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registrando...
              </span>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
