export const BINGO_OPTIONS = [
  'Se limpia la nariz',
  'Menciona a uno de sus perros',
  'Se mira en el espejo',
  'Se arregla el cabello',
  'Se olvida de lo que estaba hablando',
  'Dice "Super si"',
  'Dice "Manifestemos"',
  'Dice "Y que vivan los hombres"',
  'Llora',
  'Hace un chiste rancio',
  'Se ríe',
  'Se endereza',
  'Toma un sorbo de algo',
  'Bosteza',
  'Dice "tengo sueño"',
  'Dice "tengo que chambear"',
  'Dice "valgo queso"',
  'Sonríe',
  'Saca foto a su comida',
  'Reconoce la canción de fondo',
  'Se pone a cantar',
  'Usa Spanglish',
  'Responde Mensajes',
  'Menciona a su hombre',
] as const;

export interface PredefinedBingoCard {
  id: number;
  name: string;
  desc: string;
  items: string[];
}

// Generación determinista y equilibrada de 50 cartones únicos de 3x3 (8 casillas + centro FREE)
function generate50UniqueCards(): PredefinedBingoCard[] {
  const cards: PredefinedBingoCard[] = [];
  const seenCombinations = new Set<string>();

  // Semilla determinista con saltos pseudo-aleatorios fijos
  let seed = 123456789;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let cardId = 1; cardId <= 50; cardId++) {
    let chosen8: string[] = [];
    let attempts = 0;

    while (attempts < 1000) {
      attempts++;
      const shuffled = [...BINGO_OPTIONS].sort(() => pseudoRandom() - 0.5);
      const candidate = shuffled.slice(0, 8);
      const signature = [...candidate].sort().join('|');

      if (!seenCombinations.has(signature)) {
        seenCombinations.add(signature);
        chosen8 = candidate;
        break;
      }
    }

    // Insertar el centro '☕ FREE ☕' en el índice 4 (casilla central de 3x3)
    const items = [
      chosen8[0],
      chosen8[1],
      chosen8[2],
      chosen8[3],
      '☕ FREE ☕',
      chosen8[4],
      chosen8[5],
      chosen8[6],
      chosen8[7],
    ];

    cards.push({
      id: cardId,
      name: `Cartón #${cardId}`,
      desc: `Combinación única con ${chosen8[0].toLowerCase()} y más.`,
      items,
    });
  }

  return cards;
}

export const PREDEFINED_CARDS: PredefinedBingoCard[] = generate50UniqueCards();
