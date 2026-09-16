'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { PartyState, PartyPhase } from '@/types/database';

export function useRealtimeState() {
  const [partyState, setPartyState] = useState<PartyState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchInitialState = async () => {
      const { data, error: fetchError } = await supabase
        .from('party_state')
        .select('*')
        .limit(1)
        .single();

      if (!isMounted) return;

      if (fetchError) {
        console.error('Failed to fetch party_state:', fetchError);
        setError('No se pudo conectar con la fiesta. Verifica tu conexión.');
        setIsLoading(false);
        return;
      }

      setPartyState(data as PartyState);
      setIsLoading(false);
    };

    fetchInitialState();

    // Real-time subscription
    const channel = supabase
      .channel('party_state_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'party_state' },
        (payload) => {
          if (isMounted) {
            setPartyState(payload.new as PartyState);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Mutations ───

  const getStateId = useCallback(() => {
    if (!partyState) throw new Error('Party state not loaded');
    return partyState.id;
  }, [partyState]);

  const updatePhase = useCallback(async (phase: PartyPhase) => {
    const { error } = await supabase
      .from('party_state')
      .update({ current_phase: phase })
      .eq('id', getStateId());
    if (error) console.error('Failed to update phase:', error);
  }, [getStateId]);

  const updateRoulette = useCallback(async (letter: string) => {
    const { error } = await supabase
      .from('party_state')
      .update({ roulette_letter: letter })
      .eq('id', getStateId());
    if (error) console.error('Failed to update roulette:', error);
  }, [getStateId]);

  const setStopActive = useCallback(async (active: boolean) => {
    const { error } = await supabase
      .from('party_state')
      .update({ stop_active: active })
      .eq('id', getStateId());
    if (error) console.error('Failed to update stop_active:', error);
  }, [getStateId]);

  const startTimer = useCallback(async (seconds: number) => {
    const { error } = await supabase
      .from('party_state')
      .update({
        timer_seconds: seconds,
        timer_started_at: new Date().toISOString(),
      })
      .eq('id', getStateId());
    if (error) console.error('Failed to start timer:', error);
  }, [getStateId]);

  const setQuizQuestion = useCallback(async (questionId: number | null) => {
    const { error } = await supabase
      .from('party_state')
      .update({ quiz_question_id: questionId })
      .eq('id', getStateId());
    if (error) console.error('Failed to set quiz question:', error);
  }, [getStateId]);

  const setQuizActive = useCallback(async (active: boolean) => {
    const { error } = await supabase
      .from('party_state')
      .update({ quiz_active: active })
      .eq('id', getStateId());
    if (error) console.error('Failed to set quiz_active:', error);
  }, [getStateId]);

  return {
    partyState,
    isLoading,
    error,
    updatePhase,
    updateRoulette,
    setStopActive,
    startTimer,
    setQuizQuestion,
    setQuizActive,
  };
}
