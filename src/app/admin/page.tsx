'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRealtimeState } from '@/hooks/useRealtimeState';
import { LoadingScreen, ErrorScreen } from '@/components/ui/LoadingScreen';
import { ToastProvider, showToast } from '@/components/ui/Toast';
import { DOG_GROUPS } from '@/lib/constants';
import { PREDEFINED_CARDS } from '@/components/modals/BingoCatalogModal';
import { QUIZ_QUESTIONS, type QuizQuestion } from '@/lib/quizQuestions';
import type {
  PartyPhase,
  Player,
  BingoCard,
  BingoClaim,
  Story,
  StoryVote,
  StopAnswer,
  QuizAnswer,
} from '@/types/database';

interface PhaseButtonItem {
  phase: PartyPhase;
  label: string;
  icon: string;
  desc: string;
}

const PHASES_LIST: PhaseButtonItem[] = [
  { phase: 'REGISTER', label: 'Lobby', icon: '🪴', desc: 'Registro de invitados' },
  { phase: 'ESPERA', label: 'Lobby (Grupos)', icon: '🐾', desc: 'Perritos & Parejas (Máx. 2)' },
  { phase: 'ICEBREAKER', label: 'Conexiones', icon: '💬', desc: 'Rompehielos 7 preguntas' },
  { phase: 'QUIZ', label: 'Trivia', icon: '🎯', desc: 'Trivia sobre Edely' },
  { phase: 'STOP', label: 'Tutti Frutti', icon: '🛑', desc: 'Ruleta & Categorías' },
  { phase: 'STORIES', label: 'Historias', icon: '📖', desc: 'Votación de anécdotas' },
  { phase: 'WISHES', label: 'Deseos', icon: '✨', desc: 'Muro de dedicatorias' },
];

export default function AdminPanel() {
  const {
    partyState,
    isLoading,
    error,
    updatePhase,
    updateRoulette,
    setStopActive,
    startTimer,
    setQuizQuestion,
    setQuizActive,
  } = useRealtimeState();

  const [isSpinning, setIsSpinning] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [bingoCards, setBingoCards] = useState<BingoCard[]>([]);
  const [pendingClaims, setPendingClaims] = useState<BingoClaim[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyVotes, setStoryVotes] = useState<StoryVote[]>([]);
  const [stopAnswers, setStopAnswers] = useState<StopAnswer[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [selectedQuizQId, setSelectedQuizQId] = useState<number>(1);
  const [showQuizLeaderboard, setShowQuizLeaderboard] = useState<boolean>(false);
  const [scores, setScores] = useState<Record<string, number>>({});

  // ─── Fetch initial data ───
  useEffect(() => {
    const fetchAll = async () => {
      const [
        playersRes,
        cardsRes,
        claimsRes,
        storiesRes,
        votesRes,
        stopRes,
        quizRes,
      ] = await Promise.all([
        supabase.from('players').select('*').order('created_at', { ascending: true }),
        supabase.from('bingo_cards').select('*'),
        supabase
          .from('bingo_claims')
          .select('*')
          .eq('status', 'PENDING')
          .order('created_at', { ascending: true }),
        supabase.from('stories').select('*').order('created_at', { ascending: true }),
        supabase.from('story_votes').select('*'),
        supabase.from('stop_answers').select('*').order('created_at', { ascending: false }),
        supabase.from('quiz_answers').select('*').order('answered_at', { ascending: true }),
      ]);

      if (playersRes.data) setPlayers(playersRes.data as Player[]);
      if (cardsRes.data) setBingoCards(cardsRes.data as BingoCard[]);
      if (claimsRes.data) setPendingClaims(claimsRes.data as BingoClaim[]);
      if (storiesRes.data) setStories(storiesRes.data as Story[]);
      if (votesRes.data) setStoryVotes(votesRes.data as StoryVote[]);
      if (stopRes.data) setStopAnswers(stopRes.data as StopAnswer[]);
      if (quizRes.data) setQuizAnswers(quizRes.data as QuizAnswer[]);
    };

    fetchAll();

    // Real-time subscriptions
    const claimsChannel = supabase
      .channel('admin_bingo_claims')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bingo_claims' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const claim = payload.new as BingoClaim;
            if (claim.status === 'PENDING') {
              setPendingClaims((prev) => [...prev, claim]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const claim = payload.new as BingoClaim;
            if (claim.status !== 'PENDING') {
              setPendingClaims((prev) => prev.filter((c) => c.id !== claim.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setPendingClaims((prev) =>
              prev.filter((c) => c.id !== (payload.old as BingoClaim).id)
            );
          }
        }
      )
      .subscribe();

    const cardsChannel = supabase
      .channel('admin_bingo_cards')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bingo_cards' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBingoCards((prev) => [...prev, payload.new as BingoCard]);
          } else if (payload.eventType === 'UPDATE') {
            setBingoCards((prev) =>
              prev.map((c) =>
                c.id === (payload.new as BingoCard).id
                  ? (payload.new as BingoCard)
                  : c
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setBingoCards((prev) =>
              prev.filter((c) => c.id !== (payload.old as BingoCard).id)
            );
          }
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel('admin_players')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPlayers((prev) => [...prev, payload.new as Player]);
          } else if (payload.eventType === 'UPDATE') {
            setPlayers((prev) =>
              prev.map((p) =>
                p.player_id === (payload.new as Player).player_id
                  ? (payload.new as Player)
                  : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPlayers((prev) =>
              prev.filter((p) => p.player_id !== (payload.old as Player).player_id)
            );
          }
        }
      )
      .subscribe();

    const storiesChannel = supabase
      .channel('admin_stories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setStories((prev) => [...prev, payload.new as Story]);
          } else if (payload.eventType === 'UPDATE') {
            setStories((prev) =>
              prev.map((s) =>
                s.id === (payload.new as Story).id ? (payload.new as Story) : s
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setStories((prev) =>
              prev.filter((s) => s.id !== (payload.old as Story).id)
            );
          }
        }
      )
      .subscribe();

    const votesChannel = supabase
      .channel('admin_story_votes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'story_votes' },
        async () => {
          const { data } = await supabase.from('story_votes').select('*');
          if (data) setStoryVotes(data as StoryVote[]);
        }
      )
      .subscribe();

    const stopChannel = supabase
      .channel('admin_stop_answers')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stop_answers' },
        (payload) => {
          setStopAnswers((prev) => [payload.new as StopAnswer, ...prev]);
        }
      )
      .subscribe();

    const quizChannel = supabase
      .channel('admin_quiz_answers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_answers' },
        async () => {
          const { data } = await supabase
            .from('quiz_answers')
            .select('*')
            .order('answered_at', { ascending: true });
          if (data) setQuizAnswers(data as QuizAnswer[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(claimsChannel);
      supabase.removeChannel(cardsChannel);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(stopChannel);
      supabase.removeChannel(quizChannel);
    };
  }, []);

  // ─── Phase Handlers ───
  const handleSelectPhase = async (phase: PartyPhase, label: string) => {
    await updatePhase(phase);
    showToast(`Pantalla cambiada a: ${label}`, 'success');
  };

  const handleStartTimer = async (seconds: number) => {
    await startTimer(seconds);
    showToast(`Temporizador iniciado: ${seconds / 60} min`, 'info');
  };

  // ─── Stop Handlers ───
  const handleSpin = async () => {
    setIsSpinning(true);
    await updateRoulette('?');
    await setStopActive(false);
    setTimeout(async () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const letter = letters.charAt(Math.floor(Math.random() * letters.length));
      await updateRoulette(letter);
      setIsSpinning(false);
      showToast(`¡Letra sorteada: ${letter}! 🎡`, 'success');
    }, 3500);
  };

  const handleForceStop = async () => {
    await setStopActive(true);
    showToast('🛑 ¡STOP PERRE ACTIVADO! Las pantallas se han bloqueado.', 'error');
  };

  const handleUnlockStop = async () => {
    await setStopActive(false);
    showToast('🟢 Tutti Frutti desbloqueado para una nueva ronda.', 'success');
  };

  const handleAssignScore = (
    stopAnswerId: string,
    category: string,
    pts: number
  ) => {
    const key = `${stopAnswerId}_${category}`;
    setScores((prev) => ({ ...prev, [key]: pts }));
    showToast(`${pts > 0 ? `+${pts}` : '0'} pts asignados a la categoría`, 'info');
  };

  // ─── Bingo Handlers ───
  const handleApproveClaim = async (claim: BingoClaim) => {
    await supabase
      .from('bingo_claims')
      .update({ status: 'APPROVED' })
      .eq('id', claim.id);

    const { data: cardData } = await supabase
      .from('bingo_cards')
      .select('*')
      .eq('player_id', claim.player_id)
      .single();

    if (cardData) {
      const current = (cardData.stamped_items as number[]) || [];
      if (!current.includes(claim.stamp_index)) {
        await supabase
          .from('bingo_cards')
          .update({ stamped_items: [...current, claim.stamp_index] })
          .eq('id', cardData.id);
      }
    }

    setPendingClaims((prev) => prev.filter((c) => c.id !== claim.id));
    showToast(`✓ Aprobado para ${claim.player_name}: "${claim.stamp_label}"`, 'success');
  };

  const handleRejectClaim = async (claim: BingoClaim) => {
    await supabase
      .from('bingo_claims')
      .update({ status: 'REJECTED' })
      .eq('id', claim.id);

    setPendingClaims((prev) => prev.filter((c) => c.id !== claim.id));
    showToast(`✕ Rechazado: "${claim.stamp_label}"`, 'error');
  };

  const handleToggleCardPayment = async (card: BingoCard) => {
    const newPaidStatus = !card.has_paid;
    const { error: updateErr } = await supabase
      .from('bingo_cards')
      .update({ has_paid: newPaidStatus })
      .eq('id', card.id);

    if (!updateErr) {
      setBingoCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, has_paid: newPaidStatus } : c))
      );
      showToast(
        newPaidStatus
          ? '💳 ¡Cartón pagado y habilitado en el celular del usuario! ✓'
          : 'Pago revocado (Cartón bloqueado)',
        newPaidStatus ? 'success' : 'info'
      );
    }
  };

  // ─── Stories & Voting Handlers ───
  const activeStory = stories.find((s) => s.revealed);
  const activeStoryIndex = stories.findIndex((s) => s.revealed);

  const handlePresentStory = async (story: Story) => {
    // Hide all others and present this one (reset author_revealed)
    await supabase.from('stories').update({ revealed: false }).neq('id', story.id);
    await supabase
      .from('stories')
      .update({ revealed: true, author_revealed: false })
      .eq('id', story.id);

    setStories((prev) =>
      prev.map((s) => ({
        ...s,
        revealed: s.id === story.id,
        author_revealed: s.id === story.id ? false : s.author_revealed,
      }))
    );
    showToast('📖 Historia presentada a todos. ¡Votaciones abiertas en los celulares!', 'success');
  };

  const handleRevealStoryAuthor = async (story: Story) => {
    await supabase
      .from('stories')
      .update({ author_revealed: true })
      .eq('id', story.id);

    setStories((prev) =>
      prev.map((s) =>
        s.id === story.id ? { ...s, author_revealed: true } : s
      )
    );
    showToast('🎉 ¡Autor revelado en todos los celulares!', 'success');
  };

  const handleNextStory = () => {
    if (stories.length === 0) return;
    const nextIdx = (activeStoryIndex + 1) % stories.length;
    handlePresentStory(stories[nextIdx]);
  };

  const handlePrevStory = () => {
    if (stories.length === 0) return;
    const prevIdx = (activeStoryIndex - 1 + stories.length) % stories.length;
    handlePresentStory(stories[prevIdx]);
  };

  // ─── Players Management ───
  const handleToggleQuizPayment = async (
    playerId: string,
    currentValue: boolean
  ) => {
    await supabase
      .from('players')
      .update({ paid_quiz: !currentValue })
      .eq('player_id', playerId);

    setPlayers((prev) =>
      prev.map((p) =>
        p.player_id === playerId ? { ...p, paid_quiz: !currentValue } : p
      )
    );
  };

  const handleReshuffleGroups = async () => {
    if (players.length === 0) {
      showToast('No hay jugadores registrados todavía', 'info');
      return;
    }

    const shuffledDogGroups = [...DOG_GROUPS].sort(() => Math.random() - 0.5);
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    const updatedList: Player[] = [];

    // Emparejar estrictamente de 2 en 2 en cada grupo de perrito
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      const groupIdx = Math.floor(i / 2) % shuffledDogGroups.length;
      const gName = shuffledDogGroups[groupIdx];

      const p1 = shuffledPlayers[i];
      const p2 = i + 1 < shuffledPlayers.length ? shuffledPlayers[i + 1] : null;

      const p1Partner = p2 ? p2.name : '';
      await supabase
        .from('players')
        .update({ group_name: gName, partner: p1Partner })
        .eq('player_id', p1.player_id);
      updatedList.push({ ...p1, group_name: gName, partner: p1Partner });

      if (p2) {
        const p2Partner = p1.name;
        await supabase
          .from('players')
          .update({ group_name: gName, partner: p2Partner })
          .eq('player_id', p2.player_id);
        updatedList.push({ ...p2, group_name: gName, partner: p2Partner });
      }
    }

    setPlayers(updatedList);
    showToast('¡Grupos y Parejas (Máx. 2 por grupo) sorteados! 🎉', 'success');
  };

  // ─── Trivia Handlers ───
  const handleStartTrivia = async () => {
    await setQuizActive(true);
    if (partyState?.current_phase !== 'QUIZ') {
      await updatePhase('QUIZ');
    }
    showToast('🚀 ¡Trivia iniciada para todos los invitados en vivo!', 'success');
  };

  const handlePauseTrivia = async () => {
    await setQuizActive(false);
    showToast('⏸ Trivia pausada. Los invitados ven la espera / ranking.', 'info');
  };

  const handleResetQuizAnswers = async () => {
    if (!window.confirm('¿Segura que deseas reiniciar todas las respuestas de la Trivia?')) return;
    await setQuizActive(false);
    const { error: delErr } = await supabase
      .from('quiz_answers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (!delErr) {
      setQuizAnswers([]);
      showToast('🗑️ Respuestas de trivia reiniciadas con éxito.', 'info');
    }
  };

  // Live Trivia Leaderboard for Admin
  const adminQuizLeaderboard = React.useMemo(() => {
    const scoresMap: Record<string, { name: string; score: number; correctCount: number; answeredCount: number }> = {};
    players.forEach((p) => {
      scoresMap[p.player_id] = { name: p.name, score: 0, correctCount: 0, answeredCount: 0 };
    });
    quizAnswers.forEach((ans) => {
      if (!scoresMap[ans.player_id]) {
        scoresMap[ans.player_id] = { name: ans.player_name, score: 0, correctCount: 0, answeredCount: 0 };
      }
      scoresMap[ans.player_id].answeredCount += 1;
    });

    for (const q of QUIZ_QUESTIONS) {
      const correctLetter = ['A', 'B', 'C', 'D'][q.correctIndex];
      const qAnswers = quizAnswers
        .filter((a) => a.question_id === q.id && a.answer === correctLetter)
        .sort((a, b) => a.answered_at - b.answered_at);

      qAnswers.forEach((ans, rankIdx) => {
        if (!scoresMap[ans.player_id]) {
          scoresMap[ans.player_id] = { name: ans.player_name, score: 0, correctCount: 0, answeredCount: 0 };
        }
        const points = Math.max(1000 - rankIdx * 100, 500);
        scoresMap[ans.player_id].score += points;
        scoresMap[ans.player_id].correctCount += 1;
      });
    }

    return Object.values(scoresMap).sort((a, b) => b.score - a.score);
  }, [quizAnswers, players]);

  // Live player progress list
  const adminPlayerQuizProgress = React.useMemo(() => {
    return players.map((p) => {
      const pAnswers = quizAnswers.filter((a) => a.player_id === p.player_id);
      const correctCount = pAnswers.filter((ans) => {
        const q = QUIZ_QUESTIONS.find((item) => item.id === ans.question_id);
        return q && ans.answer === ['A', 'B', 'C', 'D'][q.correctIndex];
      }).length;

      const scoreEntry = adminQuizLeaderboard.find((entry) => entry.name === p.name);
      const score = scoreEntry?.score || 0;

      return {
        ...p,
        answeredCount: pAnswers.length,
        correctCount,
        score,
      };
    }).sort((a, b) => b.score - a.score);
  }, [players, quizAnswers, adminQuizLeaderboard]);

  if (isLoading) return <LoadingScreen />;
  if (error || !partyState) return <ErrorScreen message={error || 'No se pudo conectar.'} />;

  const currentPhaseConfig =
    PHASES_LIST.find((p) => p.phase === partyState.current_phase) ||
    PHASES_LIST[0];

  // Active story votes
  const activeVotes = activeStory
    ? storyVotes.filter((v) => v.story_id === activeStory.id)
    : [];

  const activeSelectedQuestion =
    QUIZ_QUESTIONS.find((q) => q.id === selectedQuizQId) || QUIZ_QUESTIONS[0];

  const selectedQAnswers = quizAnswers
    .filter((a) => a.question_id === selectedQuizQId)
    .sort((a, b) => a.answered_at - b.answered_at);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-coffee pb-16">
      <ToastProvider />

      {/* ─── Top Header ─── */}
      <header className="bg-white/85 backdrop-blur-md border-b border-beige px-4 sm:px-8 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-beige/80 border border-beige flex items-center justify-center text-2xl shadow-xs">
              👑
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-coffee leading-tight">
                Mando Maestro de Edely
              </h1>
              <p className="text-xs text-coffee-light flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pistachio animate-pulse" />
                {players.length} invitados conectados · Pantalla:{' '}
                <strong className="text-pistachio-dark">
                  {currentPhaseConfig.label}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-white hover:bg-beige text-coffee text-xs font-bold border border-beige shadow-xs transition-transform active:scale-95 flex items-center gap-2"
            >
              <span>🎈</span>
              <span className="hidden sm:inline">Ver Vista Invitados</span>
              <span className="sm:hidden">Fiesta</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main 3-Column Control Center Grid ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* TARJETA 1: CONTROL DE FASES / DINÁMICAS                          */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-md border border-beige flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎛️</span>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-coffee">
                    Control de Pantalla
                  </h2>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-pistachio/20 text-pistachio-dark border border-pistachio/30">
                  {currentPhaseConfig.icon} {currentPhaseConfig.label}
                </span>
              </div>

              <p className="text-xs text-coffee-light mb-4">
                Toca cualquier dinámica para cambiar en vivo la pantalla de todos los invitados:
              </p>

              {/* Botones Grandes de Fases */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                {PHASES_LIST.map((item) => {
                  const isActive = partyState.current_phase === item.phase;
                  return (
                    <button
                      key={item.phase}
                      onClick={() => handleSelectPhase(item.phase, item.label)}
                      className={`w-full p-3.5 rounded-2xl text-left border transition-all flex items-center gap-3.5 shadow-xs active:scale-98 ${
                        isActive
                          ? 'bg-pistachio-dark text-white border-pistachio-dark shadow-md ring-2 ring-pistachio/40'
                          : 'bg-white hover:bg-beige/40 text-coffee border-beige hover:border-pistachio/50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                          isActive ? 'bg-white/20' : 'bg-beige/70'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-serif font-bold text-sm truncate">
                            {item.label}
                          </p>
                          {isActive && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                              EN VIVO
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] truncate ${
                            isActive ? 'text-white/80' : 'text-coffee-light'
                          }`}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Temporizador Global */}
            <div className="mt-6 pt-5 border-t border-beige">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-coffee flex items-center gap-1.5">
                  <span>⏱️</span> Temporizador
                </span>
                <span className="text-[11px] text-coffee-light">
                  {partyState.timer_seconds / 60} min configurados
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 10].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleStartTimer(mins * 60)}
                    className="py-2.5 rounded-xl font-bold text-xs bg-beige hover:bg-pistachio-dark hover:text-white text-coffee transition-colors active:scale-95 shadow-xs"
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* TARJETA 2: MÓDULO TUTTI FRUTTI (STOP PERRE)                     */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-md border border-beige flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛑</span>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-danger">
                    Módulo Tutti Frutti
                  </h2>
                </div>
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    partyState.stop_active
                      ? 'bg-red-100 text-red-700 animate-pulse border border-red-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {partyState.stop_active ? '🔴 STOP BLOQUEADO' : '🟢 JUGANDO'}
                </span>
              </div>

              {/* Sorteo de Letra */}
              <div className="bg-beige/40 rounded-2xl p-4 border border-beige mb-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-coffee-light block mb-2">
                  Letra de la Ronda
                </span>
                <div className="w-16 h-16 mx-auto rounded-full bg-white shadow-sm border-2 border-pistachio flex items-center justify-center mb-3">
                  <span className="text-3xl font-serif font-bold text-coffee">
                    {isSpinning ? '🎡' : partyState.roulette_letter || '—'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={handleSpin}
                    disabled={isSpinning}
                    className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-sm bg-gold hover:bg-gold/90 text-white transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <span>🎡</span>
                    {isSpinning ? 'Girando...' : 'Girar Ruleta'}
                  </button>

                  {partyState.stop_active ? (
                    <button
                      onClick={handleUnlockStop}
                      className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-sm bg-pistachio hover:bg-pistachio-dark text-white transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🟢</span> Desbloquear
                    </button>
                  ) : (
                    <button
                      onClick={handleForceStop}
                      className="w-full py-3 rounded-xl font-black uppercase tracking-wider text-xs shadow-sm bg-danger hover:bg-red-700 text-white transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span>🛑</span> Forzar STOP PERRE
                    </button>
                  )}
                </div>
              </div>

              {/* Respuestas Recibidas y Calificación */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-coffee">
                    Respuestas Enviadas ({stopAnswers.length})
                  </span>
                  {stopAnswers.length > 0 && (
                    <span className="text-[10px] text-coffee-light">
                      Califica con +10 / +5
                    </span>
                  )}
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar pr-1">
                  {stopAnswers.length === 0 ? (
                    <div className="text-center py-8 bg-beige/20 rounded-2xl border border-dashed border-beige">
                      <p className="text-xs italic text-coffee-light">
                        Esperando a que los jugadores envíen respuestas...
                      </p>
                    </div>
                  ) : (
                    stopAnswers.map((sa) => (
                      <div
                        key={sa.id}
                        className="bg-white p-3.5 rounded-2xl border border-beige shadow-xs"
                      >
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-beige">
                          <p className="font-bold text-coffee text-xs">
                            👤 {sa.player_name}
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-beige text-coffee">
                            Letra: {sa.round_letter}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {Object.entries(sa.answers).map(([cat, ans]) => {
                            const scoreKey = `${sa.id}_${cat}`;
                            const currentScore = scores[scoreKey];
                            return (
                              <div
                                key={cat}
                                className="bg-beige/30 p-2 rounded-xl text-xs flex flex-col gap-1"
                              >
                                <div className="flex justify-between items-start gap-1">
                                  <span className="text-[9px] font-bold uppercase text-coffee-light leading-tight">
                                    {cat}:
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() =>
                                        handleAssignScore(sa.id, cat, 10)
                                      }
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-colors ${
                                        currentScore === 10
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                      }`}
                                    >
                                      +10
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleAssignScore(sa.id, cat, 5)
                                      }
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-colors ${
                                        currentScore === 5
                                          ? 'bg-amber-500 text-white'
                                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                      }`}
                                    >
                                      +5
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleAssignScore(sa.id, cat, 0)
                                      }
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold transition-colors ${
                                        currentScore === 0
                                          ? 'bg-gray-600 text-white'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      0
                                    </button>
                                  </div>
                                </div>
                                <p className="font-medium text-coffee text-xs">
                                  &ldquo;{ans || '—'}&rdquo;
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* TARJETA 3: CENTRAL DE BINGO (PAGOS Y RECLAMOS EN VIVO)            */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-md border border-beige flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎟️</span>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-pistachio-dark">
                    Central de Bingo
                  </h2>
                </div>
                {pendingClaims.length > 0 ? (
                  <span className="bg-danger text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1">
                    <span>⚠️</span> {pendingClaims.length} pendientes
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                    ✓ Reclamos al día
                  </span>
                )}
              </div>

              {/* Subsección: Aprobación de Pagos de Cartones */}
              <div className="mb-5 bg-beige/30 p-3.5 rounded-2xl border border-beige">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-coffee">
                    Cartones & Pagos ({bingoCards.length})
                  </span>
                  <span className="text-[10px] text-coffee-light">
                    {bingoCards.filter((c) => c.has_paid).length} habilitados
                  </span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
                  {bingoCards.length === 0 ? (
                    <p className="text-[11px] italic text-coffee-light py-2 text-center">
                      Ningún invitado ha elegido cartón aún.
                    </p>
                  ) : (
                    bingoCards.map((c) => {
                      const playerObj = players.find(
                        (p) => p.player_id === c.player_id
                      );
                      const cardDef = PREDEFINED_CARDS.find(
                        (cd) => cd.id === c.card_id
                      );

                      return (
                        <div
                          key={c.id}
                          className="bg-white p-2.5 rounded-xl border border-beige flex items-center justify-between gap-2 text-xs shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-coffee truncate">
                              👤 {playerObj ? playerObj.name : 'Invitado'}
                            </p>
                            <p className="text-[10px] text-coffee-light truncate">
                              {cardDef ? cardDef.name : `Cartón #${c.card_id}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggleCardPayment(c)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-all shrink-0 ${
                              c.has_paid
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse shadow-xs'
                            }`}
                          >
                            {c.has_paid ? '✓ Pagado' : '💳 Habilitar'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Cola de Reclamos de Casillas */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-coffee mb-2">
                  Reclamos de Casillas ({pendingClaims.length}):
                </p>
                <div className="space-y-2.5 max-h-56 overflow-y-auto no-scrollbar pr-1">
                  {pendingClaims.length === 0 ? (
                    <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-beige">
                      <p className="text-xs text-coffee-light italic">
                        No hay casillas marcadas pendientes de verificar.
                      </p>
                    </div>
                  ) : (
                    pendingClaims.map((claim) => (
                      <div
                        key={claim.id}
                        className="bg-beige/50 p-3 rounded-2xl border border-gold/50 shadow-xs flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-coffee text-xs truncate">
                            👤 {claim.player_name}
                          </p>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white text-coffee">
                            Cartón #{claim.card_id}
                          </span>
                        </div>
                        <p className="text-xs text-coffee bg-white/90 p-1.5 rounded-lg border border-beige font-semibold">
                          &ldquo;{claim.stamp_label}&rdquo;
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleRejectClaim(claim)}
                            className="py-2 px-2 rounded-xl font-bold uppercase text-[10px] bg-red-100 hover:bg-red-200 text-red-700 active:scale-95 transition-transform border border-red-200"
                          >
                            ✕ Rechazar
                          </button>
                          <button
                            onClick={() => handleApproveClaim(claim)}
                            className="py-2 px-2 rounded-xl font-bold uppercase text-[10px] bg-pistachio hover:bg-pistachio-dark text-white active:scale-95 transition-transform shadow-xs"
                          >
                            ✓ Aprobar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* SECCIÓN: MÓDULO TRIVIA DE EDELY (20 PREGUNTAS DE CORRIDO)         */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-[2rem] p-5 sm:p-7 shadow-md border-2 border-pistachio/30 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-beige">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-2xl shadow-xs">
                🎯
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-serif font-bold text-coffee">
                    Módulo Trivia de Edely
                  </h2>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      partyState.quiz_active
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-300'
                        : 'bg-beige text-coffee-light'
                    }`}
                  >
                    {partyState.quiz_active
                      ? '🟢 TRIVIA EN VIVO (Invitados Jugando)'
                      : '⏸ EN PAUSA / SALA DE ESPERA'}
                  </span>
                </div>
                <p className="text-xs text-coffee-light">
                  Inicia la trivia para todos con 1 solo botón. Los invitados juegan 20 preguntas aleatorias de corrido.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Botón Maestro de Inicio / Pausa */}
              {!partyState.quiz_active ? (
                <button
                  onClick={handleStartTrivia}
                  className="px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider bg-pistachio hover:bg-pistachio-dark text-white shadow-md active:scale-95 transition-transform flex items-center gap-2"
                >
                  <span>🚀</span>
                  <span>Iniciar Trivia para Todos</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseTrivia}
                  className="px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 transition-transform flex items-center gap-2"
                >
                  <span>⏹</span>
                  <span>Pausar Trivia</span>
                </button>
              )}

              <button
                onClick={() => setShowQuizLeaderboard(!showQuizLeaderboard)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gold hover:bg-gold/90 text-white shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <span>🏆</span>
                <span>{showQuizLeaderboard ? 'Ver Progreso' : 'Podio en Vivo'}</span>
              </button>

              <button
                onClick={handleResetQuizAnswers}
                className="px-3 py-2.5 rounded-xl text-xs font-bold bg-beige hover:bg-rose-100 hover:text-rose-700 text-coffee-light shadow-2xs transition-colors active:scale-95 flex items-center gap-1"
                title="Borrar respuestas registradas"
              >
                <span>🗑️</span>
                <span className="hidden sm:inline">Reiniciar</span>
              </button>
            </div>
          </div>

          {showQuizLeaderboard ? (
            /* Leaderboard View */
            <div className="bg-beige/20 rounded-2xl p-5 border border-beige animate-fade-scale">
              <div className="text-center mb-5">
                <span className="text-4xl block mb-1">🏆</span>
                <h3 className="text-lg font-serif font-bold text-coffee">
                  Tabla de Posiciones Trivia (En Vivo)
                </h3>
                <p className="text-xs text-coffee-light">
                  Puntaje acumulado por respuestas correctas + velocidad.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {adminQuizLeaderboard.length === 0 ? (
                  <p className="col-span-full text-center text-xs italic text-coffee-light py-6">
                    Aún no hay respuestas registradas en la trivia.
                  </p>
                ) : (
                  adminQuizLeaderboard.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        idx === 0
                          ? 'bg-gold/20 border-gold shadow-xs'
                          : idx === 1
                          ? 'bg-slate-100 border-slate-300'
                          : idx === 2
                          ? 'bg-amber-100/60 border-amber-300'
                          : 'bg-white border-beige'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs bg-white shadow-2xs">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`}
                        </span>
                        <div>
                          <p className="font-bold text-xs text-coffee">{item.name}</p>
                          <p className="text-[10px] text-coffee-light">
                            {item.correctCount} aciertos · {item.answeredCount}/20 respondidas
                          </p>
                        </div>
                      </div>
                      <span className="font-black font-serif text-sm text-coffee">
                        {item.score} <span className="text-[10px] font-sans font-bold">pts</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Live Guest Progress Monitor */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-coffee flex items-center gap-1.5">
                  <span>👥</span> Progreso de los Invitados en Tiempo Real
                </span>
                <span className="text-xs text-coffee-light">
                  {players.filter((p) => (adminPlayerQuizProgress.find((ap) => ap.player_id === p.player_id)?.answeredCount || 0) === 20).length} de {players.length} han finalizado
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {adminPlayerQuizProgress.length === 0 ? (
                  <p className="col-span-full text-center text-xs italic text-coffee-light py-8 bg-beige/20 rounded-2xl border border-dashed border-beige">
                    No hay invitados registrados todavía.
                  </p>
                ) : (
                  adminPlayerQuizProgress.map((p, idx) => {
                    const pct = Math.round((p.answeredCount / 20) * 100);
                    const isDone = p.answeredCount === 20;

                    return (
                      <div
                        key={p.player_id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isDone
                            ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                            : p.answeredCount > 0
                            ? 'bg-white border-beige shadow-xs'
                            : 'bg-beige/30 border-beige/60 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-black text-xs text-coffee">
                              {idx === 0 && p.score > 0 ? '🥇' : idx === 1 && p.score > 0 ? '🥈' : idx === 2 && p.score > 0 ? '🥉' : `${idx + 1}°`}
                            </span>
                            <p className="font-bold text-xs text-coffee truncate">
                              {p.name}
                            </p>
                          </div>
                          <span className="font-serif font-black text-xs text-coffee shrink-0">
                            {p.score} <span className="text-[9px] font-sans font-bold text-coffee-light">pts</span>
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-beige h-2 rounded-full overflow-hidden mb-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isDone ? 'bg-emerald-500' : 'bg-pistachio'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-coffee-light">
                          <span>
                            {isDone ? '🎉 ¡Finalizado!' : `${p.answeredCount} / 20 preguntas`}
                          </span>
                          <span className="font-bold text-coffee">
                            {p.correctCount} aciertos
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* SEGUNDA FILA: GESTIÓN DE HISTORIAS & JUGADORES (DUOS MÁX 2)      */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* ─── Tarjeta: Historias Secretas y Votaciones en Vivo ─── */}
          <div className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-md border border-beige">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📖</span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gold">
                  Historias Secretas ({stories.length})
                </h3>
              </div>
              {stories.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevStory}
                    className="p-1.5 rounded-lg bg-beige hover:bg-white text-coffee text-xs font-bold shadow-xs active:scale-95"
                    title="Historia anterior"
                  >
                    ◀️
                  </button>
                  <span className="text-[11px] font-bold px-2 py-1 bg-beige-lighter rounded-md text-coffee">
                    {activeStoryIndex >= 0
                      ? `${activeStoryIndex + 1} / ${stories.length}`
                      : `0 / ${stories.length}`}
                  </span>
                  <button
                    onClick={handleNextStory}
                    className="p-1.5 rounded-lg bg-beige hover:bg-white text-coffee text-xs font-bold shadow-xs active:scale-95"
                    title="Siguiente historia"
                  >
                    ▶️
                  </button>
                </div>
              )}
            </div>

            {/* Historia Activa y Votos en Vivo */}
            {activeStory && (
              <div className="bg-gold/10 p-4 rounded-2xl border-2 border-gold/40 mb-4 animate-fade-scale">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-gold text-white px-2.5 py-0.5 rounded-full">
                    Mostrando en Vivo
                  </span>
                  <span className="text-xs font-bold text-coffee">
                    De: {players.find((p) => p.player_id === activeStory.player_id)?.name || 'Autor Secreto'}
                  </span>
                </div>

                <p className="text-sm font-serif italic text-coffee my-2 leading-relaxed bg-white/80 p-3 rounded-xl border border-gold/30">
                  &ldquo;{activeStory.content}&rdquo;
                </p>

                {/* Votaciones en vivo */}
                <div className="mt-3 pt-2 border-t border-gold/20">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-coffee">
                      Votos recibidos ({activeVotes.length}):
                    </span>
                    <span className="text-[11px] text-coffee-light">
                      {activeStory.author_revealed ? '🎉 Autor Revelado' : '⏳ Votación Abierta'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {players.map((p) => {
                      const count = activeVotes.filter(
                        (v) => v.voted_for_player_id === p.player_id
                      ).length;
                      if (count === 0) return null;
                      return (
                        <span
                          key={p.player_id}
                          className="bg-white text-coffee text-[10px] font-bold px-2 py-0.5 rounded-lg border border-gold/30 shadow-2xs"
                        >
                          {p.name}: {count}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Botón de Revelación */}
                <div className="mt-4 flex gap-2">
                  {!activeStory.author_revealed ? (
                    <button
                      onClick={() => handleRevealStoryAuthor(activeStory)}
                      className="w-full py-2.5 rounded-xl font-black uppercase text-xs tracking-wider bg-gold hover:bg-gold/90 text-white shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                    >
                      <span>🎉</span> Revelar Autor Real a Todos
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl text-center font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Autor ya revelado en pantallas
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Listado de todas las historias recibidas */}
            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
              {stories.length === 0 ? (
                <p className="text-center text-xs italic text-coffee-light py-8">
                  Aún no se han enviado anécdotas secretas.
                </p>
              ) : (
                stories.map((story, i) => {
                  const author = players.find(
                    (p) => p.player_id === story.player_id
                  );
                  const isCurrent = story.id === activeStory?.id;

                  return (
                    <div
                      key={story.id}
                      className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-gold/15 border-gold shadow-xs'
                          : 'bg-beige/30 border-beige hover:border-gold/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-coffee text-xs flex items-center gap-1.5 truncate">
                          <span>#{i + 1}</span>
                          <span className="text-coffee-light font-normal truncate">
                            (De: <strong className="text-coffee">{author ? author.name : 'Desconocido'}</strong>)
                          </span>
                        </p>
                        <p className="text-coffee-light italic line-clamp-1 mt-0.5">
                          &ldquo;{story.content}&rdquo;
                        </p>
                      </div>

                      <button
                        onClick={() => handlePresentStory(story)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase active:scale-95 transition-all shrink-0 ${
                          isCurrent
                            ? 'bg-gold text-white font-black shadow-xs'
                            : 'bg-beige text-coffee hover:bg-gold hover:text-white'
                        }`}
                      >
                        {isCurrent ? 'Mostrando' : 'Presentar'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ─── Tarjeta: Jugadores y Asignación de Parejas (Dúos Máx 2) ─── */}
          <div className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-md border border-beige">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">👥</span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-coffee">
                  Invitados ({players.length})
                </h3>
              </div>
              <button
                onClick={handleReshuffleGroups}
                className="text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl bg-beige hover:bg-gold hover:text-white text-coffee transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
              >
                <span>🎲</span> Sortear Parejas (Máx. 2)
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar pr-1">
              {players.length === 0 ? (
                <p className="text-center text-xs italic text-coffee-light py-8">
                  Aún no se han registrado invitados.
                </p>
              ) : (
                players.map((p) => {
                  const card = bingoCards.find((c) => c.player_id === p.player_id);

                  return (
                    <div
                      key={p.player_id}
                      className="bg-beige-lighter p-3 rounded-xl border border-beige flex items-center justify-between gap-3 text-xs hover:border-pistachio/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-coffee truncate text-sm">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-coffee-light truncate">
                          🐾 {p.group_name || 'Sin grupo'} · 🤝 Pareja:{' '}
                          <strong className="text-coffee">{p.partner || 'Esperando...'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Kahoot Paid toggle */}
                        <button
                          onClick={() =>
                            handleToggleQuizPayment(p.player_id, p.paid_quiz)
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-all ${
                            p.paid_quiz
                              ? 'bg-pistachio text-white shadow-xs'
                              : 'bg-red-100 text-red-600'
                          }`}
                          title="Estado de pago Kahoot Quiz"
                        >
                          Quiz {p.paid_quiz ? '✓' : '✕'}
                        </button>

                        {/* Bingo card paid indicator / toggle */}
                        {card ? (
                          <button
                            onClick={() => handleToggleCardPayment(card)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase active:scale-95 transition-all shadow-xs ${
                              card.has_paid
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                            title="Estado de pago de cartón de Bingo"
                          >
                            Bingo {card.has_paid ? '✓' : '💳'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-coffee-light/60 px-2 py-1 bg-beige/50 rounded-lg">
                            Sin cartón
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
