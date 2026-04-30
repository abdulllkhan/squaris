import { Difficulty } from '../App';
import { sfx } from '../lib/sound';

interface Props {
  timeText: string;
  moves: number;
  difficulty: Difficulty;
  onNext: () => void;
  onMenu: () => void;
}

export function WinScreen({ timeText, moves, difficulty, onNext, onMenu }: Props) {
  const handleShare = async () => {
    sfx.click();
    const text = `Squaris solved in ${timeText} with ${moves} moves on ${difficulty.toUpperCase()}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Squaris', text });
      } catch {}
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      {/* Subtle confetti decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute w-2 h-2 rounded-sm bg-accent" style={{ top: '20%', left: '15%', transform: 'rotate(15deg)' }} />
        <div className="absolute w-2 h-2 rounded-sm bg-piece-blue-secondary" style={{ top: '40%', left: '85%', transform: 'rotate(-25deg)' }} />
        <div className="absolute w-2 h-2 rounded-sm bg-piece-blue-pale" style={{ top: '75%', left: '10%', transform: 'rotate(45deg)' }} />
        <div className="absolute w-2 h-2 rounded-sm bg-accent" style={{ top: '10%', left: '70%', transform: 'rotate(-10deg)' }} />
        <div className="absolute w-2 h-2 rounded-sm bg-piece-blue" style={{ top: '60%', left: '90%', transform: 'rotate(30deg)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 rounded-xl bg-divider/40 backdrop-blur-md border border-divider shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center">
        <div className="mb-5 relative">
          <div className="absolute -inset-4 bg-accent opacity-25 blur-2xl rounded-full" />
          <span
            className="material-symbols-outlined text-6xl text-accent relative animate-pulse-soft"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            emoji_events
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-accent mb-2 text-center">Puzzle Solved!</h1>
        <p className="text-sm text-text mb-7 text-center">You mastered the square. Brilliant logic!</p>

        <div className="grid grid-cols-2 gap-3 w-full mb-7">
          <div className="bg-well border border-divider p-4 rounded-lg flex flex-col items-center justify-center">
            <span className="label-caps text-text-muted mb-1">TIME</span>
            <span className="text-2xl font-semibold text-white tracking-wider">{timeText}</span>
          </div>
          <div className="bg-well border border-divider p-4 rounded-lg flex flex-col items-center justify-center">
            <span className="label-caps text-text-muted mb-1">MOVES</span>
            <span className="text-2xl font-semibold text-white tracking-wider">{moves}</span>
          </div>
        </div>

        <div className="flex flex-col w-full gap-3">
          <button
            onClick={() => { sfx.click(); onNext(); }}
            className="w-full bg-accent hover:bg-accent-hover py-4 rounded-lg font-bold text-sm text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            NEXT PUZZLE
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
          <button
            onClick={handleShare}
            className="w-full bg-divider hover:bg-divider-hover py-4 rounded-lg font-bold text-sm text-text active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">share</span>
            SHARE RESULT
          </button>
          <button
            onClick={() => { sfx.click(); onMenu(); }}
            className="w-full border border-divider hover:bg-divider py-3 rounded-lg font-bold text-sm text-text-muted hover:text-text active:scale-[0.98] transition-all mt-1"
          >
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
}
