// 7 skinów total: 1 default + 2 tinty (Vampire, Pumpkin) + 4 full-sprite (Drox, Nex, Nox, Poki).
// Posortowane po cenie rosnąco — ShopScene renderuje w tej kolejności.
//
// Typy:
//   'default'    → gracz biega postacią wybraną w CharSelectScene (char01-03), bez tintu.
//   'tint'       → tint nakładany na postać wybraną w CharSelectScene (char01-03).
//   'fullsprite' → pełna zamiana sprite'a na char04-07 (CharSelectScene wybór ignorowany).

export const SKINS = [
  {
    id: 'default',
    name: 'Domyślny',
    type: 'default',
    baseChar: null,
    tint: null,
    alpha: 1.0,
    price: 0,
    free: true,
  },
  {
    id: 'vampire',
    name: 'Vampire',
    type: 'tint',
    baseChar: null,
    tint: 0xcc2222,
    alpha: 1.0,
    price: 60,
  },
  {
    id: 'drox',
    name: 'Drox',
    type: 'fullsprite',
    baseChar: 'char04',
    tint: null,
    alpha: 1.0,
    price: 80,
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    type: 'tint',
    baseChar: null,
    tint: 0xff8800,
    alpha: 1.0,
    price: 100,
  },
  {
    id: 'nex',
    name: 'Nex',
    type: 'fullsprite',
    baseChar: 'char05',
    tint: null,
    alpha: 1.0,
    price: 110,
  },
  {
    id: 'nox',
    name: 'Nox',
    type: 'fullsprite',
    baseChar: 'char06',
    tint: null,
    alpha: 1.0,
    price: 140,
  },
  {
    id: 'poki',
    name: 'Poki',
    type: 'fullsprite',
    baseChar: 'char07',
    tint: null,
    alpha: 1.0,
    price: 180,
  },
];

export function getSkinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

/** Zwraca jaki char asset użyć w grze.
 *   - 'fullsprite' → baseChar ze skina (char04-07)
 *   - 'tint' / 'default' → wybrana postać z CharSelectScene (char01-03)
 */
export function getEffectiveCharKey(skin, selectedCharFromCharSelect) {
  if (skin && skin.type === 'fullsprite' && skin.baseChar) {
    return skin.baseChar;
  }
  return selectedCharFromCharSelect;
}

/** Tint do nałożenia na sprite, lub null. */
export function getEffectiveTint(skin) {
  if (skin && skin.type === 'tint') {
    return skin.tint;
  }
  return null;
}

/** Alpha sprite'a (1.0 default). */
export function getEffectiveAlpha(skin) {
  if (skin && skin.alpha != null) {
    return skin.alpha;
  }
  return 1.0;
}
