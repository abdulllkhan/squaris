# Squaris - Reddit Square Packing Game

A daily puzzle game where players pack square pieces into a container with no gaps or overlaps. Built for Reddit's platform using Phaser.js.

## 🎮 Game Features

- **Daily Puzzles**: New puzzle every day with date-seeded generation
- **Reverse Construction Algorithm**: Guarantees every puzzle is solvable
- **Difficulty Levels**: Mostly medium difficulty with random easy/hard puzzles
- **Drag & Drop Interface**: Intuitive square placement with grid snapping
- **Time Tracking**: Track solve times for future leaderboards
- **Smart Container Sizing**: Max 1.5:1 aspect ratio constraint

## 🎯 How to Play

1. **Objective**: Fill the gray container completely using all square pieces
2. **Drag & Drop**: Drag squares from the inventory area into the container
3. **Grid Snapping**: Squares automatically snap to the grid
4. **No Overlaps**: Squares can't overlap or exceed container boundaries
5. **Win Condition**: Place all squares to fill the container completely

## 🛠️ Development

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

## 🏗️ Architecture

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

## 📊 Test Coverage

- ✅ 29 tests passing
- ✅ Puzzle generation validation
- ✅ Game logic comprehensive testing
- ✅ Win condition verification
- ✅ Time tracking functionality

## 🎪 Future Reddit Integration

This game is designed for Reddit's Devvit platform:

- **Interactive Posts**: Embed game in Reddit posts
- **Community Leaderboards**: Daily solve time competitions
- **Subreddit Integration**: Automated daily puzzle posts
- **Social Sharing**: Screenshot solutions to Reddit
- **Achievement System**: Streak badges and flair

## 🎨 Visual Design

- **Reddit-themed**: Dark mode color scheme
- **Grid-based**: Clear container boundaries
- **Color-coded**: Different colors for square sizes
- **Responsive**: Works on desktop and mobile
- **Accessibility**: High contrast, clear typography

## 📁 Project Structure

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

## 🔧 Configuration

- **Container Size**: 4x4 to 12x8 units
- **Aspect Ratio**: Max 1.5:1 (longer:shorter)
- **Cell Size**: 40px for optimal visibility
- **Timer**: Real-time tracking from first move

## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Start development**: `npm run dev`
4. **Open browser**: Navigate to `http://localhost:3000`
5. **Play the game**: Drag squares into the container!

## 🧪 Testing the Game

The game is now ready for testing! Key features to test:

- ✅ Daily puzzle generation (consistent per date)
- ✅ Drag and drop functionality
- ✅ Grid snapping and placement validation
- ✅ Win condition detection
- ✅ Time tracking
- ✅ Responsive design

---

**Built with ❤️ for Reddit's Fun and Games Hackathon**