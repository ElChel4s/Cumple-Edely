'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '../ui/Toast';
import { QUIZ_QUESTIONS, type QuizQuestion } from '@/lib/quizQuestions';
import type { Player, PartyState, QuizAnswer } from '@/types/database';

interface QuizViewProps {
  player: Player;
  partyState: PartyState;
}

const OPTION_COLORS = [
  'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700',
  'bg-sky-600 hover:bg-sky-700 text-white border-sky-700',
  'bg-amber-500 hover:bg-amber-600 text-white border-amber-600',
  'bg-rose-600 hover:bg-rose-700 text-white border-rose-700',
];

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function QuizView({ player, partyState }: QuizViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allQuizAnswers, setAllQuizAnswers] = useState<QuizAnswer[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // ─── Generar orden aleatorio de preguntas (persistido por sesión de jugador) ───
  const shuffledQuestions = useMemo<QuizQuestion[]>(() => {
    const storageKey = `edely_shuffled_quiz_order_${player.player_id}`;
    const savedOrder = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

    if (savedOrder) {
      try {
        const ids: number[] = JSON.parse(savedOrder);
        const mapped = ids
          .map((id) => QUIZ_QUESTIONS.find((q) => q.id === id))
          .filter(Boolean) as QuizQuestion[];
        if (mapped.length === QUIZ_QUESTIONS.length) {
          return mapped;
        }
      } catch (e) {
        console.error('Failed to parse saved quiz order:', e);
      }
    }

    const randomized = shuffleArray(QUIZ_QUESTIONS);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(randomized.map((q) => q.id)));
    }
    return randomized;
  }, [player.player_id]);

  // ─── Fetch All Quiz Answers from Supabase ───
  const fetchAllAnswers = async () => {
    const { data } = await supabase
      .from('quiz_answers')
      .select('*')
      .order('answered_at', { ascending: true });

    if (data) {
      setAllQuizAnswers(data as QuizAnswer[]);
    }
  };

  useEffect(() => {
    fetchAllAnswers();

    // Subscribe to realtime quiz answers
    const channel = supabase
      .channel('quiz_answers_live_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_answers' },
        () => {
          fetchAllAnswers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Detectar preguntas ya respondidas por el jugador ───
  const myAnswers = useMemo(() => {
    return allQuizAnswers.filter((a) => a.player_id === player.player_id);
  }, [allQuizAnswers, player.player_id]);

  // Sincronizar índice inicial al cargar respuestas previas
  useEffect(() => {
    if (myAnswers.length > 0) {
      // Encontrar la primera pregunta no respondida en el orden aleatorio
      const firstUnansweredIdx = shuffledQuestions.findIndex(
        (q) => !myAnswers.some((ans) => ans.question_id === q.id)
      );

      if (firstUnansweredIdx !== -1) {
        setCurrentIndex(firstUnansweredIdx);
      } else {
        // Ya respondió todas las 20 preguntas
        setCurrentIndex(shuffledQuestions.length);
      }
    }
  }, [myAnswers, shuffledQuestions]);

  const isTriviaActive = !!partyState.quiz_active;
  const currentQuestion: QuizQuestion | undefined = shuffledQuestions[currentIndex];
  const isFinished = currentIndex >= shuffledQuestions.length;

  // Respuestas del jugador para la pregunta actual (si ya respondió)
  const currentQMyAnswer = currentQuestion
    ? myAnswers.find((a) => a.question_id === currentQuestion.id)
    : undefined;

  // ─── Handle Submitting Answer ───
  const handleAnswer = async (index: number) => {
    if (!currentQuestion || selectedAnswerIndex !== null || isSubmitting || currentQMyAnswer) return;

    if (!player.paid_quiz) {
      showToast('Pide a Edely habilitar tu acceso a la Trivia en el panel.', 'error');
      return;
    }

    setIsSubmitting(true);
    setSelectedAnswerIndex(index);

    const letter = OPTION_LETTERS[index];
    const timestamp = Date.now();

    const { error } = await supabase.from('quiz_answers').insert({
      player_id: player.player_id,
      player_name: player.name,
      question_id: currentQuestion.id,
      answer: letter,
      answered_at: timestamp,
    });

    if (error) {
      console.error('Failed to submit quiz answer:', error);
      showToast('Error al registrar respuesta.', 'error');
      setSelectedAnswerIndex(null);
    } else {
      const isCorrect = index === currentQuestion.correctIndex;
      if (isCorrect) {
        showToast('🎯 ¡Respuesta Correcta!', 'success');
      } else {
        showToast('❌ ¡Respuesta Incorrecta!', 'error');
      }
      await fetchAllAnswers();
    }
    setIsSubmitting(false);
  };

  // Avanzar a la siguiente pregunta de corrido
  const handleNextQuestion = () => {
    setSelectedAnswerIndex(null);
    setCurrentIndex((prev) => prev + 1);
  };

  // ─── Calcular Leaderboard General ───
  const leaderboardScores = useMemo(() => {
    const scoresMap: Record<string, { name: string; score: number; correctCount: number; answeredCount: number }> = {};

    // Asegurar que el jugador actual exista en la tabla
    if (player && !scoresMap[player.player_id]) {
      scoresMap[player.player_id] = {
        name: player.name,
        score: 0,
        correctCount: 0,
        answeredCount: 0,
      };
    }

    allQuizAnswers.forEach((ans) => {
      if (!scoresMap[ans.player_id]) {
        scoresMap[ans.player_id] = {
          name: ans.player_name,
          score: 0,
          correctCount: 0,
          answeredCount: 0,
        };
      }
      scoresMap[ans.player_id].answeredCount += 1;
    });

    // Puntos de rapidez por cada pregunta
    for (const q of QUIZ_QUESTIONS) {
      const correctLetter = OPTION_LETTERS[q.correctIndex];
      const qAnswers = allQuizAnswers
        .filter((a) => a.question_id === q.id && a.answer === correctLetter)
        .sort((a, b) => a.answered_at - b.answered_at);

      qAnswers.forEach((ans, rankIdx) => {
        if (!scoresMap[ans.player_id]) {
          scoresMap[ans.player_id] = {
            name: ans.player_name,
            score: 0,
            correctCount: 0,
            answeredCount: 0,
          };
        }
        const points = Math.max(1000 - rankIdx * 100, 500);
        scoresMap[ans.player_id].score += points;
        scoresMap[ans.player_id].correctCount += 1;
      });
    }

    return Object.values(scoresMap).sort((a, b) => b.score - a.score);
  }, [allQuizAnswers, player]);

  // Estadísticas del jugador actual
  const myLeaderboardEntry = leaderboardScores.find((entry) => entry.name === player.name);
  const myTotalScore = myLeaderboardEntry?.score || 0;
  const myCorrectCount = myLeaderboardEntry?.correctCount || 0;
  const myRankIndex = leaderboardScores.findIndex((entry) => entry.name === player.name);

  // Speed rank para la pregunta actual si acertó
  const currentQSpeedRank = useMemo(() => {
    if (!currentQuestion) return null;
    const correctLetter = OPTION_LETTERS[currentQuestion.correctIndex];
    const correctAnswers = allQuizAnswers
      .filter((a) => a.question_id === currentQuestion.id && a.answer === correctLetter)
      .sort((a, b) => a.answered_at - b.answered_at);

    const rankIdx = correctAnswers.findIndex((a) => a.player_id === player.player_id);
    return rankIdx !== -1 ? rankIdx + 1 : null;
  }, [currentQuestion, allQuizAnswers, player.player_id]);

  return (
    <div className="animate-fade-in w-full pb-12 text-coffee">
      {/* ─── Header & Leaderboard Toggle ─── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-coffee-light">
            Trivia de Edely 🎯
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-coffee">
            {!isTriviaActive && myAnswers.length === 0
              ? 'Trivia de la Cumpleañera'
              : isFinished
              ? '¡Trivia Finalizada!'
              : `Pregunta #${currentIndex + 1} de 20`}
          </h2>
        </div>

        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="px-3 py-1.5 rounded-xl bg-gold hover:bg-gold/90 text-white font-bold text-xs shadow-xs active:scale-95 transition-transform flex items-center gap-1.5"
        >
          <span>🏆</span>
          <span>{showLeaderboard ? 'Ver Trivia' : 'Posiciones'}</span>
        </button>
      </div>

      {/* ─── VISTA 1: TABLA DE POSICIONES (LEADERBOARD) ─── */}
      {showLeaderboard ? (
        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-beige animate-fade-scale text-left">
          <div className="text-center mb-6">
            <span className="text-4xl block mb-1">🏆</span>
            <h3 className="text-xl font-serif font-bold text-coffee">
              Tabla de Posiciones en Vivo
            </h3>
            <p className="text-xs text-coffee-light">
              Puntos calculados por respuestas correctas y velocidad en tiempo real.
            </p>
          </div>

          <div className="space-y-2.5">
            {leaderboardScores.length === 0 ? (
              <p className="text-center text-xs italic text-coffee-light py-8">
                Aún no hay respuestas registradas.
              </p>
            ) : (
              leaderboardScores.map((item, idx) => {
                const isMe = item.name === player.name;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      isMe
                        ? 'bg-pistachio/20 border-pistachio-dark font-bold text-coffee ring-2 ring-pistachio/50 shadow-sm'
                        : idx === 0
                        ? 'bg-gold/20 border-gold font-bold text-coffee shadow-sm'
                        : idx === 1
                        ? 'bg-slate-100 border-slate-300 text-coffee'
                        : idx === 2
                        ? 'bg-amber-100/60 border-amber-300 text-coffee'
                        : 'bg-beige-lighter border-beige text-coffee'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs bg-white shadow-2xs">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}°`}
                      </span>
                      <div>
                        <p className="font-bold text-sm text-coffee flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {isMe && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-pistachio text-white font-black">
                              Tú
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-coffee-light">
                          {item.correctCount} aciertos · {item.answeredCount}/20 respondidas
                        </p>
                      </div>
                    </div>
                    <span className="font-black font-serif text-base text-coffee">
                      {item.score} <span className="text-[10px] font-sans font-bold">pts</span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : !isTriviaActive && myAnswers.length === 0 ? (
        /* ─── VISTA 2: ESPERANDO A QUE EL ADMIN INICIE LA TRIVIA ─── */
        <div className="bg-white rounded-[2.5rem] p-7 shadow-xl border-2 border-pistachio/30 text-center animate-fade-scale">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-4xl mb-4 shadow-xs animate-pulse">
            ⏳
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-pistachio/20 text-pistachio-dark mb-3 inline-block">
            Sala de Espera Trivia
          </span>
          <h3 className="text-2xl font-serif font-bold text-coffee mb-2">
            Esperando a que Edely inicie la Trivia...
          </h3>
          <p className="text-xs sm:text-sm text-coffee-light leading-relaxed mb-6">
            Edely activará la trivia desde el panel de control. En cuanto la inicie, comenzarán tus <strong>20 preguntas de corrido</strong> y en <strong>orden aleatorio</strong>.
          </p>

          <div className="bg-beige/40 rounded-2xl p-4 border border-beige text-left space-y-2 mb-6">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-coffee">
              <span>⚡</span>
              <span><strong>1,000 puntos</strong> para el más rápido en acertar</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-coffee">
              <span>🎲</span>
              <span>20 preguntas aleatorias de corrido</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-coffee">
              <span>🏆</span>
              <span>Podio en tiempo real con todos los invitados</span>
            </div>
          </div>

          {!player.paid_quiz && (
            <div className="bg-amber-100 border border-amber-300 text-amber-900 rounded-2xl p-3 text-center text-xs font-bold mb-4">
              🔒 Pide a Edely habilitar tu acceso a la Trivia en el panel.
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-pistachio/10 border border-pistachio/30 text-xs font-bold text-pistachio-dark flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pistachio animate-ping" />
            <span>Conectado en vivo · Esperando señal del Mando Maestro...</span>
          </div>
        </div>
      ) : isFinished ? (
        /* ─── VISTA 3: TRIVIA COMPLETADA (RESUMEN & PODIO) ─── */
        <div className="bg-white rounded-[2.5rem] p-7 shadow-xl border-2 border-gold/40 text-center animate-fade-scale">
          <span className="text-5xl block mb-2">🎉</span>
          <h3 className="text-2xl font-serif font-bold text-coffee mb-1">
            ¡Trivia Completada!
          </h3>
          <p className="text-xs text-coffee-light mb-6">
            Has respondido las 20 preguntas sobre Edely a toda velocidad.
          </p>

          {/* Tarjeta de Resumen Personal */}
          <div className="bg-gold/15 rounded-2xl p-5 border border-gold/40 mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-gold block mb-1">
              Tu Resultado Final
            </span>
            <p className="text-4xl font-serif font-black text-coffee mb-1">
              {myTotalScore} <span className="text-base font-sans font-bold text-coffee-light">pts</span>
            </p>
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-coffee-light mt-2 pt-2 border-t border-gold/20">
              <span>🎯 {myCorrectCount} de 20 aciertos</span>
              <span>·</span>
              <span>
                🏆 Posición:{' '}
                <strong className="text-coffee font-black">
                  {myRankIndex !== -1 ? `${myRankIndex + 1}° Lugar` : '—'}
                </strong>
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowLeaderboard(true)}
            className="w-full py-3.5 rounded-2xl font-bold uppercase text-xs tracking-wider bg-gold hover:bg-gold/90 text-white shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <span>🏆</span>
            <span>Ver Tabla de Posiciones Completa</span>
          </button>
        </div>
      ) : currentQuestion ? (
        /* ─── VISTA 4: PREGUNTAS DE CORRIDO (JUGANDO) ─── */
        <div className="space-y-4 animate-fade-scale">
          {/* Barra de Progreso y Puntaje */}
          <div className="bg-white rounded-2xl p-3 border border-beige shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-pistachio-dark">
                Pregunta {currentIndex + 1} de {shuffledQuestions.length}
              </span>
              <span className="text-coffee font-serif font-black">
                ⭐ {myTotalScore} pts
              </span>
            </div>
            <div className="w-full bg-beige/50 h-2 rounded-full overflow-hidden">
              <div
                className="bg-pistachio h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / shuffledQuestions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Tarjeta de la Pregunta */}
          <div className="bg-white rounded-[2rem] p-6 shadow-lg border-2 border-pistachio/40 text-center relative overflow-hidden">
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-pistachio/20 text-pistachio-dark mb-3 inline-block">
              Pregunta #{currentIndex + 1} de 20
            </span>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-coffee leading-snug">
              {currentQuestion.question}
            </h3>
          </div>

          {/* 4 Opciones de Respuesta con su TEXTO COMPLETO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map((optionText, idx) => {
              const letter = OPTION_LETTERS[idx];
              const isSelected =
                selectedAnswerIndex === idx ||
                (currentQMyAnswer && currentQMyAnswer.answer === letter);
              const isCorrect = idx === currentQuestion.correctIndex;
              const hasAnswered = selectedAnswerIndex !== null || !!currentQMyAnswer;

              // Estilo visual del botón
              let btnStyle = OPTION_COLORS[idx];
              if (hasAnswered) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-600 text-white ring-4 ring-emerald-300 shadow-lg scale-[1.02]';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-rose-600 text-white opacity-80';
                } else {
                  btnStyle = 'bg-gray-100 text-gray-400 border-gray-200 opacity-40';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={hasAnswered || !player.paid_quiz || isSubmitting}
                  className={`p-4 rounded-2xl text-left border-2 transition-all flex items-center gap-3.5 shadow-md active:scale-95 relative overflow-hidden ${btnStyle}`}
                >
                  <span className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-serif font-black text-lg shrink-0 shadow-2xs">
                    {letter}
                  </span>
                  <span className="font-semibold text-sm sm:text-base leading-tight flex-1">
                    {optionText}
                  </span>
                  {hasAnswered && isCorrect && (
                    <span className="text-xl shrink-0">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ─── Feedback Inmediato y Botón "Siguiente" de Corrido ─── */}
          {(selectedAnswerIndex !== null || currentQMyAnswer) && (
            <div className="bg-white rounded-2xl p-5 border border-beige shadow-md text-center animate-slide-up space-y-4">
              {(selectedAnswerIndex === currentQuestion.correctIndex ||
                (currentQMyAnswer &&
                  currentQMyAnswer.answer === OPTION_LETTERS[currentQuestion.correctIndex])) ? (
                <div>
                  <span className="text-4xl block mb-1">🎯</span>
                  <h4 className="text-lg font-serif font-bold text-emerald-700">
                    ¡RESPUESTA CORRECTA!
                  </h4>
                  {currentQSpeedRank && (
                    <p className="text-xs font-bold text-coffee mt-1">
                      ⚡ Fuiste el <strong>{currentQSpeedRank}°</strong> en responder correctamente (+{Math.max(1000 - (currentQSpeedRank - 1) * 100, 500)} pts)
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <span className="text-4xl block mb-1">❌</span>
                  <h4 className="text-lg font-serif font-bold text-rose-700">
                    ¡RESPUESTA INCORRECTA!
                  </h4>
                  <p className="text-xs text-coffee-light mt-1">
                    La respuesta correcta era:{' '}
                    <strong className="text-coffee font-serif text-sm block mt-0.5">
                      {currentQuestion.options[currentQuestion.correctIndex]}
                    </strong>
                  </p>
                </div>
              )}

              {/* Botón para avanzar a la siguiente pregunta de corrido */}
              <button
                onClick={handleNextQuestion}
                className="w-full py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider bg-pistachio hover:bg-pistachio-dark text-white shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <span>{currentIndex + 1 < shuffledQuestions.length ? 'Siguiente Pregunta' : 'Ver Resultados Finales'}</span>
                <span>➔</span>
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
