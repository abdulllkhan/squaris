# Squaris - Square Packing Puzzle Game

A challenging spatial puzzle game where players pack square pieces into a container with no gaps or overlaps. Built with Phaser.js and TypeScript.

## Game Features

- **Daily Puzzles**: New puzzle every day with date-seeded generation
- **Three Difficulty Levels**: Easy, Medium, and Difficult modes with different grid sizes and piece distributions
- **Reverse Construction Algorithm**: Guarantees every puzzle is solvable with complete container coverage
- **Drag & Drop Interface**: Intuitive square placement with grid snapping and visual feedback
- **Game Controls**:
  - **UNDO**: Reverse your last move
  - **RESTART**: Generate a new puzzle
  - **HINT**: Shows optimal placement suggestion
  - **SHUFFLE BLOCKS**: Randomize inventory arrangement for fresh perspective
- **Time & Move Tracking**: Track solve times and move count
- **Smart Container Sizing**: Adaptive sizing based on difficulty (5x4 to 12x10)
- **Visual Polish**: High-resolution text, particle effects, sound effects
- **Settings**: Toggle sound effects and timer display

## How to Play

1. **Objective**: Fill the gray container completely using all square pieces
2. **Controls**:
   - **Drag & Drop**: Drag squares from inventory into the container
   - **Click to Remove**: Click placed squares to return them to inventory
   - **Grid Snapping**: Squares automatically snap to the grid
3. **Rules**:
   - No overlaps allowed between squares
   - Squares can't exceed container boundaries
   - All squares must be placed to win
4. **Strategy Tips**:
   - Place larger squares first
   - Use the HINT button when stuck
   - SHUFFLE inventory for new perspectives
   - UNDO moves to try different approaches

## Development

### Prerequisites
- Node.js v22.2.0+ (recommended for Reddit Devvit)
- Git

### Installation
```bash
npm install
```

### Development
```bash
npm run dev         # Start development server
npm test           # Run test suite
npm run build      # Build for production
npm run lint       # Lint code
```

### Testing
```bash
npm test           # Run all tests
npm run test:watch # Watch mode for tests
```

## Architecture

### Core Components

1. **PuzzleGenerator**: Uses reverse construction algorithm to create solvable puzzles
2. **GameLogic**: Handles game state, square placement, and win conditions
3. **GameScene**: Phaser.js scene with drag & drop interface
4. **Types**: TypeScript interfaces for type safety

### Algorithm: Reverse Construction

1. Generate container dimensions (respecting 1.5:1 ratio)
2. Start with empty grid
3. Place squares strategically using size probabilities
4. Record placed squares as puzzle pieces
5. Shuffle pieces for presentation
6. Result: Guaranteed solvable puzzle

### Difficulty System

- **Easy (15%)**: 3-4 larger squares, simple placement
- **Medium (70%)**: 5-7 mixed-size squares, moderate complexity
- **Difficult (15%)**: 8-10+ squares with many smaller pieces

## Test Coverage

- 29 tests passing
- Puzzle generation validation
- Game logic comprehensive testing
- Win condition verification
- Time tracking functionality

## Future Reddit Integration

This game is designed for Reddit's Devvit platform:

- **Interactive Posts**: Embed game in Reddit posts
- **Community Leaderboards**: Daily solve time competitions
- **Subreddit Integration**: Automated daily puzzle posts
- **Social Sharing**: Screenshot solutions to Reddit
- **Achievement System**: Streak badges and flair

## Visual Design

- **Reddit-themed**: Dark mode color scheme
- **Grid-based**: Clear container boundaries
- **Color-coded**: Different colors for square sizes
- **Responsive**: Works on desktop and mobile
- **Accessibility**: High contrast, clear typography

## Project Structure

```
src/
├── types.ts           # TypeScript interfaces
├── puzzleGenerator.ts # Daily puzzle generation
├── gameLogic.ts       # Core game mechanics
├── gameScene.ts       # Phaser.js game scene
└── main.ts           # Application entry point

tests/
├── puzzleGenerator.test.ts # Puzzle generation tests
└── gameLogic.test.ts      # Game logic tests
```

## Configuration

- **Container Size**: 4x4 to 12x8 units
- **Aspect Ratio**: Max 1.5:1 (longer:shorter)
- **Cell Size**: 40px for optimal visibility
- **Timer**: Real-time tracking from first move

## Getting Started

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Start development**: `npm run dev`
4. **Open browser**: Navigate to `http://localhost:3000`
5. **Play the game**: Drag squares into the container!

## Testing the Game

The game is now ready for testing! Key features to test:

- Daily puzzle generation (consistent per date)
- Drag and drop functionality
- Grid snapping and placement validation
- Win condition detection
- Time tracking
- Responsive design

---

**Built for puzzle enthusiasts**