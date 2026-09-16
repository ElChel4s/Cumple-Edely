import React from 'react';
import { Timer } from '../ui/Timer';
import type { PartyState } from '@/types/database';

interface IcebreakerViewProps {
  partyState: PartyState;
}

const QUESTIONS = [
  "¿Cómo conociste a la cumpleañera?",
  "¿Por qué crees que estás aquí?",
  "Anécdota con Edely.",
  "¿Qué pedirían si todo fuera gratis?",
  "¿A qué se dedican?",
  "¿Qué tipo de música escuchan?",
  "Una fobia que tengan o alergias.",
];

export function IcebreakerView({ partyState }: IcebreakerViewProps) {
  return (
    <div className="animate-fade-in glass-card p-6 rounded-[2rem] text-center shadow-lg border border-beige">
      <div className="text-5xl mb-4">💬</div>
      <h2 className="text-3xl font-serif mb-2 text-coffee">Conexiones</h2>
      <p className="mb-8 text-sm text-coffee-light">
        Habla con tu pareja de equipo y descubran rápidamente:
      </p>

      <div className="space-y-3 text-left px-1 mb-8">
        {QUESTIONS.map((q, i) => (
          <div
            key={i}
            className="flex gap-3 items-start animate-slide-right bg-white/40 p-3 rounded-xl border border-white/50 shadow-sm"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 shadow-sm bg-pistachio-dark">
              {i + 1}
            </span>
            <span className="text-[13px] font-medium leading-tight text-coffee">{q}</span>
          </div>
        ))}
      </div>

      {/* Synchronized Timer */}
      <Timer
        timerSeconds={partyState.timer_seconds}
        timerStartedAt={partyState.timer_started_at}
      />
    </div>
  );
}
