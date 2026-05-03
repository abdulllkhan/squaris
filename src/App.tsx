import { lazy, Suspense, useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { Game } from './components/Game';
import type { Squaris3DMode } from './components/Squaris3D';

const Squaris3D = lazy(() =>
  import('./components/Squaris3D').then(m => ({ default: m.Squaris3D }))
);

export type Difficulty = 'easy' | 'medium' | 'difficult';

const SQUARIS3D_MODE_KEY = 'squaris3dMode';

function loadMode3D(): Squaris3DMode {
  const stored = localStorage.getItem(SQUARIS3D_MODE_KEY);
  return stored === 'bent' ? 'bent' : 'cubes';
}

export function App() {
  const [view, setView] = useState<'menu' | 'game' | 'game3d'>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    (localStorage.getItem('selectedDifficulty') as Difficulty) || 'medium'
  );
  const [gameKey, setGameKey] = useState(0);
  const [mode3d, setMode3d] = useState<Squaris3DMode>(loadMode3D);

  const startGame = (d: Difficulty) => {
    setDifficulty(d);
    localStorage.setItem('selectedDifficulty', d);
    setGameKey(k => k + 1);
    setView('game');
  };

  const handleModeChange = (m: Squaris3DMode) => {
    setMode3d(m);
    localStorage.setItem(SQUARIS3D_MODE_KEY, m);
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

  if (view === 'game3d') {
    return (
      <Suspense fallback={<Loading3D />}>
        <Squaris3D
          key={mode3d}
          mode={mode3d}
          onModeChange={handleModeChange}
          onExit={() => setView('menu')}
        />
      </Suspense>
    );
  }

  return (
    <MainMenu
      difficulty={difficulty}
      onDifficultyChange={setDifficulty}
      onPlay={startGame}
      onPlay3D={() => setView('game3d')}
    />
  );
}

function Loading3D() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-accent">
      <div className="flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-4xl animate-pulse">view_in_ar</span>
        <span className="label-caps">Loading 3D…</span>
      </div>
    </div>
  );
}
