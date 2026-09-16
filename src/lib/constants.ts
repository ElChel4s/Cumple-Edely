// Grupos temáticos de perritos (cada grupo es una pareja / dúo de MÁXIMO 2 personas)
export const DOG_GROUPS = [
  'Boddy',
  'Pathan',
  'Milo',
  'Chuleta',
  'Canela',
  'Oso',
  'Vago',
] as const;

export const DOG_IMAGES: Record<string, string> = {
  Boddy: '/perros/boddy.png',
  Pathan: '/perros/patan.png',
  Patan: '/perros/patan.png',
  Milo: '/perros/milo.png',
  Chuleta: '/perros/chuleta.png',
  Canela: '/perros/canela.png',
  Oso: '/perros/oso.png',
  Vago: '/perros/vago.png',
};

export function getDogImage(groupName?: string | null): string {
  if (!groupName) return '/perros/boddy.png';
  const clean = groupName.trim();
  const directMatch = DOG_IMAGES[clean];
  if (directMatch) return directMatch;
  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  return DOG_IMAGES[capitalized] || '/perros/boddy.png';
}

export const MAX_PLAYERS_PER_GROUP = 2;

export const PHASE_CONFIG: Record<
  string,
  { label: string; icon: string; desc: string }
> = {
  REGISTER: {
    label: 'Lobby',
    icon: '🪴',
    desc: 'Registro y bienvenida',
  },
  ESPERA: {
    label: 'Lobby (Grupos)',
    icon: '🐾',
    desc: 'Muestra grupos y parejas',
  },
  ICEBREAKER: {
    label: 'Conexiones',
    icon: '💬',
    desc: 'Rompehielos con pareja',
  },
  QUIZ: {
    label: 'Trivia',
    icon: '🎯',
    desc: 'Trivia y preguntas sobre Edely',
  },
  STOP: {
    label: 'Tutti Frutti',
    icon: '🛑',
    desc: 'Ruleta de letras y Stop',
  },
  STORIES: {
    label: 'Historias',
    icon: '📖',
    desc: 'Muro de anécdotas',
  },
  WISHES: {
    label: 'Deseos',
    icon: '✨',
    desc: 'Muro de fotos y dedicatorias',
  },
};

export interface ExistingPlayerRef {
  player_id: string;
  name: string;
  group_name: string;
  partner?: string | null;
}

/**
 * Asigna de forma COMPLETAMENTE ALEATORIA a un grupo con cupo disponible.
 * REGLA ESTRICTA: Cada grupo tiene un MÁXIMO de 2 personas (dúos / parejas).
 */
export function assignGroupAndPartner(
  playerName: string,
  existingPlayers: ExistingPlayerRef[] = []
): {
  group_name: string;
  partner: string;
  matchedTeammateId: string | null;
} {
  const cleanName = playerName.trim();
  const otherPlayers = existingPlayers.filter(
    (p) => p.name.trim().toLowerCase() !== cleanName.toLowerCase()
  );

  // 1. Contar cuántos integrantes tiene cada grupo actualmente
  const counts: Record<string, number> = {};
  DOG_GROUPS.forEach((g) => (counts[g] = 0));
  otherPlayers.forEach((p) => {
    if (p.group_name && counts[p.group_name] !== undefined) {
      counts[p.group_name]++;
    }
  });

  // 2. Filtrar únicamente grupos que tengan MENOS de 2 personas (cupo disponible: 0 o 1)
  const availableGroups = DOG_GROUPS.filter(
    (g) => counts[g] < MAX_PLAYERS_PER_GROUP
  );

  // Si por alguna razón todos los grupos están llenos, usar cualquiera
  const pool = availableGroups.length > 0 ? availableGroups : [...DOG_GROUPS];

  // 3. Selección 100% ALEATORIA entre los grupos disponibles
  const group_name = pool[Math.floor(Math.random() * pool.length)];

  // 4. Si el grupo seleccionado ya tenía 1 integrante, este nuevo jugador es el 2do del dúo -> se emparejan!
  const waitingTeammate = otherPlayers.find(
    (p) => p.group_name === group_name
  );

  if (waitingTeammate) {
    return {
      group_name,
      partner: waitingTeammate.name,
      matchedTeammateId: waitingTeammate.player_id,
    };
  }

  // 5. Si el grupo tenía 0 integrantes, este jugador es el 1ro -> espera a su pareja
  return {
    group_name,
    partner: '',
    matchedTeammateId: null,
  };
}
