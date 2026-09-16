-- ============================================================
-- Edely Birthday Party — Supabase Schema (Idempotente & Seguro)
-- Pega este script completo en el SQL Editor de Supabase.
-- Puedes ejecutarlo cuantas veces quieras sin errores.
-- ============================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. party_state ───
CREATE TABLE IF NOT EXISTS party_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_phase TEXT NOT NULL DEFAULT 'REGISTER',
  roulette_letter TEXT NOT NULL DEFAULT '',
  stop_active BOOLEAN NOT NULL DEFAULT FALSE,
  timer_seconds INTEGER NOT NULL DEFAULT 300,
  timer_started_at TIMESTAMPTZ DEFAULT NULL,
  quiz_question_id INTEGER DEFAULT NULL,
  quiz_active BOOLEAN NOT NULL DEFAULT FALSE,
  active_story_id UUID DEFAULT NULL,
  story_author_revealed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE party_state ADD COLUMN IF NOT EXISTS quiz_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE party_state ADD COLUMN IF NOT EXISTS active_story_id UUID DEFAULT NULL;
ALTER TABLE party_state ADD COLUMN IF NOT EXISTS story_author_revealed BOOLEAN NOT NULL DEFAULT FALSE;

-- Insertar fila inicial si no existe
INSERT INTO party_state (current_phase)
SELECT 'REGISTER'
WHERE NOT EXISTS (SELECT 1 FROM party_state);

-- ─── 2. players ───
CREATE TABLE IF NOT EXISTS players (
  player_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT '',
  partner TEXT NOT NULL DEFAULT '',
  paid_quiz BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. bingo_cards ───
CREATE TABLE IF NOT EXISTS bingo_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  has_paid BOOLEAN NOT NULL DEFAULT FALSE,
  stamped_items INTEGER[] NOT NULL DEFAULT ARRAY[4]::INTEGER[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id)
);

-- ─── 4. bingo_claims ───
CREATE TABLE IF NOT EXISTS bingo_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  player_name TEXT NOT NULL DEFAULT '',
  card_id INTEGER NOT NULL,
  stamp_index INTEGER NOT NULL,
  stamp_label TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. stories ───
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  revealed BOOLEAN NOT NULL DEFAULT FALSE,
  author_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stories ADD COLUMN IF NOT EXISTS author_revealed BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 6. story_votes ───
CREATE TABLE IF NOT EXISTS story_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  voter_player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  voter_name TEXT NOT NULL DEFAULT '',
  voted_for_player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  voted_for_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(story_id, voter_player_id)
);

-- ─── 7. wishes ───
CREATE TABLE IF NOT EXISTS wishes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'post-it',
  text TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  color_or_emoji TEXT NOT NULL DEFAULT '#fdfd96',
  rotation INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 8. stop_answers ───
CREATE TABLE IF NOT EXISTS stop_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  player_name TEXT NOT NULL DEFAULT '',
  round_letter TEXT NOT NULL DEFAULT '',
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 9. quiz_answers ───
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  player_name TEXT NOT NULL DEFAULT '',
  question_id INTEGER,
  answer TEXT NOT NULL DEFAULT '',
  answered_at BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. Habilitar Realtime de forma segura (sin errores 42710)
-- ============================================================
DO $$
DECLARE
  tab_record RECORD;
BEGIN
  FOR tab_record IN 
    SELECT tablename FROM (VALUES 
      ('party_state'),
      ('players'),
      ('bingo_cards'),
      ('bingo_claims'),
      ('stories'),
      ('story_votes'),
      ('wishes'),
      ('stop_answers'),
      ('quiz_answers')
    ) AS t(tablename)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = tab_record.tablename
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I;', tab_record.tablename);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 11. Row Level Security (RLS) y Políticas Permisivas
-- ============================================================
ALTER TABLE party_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stop_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- Recrear políticas limpiamente
DROP POLICY IF EXISTS "anon_all_party_state" ON party_state;
CREATE POLICY "anon_all_party_state" ON party_state FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_players" ON players;
CREATE POLICY "anon_all_players" ON players FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_bingo_cards" ON bingo_cards;
CREATE POLICY "anon_all_bingo_cards" ON bingo_cards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_bingo_claims" ON bingo_claims;
CREATE POLICY "anon_all_bingo_claims" ON bingo_claims FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_stories" ON stories;
CREATE POLICY "anon_all_stories" ON stories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_story_votes" ON story_votes;
CREATE POLICY "anon_all_story_votes" ON story_votes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_wishes" ON wishes;
CREATE POLICY "anon_all_wishes" ON wishes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_stop_answers" ON stop_answers;
CREATE POLICY "anon_all_stop_answers" ON stop_answers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_quiz_answers" ON quiz_answers;
CREATE POLICY "anon_all_quiz_answers" ON quiz_answers FOR ALL USING (true) WITH CHECK (true);
