import { useState } from 'react';
import { Difficulty } from '../App';
import { TopAppBar } from './TopAppBar';
import { sfx } from '../lib/sound';

interface Props {
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onPlay: (d: Difficulty) => void;
  onPlay3D: () => void;
}

export function MainMenu({ difficulty, onDifficultyChange, onPlay, onPlay3D }: Props) {
  const [modal, setModal] = useState<'settings' | 'about' | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDifficulty = (d: Difficulty) => {
    onDifficultyChange(d);
    localStorage.setItem('selectedDifficulty', d);
    sfx.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopAppBar />

      <main className="flex-1 flex flex-col items-center w-full max-w-lg mx-auto px-4 py-10 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1
            className="text-7xl sm:text-8xl font-black text-accent uppercase tracking-tighter mb-2 animate-pulse-soft"
            style={{ filter: 'drop-shadow(0 4px 24px rgba(255, 69, 0, 0.35))' }}
          >
            SQUARIS
          </h1>
          <p className="text-text-muted label-caps">Logic & Tactile Mastery</p>
        </div>

        {/* Daily Challenge Card */}
        <div className="w-full bg-surface-elevated border border-divider rounded-xl p-5 mb-6 relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-accent opacity-[0.06] rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-accent text-white text-[10px] font-black uppercase px-2 py-1 rounded-sm mb-2 inline-block">
                Daily Challenge
              </span>
              <h2 className="text-lg font-semibold text-white">{today}</h2>
            </div>
            <div className="text-right">
              <span className="block label-caps text-text-muted mb-1">Difficulty</span>
              <span className="text-accent font-bold">{difficulty.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Play Button */}
        <button
          onClick={() => {
            sfx.click();
            onPlay(difficulty);
          }}
          className="w-full bg-accent hover:bg-accent-hover text-white py-5 rounded-lg font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-accent-glow mb-3"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            play_arrow
          </span>
          PLAY NOW
        </button>

        {/* 3D Mode Button */}
        <button
          onClick={() => {
            sfx.click();
            onPlay3D();
          }}
          className="w-full bg-surface border-2 border-accent text-accent hover:bg-accent hover:text-white py-5 rounded-lg font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-accent-soft mb-3 group"
        >
          <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">
            view_in_ar
          </span>
          EXPLORE SQUARIS 3D
        </button>

        {/* Difficulty Segmented Control */}
        <div className="flex w-full bg-surface-elevated border border-divider rounded-lg overflow-hidden h-14 mb-3">
          {(['easy', 'medium', 'difficult'] as Difficulty[]).map((d, i) => {
            const isActive = difficulty === d;
            const labelMap: Record<Difficulty, string> = {
              easy: 'EASY',
              medium: 'MEDIUM',
              difficult: 'HARD',
            };
            return (
              <button
                key={d}
                onClick={() => handleDifficulty(d)}
                className={`flex-1 text-xs font-bold transition-colors ${
                  i < 2 ? 'border-r border-divider' : ''
                } ${
                  isActive
                    ? 'text-accent bg-divider'
                    : 'text-text hover:bg-divider/50'
                }`}
              >
                {labelMap[d]}
              </button>
            );
          })}
        </div>

        {/* Settings + About */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onClick={() => {
              sfx.click();
              setModal('settings');
            }}
            className="flex items-center justify-center gap-2 h-14 bg-surface-elevated border border-divider text-text font-bold text-sm rounded-lg hover:bg-divider hover:text-white active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            SETTINGS
          </button>
          <button
            onClick={() => {
              sfx.click();
              setModal('about');
            }}
            className="flex items-center justify-center gap-2 h-14 bg-surface-elevated border border-divider text-text font-bold text-sm rounded-lg hover:bg-divider hover:text-white active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">info</span>
            ABOUT
          </button>
        </div>
      </main>

      {/* Decorative background squares */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-accent opacity-[0.03] rotate-12 rounded-2xl border-4 border-accent border-dashed"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent opacity-[0.02] -rotate-12 rounded-[40px] border-2 border-accent"></div>
      </div>

      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
      {modal === 'about' && <AboutModal onClose={() => setModal(null)} />}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-elevated border border-divider rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-accent uppercase tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-divider transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [soundOn, setSoundOn] = useState(localStorage.getItem('soundEnabled') === 'true');
  const [timerOn, setTimerOn] = useState(localStorage.getItem('showTimer') !== 'false');
  const [reset, setReset] = useState(false);

  const toggle = (key: 'soundEnabled' | 'showTimer', val: boolean, set: (b: boolean) => void) => {
    sfx.click();
    set(val);
    localStorage.setItem(key, String(val));
  };

  return (
    <ModalShell title="Settings" onClose={onClose}>
      <div className="space-y-4">
        <Toggle label="Sound Effects" on={soundOn} onChange={v => toggle('soundEnabled', v, setSoundOn)} />
        <Toggle label="Show Timer" on={timerOn} onChange={v => toggle('showTimer', v, setTimerOn)} />
        <button
          onClick={() => {
            localStorage.clear();
            sfx.click();
            setReset(true);
            setTimeout(() => setReset(false), 1500);
          }}
          className="w-full bg-accent-muted border border-accent text-accent font-bold text-sm py-3 rounded-lg hover:bg-accent/20 transition-colors"
        >
          RESET PROGRESS
        </button>
        {reset && <p className="text-accent text-xs text-center">Progress reset.</p>}
      </div>
    </ModalShell>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-text font-medium">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={`relative w-14 h-7 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-divider'}`}
      >
        <span
          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${on ? 'left-8' : 'left-1'}`}
        />
      </button>
    </div>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="About Squaris" onClose={onClose}>
      <div className="space-y-3 text-sm text-text">
        <p>A daily spatial puzzle. Pack squares into the container with no gaps or overlaps.</p>
        <div>
          <p className="label-caps text-accent mb-1">How to Play</p>
          <ul className="space-y-1 text-text">
            <li>• Drag pieces from the inventory into the grid</li>
            <li>• Click a placed piece to send it back</li>
            <li>• UNDO reverses your last move</li>
            <li>• HINT highlights an optimal placement</li>
          </ul>
        </div>
        <p className="text-text-muted text-xs pt-2">New puzzle every day.</p>
      </div>
    </ModalShell>
  );
}
