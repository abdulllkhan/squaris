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
        <a
          href="https://github.com/abdulllkhan/squaris"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          title="View source on GitHub"
          className="text-text hover:bg-divider hover:text-white p-2 rounded-lg active:scale-95 transition-all flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18.92-.26 1.9-.39 2.88-.39s1.96.13 2.88.39c2.2-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.7.41.36.78 1.06.78 2.13v3.16c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
