'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '../ui/Toast';
import type { Player, Story, StoryVote } from '@/types/database';

interface StoriesViewProps {
  player: Player;
}

export function StoriesView({ player }: StoriesViewProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  // Active story and votes
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [storyVotes, setStoryVotes] = useState<StoryVote[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // ─── Fetch active story, players, and votes ───
  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch currently active revealed story
      const { data: storyData } = await supabase
        .from('stories')
        .select('*')
        .eq('revealed', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (storyData) {
        setActiveStory(storyData as Story);
      }

      // 2. Fetch all present players for voting options
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true });

      if (playersData) {
        setPlayersList(playersData as Player[]);
      }
    };

    fetchData();

    // Subscribe to stories changes
    const storiesChannel = supabase
      .channel('stories_realtime_view')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        async () => {
          const { data } = await supabase
            .from('stories')
            .select('*')
            .eq('revealed', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          setActiveStory((data as Story) || null);
        }
      )
      .subscribe();

    // Subscribe to players list changes
    const playersChannel = supabase
      .channel('players_realtime_stories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        async () => {
          const { data } = await supabase
            .from('players')
            .select('*')
            .order('name', { ascending: true });
          if (data) setPlayersList(data as Player[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(playersChannel);
    };
  }, []);

  // ─── Fetch and subscribe to votes for active story ───
  useEffect(() => {
    if (!activeStory) {
      setStoryVotes([]);
      setMyVote(null);
      return;
    }

    const fetchVotes = async () => {
      const { data } = await supabase
        .from('story_votes')
        .select('*')
        .eq('story_id', activeStory.id);

      if (data) {
        const votes = data as StoryVote[];
        setStoryVotes(votes);
        const existingMyVote = votes.find(
          (v) => v.voter_player_id === player.player_id
        );
        if (existingMyVote) {
          setMyVote(existingMyVote.voted_for_player_id);
        } else {
          setMyVote(null);
        }
      }
    };

    fetchVotes();

    const votesChannel = supabase
      .channel(`votes_story_${activeStory.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'story_votes',
          filter: `story_id=eq.${activeStory.id}`,
        },
        async () => {
          fetchVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(votesChannel);
    };
  }, [activeStory, player.player_id]);

  // ─── Handle Story Submission ───
  const handleSubmitStory = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);

    const { error } = await supabase.from('stories').insert({
      player_id: player.player_id,
      content: trimmed,
      revealed: false,
      author_revealed: false,
    });

    if (error) {
      console.error('Failed to submit story:', error);
      showToast('Error al enviar anécdota.', 'error');
    } else {
      showToast('¡Anécdota enviada con éxito! 💌', 'success');
      setContent('');
      setHasSent(true);
    }
    setIsSubmitting(false);
  };

  // ─── Handle Vote ───
  const handleVote = async (votedPlayer: Player) => {
    if (!activeStory || isVoting || activeStory.author_revealed) return;
    setIsVoting(true);

    const { error } = await supabase.from('story_votes').upsert(
      {
        story_id: activeStory.id,
        voter_player_id: player.player_id,
        voter_name: player.name,
        voted_for_player_id: votedPlayer.player_id,
        voted_for_name: votedPlayer.name,
      },
      { onConflict: 'story_id,voter_player_id' }
    );

    if (error) {
      console.error('Failed to cast vote:', error);
      showToast('Error al registrar voto.', 'error');
    } else {
      setMyVote(votedPlayer.player_id);
      showToast(`Votaste por: ${votedPlayer.name} 🗳️`, 'success');
    }
    setIsVoting(false);
  };

  // Calculate vote tallies
  const totalVotes = storyVotes.length;
  const voteCounts: Record<string, number> = {};
  storyVotes.forEach((v) => {
    voteCounts[v.voted_for_player_id] =
      (voteCounts[v.voted_for_player_id] || 0) + 1;
  });

  // Find real author info
  const realAuthor = playersList.find((p) => p.player_id === activeStory?.player_id);
  const guessedCorrectly = myVote === activeStory?.player_id;

  return (
    <div className="animate-fade-in w-full text-center pb-12">
      <div className="mb-6">
        <span className="text-4xl mb-2 block">📖</span>
        <h2 className="text-3xl font-serif font-bold text-coffee">Historias Secretas</h2>
        <p className="text-xs text-coffee-light mt-1">
          Anécdotas anónimas con Edely. ¿Quién crees que la escribió?
        </p>
      </div>

      {/* ─── VISTA 1: HISTORIA ACTIVA EN PANTALLA (VOTACIÓN) ─── */}
      {activeStory ? (
        <div className="space-y-6">
          {/* Tarjeta de la Historia */}
          <div className="relative p-6 sm:p-8 bg-white rounded-[2.5rem] shadow-xl border-2 border-gold/40 overflow-hidden text-left animate-fade-scale">
            <div className="absolute top-3 right-4 bg-gold text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-xs">
              Historia Activa
            </div>

            <span className="text-4xl text-gold opacity-50 block font-serif leading-none mb-2">
              &ldquo;
            </span>
            <p className="text-lg sm:text-xl font-serif font-medium leading-relaxed italic text-coffee px-1">
              {activeStory.content}
            </p>
            <span className="text-4xl text-gold opacity-50 block font-serif leading-none text-right mt-2">
              &rdquo;
            </span>

            {/* REVELACIÓN DEL AUTOR REAL */}
            {activeStory.author_revealed && (
              <div className="mt-6 pt-5 border-t-2 border-dashed border-gold/50 bg-gold/10 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 text-center animate-fade-scale">
                <span className="text-3xl block mb-1">🎉</span>
                <span className="text-xs uppercase font-extrabold tracking-widest text-coffee-light block">
                  El verdadero autor fue:
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif font-black text-coffee mt-1 underline decoration-gold decoration-4">
                  {realAuthor ? realAuthor.name : 'Invitado Secreto'}
                </h3>
                {myVote && (
                  <div className="mt-3">
                    {guessedCorrectly ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300 shadow-xs">
                        <span>🎯</span> ¡Adivinaste correctamente! (+10 pts)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-300 shadow-xs">
                        <span>😅</span> ¡Caíste en la trampa!
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel de Votación */}
          {!activeStory.author_revealed ? (
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[2rem] border border-beige shadow-md text-left">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-coffee flex items-center gap-2">
                  <span>🗳️</span> ¿Quién crees que es el autor?
                </h3>
                <span className="text-[11px] font-bold text-pistachio-dark bg-pistachio/20 px-2.5 py-0.5 rounded-full">
                  {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
                </span>
              </div>

              {/* Grid de Invitados para Votar */}
              <div className="grid grid-cols-2 gap-2.5">
                {playersList.map((p) => {
                  const isSelected = myVote === p.player_id;
                  const count = voteCounts[p.player_id] || 0;
                  const percentage =
                    totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

                  return (
                    <button
                      key={p.player_id}
                      onClick={() => handleVote(p)}
                      disabled={isVoting}
                      className={`p-3 rounded-2xl text-left border transition-all relative overflow-hidden active:scale-95 shadow-xs ${
                        isSelected
                          ? 'bg-pistachio-dark text-white border-pistachio-dark shadow-md ring-2 ring-pistachio/40'
                          : 'bg-beige/40 hover:bg-beige text-coffee border-beige'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs truncate">
                          👤 {p.name}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-black uppercase bg-white/20 px-1.5 py-0.2 rounded-full">
                            Tu voto
                          </span>
                        )}
                      </div>

                      {/* Barra de Progreso de Votos */}
                      <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden mt-1.5">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isSelected ? 'bg-white' : 'bg-pistachio'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-semibold mt-1 block ${
                          isSelected ? 'text-white/80' : 'text-coffee-light'
                        }`}
                      >
                        {count} {count === 1 ? 'voto' : 'votos'} ({percentage}%)
                      </span>
                    </button>
                  );
                })}
              </div>

              {myVote && (
                <p className="text-center text-xs text-coffee-light mt-4 italic">
                  ✓ Puedes cambiar tu voto antes de que Edely revele al autor real.
                </p>
              )}
            </div>
          ) : (
            /* Resultados Finales de la Votación */
            <div className="bg-white p-6 rounded-[2rem] border border-beige shadow-md text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-coffee mb-3 flex items-center gap-2">
                <span>📊</span> Resultados de las Votaciones:
              </h3>
              <div className="space-y-2">
                {playersList
                  .filter((p) => (voteCounts[p.player_id] || 0) > 0)
                  .sort(
                    (a, b) =>
                      (voteCounts[b.player_id] || 0) -
                      (voteCounts[a.player_id] || 0)
                  )
                  .map((p) => {
                    const count = voteCounts[p.player_id] || 0;
                    const percentage =
                      totalVotes > 0
                        ? Math.round((count / totalVotes) * 100)
                        : 0;
                    const isTheAuthor = p.player_id === activeStory.player_id;

                    return (
                      <div
                        key={p.player_id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isTheAuthor
                            ? 'bg-gold/20 border-gold font-bold text-coffee'
                            : 'bg-beige/30 border-beige text-coffee'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{isTheAuthor ? '👑' : '👤'}</span>
                          <span className="font-bold">{p.name}</span>
                          {isTheAuthor && (
                            <span className="text-[10px] font-black uppercase text-gold bg-white px-2 py-0.5 rounded-full border border-gold/40">
                              Autor Real
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-coffee-light">
                          {count} {count === 1 ? 'voto' : 'votos'} ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── VISTA 2: ESPERANDO QUE EL ADMIN ACTIVE UNA HISTORIA ─── */
        <div className="bg-white/80 p-6 rounded-[2rem] border border-beige shadow-sm mb-8 text-center">
          <span className="text-4xl block mb-2">⏳</span>
          <h3 className="text-lg font-serif font-bold text-coffee mb-1">
            Esperando a la cumpleañera...
          </h3>
          <p className="text-xs text-coffee-light">
            Edely mostrará las historias una por una en pantalla para que todos voten.
          </p>
        </div>
      )}

      {/* ─── SECCIÓN: ENVIAR OTRA ANÉCDOTA ─── */}
      <div className="mt-8 pt-6 border-t border-beige">
        <h3 className="text-base font-serif font-bold text-coffee mb-2">
          ¿Quieres enviar otra anécdota secreta?
        </h3>
        <p className="text-xs text-coffee-light mb-4 px-2">
          Puedes enviar todas las anécdotas o momentos divertidos que recuerdes con Edely.
        </p>

        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-beige text-left">
          <textarea
            className="w-full bg-beige-lighter border-none rounded-xl p-3.5 text-sm font-serif resize-none outline-none focus:ring-2 focus:ring-pistachio shadow-inner placeholder:italic placeholder:font-light text-coffee"
            rows={3}
            placeholder="Una vez estábamos en la universidad y..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            onClick={handleSubmitStory}
            disabled={isSubmitting || !content.trim()}
            className="w-full mt-3 py-3 rounded-xl font-bold tracking-widest uppercase text-xs shadow-md active:scale-95 transition-transform bg-pistachio-dark hover:bg-pistachio text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Anécdota 💌'}
          </button>
        </div>
      </div>
    </div>
  );
}
