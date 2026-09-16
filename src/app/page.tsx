'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import type { Player, BingoCard, PartyPhase } from '@/types/database';

import { BotanicalSVG } from '@/components/ui/SVGs';
import { Header } from '@/components/ui/Header';
import { FloatingBingoButton } from '@/components/ui/FloatingBingoButton';
import { LoadingScreen, ErrorScreen } from '@/components/ui/LoadingScreen';
import { ToastProvider } from '@/components/ui/Toast';

import { RegisterView } from '@/components/views/RegisterView';
import { WaitingView } from '@/components/views/WaitingView';
import { IcebreakerView } from '@/components/views/IcebreakerView';
import { QuizView } from '@/components/views/QuizView';
import { StopView } from '@/components/views/StopView';
import { StoriesView } from '@/components/views/StoriesView';
import { WishesView } from '@/components/views/WishesView';

import { BingoModal } from '@/components/modals/BingoModal';
import { BingoCatalogModal } from '@/components/modals/BingoCatalogModal';

import { DOG_GROUPS, assignGroupAndPartner } from '@/lib/constants';

export default function Home() {
  const { partyState, isLoading, error } = useRealtimeState();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [showBingoModal, setShowBingoModal] = useState(false);
  const [bingoCard, setBingoCard] = useState<BingoCard | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);

  // ─── Restore session from localStorage ───
  useEffect(() => {
    const restoreSession = async () => {
      const storedId = localStorage.getItem('edely_player_id');
      if (!storedId) {
        setPlayerLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('player_id', storedId)
        .single();

      if (fetchError || !data) {
        localStorage.removeItem('edely_player_id');
        setPlayerLoading(false);
        return;
      }

      let playerData = data as Player;

      // Validate dog group
      if (!playerData.group_name || !DOG_GROUPS.includes(playerData.group_name as any)) {
        playerData.group_name = DOG_GROUPS[Math.floor(Math.random() * DOG_GROUPS.length)];
        await supabase
          .from('players')
          .update({ group_name: playerData.group_name })
          .eq('player_id', playerData.player_id);
      }

      // Check if partner is a real existing player in Supabase
      const { data: allRealPlayers } = await supabase
        .from('players')
        .select('player_id, name, group_name, partner')
        .neq('player_id', playerData.player_id);

      const otherRealNames = (allRealPlayers || []).map((p) => p.name.trim().toLowerCase());
      const isRealPartner =
        playerData.partner &&
        otherRealNames.includes(playerData.partner.trim().toLowerCase());

      if (!isRealPartner) {
        // Look for a real player in the same group waiting for a partner
        const realTeammateWaiting = (allRealPlayers || []).find(
          (p) =>
            p.group_name === playerData.group_name &&
            (!p.partner || p.partner.trim() === '')
        );

        if (realTeammateWaiting) {
          playerData.partner = realTeammateWaiting.name;
          await supabase
            .from('players')
            .update({ partner: realTeammateWaiting.name })
            .eq('player_id', playerData.player_id);

          await supabase
            .from('players')
            .update({ partner: playerData.name })
            .eq('player_id', realTeammateWaiting.player_id);
        } else {
          // No partner yet -> set to empty string so user sees "Esperando compañero..."
          playerData.partner = '';
          await supabase
            .from('players')
            .update({ partner: '' })
            .eq('player_id', playerData.player_id);
        }
      }

      setPlayer(playerData);
      setPlayerLoading(false);
    };

    restoreSession();
  }, []);

  // ─── Fetch bingo card ───
  const fetchBingoCard = useCallback(async (playerId: string) => {
    const { data } = await supabase
      .from('bingo_cards')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();
    if (data) setBingoCard(data as BingoCard);
  }, []);

  useEffect(() => {
    if (!player) return;
    fetchBingoCard(player.player_id);

    const channel = supabase
      .channel(`my_bingo_card_${player.player_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bingo_cards', filter: `player_id=eq.${player.player_id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') setBingoCard(null);
          else setBingoCard(payload.new as BingoCard);
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [player, fetchBingoCard]);

  // ─── Subscribe to player updates ───
  useEffect(() => {
    if (!player) return;
    const channel = supabase
      .channel(`player_updates_${player.player_id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `player_id=eq.${player.player_id}` },
        (payload) => { setPlayer(payload.new as Player); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [player]);

  const handleRegistered = (newPlayer: Player) => setPlayer(newPlayer);
  const handleCardSelected = () => {
    if (player) fetchBingoCard(player.player_id);
    setShowCatalog(false);
  };

  if (isLoading || playerLoading) return <LoadingScreen />;
  if (error || !partyState) return <ErrorScreen message={error || 'No se pudo conectar.'} />;

  const phase: PartyPhase = partyState.current_phase;
  const isRegistered = !!player;
  
  let currentView: string = phase;
  if (!isRegistered) {
    currentView = 'REGISTER';
  } else if (phase === 'REGISTER') {
    currentView = 'ESPERA'; // Mover al lobby local si ya está registrado
  }
  if (showCatalog) {
    currentView = 'CATALOG';
  }

  return (
    <div className="h-screen-safe relative flex flex-col no-scrollbar overflow-hidden">
      <ToastProvider />

      {/* ─── Background Botanicals (contained, no overflow) ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <BotanicalSVG className="absolute -top-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 animate-spin-slow text-pistachio" />
        <BotanicalSVG className="absolute -bottom-32 -right-16 w-64 h-64 sm:w-80 sm:h-80 text-beige" style={{ transform: 'rotate(45deg)' }} />
        {/* Extra subtle accent for desktop */}
        <BotanicalSVG className="hidden lg:block absolute top-1/3 -right-40 w-[30rem] h-[30rem] text-pistachio opacity-50" style={{ transform: 'rotate(-30deg)' }} />
      </div>

      <Header playerName={player?.name} />

      {/* ─── Main View Container ─── */}
      <main className="flex-1 relative z-10 w-full max-w-md mx-auto px-4 sm:px-6 py-6 pb-28 overflow-y-auto no-scrollbar">
        {currentView === 'REGISTER' && (
          <div className="flex items-center justify-center min-h-[calc(100dvh-10rem)]">
            <RegisterView onRegistered={handleRegistered} />
          </div>
        )}
        {currentView === 'ESPERA' && player && <WaitingView userData={player} />}
        {currentView === 'ICEBREAKER' && <IcebreakerView partyState={partyState} />}
        {currentView === 'QUIZ' && player && (
          <QuizView player={player} partyState={partyState} />
        )}
        {currentView === 'STOP' && player && (
          <StopView player={player} partyState={partyState} />
        )}
        {currentView === 'STORIES' && player && <StoriesView player={player} />}
        {currentView === 'WISHES' && player && <WishesView player={player} />}
        {currentView === 'CATALOG' && player && (
          <BingoCatalogModal
            player={player}
            selectedCardId={bingoCard?.card_id ?? null}
            onCardSelected={handleCardSelected}
          />
        )}
      </main>

      {/* ─── Floating Bingo Button ─── */}
      {isRegistered && currentView !== 'REGISTER' && currentView !== 'CATALOG' && (
        <FloatingBingoButton
          hasSelectedCard={bingoCard !== null}
          onClick={() => setShowBingoModal(true)}
        />
      )}

      {/* ─── Bingo Modal ─── */}
      {showBingoModal && player && (
        <BingoModal
          player={player}
          bingoCard={bingoCard}
          onClose={() => setShowBingoModal(false)}
          goToSelection={() => { setShowBingoModal(false); setShowCatalog(true); }}
        />
      )}
    </div>
  );
}
