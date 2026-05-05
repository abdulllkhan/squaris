import { lazy, Suspense, useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { Game } from './components/Game';
import { parseDifficulty, parseMode3D, parseBent2DDifficulty } from './lib/preferences';
import type {
  Difficulty as DifficultyT,
  Squaris3DMode as Squaris3DModeT,
  Game2DBentDifficulty as Bent2DDifficultyT,
} from './lib/preferences';

const Squaris3D = lazy(() =>
  import('./components/Squaris3D').then(m => ({ default: m.Squaris3D }))
);

const Game2DBent = lazy(() =>
  import('./components/Game2DBent').then(m => ({ default: m.Game2DBent }))
);

export type Difficulty = DifficultyT;
export type Squaris3DMode = Squaris3DModeT;
export type Game2DBentDifficulty = Bent2DDifficultyT;

const DIFFICULTY_KEY = 'selectedDifficulty';
const SQUARIS3D_MODE_KEY = 'squaris3dMode';
const BENT_2D_DIFFICULTY_KEY = 'bent2dDifficulty';

export function App() {
  const [view, setView] = useState<'menu' | 'game' | 'game3d' | 'game2dBent'>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>(() =>
    parseDifficulty(localStorage.getItem(DIFFICULTY_KEY)),
  );
  const [gameKey, setGameKey] = useState(0);
  const [mode3d, setMode3d] = useState<Squaris3DMode>(() =>
    parseMode3D(localStorage.getItem(SQUARIS3D_MODE_KEY)),
  );
  const [bent2dDifficulty, setBent2dDifficulty] = useState<Game2DBentDifficulty>(() =>
    parseBent2DDifficulty(localStorage.getItem(BENT_2D_DIFFICULTY_KEY)),
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

  const handleBent2DDifficultyChange = (d: Game2DBentDifficulty) => {
    setBent2dDifficulty(d);
    localStorage.setItem(BENT_2D_DIFFICULTY_KEY, d);
  };

  const startGame2DBent = (d: Game2DBentDifficulty) => {
    handleBent2DDifficultyChange(d);
    setView('game2dBent');
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

  if (view === 'game2dBent') {
    return (
      <Suspense fallback={<LoadingBent />}>
        <Game2DBent
          key={bent2dDifficulty}
          difficulty={bent2dDifficulty}
          onDifficultyChange={handleBent2DDifficultyChange}
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
      onPlay2DBent={startGame2DBent}
      onBent2DDifficultyChange={handleBent2DDifficultyChange}
      bent2dDifficulty={bent2dDifficulty}
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

function LoadingBent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-accent">
      <div className="flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-4xl animate-pulse">extension</span>
        <span className="label-caps">Loading Bent…</span>
      </div>
    </div>
  );
}
