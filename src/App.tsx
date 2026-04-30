import { useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { Game } from './components/Game';

export type Difficulty = 'easy' | 'medium' | 'difficult';

export function App() {
  const [view, setView] = useState<'menu' | 'game'>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    (localStorage.getItem('selectedDifficulty') as Difficulty) || 'medium'
  );
  const [gameKey, setGameKey] = useState(0);

  const startGame = (d: Difficulty) => {
    setDifficulty(d);
    localStorage.setItem('selectedDifficulty', d);
    setGameKey(k => k + 1);
    setView('game');
  };

  if (view === 'game') {
    return (
      <Game
        key={gameKey}
        difficulty={difficulty}
        onExit={() => setView('menu')}
        onRestart={() => setGameKey(k => k + 1)}
      />
    );
  }

  return (
    <MainMenu
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      onPlay={startGame}
    />
  );
}
