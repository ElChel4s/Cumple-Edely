export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0..3
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: '¿En qué año nació la cumpleañera?',
    options: ['2003', '2002', '2005', '2000'],
    correctIndex: 0,
  },
  {
    id: 2,
    question: "¿Cuál es la mayor 'manía' o hábito curioso de la cumpleañera?",
    options: [
      'Mirarse al espejo cada 5 minutos',
      'Tirar piedras a perros',
      'Cantar cada 3 minutos',
      'Agarrarse de personas para cruzar la calle',
    ],
    correctIndex: 3,
  },
  {
    id: 3,
    question: 'Si la cumpleañera pudiera comer una sola cosa por el resto de su vida, ¿qué elegiría?',
    options: ['Pollo al horno', 'Pollo al spiedo', 'Sopa de Pollo', 'Pollo frito'],
    correctIndex: 3,
  },
  {
    id: 4,
    question: '¿Cuál es su talento o habilidad secreta?',
    options: ['Bailar Salsa', 'Hablar con los animales', 'Cantar', 'Hornear y Cocinar'],
    correctIndex: 2,
  },
  {
    id: 5,
    question: '¿Qué género de música NO APARECERÍA en su playlist?',
    options: ['Bellakeo', 'Cumbia', 'Instrumentales', 'R&B'],
    correctIndex: 2,
  },
  {
    id: 6,
    question: '¿Cuál es su mayor debilidad cuando va de compras?',
    options: ['Zapatos o bolsos', 'Ropa y Accesorios', 'Maquillaje', 'Perfumes y cremas'],
    correctIndex: 2,
  },
  {
    id: 7,
    question: '¿Cuál es el mejor regalo que le puedes dar?',
    options: [
      'Una tarjeta genérica',
      'Experiencias (viajes, cenas, conciertos)',
      'Cosas con las imágenes de sus perros',
      'Gomitas',
    ],
    correctIndex: 2,
  },
  {
    id: 8,
    question: '¿Qué palabra describe mejor a la cumpleañera según sus amigos?',
    options: ['Alegre e Incondicional', 'Predecible', 'Misteriosa', 'Seria y Reservada'],
    correctIndex: 3,
  },
  {
    id: 9,
    question: '¿Qué es lo primero que hace al despertarse?',
    options: ['Hacer ejercicio', 'Hacer la cama', 'Revisar el teléfono', 'Besar a sus perros'],
    correctIndex: 3,
  },
  {
    id: 10,
    question: '¿Qué género de películas o series prefiere?',
    options: [
      'Thriller y Terror',
      'Ciencia ficción',
      'Comedias románticas',
      'Documentales sobre crímenes basados en hechos reales',
    ],
    correctIndex: 3,
  },
  {
    id: 11,
    question: '¿Cuál es la frase o muletilla que más repite?',
    options: ['Super si!', 'Manifestemos!', 'No se bb!', 'Y que vivan los hombres!'],
    correctIndex: 2,
  },
  {
    id: 12,
    question: '¿A qué le tiene más miedo o fobia?',
    options: ['La oscuridad', 'Las arañas o insectos', 'A las Gallinas', 'A los anfibios'],
    correctIndex: 3,
  },
  {
    id: 13,
    question: '¿Cuál es su reacción típica cuando escucha su canción favorita en una fiesta?',
    options: [
      'Empieza a cantar desde la mesa sin levantarse.',
      'Saca el teléfono para grabar un video.',
      'Dice, ¨Bro nooooo, mi canción¨.',
      'Dice, ¨NOOO esa noooo¨.',
    ],
    correctIndex: 3,
  },
  {
    id: 14,
    question: '¿Cómo maneja los planes imprevistos de último minuto?',
    options: [
      'Pide tiempo para pensar y luego decide.',
      'Acepta solo si van sus amigos más cercanos.',
      'Prefiere rechazarlos si ya tenía planeado descansar.',
      'Entra en Pánico y se estresa.',
    ],
    correctIndex: 3,
  },
  {
    id: 15,
    question: '¿Qué objeto es indispensable que lleve en su bolso o mochila?',
    options: [
      'Batería portátil para el teléfono.',
      'Bálsamo labial o retoque de maquillaje.',
      'Audífonos para escuchar música en todo lugar.',
      'Una botella de agua.',
    ],
    correctIndex: 1,
  },
  {
    id: 16,
    question: '¿Cuál es su color favorito?',
    options: ['Beige', 'Verde Pistacho', 'Borgoña', 'Cafe'],
    correctIndex: 3,
  },
  {
    id: 17,
    question: '¿Cual es su artista favorito?',
    options: ['Harry Styles', 'Ariana Grande', 'Kali Uchis', 'Twenty One Pilots'],
    correctIndex: 3,
  },
  {
    id: 18,
    question: '¿Qué hace la cumpleañera cuando se entera de un buen chisme?',
    options: [
      'Se pone nerviosa y pide no saber nada.',
      'Pide todos los detalles con lujo de precisión',
      'Pide fotos',
      'Se olvida a los dos segundos de lo que le contaron.',
    ],
    correctIndex: 2,
  },
  {
    id: 19,
    question: '¿Qué actitud toma la cumpleañera cuando algo no sale como lo planeó?',
    options: [
      'Le echa la culpa a la primera persona que ve.',
      'Abandona todo y se pone a llorar todo el día.',
      'Se mantiene fría y calculadora sin expresar nada.',
      'Se queja dramáticamente pero luego busca solución.',
    ],
    correctIndex: 1,
  },
  {
    id: 20,
    question: '¿Cual es la mayor excusa que utiliza para irse?',
    options: ['Tengo que cocinar', 'Tengo que cuidar a mis perros', 'tengo que chambear', 'Debo de llegar a casa'],
    correctIndex: 2,
  },
];
