'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RouletteWheelSVG } from '../ui/SVGs';
import { showToast } from '../ui/Toast';
import type { Player, PartyState } from '@/types/database';

interface StopViewProps {
  player: Player;
  partyState: PartyState;
}

export const STOP_CATEGORIES = [
  'Nombre o apellido de docente de la carrera',
  'Tema de informática',
  'Lenguajes de programación',
  'Comidas que comería la cumpleañera',
  'Canciones que escucharía la cumpleañera',
  'Regalo que le darías a la cumpleañera',
];

export function StopView({ player, partyState }: StopViewProps) {
  const { roulette_letter, stop_active } = partyState;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const isSpinning = roulette_letter === '?';
  const isLocked = stop_active;
  const canType = !isSpinning && roulette_letter !== '' && !isLocked;

  // When stop activates, auto-submit answers
  useEffect(() => {
    if (isLocked && !hasSubmitted && Object.keys(answers).length > 0) {
      submitAnswers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  const submitAnswers = async () => {
    if (hasSubmitted || isSubmitting) return;
    setIsSubmitting(true);

    const { error } = await supabase.from('stop_answers').insert({
      player_id: player.player_id,
      player_name: player.name,
      round_letter: roulette_letter,
      answers,
    });

    if (error) {
      console.error('Failed to submit stop answers:', error);
      showToast('Error al enviar respuestas.', 'error');
    } else {
      setHasSubmitted(true);
      showToast('¡Respuestas registradas con éxito!', 'success');
    }
    setIsSubmitting(false);
  };

  const handleStop = async () => {
    const { error } = await supabase
      .from('party_state')
      .update({ stop_active: true })
      .eq('id', partyState.id);
    if (error) {
      console.error('Failed to trigger stop:', error);
      showToast('Error al detener.', 'error');
    }
  };

  const updateAnswer = (cat: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [cat]: val }));
  };

  return (
    <div className="animate-fade-in w-full pb-6">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif mb-1 text-coffee">Tutti Frutti</h2>
        <p className="text-xs text-coffee-light">
          Llena las categorías lo más rápido posible cuando gire la letra.
        </p>
      </div>

      {/* Roulette */}
      <div className="bg-white p-6 rounded-[2.5rem] flex flex-col items-center shadow-sm border border-beige mb-6 relative overflow-hidden">
        <span className="text-[10px] uppercase tracking-[0.2em] mb-4 font-bold text-coffee-light">
          Sorteo de Letra
        </span>

        <div className="relative w-28 h-28 mb-4">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[14px] border-l-transparent border-r-transparent border-t-gold" />
          <div
            className={`w-full h-full rounded-full shadow-inner ${
              isSpinning ? 'animate-spin-roulette' : ''
            }`}
          >
            <RouletteWheelSVG className="w-full h-full" />
          </div>
          {!isSpinning && roulette_letter !== '?' && roulette_letter !== '' && (
            <div className="absolute inset-0 m-auto w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center animate-fade-scale border-[3px] border-pistachio">
              <span className="text-3xl font-serif font-bold text-coffee">
                {roulette_letter}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="glass-card p-5 rounded-[2rem] space-y-4">
        {STOP_CATEGORIES.map((cat, i) => (
          <div
            key={i}
            className="animate-slide-right"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <label className="text-[11px] uppercase font-bold tracking-wider block mb-1 text-pistachio-dark">
              {cat}
            </label>
            <input
              type="text"
              placeholder={canType ? `Escribe con la letra ${roulette_letter || '...'}` : 'Esperando letra...'}
              className="w-full bg-white/80 px-3.5 py-2.5 border-b-2 border-coffee-light/20 rounded-t-lg text-sm font-medium focus:outline-none focus:border-pistachio-dark transition-colors disabled:opacity-40 disabled:bg-gray-50/50"
              disabled={!canType}
              value={answers[cat] || ''}
              onChange={(e) => updateAnswer(cat, e.target.value)}
            />
          </div>
        ))}

        {/* STOP Button — thumb zone */}
        <div className="pt-4 thumb-zone">
          <button
            disabled={!canType || hasSubmitted}
            onClick={handleStop}
            className="w-full py-5 rounded-xl font-black tracking-widest text-xl sm:text-2xl uppercase shadow-xl disabled:opacity-50 active:scale-95 transition-transform relative overflow-hidden bg-danger text-white"
          >
            {isLocked ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ¡STOP ACTIVADO!
              </span>
            ) : hasSubmitted ? (
              '✅ Respuestas Enviadas'
            ) : (
              '¡Stop perre!! 🛑'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
