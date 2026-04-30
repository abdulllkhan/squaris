import { Difficulty } from '../App';

interface Props {
  onLogoClick?: () => void;
  puzzleNumber?: number;
  difficulty?: Difficulty;
}

export function TopAppBar({ onLogoClick, puzzleNumber, difficulty }: Props) {
  return (
    <header className="bg-surface border-b border-divider flex justify-between items-center w-full px-6 h-16 sticky top-0 z-40">
      <button
        onClick={onLogoClick}
        className="text-2xl font-black text-accent uppercase tracking-tight hover:opacity-90 active:scale-95 transition-all"
      >
        Squaris
      </button>

      {puzzleNumber !== undefined && difficulty && (
        <div className="hidden sm:flex items-center gap-8">
          <div className="flex flex-col items-center">
            <span className="label-caps text-text-muted">Puzzle</span>
            <span className="text-white font-bold text-sm">#{puzzleNumber}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="label-caps text-text-muted">Difficulty</span>
            <span className="text-accent font-bold text-sm">{difficulty.toUpperCase()}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button className="text-text hover:bg-divider hover:text-white p-2 rounded-lg active:scale-95 transition-all">
          <span className="material-symbols-outlined text-xl">timer</span>
        </button>
        <button className="text-text hover:bg-divider hover:text-white p-2 rounded-lg active:scale-95 transition-all">
          <span className="material-symbols-outlined text-xl">leaderboard</span>
        </button>
      </div>
    </header>
  );
}
