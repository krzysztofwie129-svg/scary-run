// 5 power-upów do zakupu w sklepie. Posortowane po cenie rosnąco.
// Pole `managerType` mapuje na wewnętrzny POWER_UP_TYPES z PowerUpManager.js
// (np. 'turbo' shop ID → 'speed' manager type).

export const POWERUPS = [
  {
    id: 'magnet',
    name: 'Magnes',
    icon: '🧲',
    description: 'Przyciąga monety przez 8 sekund',
    duration: 8,
    price: 40,
    color: 0xff6b9d,
    managerType: 'magnet',
  },
  {
    id: 'shield',
    name: 'Tarcza',
    icon: '🛡️',
    description: 'Chroni przed jednym trafieniem',
    duration: null,
    price: 50,
    color: 0x4ecdc4,
    managerType: 'shield',
  },
  {
    id: 'turbo',
    name: 'Turbo',
    icon: '⚡',
    description: 'Szybciej i nietykalny przez 5 sekund',
    duration: 5,
    price: 60,
    color: 0xffd93c,
    managerType: 'speed',
  },
  {
    id: 'double_coins',
    name: '2× Monety',
    icon: '💰',
    description: 'Każda moneta = 2× wartość przez 12 sekund',
    duration: 12,
    price: 70,
    color: 0xb084ff,
    managerType: 'double_coins',
  },
  // EKSTRA ŻYCIE: 1 życie 1 szansa — zawsze 1, NIE dodajemy heart nigdzie.
];

export function getPowerupById(id) {
  return POWERUPS.find((p) => p.id === id) || null;
}
