# Scary Run

Scary Run to 2D side-scroll runner, w którym postać ucieka przez nawiedzony las. Gracz wybiera jednego z trzech bohaterów (biały ninja, ninja w różowej czapce, czerwony ninja), unika przeszkód i zbiera elementy bonusowe na zwiększającej się prędkości. Gra jest czysto frontendowa, statyczna, działa w przeglądarce.

## Run locally

```bash
npm install
npm run dev
```

Dev server uruchamia się na `http://localhost:5173`.

Build produkcyjny:

```bash
npm run build
npm run preview
```

## Stack

- **Phaser 3** — silnik gry 2D
- **Vite** — bundler + dev server (HMR)
- **ES modules** — natywny system modułów

## Assets

Postacie i tilesety pochodzą z **CraftPix** (https://craftpix.net), licencja royalty-free do użytku komercyjnego i niekomercyjnego. Folder `public/assets/` zawiera oddzielne katalogi dla:

- `characters/char01-char03/` — animowani bohaterowie
- `tileset/{background,ground,obstacles,collectables,decoration}/` — elementy świata
- `audio/{sfx,music}/` — efekty i muzyka tła
- `ui/` — przyciski, panele
- `fonts/` — czcionki bitmapowe

## Struktura

```
src/
├── main.js              # Entry point — inicjalizacja Phaser
├── config.js            # Stałe gry (rozmiar, fizyka, prędkości)
└── scenes/
    ├── BootScene.js     # Logo loadera + minimalny preload
    ├── PreloadScene.js  # Progress bar + pełny preload assetów
    ├── MenuScene.js     # Menu główne z przyciskiem PLAY
    ├── GameScene.js     # Rozgrywka (TODO: kolejne sesje)
    └── GameOverScene.js # Ekran końcowy (TODO)
```
