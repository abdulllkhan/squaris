import { lazy, Suspense, useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { Game } from './components/Game';
import { parseDifficulty, parseMode3D } from './lib/preferences';
import type { Difficulty as DifficultyT, Squaris3DMode as Squaris3DModeT } from './lib/preferences';

const Squaris3D = lazy(() =>
  import('./components/Squaris3D').then(m => ({ default: m.Squaris3D }))
);

export type Difficulty = DifficultyT;
export type Squaris3DMode = Squaris3DModeT;

const DIFFICULTY_KEY = 'selectedDifficulty';
const SQUARIS3D_MODE_KEY = 'squaris3dMode';

export function App() {
  const [view, setView] = useState<'menu' | 'game' | 'game3d'>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>(() =>
    parseDifficulty(localStorage.getItem(DIFFICULTY_KEY)),
  );
  const [gameKey, setGameKey] = useState(0);
  const [mode3d, setMode3d] = useState<Squaris3DMode>(() =>
    parseMode3D(localStorage.getItem(SQUARIS3D_MODE_KEY)),
  );

  const startGame = (d: Difficulty) => {
    setDifficulty(d);
    localStorage.setItem(DIFFICULTY_KEY, d);
    setGameKey(k => k + 1);
    setView('game');
  };

  const handleModeChange = (m: Squaris3DMode) => {
    setMode3d(m);
    localStorage.setItem(SQUARIS3D_MODE_KEY, m);
  };

  const startGame3D = (m: Squaris3DMode) => {
    handleModeChange(m);
    setView('game3d');
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
      onPlay3D={startGame3D}
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
