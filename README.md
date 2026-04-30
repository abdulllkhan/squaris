# Squaris — Daily Square Packing Puzzle

A daily spatial puzzle where players pack square pieces into a container with no gaps or overlaps. Built with **React + TypeScript + Tailwind + Vite**.

## Features

- **Daily puzzles** — date-seeded generation, same puzzle for everyone on the same day
- **Three difficulty bands** — Easy / Medium / Difficult, each with different grid sizes and piece distributions
- **Reverse-construction algorithm** — every puzzle is guaranteed solvable
- **Pointer-based drag & drop** — works with mouse and touch, with grid snapping and live placement preview
- **Click to remove** — tap a placed piece to send it back to the inventory
- **Action bar** — Undo / Restart / Hint / Shuffle
- **Time + move tracking** — for future leaderboards
- **Responsive** — cell size scales to viewport

## How to play

1. Drag pieces from the inventory into the grid.
2. Pieces snap to grid cells; valid placements glow orange, invalid ones flash red.
3. Click a placed piece to return it to the inventory.
4. Fill every cell of the container with no overlaps to win.

Tips:
- Place larger pieces first.
- Use **HINT** to highlight an optimal next move.
- **SHUFFLE** reorders the inventory for a fresh perspective.
- **UNDO** reverses your last move.

## Tech stack

- **React 18** — component model + state
- **Tailwind CSS** — design tokens and styling
- **TypeScript** — type safety end-to-end
- **Vite** — dev server and bundler
- **Jest** — unit tests for the game/puzzle logic

The game logic ([`src/gameLogic.ts`](src/gameLogic.ts)) and puzzle generator ([`src/puzzleGenerator.ts`](src/puzzleGenerator.ts)) are pure TypeScript with no UI dependencies — easy to swap rendering layers or run on the server.

## Project structure

```
src/
├── main.tsx              # React entry
├── App.tsx               # Top-level view router (menu ↔ game)
├── index.css             # Tailwind directives + base styles
├── types.ts              # Shared TypeScript interfaces
├── gameLogic.ts          # Pure game state + placement rules
├── puzzleGenerator.ts    # Reverse-construction puzzle generator
├── lib/
│   ├── pieceColor.ts     # Piece colour palette by size
│   └── sound.ts          # WebAudio click/place/error/win cues
└── components/
    ├── MainMenu.tsx      # Menu screen + Settings/About modals
    ├── Game.tsx          # In-game view: grid, inventory, drag-drop
    ├── WinScreen.tsx     # Completion modal
    ├── TopAppBar.tsx     # Shared top bar
    └── BottomNav.tsx     # In-game action bar (Undo/Restart/Hint/Shuffle)

tests/
├── gameLogic.test.ts
└── puzzleGenerator.test.ts
```

## Algorithm — reverse construction

1. Generate daily container dimensions (max 1.5:1 aspect ratio).
2. Start from an empty grid.
3. Place squares strategically using size-weighted probabilities.
4. Record placed squares as the puzzle's pieces.
5. Shuffle pieces for presentation.
6. Result: a guaranteed-solvable puzzle.

## Difficulty distribution

- **Easy** (~15%): 3–4 larger squares, simple placement
- **Medium** (~70%): 5–7 mixed sizes, moderate complexity
- **Difficult** (~15%): 8–10+ squares with many smaller pieces

## Development

### Prerequisites

- Node.js v18+ (v22+ recommended for Reddit Devvit deployment)

### Setup

```bash
npm install
```

### Scripts

```bash
npm run dev      # Vite dev server at http://localhost:3000
npm run build    # Production build (output: dist/)
npm run preview  # Serve the built bundle locally
npm test         # Run unit tests
npm run lint     # ESLint
```

## Design system

| Token             | Value      | Usage                          |
| ----------------- | ---------- | ------------------------------ |
| `surface`         | `#1A1A1B`  | Page background                |
| `surface-elevated`| `#202021`  | Cards                          |
| `well`            | `#151516`  | Game grid background           |
| `divider`         | `#343536`  | Borders                        |
| `accent`          | `#FF4500`  | Primary CTAs, hero, key pieces |
| `text`            | `#D7DADC`  | Body text                      |
| `text-muted`      | `#8A8D8F`  | Secondary text, label-caps     |

Piece colours map to size: 1×1 blue, 2×2 orange (hero), 3×3 secondary blue, 4×4 lighter orange, etc. — see [`src/lib/pieceColor.ts`](src/lib/pieceColor.ts).

## Future Reddit Devvit integration

The game is designed to deploy to Reddit's Devvit platform:

- **Interactive Posts** — embed the game in subreddit posts
- **Community leaderboards** — daily solve-time competitions
- **Subreddit integration** — automated daily puzzle posts
- **Social sharing** — share completion text via `navigator.share`
- **Achievements** — streak badges + Reddit flair

## Tests

29 passing tests covering puzzle generation, game logic, placement validation, win-condition detection, and time tracking.

```bash
npm test
```

---

Built for puzzle enthusiasts.
