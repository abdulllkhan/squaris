# Squaris

A Reddit-themed square packing puzzle game built for the Revvit Hackathon.

## About

Squaris is an engaging puzzle game where players must strategically place Reddit-themed square pieces on a grid. The goal is to efficiently pack squares while managing your inventory and maximizing your score.

## Features

- Interactive grid-based gameplay with drag-and-drop mechanics
- Reddit-themed square pieces with various sizes
- Inventory management system
- Score tracking and win conditions
- Built with Phaser 3 game framework and TypeScript

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/abdulllkhan/squaris.git
cd squaris
```

2. Navigate to the game directory:
```bash
cd squaris-game
```

3. Install dependencies:
```bash
npm install
```

### Running the Game

Start the development server:
```bash
npm run dev
```

The game will be available at `http://localhost:3000/`

### Building for Production

Create a production build:
```bash
npm run build
```

### Running Tests

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Development

- `src/main.ts` - Main game entry point
- `src/gameScene.ts` - Main game scene implementation
- `src/gameLogic.ts` - Core game logic and mechanics
- `src/puzzleGenerator.ts` - Puzzle generation algorithms
- `src/types.ts` - TypeScript type definitions

## Technology Stack

- **Phaser 3** - HTML5 game framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Jest** - Testing framework

## License

MIT
