// ─── Party Phase Machine ───
export type PartyPhase =
  | 'REGISTER'
  | 'ESPERA'
  | 'ICEBREAKER'
  | 'QUIZ'
  | 'STOP'
  | 'STORIES'
  | 'WISHES';

// ─── party_state (single row) ───
export interface PartyState {
  id: string;
  current_phase: PartyPhase;
  roulette_letter: string;
  stop_active: boolean;
  timer_seconds: number;
  timer_started_at: string | null; // ISO timestamp
  quiz_question_id: number | null;
  quiz_active?: boolean;
  active_story_id?: string | null;
  story_author_revealed?: boolean;
}

// ─── players ───
export interface Player {
  player_id: string;
  name: string;
  group_name: string;
  partner: string;
  paid_quiz: boolean;
  created_at: string;
}

// ─── bingo_cards ───
export interface BingoCard {
  id: string;
  player_id: string;
  card_id: number;
  has_paid: boolean;
  stamped_items: number[]; // indices of approved stamps
  created_at: string;
}

// ─── bingo_claims ───
export interface BingoClaim {
  id: string;
  player_id: string;
  player_name: string;
  card_id: number;
  stamp_index: number;
  stamp_label: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

// ─── stories ───
export interface Story {
  id: string;
  player_id: string;
  author_name?: string;
  content: string;
  revealed: boolean;
  author_revealed?: boolean;
  created_at: string;
}

// ─── story_votes ───
export interface StoryVote {
  id: string;
  story_id: string;
  voter_player_id: string;
  voter_name: string;
  voted_for_player_id: string;
  voted_for_name: string;
  created_at: string;
}

// ─── wishes ───
export interface Wish {
  id: string;
  player_id: string;
  type: 'post-it' | 'polaroid';
  text: string;
  author: string;
  color_or_emoji: string;
  rotation: number;
  created_at: string;
}

// ─── stop_answers ───
export interface StopAnswer {
  id: string;
  player_id: string;
  player_name: string;
  round_letter: string;
  answers: Record<string, string>; // category -> answer
  created_at: string;
}

// ─── quiz_answers ───
export interface QuizAnswer {
  id: string;
  player_id: string;
  player_name: string;
  question_id: number;
  answer: string; // 'A' | 'B' | 'C' | 'D'
  answered_at: number; // Unix timestamp ms
  created_at: string;
}
