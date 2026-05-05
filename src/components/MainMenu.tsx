import { useState } from 'react';
import { Difficulty } from '../App';
import type { Squaris3DMode } from '../lib/preferences';
import { TopAppBar } from './TopAppBar';
import { sfx } from '../lib/sound';

interface Props {
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onPlay: (d: Difficulty) => void;
  onPlay3D: (mode: Squaris3DMode) => void;
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

      <main className="flex-1 flex flex-col items-center w-full max-w-6xl mx-auto px-4 py-10 sm:py-14">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1
            className="text-7xl sm:text-8xl font-black text-accent uppercase tracking-tighter mb-2 animate-pulse-soft"
            style={{ filter: 'drop-shadow(0 4px 24px rgba(255, 69, 0, 0.35))' }}
          >
            SQUARIS
          </h1>
          <p className="text-text-muted label-caps">Daily spatial puzzles</p>
        </div>

        {/* Date badge */}
        <div className="mb-8 inline-flex items-center gap-2 bg-surface-elevated border border-divider rounded-full px-4 py-1.5 text-xs">
          <span className="bg-accent text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-sm">
            Daily
          </span>
          <span className="text-text">{today}</span>
        </div>

        {/* Three game cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {/* Card 1 — Squaris 2D (the original) */}
          <GameCard
            title="Squaris"
            tagline="The original"
            description="Pack squares into a daily grid. No gaps, no overlaps."
            timeEstimate="~3 min"
            difficultyLabel={difficulty.toUpperCase()}
            preview={<Preview2D />}
            ctaLabel="Play"
            onPlay={() => {
              sfx.click();
              onPlay(difficulty);
            }}
          >
            <div className="flex w-full bg-surface border border-divider rounded-lg overflow-hidden h-10 mt-2">
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
                    className={`flex-1 text-[10px] font-bold transition-colors ${
                      i < 2 ? 'border-r border-divider' : ''
                    } ${
                      isActive
                        ? 'text-accent bg-divider'
                        : 'text-text-muted hover:bg-divider/50'
                    }`}
                  >
                    {labelMap[d]}
                  </button>
                );
              })}
            </div>
          </GameCard>

          {/* Card 2 — Squaris 3D Cubes */}
          <GameCard
            title="Squaris 3D"
            tagline="Cubes"
            description="Step up to three dimensions. Rectangular pieces only — no rotations to worry about."
            timeEstimate="~5 min"
            difficultyLabel="MEDIUM"
            preview={<Preview3DCubes />}
            ctaLabel="Play 3D"
            onPlay={() => {
              sfx.click();
              onPlay3D('cubes');
            }}
          />

          {/* Card 3 — Squaris 3D Bent */}
          <GameCard
            title="Squaris 3D"
            tagline="Bent"
            description="Tetris-shaped polycubes. Rotation matters — flip and turn each piece to fit."
            timeEstimate="~10 min"
            difficultyLabel="HARD"
            badge="ADVANCED"
            preview={<Preview3DBent />}
            ctaLabel="Play Bent"
            onPlay={() => {
              sfx.click();
              onPlay3D('bent');
            }}
          />
        </div>

        {/* Settings + About */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-8">
          <button
            onClick={() => {
              sfx.click();
              setModal('settings');
            }}
            className="flex items-center justify-center gap-2 h-12 bg-surface-elevated border border-divider text-text font-bold text-sm rounded-lg hover:bg-divider hover:text-white active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            SETTINGS
          </button>
          <button
            onClick={() => {
              sfx.click();
              setModal('about');
            }}
            className="flex items-center justify-center gap-2 h-12 bg-surface-elevated border border-divider text-text font-bold text-sm rounded-lg hover:bg-divider hover:text-white active:scale-95 transition-all"
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

// ─── Game card ────────────────────────────────────────────────────────────────

interface GameCardProps {
  title: string;
  tagline: string;
  description: string;
  timeEstimate: string;
  difficultyLabel: string;
  preview: React.ReactNode;
  ctaLabel: string;
  badge?: string;
  onPlay: () => void;
  children?: React.ReactNode;
}

function GameCard({
  title,
  tagline,
  description,
  timeEstimate,
  difficultyLabel,
  preview,
  ctaLabel,
  badge,
  onPlay,
  children,
}: GameCardProps) {
  return (
    <div className="relative bg-surface-elevated border border-divider rounded-xl p-5 flex flex-col gap-3 hover:border-accent transition-colors group">
      {badge && (
        <span className="absolute top-3 right-3 bg-accent text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm shadow-accent-soft">
          {badge}
        </span>
      )}

      <div className="flex items-center justify-center w-full h-32 bg-well rounded-lg border border-divider overflow-hidden">
        {preview}
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-white leading-tight">{title}</h2>
        <p className="text-accent label-caps">{tagline}</p>
      </div>

      <p className="text-text-muted text-sm leading-relaxed flex-1">{description}</p>

      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">schedule</span>
          {timeEstimate}
        </span>
        <span className="font-mono font-bold text-accent">{difficultyLabel}</span>
      </div>

      {children}

      <button
        onClick={onPlay}
        className="bg-accent hover:bg-accent-hover text-white py-3 rounded-lg font-bold text-sm uppercase flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-accent-glow group-hover:shadow-accent-glow"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          play_arrow
        </span>
        {ctaLabel}
      </button>
    </div>
  );
}

// ─── Card preview thumbnails (CSS only, no R3F here to keep menu light) ──────

function Preview2D() {
  // Flat 2D mini-grid of colored squares.
  const tiles = [
    { x: 0, y: 0, w: 2, h: 2, color: '#FF4500' },
    { x: 2, y: 0, w: 1, h: 1, color: '#2592FF' },
    { x: 3, y: 0, w: 1, h: 1, color: '#A2C9FF' },
    { x: 2, y: 1, w: 2, h: 2, color: '#FF6A35' },
    { x: 0, y: 2, w: 1, h: 1, color: '#A2C9FF' },
    { x: 1, y: 2, w: 1, h: 1, color: '#2592FF' },
  ];
  const cell = 18;
  return (
    <div className="relative" style={{ width: 4 * cell, height: 3 * cell }}>
      {tiles.map((t, i) => (
        <div
          key={i}
          className="absolute rounded-[3px]"
          style={{
            left: t.x * cell,
            top: t.y * cell,
            width: t.w * cell - 2,
            height: t.h * cell - 2,
            background: t.color,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)',
          }}
        />
      ))}
    </div>
  );
}

function Preview3DCubes() {
  // Stylised orange wireframe cube with two solid blocks inside, drawn purely
  // in CSS for menu-load performance (no R3F canvas).
  return (
    <div
      className="relative"
      style={{
        width: 96,
        height: 96,
        transform: 'rotateX(20deg) rotateY(-25deg)',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="absolute inset-0 border-2 border-accent rounded-[3px]"
        style={{ boxShadow: '0 0 24px rgba(255, 69, 0, 0.25)' }}
      />
      <div
        className="absolute"
        style={{
          left: 8,
          top: 40,
          width: 36,
          height: 36,
          background: '#FF4500',
          borderRadius: 3,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
        }}
      />
      <div
        className="absolute"
        style={{
          left: 52,
          top: 56,
          width: 22,
          height: 22,
          background: '#2592FF',
          borderRadius: 3,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}

function Preview3DBent() {
  // Same wireframe cube, but with the four bent-piece colours represented.
  return (
    <div
      className="relative"
      style={{
        width: 96,
        height: 96,
        transform: 'rotateX(20deg) rotateY(-25deg)',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="absolute inset-0 border-2 border-accent rounded-[3px]"
        style={{ boxShadow: '0 0 24px rgba(255, 69, 0, 0.25)' }}
      />
      {[
        { l: 8, t: 56, w: 16, h: 16, c: '#6FCF97' },
        { l: 26, t: 40, w: 16, h: 32, c: '#F2C94C' },
        { l: 44, t: 56, w: 32, h: 16, c: '#BB6BD9' },
        { l: 60, t: 40, w: 16, h: 16, c: '#EB5757' },
      ].map((b, i) => (
        <div
          key={i}
          className="absolute rounded-[3px]"
          style={{
            left: b.l,
            top: b.t,
            width: b.w,
            height: b.h,
            background: b.c,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Modals (unchanged) ───────────────────────────────────────────────────────

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
        <p>Three daily puzzles. Pack pieces into the container with no gaps or overlaps.</p>
        <div>
          <p className="label-caps text-accent mb-1">The three games</p>
          <ul className="space-y-1 text-text">
            <li>• <strong className="text-white">Squaris</strong> — flat 2D grid, square pieces only</li>
            <li>• <strong className="text-white">Squaris 3D · Cubes</strong> — 4×4×4 box, rectangular polycubes</li>
            <li>• <strong className="text-white">Squaris 3D · Bent</strong> — 4×4×4 box, Tetris-shaped polycubes with rotations</li>
          </ul>
        </div>
        <p className="text-text-muted text-xs pt-2">New puzzle every day. Same puzzle for every player.</p>
      </div>
    </ModalShell>
  );
}
