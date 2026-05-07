import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../lib/sound';
import {
  Vec2,
  Puzzle2D,
  PuzzlePiece2D,
  InventoryEntry2D,
  ResolvedPieceType2D,
  SymmetryGroup,
  buildPieceLibrary,
  generatePuzzle2DBent,
  placedCells2D,
  occupiedFromPlaced2D,
  isFilled2D,
  cellKey2D,
  computeAutoPlacement2D,
  applyRotation2D,
  applyFlip2D,
  RotationDir2D,
  FlipAxis2D,
  dateToSeed2D,
} from '../puzzle2dBent';

export type Game2DBentDifficulty = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  width: number;
  height: number;
  group: SymmetryGroup;
  label: string;
}

// All difficulties use the dihedral D₄ group so the player's flip controls
// actually do something on chiral pieces (L, S). Under C₄ a flip lands on a
// mirror orientation that isn't in the orientation list, making the H/V
// buttons silently no-op.
export const DIFFICULTY_CONFIG: Record<Game2DBentDifficulty, DifficultyConfig> = {
  easy:   { width: 5, height: 5, group: 'D4', label: 'Easy' },
  medium: { width: 7, height: 6, group: 'D4', label: 'Medium' },
  hard:   { width: 8, height: 7, group: 'D4', label: 'Hard' },
};

interface PlacedRecord {
  id: string;
  piece: PuzzlePiece2D;
}

interface Props {
  onExit: () => void;
  difficulty?: Game2DBentDifficulty;
  onDifficultyChange?: (d: Game2DBentDifficulty) => void;
}

export function Game2DBent({ onExit, difficulty = 'medium', onDifficultyChange }: Props) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const pieceTypes = useMemo<ResolvedPieceType2D[]>(
    () => buildPieceLibrary(config.group),
    [config.group],
  );

  const puzzle = useMemo<Puzzle2D>(() => {
    const today = new Date().toISOString().slice(0, 10);
    return generatePuzzle2DBent(
      config.width,
      config.height,
      dateToSeed2D(`${today}-${difficulty}`),
      { group: config.group },
    );
    // Component is remounted via key={difficulty} from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialInventory = useMemo<InventoryEntry2D[]>(() => {
    const counts = new Map<string, number>();
    for (const p of puzzle.pieces) counts.set(p.typeId, (counts.get(p.typeId) ?? 0) + 1);
    const out: InventoryEntry2D[] = [];
    for (const t of pieceTypes) {
      const total = counts.get(t.id);
      if (!total) continue;
      out.push({ typeId: t.id, label: t.label, color: t.color, total, remaining: total });
    }
    // Bigger pieces first (cell count desc), 'unit' always last.
    out.sort((a, b) => {
      if (a.typeId === 'unit') return 1;
      if (b.typeId === 'unit') return -1;
      const aSize = pieceTypes.find(p => p.id === a.typeId)!.baseCells.length;
      const bSize = pieceTypes.find(p => p.id === b.typeId)!.baseCells.length;
      return bSize - aSize;
    });
    return out;
  }, [puzzle, pieceTypes]);

  const [inventory, setInventory] = useState<InventoryEntry2D[]>(initialInventory);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(initialInventory[0]?.typeId ?? 'unit');
  const [orientationIndex, setOrientationIndex] = useState(0);
  const [placed, setPlaced] = useState<PlacedRecord[]>([]);
  const [hoverCell, setHoverCell] = useState<Vec2 | null>(null);
  const [won, setWon] = useState(false);
  const placedIdRef = useRef(0);

  const selectedType = useMemo(
    () => pieceTypes.find(t => t.id === selectedTypeId)!,
    [selectedTypeId, pieceTypes],
  );

  const occupied = useMemo(
    () => occupiedFromPlaced2D(placed.map(p => p.piece), pieceTypes),
    [placed, pieceTypes],
  );

  const ghostPlacement = useMemo(() => {
    if (!hoverCell || !selectedType) return null;
    return computeAutoPlacement2D(
      selectedType.orientations[orientationIndex],
      hoverCell,
      config.width,
      config.height,
      occupied,
    );
  }, [hoverCell, selectedType, orientationIndex, occupied, config.width, config.height]);

  const ghostCells = ghostPlacement?.cells ?? null;
  const ghostAnchorCell = ghostPlacement
    ? ghostPlacement.cells[ghostPlacement.anchorCellIndex]
    : null;

  const remainingForSelected = inventory.find(i => i.typeId === selectedTypeId)?.remaining ?? 0;
  const ghostValid = !!ghostPlacement && ghostPlacement.valid && remainingForSelected > 0;

  const placeAt = (cell: Vec2) => {
    if (remainingForSelected === 0 || !selectedType) {
      sfx.click();
      return;
    }
    const placement = computeAutoPlacement2D(
      selectedType.orientations[orientationIndex],
      cell,
      config.width,
      config.height,
      occupied,
    );
    if (!placement.valid) {
      sfx.click();
      return;
    }
    sfx.place();
    setPlaced(prev => [
      ...prev,
      {
        id: `placed-${placedIdRef.current++}`,
        piece: { typeId: selectedTypeId, orientationIndex, position: placement.origin },
      },
    ]);
    setInventory(inv =>
      inv.map(i =>
        i.typeId === selectedTypeId ? { ...i, remaining: i.remaining - 1 } : i,
      ),
    );
    setHoverCell(null);
  };

  const tryPlace = () => {
    if (!hoverCell) {
      sfx.click();
      return;
    }
    placeAt(hoverCell);
  };

  const removePiece = (id: string) => {
    sfx.click();
    const target = placed.find(p => p.id === id);
    if (!target) return;
    setPlaced(prev => prev.filter(p => p.id !== id));
    setInventory(inv =>
      inv.map(i =>
        i.typeId === target.piece.typeId
          ? { ...i, remaining: Math.min(i.total, i.remaining + 1) }
          : i,
      ),
    );
  };

  const reset = () => {
    sfx.click();
    setPlaced([]);
    setHoverCell(null);
    setWon(false);
    setInventory(initialInventory.map(i => ({ ...i })));
  };

  const selectType = (typeId: string) => {
    sfx.click();
    setSelectedTypeId(typeId);
    setOrientationIndex(0);
    setHoverCell(null);
  };

  const applyRotation = (dir: RotationDir2D) => {
    sfx.click();
    setOrientationIndex(i => applyRotation2D(selectedType.orientations, i, dir));
  };

  const applyFlip = (axis: FlipAxis2D) => {
    sfx.click();
    setOrientationIndex(i => applyFlip2D(selectedType.orientations, i, axis));
  };

  // Win detection.
  useEffect(() => {
    if (!won && isFilled2D(occupied, config.width, config.height)) {
      setWon(true);
      sfx.win();
    }
  }, [occupied, won, config.width, config.height]);

  // Auto-pick next type if current runs out.
  useEffect(() => {
    if (remainingForSelected > 0) return;
    const next = inventory.find(i => i.remaining > 0);
    if (next) {
      setSelectedTypeId(next.typeId);
      setOrientationIndex(0);
    }
  }, [inventory, remainingForSelected]);

  // Keyboard shortcuts: R/Shift+R rotate, H/V flip, Space/Enter place.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      switch (e.key.toLowerCase()) {
        case 'r': applyRotation(e.shiftKey ? 'ccw' : 'cw'); e.preventDefault(); break;
        case 'h': applyFlip('h'); e.preventDefault(); break;
        case 'v': applyFlip('v'); e.preventDefault(); break;
        case ' ':
        case 'enter':
          tryPlace();
          e.preventDefault();
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const totalCells = config.width * config.height;
  const filledCells = occupied.size;
  const pct = Math.round((filledCells / totalCells) * 100);

  // Responsive cell size — fits the grid into the available viewport on
  // both phones and desktops. Header (~64), bottom controls (~190), and
  // bottom nav (~64) eat ~320px of vertical space; allow some breathing
  // room on top of that.
  const [cellSize, setCellSize] = useState(56);
  useEffect(() => {
    const compute = () => {
      const horizontal = (window.innerWidth - 24) / config.width;
      const vertical = (window.innerHeight - 360) / config.height;
      const size = Math.max(28, Math.min(64, Math.floor(Math.min(horizontal, vertical))));
      setCellSize(size);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [config.width, config.height]);

  // Map placed piece's first cell → the placed record id, for click-to-remove.
  const placedById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of placed) {
      for (const [x, y] of placedCells2D(p.piece, pieceTypes)) {
        m.set(cellKey2D(x, y), p.id);
      }
    }
    return m;
  }, [placed, pieceTypes]);

  const placedColorByCell = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of placed) {
      const t = pieceTypes.find(t => t.id === p.piece.typeId);
      if (!t) continue;
      for (const [x, y] of placedCells2D(p.piece, pieceTypes)) {
        m.set(cellKey2D(x, y), t.color);
      }
    }
    return m;
  }, [placed, pieceTypes]);

  const ghostColor = selectedType?.color ?? '#FF4500';

  return (
    <div className="fixed inset-0 bg-surface text-on-surface flex flex-col overflow-hidden">
      <header className="bg-surface border-b border-divider flex justify-between items-center w-full px-3 sm:px-6 h-14 sm:h-16 z-40 gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-5 min-w-0">
          <button
            onClick={onExit}
            className="text-text hover:text-white p-1.5 rounded-lg hover:bg-divider active:scale-95 transition-all flex-shrink-0"
            aria-label="Back to menu"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <span className="text-base sm:text-2xl font-black text-accent tracking-tight flex-shrink-0">
            Squaris Bent
          </span>
          <div className="hidden sm:block h-6 w-px bg-divider" />
          <span className="hidden md:inline label-caps text-text-muted whitespace-nowrap">
            {config.width}×{config.height} · {config.label} · {config.group}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {onDifficultyChange && (
            <DifficultySegmented
              value={difficulty}
              onChange={onDifficultyChange}
            />
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-surface-elevated px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-divider">
            <span className="material-symbols-outlined text-accent text-sm hidden sm:inline">analytics</span>
            <span className="text-[11px] sm:text-sm font-mono font-bold tabular-nums">
              {pct}%
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-6 overflow-auto">
        {/* The grid */}
        <div
          className="relative bg-well border border-divider rounded-xl shadow-2xl flex-shrink-0 touch-none"
          style={{
            width: config.width * cellSize,
            height: config.height * cellSize,
          }}
        >
          {/* Grid lines */}
          <div
            className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
              backgroundSize: `${cellSize}px ${cellSize}px`,
            }}
          />

          {/* Cells (hover targets + click-to-place / click-to-remove) */}
          {Array.from({ length: config.height }).flatMap((_, y) =>
            Array.from({ length: config.width }).map((__, x) => {
              const key = cellKey2D(x, y);
              const placedId = placedById.get(key);
              const placedColor = placedColorByCell.get(key);
              const ghostHere = ghostCells?.some(([cx, cy]) => cx === x && cy === y);
              const isAnchor =
                ghostAnchorCell !== null &&
                ghostAnchorCell[0] === x &&
                ghostAnchorCell[1] === y;
              return (
                <div
                  key={key}
                  className="absolute cursor-pointer touch-manipulation"
                  style={{ left: x * cellSize, top: y * cellSize, width: cellSize, height: cellSize }}
                  onMouseEnter={() => setHoverCell([x, y])}
                  onMouseLeave={() => setHoverCell(null)}
                  onClick={() => {
                    if (placedId) removePiece(placedId);
                    else placeAt([x, y]);
                  }}
                >
                  {/* Placed piece cell */}
                  {placedColor && (
                    <div
                      className="absolute inset-[2px] rounded-md"
                      style={{
                        background: placedColor,
                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                      }}
                    />
                  )}
                  {/* Ghost preview */}
                  {!placedColor && ghostHere && (
                    <div
                      className="absolute inset-[3px] rounded-md transition-opacity"
                      style={{
                        background: ghostValid ? ghostColor : '#ff4040',
                        opacity: ghostValid ? (isAnchor ? 0.7 : 0.4) : 0.55,
                        boxShadow: isAnchor
                          ? `0 0 0 2px ${ghostValid ? ghostColor : '#ff4040'}`
                          : 'inset 0 0 0 1px rgba(0,0,0,0.35)',
                      }}
                    />
                  )}
                </div>
              );
            }),
          )}
        </div>

      </main>

      {/* Controls strip pinned just above the bottom nav. Same single-row
          layout as before (Inventory · Rotate/Flip · Place) but anchored at
          the bottom of the page instead of floating in the middle. */}
      <div className="w-full flex justify-center px-2 sm:px-4 pb-2 pointer-events-none">
        <div className="flex flex-wrap justify-center items-end gap-x-3 gap-y-2 sm:gap-4 px-3 sm:px-5 py-2 sm:py-3 bg-surface-elevated/85 backdrop-blur-md rounded-2xl border border-divider shadow-2xl max-w-full pointer-events-auto">
          {/* Inventory */}
          <div className="flex flex-col gap-1 sm:gap-1.5 min-w-0">
            <span className="label-caps text-text-muted">Inventory</span>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {inventory.map(item => {
                const active = item.typeId === selectedTypeId;
                const out = item.remaining === 0;
                const type = pieceTypes.find(t => t.id === item.typeId);
                return (
                  <div key={item.typeId} className="flex flex-col items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    <button
                      onClick={() => !out && selectType(item.typeId)}
                      disabled={out}
                      className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-xl border-2 flex items-center justify-center transition-all overflow-hidden p-1 sm:p-1.5 ${
                        out
                          ? 'border-divider/40 bg-surface/40 opacity-30 cursor-not-allowed'
                          : active
                            ? 'border-accent bg-accent/15 shadow-accent-soft'
                            : 'border-divider hover:border-divider-hover bg-surface'
                      }`}
                      title={item.label}
                    >
                      {type && (
                        <PieceIcon2D
                          cells={
                            type.orientations[active ? orientationIndex : 0]
                          }
                          color={item.color}
                        />
                      )}
                    </button>
                    <span
                      className={`text-[11px] sm:text-[12px] font-mono font-bold tabular-nums tracking-tight ${
                        out
                          ? 'text-text-muted/60 line-through'
                          : active
                            ? 'text-accent'
                            : 'text-text'
                      }`}
                    >
                      ×{item.remaining}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden sm:block w-px h-12 bg-divider" />

          {/* Rotate / flip controls */}
          <div className="flex flex-col items-center gap-1 sm:gap-1.5">
            <span className="label-caps text-text-muted">Rotate</span>
            <div className="flex gap-1">
              <ControlButton label="↻ R" title="Rotate 90° clockwise (key: R)" onClick={() => applyRotation('cw')} />
              <ControlButton label="↺ R" title="Rotate 90° counter-clockwise (key: Shift+R)" onClick={() => applyRotation('ccw')} />
            </div>
            <span className="label-caps text-text-muted mt-0.5 sm:mt-1">Flip</span>
            <div className="flex gap-1">
              <ControlButton label="⇄ H" title="Flip horizontal (key: H)" onClick={() => applyFlip('h')} />
              <ControlButton label="⇅ V" title="Flip vertical (key: V)" onClick={() => applyFlip('v')} />
            </div>
          </div>

          <div className="hidden sm:block w-px h-12 bg-divider" />

          <button
            onClick={tryPlace}
            disabled={!ghostValid}
            className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-sm uppercase transition-all self-center ${
              ghostValid
                ? 'bg-accent text-white hover:bg-accent-hover shadow-accent-glow active:scale-95'
                : 'bg-surface text-text-muted border border-divider cursor-not-allowed'
            }`}
            title="Place selected piece (key: Space)"
          >
            Place
          </button>
        </div>
      </div>

      <nav className="w-full flex justify-around items-center h-16 bg-surface border-t border-divider z-40">
        <button onClick={reset} className="flex flex-col items-center justify-center text-text-muted hover:text-white active:translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-xl">restart_alt</span>
          <span className="text-[10px] uppercase tracking-widest mt-0.5 font-bold">Reset</span>
        </button>
        <button onClick={onExit} className="flex flex-col items-center justify-center text-text-muted hover:text-white active:translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-xl">menu</span>
          <span className="text-[10px] uppercase tracking-widest mt-0.5 font-bold">Menu</span>
        </button>
      </nav>

      {won && (
        <div className="absolute inset-0 z-50 bg-surface/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-surface-elevated border border-divider rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <span className="material-symbols-outlined text-accent text-5xl mb-2">emoji_events</span>
            <h2 className="text-3xl font-black text-accent mb-2">Bent Complete</h2>
            <p className="text-text-muted mb-6">
              {config.label} · {config.group} · every cell of the {config.width}×{config.height} grid is filled.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-5 py-3 rounded-xl bg-accent text-white font-bold text-sm uppercase hover:bg-accent-hover active:scale-95 transition-all"
              >
                Play Again
              </button>
              <button
                onClick={onExit}
                className="px-5 py-3 rounded-xl bg-surface border border-divider text-text font-bold text-sm uppercase hover:border-accent hover:text-accent active:scale-95 transition-all"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ControlButton({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`min-w-[44px] h-8 px-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${
        disabled
          ? 'bg-surface/40 text-text-muted/50 border border-divider/40 cursor-not-allowed'
          : 'bg-surface border border-divider text-text hover:border-accent hover:text-accent hover:bg-accent/10 active:scale-95'
      }`}
    >
      {label}
    </button>
  );
}

function DifficultySegmented({
  value,
  onChange,
}: {
  value: Game2DBentDifficulty;
  onChange: (d: Game2DBentDifficulty) => void;
}) {
  const opts: Game2DBentDifficulty[] = ['easy', 'medium', 'hard'];
  return (
    <div className="flex items-center bg-surface-elevated rounded-full border border-divider overflow-hidden">
      {opts.map(d => (
        <button
          key={d}
          onClick={() => d !== value && (sfx.click(), onChange(d))}
          className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider transition-all ${
            value === d
              ? 'bg-accent text-white shadow-accent-soft'
              : 'text-text-muted hover:text-white'
          }`}
          title={`${DIFFICULTY_CONFIG[d].label} · ${DIFFICULTY_CONFIG[d].width}×${DIFFICULTY_CONFIG[d].height} · ${DIFFICULTY_CONFIG[d].group}`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

function PieceIcon2D({ cells, color }: { cells: Vec2[]; color: string }) {
  const xs = cells.map(c => c[0]);
  const ys = cells.map(c => c[1]);
  const w = Math.max(...xs) - Math.min(...xs) + 1;
  const h = Math.max(...ys) - Math.min(...ys) + 1;
  const cellPx = Math.max(6, Math.floor(34 / Math.max(w, h)));
  return (
    <div className="relative" style={{ width: w * cellPx, height: h * cellPx }}>
      {cells.map(([x, y], i) => (
        <div
          key={i}
          className="absolute rounded-[2px]"
          style={{
            left: x * cellPx,
            top: y * cellPx,
            width: cellPx - 1,
            height: cellPx - 1,
            background: color,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
          }}
        />
      ))}
    </div>
  );
}
