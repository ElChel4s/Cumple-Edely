'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '../ui/Toast';
import type { Player, Wish } from '@/types/database';

interface WishesViewProps {
  player: Player;
}

const POST_IT_COLORS = ['#fdfd96', '#ffb7b2', '#e2f0cb', '#c7ceea', '#ffdac1', '#b5ead7'];
const POLAROID_EMOJIS = ['📸', '☕', '🌿', '🎂', '✨', '💐', '🎵', '🌻'];

export function WishesView({ player }: WishesViewProps) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [newWish, setNewWish] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchWishes = async () => {
      const { data, error } = await supabase
        .from('wishes')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setWishes(data as Wish[]);
      }
      setIsLoading(false);
    };

    fetchWishes();

    const channel = supabase
      .channel('wishes_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wishes' },
        (payload) => {
          setWishes((prev) => [...prev, payload.new as Wish]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAdd = async () => {
    const trimmed = newWish.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    const isPolaroid = Math.random() > 0.5;

    const wishData = {
      player_id: player.player_id,
      type: isPolaroid ? 'polaroid' : 'post-it',
      text: trimmed,
      author: player.name,
      color_or_emoji: isPolaroid
        ? POLAROID_EMOJIS[Math.floor(Math.random() * POLAROID_EMOJIS.length)]
        : POST_IT_COLORS[Math.floor(Math.random() * POST_IT_COLORS.length)],
      rotation: Math.floor(Math.random() * 16) - 8,
    };

    const { error } = await supabase.from('wishes').insert(wishData);

    if (error) {
      console.error('Failed to add wish:', error);
      showToast('Error al publicar deseo.', 'error');
    } else {
      showToast('¡Deseo publicado! ✨', 'success');
      setNewWish('');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="animate-fade-in w-full">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-serif mb-2 text-coffee">Muro de Deseos</h2>
        <p className="text-sm px-6 text-coffee-light">Un pequeño desastre lleno de amor. Deja tu huella.</p>
      </div>

      <div className="flex gap-2 mb-6 relative z-50 px-1">
        <input
          type="text"
          placeholder="Escribe un deseo cortito..."
          className="flex-1 bg-white/90 backdrop-blur-sm rounded-full px-5 py-3 text-sm shadow-md border border-beige outline-none focus:ring-2 focus:ring-pistachio transition-all font-serif"
          value={newWish}
          onChange={(e) => setNewWish(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          disabled={isSubmitting}
        />
        <button
          onClick={handleAdd}
          disabled={isSubmitting || !newWish.trim()}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-md shrink-0 bg-coffee text-beige-lighter hover:bg-pistachio-dark transition-colors text-xl disabled:opacity-50 active:scale-90"
        >
          {isSubmitting ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : '📌'}
        </button>
      </div>

      {isLoading ? (
        <div className="wish-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton w-full aspect-[0.9] rounded-lg" />
          ))}
        </div>
      ) : wishes.length === 0 ? (
        <div className="text-center py-12 opacity-60">
          <span className="text-4xl block mb-2">🌱</span>
          <p className="text-sm text-coffee-light">Sé el primero en dejar un deseo.</p>
        </div>
      ) : (
        <div className="wish-grid">
          {wishes.map((wish, i) => {
            const randomOffset = i % 2 === 0 ? 'mt-3' : 'mt-0';

            if (wish.type === 'polaroid') {
              return (
                <div
                  key={wish.id}
                  className={`polaroid-card animate-fade-scale cursor-pointer ${randomOffset}`}
                  style={{ transform: `rotate(${wish.rotation}deg)`, animationDelay: `${(i % 6) * 80}ms` }}
                >
                  <div className="tape" />
                  <div className="polaroid-img text-4xl sm:text-5xl">{wish.color_or_emoji}</div>
                  <p className="handwriting text-center text-gray-800 leading-tight">{wish.text}</p>
                  <p className="handwriting-small text-right text-gray-500 mt-2">- {wish.author}</p>
                </div>
              );
            } else {
              return (
                <div
                  key={wish.id}
                  className={`post-it animate-fade-scale cursor-pointer ${randomOffset}`}
                  style={{ backgroundColor: wish.color_or_emoji, transform: `rotate(${wish.rotation}deg)`, animationDelay: `${(i % 6) * 80}ms` }}
                >
                  <div className="pin" />
                  <p className="handwriting text-center text-gray-800 leading-tight mt-2">{wish.text}</p>
                  <p className="handwriting-small text-right w-full text-gray-600 mt-auto pt-2">- {wish.author}</p>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
