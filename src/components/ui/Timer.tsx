'use client';

import React, { useEffect, useState, useRef } from 'react';

interface TimerProps {
  timerSeconds: number;
  timerStartedAt: string | null;
  label?: string;
}

/**
 * Synchronized countdown timer.
 * Computes remaining time from server-provided start timestamp + duration.
 * All clients see the same time regardless of when they load.
 */
export function Timer({ timerSeconds, timerStartedAt, label = 'Tiempo Restante' }: TimerProps) {
  const [remaining, setRemaining] = useState(timerSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!timerStartedAt) {
      setRemaining(timerSeconds);
      return;
    }

    const startTime = new Date(timerStartedAt).getTime();

    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const left = Math.max(0, timerSeconds - elapsed);
      setRemaining(left);
      if (left <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    tick(); // immediate
    intervalRef.current = setInterval(tick, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerSeconds, timerStartedAt]);

  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const pct = timerSeconds > 0 ? (remaining / timerSeconds) * 100 : 0;
  const isLow = remaining < 30;

  return (
    <div className="bg-white/50 p-4 rounded-2xl border border-white/60">
      <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${isLow ? 'text-danger' : 'text-coffee-light'}`}>
        {label}
      </p>
      <div className="h-3 w-full bg-beige rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-linear ${isLow ? 'bg-danger' : 'bg-pistachio-dark'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`font-mono text-2xl mt-2 font-bold ${isLow ? 'text-danger animate-pulse' : 'text-coffee'}`}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </p>
    </div>
  );
}
