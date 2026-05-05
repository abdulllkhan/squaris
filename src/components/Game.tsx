import { useEffect, useMemo, useRef, useState } from 'react';
import { Difficulty } from '../App';
import { GameLogic } from '../gameLogic';
import { PuzzleGenerator, dailyPuzzleKey } from '../puzzleGenerator';
import { GameState, Square } from '../types';
import { TopAppBar } from './TopAppBar';
import { BottomNav } from './BottomNav';
import { WinScreen } from './WinScreen';
import { pieceBgClass } from '../lib/pieceColor';
import { sfx } from '../lib/sound';

interface Props {
  difficulty: Difficulty;
  onExit: () => void;
  onRestart: () => void;
}

interface DragState {
  squareId: number;
  size: number;
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  source: 'inventory' | 'placed';
}

export function Game({ difficulty, onExit, onRestart }: Props) {
  const [gameState, setGameState] = useState<GameState>(() =>
    GameLogic.createInitialGameState(
      PuzzleGenerator.generateDailyPuzzle(dailyPuzzleKey(), difficulty),
    ),
  );
  const [moveCount, setMoveCount] = useState(0);
  const [history, setHistory] = useState<GameState[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hint, setHint] = useState<{ x: number; y: number; size: number; squareId: number } | null>(null);
  const [shuffleNonce, setShuffleNonce] = useState(0);
  const showTimer = localStorage.getItem('showTimer') !== 'false';

  const containerCols = gameState.puzzle.container.width;
  const containerRows = gameState.puzzle.container.height;

  // Cell size — responsive based on viewport and grid size.
  const [cellSize, setCellSize] = useState(56);
  useEffect(() => {
    const compute = () => {
      const horizontal = Math.min(window.innerWidth - 32, 560) / containerCols;
      const vertical = (window.innerHeight - 360) / containerRows;
      const size = Math.max(32, Math.min(72, Math.floor(Math.min(horizontal, vertical))));
      setCellSize(size);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [containerCols, containerRows]);

  // Game timer — uses real time so it stays accurate even if tab is throttled.
  const startRef = useRef(Date.now());
  useEffect(() => {
    if (gameState.isCompleted) return;
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 250);
    return () => clearInterval(id);
  }, [gameState.isCompleted]);

  // Inventory order — keep a stable ordering across renders, with a manual shuffle.
  const inventoryOrder = useMemo(() => {
    const unplaced = GameLogic.getUnplacedSquares(gameState);
    if (shuffleNonce === 0) return unplaced;
    // Fisher-Yates with the nonce as seed-ish (deterministic enough)
    const arr = [...unplaced];
    let s = shuffleNonce;
    for (let i = arr.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [gameState, shuffleNonce]);

  const placedSquares = GameLogic.getPlacedSquares(gameState);

  // Win on completion
  useEffect(() => {
    if (gameState.isCompleted) {
      sfx.win();
    }
  }, [gameState.isCompleted]);

  const gridRef = useRef<HTMLDivElement>(null);

  // ---------- Drag-drop ----------

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    piece: Square,
    source: 'inventory' | 'placed'
  ) => {
    e.preventDefault();
    if (gameState.isCompleted) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    let workingState = gameState;
    if (source === 'placed') {
      setHistory(h => [...h, gameState]);
      workingState = GameLogic.removeSquare(gameState, piece.id);
      setGameState(workingState);
      setMoveCount(c => c + 1);
    }

    setDrag({
      squareId: piece.id,
      size: piece.size,
      pointerX: e.clientX,
      pointerY: e.clientY,
      offsetX,
      offsetY,
      source,
    });
    setHint(null);

    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      if (!moved && (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5)) {
        moved = true;
      }
      setDrag(d => (d ? { ...d, pointerX: ev.clientX, pointerY: ev.clientY } : null));
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      if (!moved) {
        // Click-only: placed pieces were already removed (click-to-remove); inventory clicks are no-ops.
        setDrag(null);
        return;
      }

      const grid = gridRef.current;
      if (!grid) {
        setDrag(null);
        return;
      }
      const gridRect = grid.getBoundingClientRect();
      const pieceLeft = ev.clientX - offsetX;
      const pieceTop = ev.clientY - offsetY;
      const gridX = Math.round((pieceLeft - gridRect.left) / cellSize);
      const gridY = Math.round((pieceTop - gridRect.top) / cellSize);

      const square = workingState.puzzle.squares.find(s => s.id === piece.id);
      if (square && GameLogic.canPlaceSquare(workingState, square, gridX, gridY)) {
        const next = GameLogic.placeSquare(workingState, piece.id, gridX, gridY);
        setGameState(next);
        if (source === 'inventory') {
          setHistory(h => [...h, gameState]);
          setMoveCount(c => c + 1);
        }
        sfx.place();
      } else if (source === 'inventory') {
        sfx.error();
      }
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Compute placement preview cell from current drag pointer position
  const previewCell = useMemo(() => {
    if (!drag || !gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const pieceLeft = drag.pointerX - drag.offsetX;
    const pieceTop = drag.pointerY - drag.offsetY;
    const gridX = Math.round((pieceLeft - rect.left) / cellSize);
    const gridY = Math.round((pieceTop - rect.top) / cellSize);

    const overGrid =
      pieceLeft + drag.size * cellSize > rect.left &&
      pieceLeft < rect.right &&
      pieceTop + drag.size * cellSize > rect.top &&
      pieceTop < rect.bottom;
    if (!overGrid) return null;

    const square = gameState.puzzle.squares.find(s => s.id === drag.squareId);
    if (!square) return null;
    const valid = GameLogic.canPlaceSquare(gameState, square, gridX, gridY);
    return { x: gridX, y: gridY, size: drag.size, valid };
  }, [drag, gameState, cellSize]);

  // ---------- Buttons ----------

  const handleUndo = () => {
    if (history.length === 0) return;
    sfx.click();
    const previous = history[history.length - 1];
    setGameState(previous);
    setHistory(h => h.slice(0, -1));
    setMoveCount(c => Math.max(0, c - 1));
    setHint(null);
  };

  const handleRestart = () => {
    sfx.click();
    onRestart();
  };

  const handleHint = () => {
    sfx.click();
    const unplaced = GameLogic.getUnplacedSquares(gameState).sort((a, b) => b.size - a.size);
    let best: { square: Square; x: number; y: number; score: number } | null = null;

    for (const sq of unplaced) {
      for (let y = 0; y <= containerRows - sq.size; y++) {
        for (let x = 0; x <= containerCols - sq.size; x++) {
          if (!GameLogic.canPlaceSquare(gameState, sq, x, y)) continue;
          let score = sq.size * 10;
          if ((x === 0 || x + sq.size === containerCols) && (y === 0 || y + sq.size === containerRows)) {
            score += 30;
          } else if (x === 0 || y === 0 || x + sq.size === containerCols || y + sq.size === containerRows) {
            score += 20;
          }
          if (!best || score > best.score) best = { square: sq, x, y, score };
        }
      }
    }
    if (best) {
      setHint({ squareId: best.square.id, x: best.x, y: best.y, size: best.square.size });
      setTimeout(() => setHint(null), 2200);
    }
  };

  const handleShuffle = () => {
    sfx.click();
    setShuffleNonce(n => n + 1 || 1);
  };

  // ---------- Rendering helpers ----------

  const timeText = GameLogic.formatTime(elapsed);
  const today = new Date();
  const puzzleNumber = Math.floor(today.getTime() / 86400000) % 10000;

  const gridWidth = containerCols * cellSize;
  const gridHeight = containerRows * cellSize;

  const isPieceBeingDragged = (squareId: number) =>
    drag !== null && drag.squareId === squareId;

  return (
    <div className="min-h-screen flex flex-col">
      <TopAppBar onLogoClick={onExit} puzzleNumber={puzzleNumber} difficulty={difficulty} />

      <main className="flex-1 flex flex-col items-center w-full px-4 pt-6 pb-28">
        {/* HUD stats card */}
        <div className="flex w-full max-w-md justify-between items-center mb-6 px-5 py-3 bg-divider/30 rounded-xl border border-divider">
          <div className="flex flex-col">
            <span className="label-caps text-text-muted">TIMER</span>
            <span className="text-2xl font-semibold text-white">{showTimer ? timeText : '--:--'}</span>
          </div>
          <div className="h-8 w-px bg-divider" />
          <div className="flex flex-col items-end">
            <span className="label-caps text-text-muted">MOVES</span>
            <span className="text-2xl font-semibold text-white">{moveCount}</span>
          </div>
        </div>

        {/* Game grid (the well) */}
        <div
          ref={gridRef}
          className="relative bg-well border border-divider rounded-xl shadow-2xl mb-6 overflow-hidden"
          style={{ width: gridWidth, height: gridHeight }}
        >
          {/* Subtle grid lines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
              backgroundSize: `${cellSize}px ${cellSize}px`,
            }}
          />

          {/* Placement preview */}
          {previewCell && (
            <div
              className={`absolute rounded-md border-2 pointer-events-none transition-all ${
                previewCell.valid
                  ? 'border-accent bg-accent/20'
                  : 'border-red-400 bg-red-400/15'
              }`}
              style={{
                left: previewCell.x * cellSize,
                top: previewCell.y * cellSize,
                width: previewCell.size * cellSize,
                height: previewCell.size * cellSize,
              }}
            />
          )}

          {/* Hint flash */}
          {hint && (
            <div
              className="absolute rounded-md border-2 border-yellow-400 bg-yellow-400/25 pointer-events-none animate-pulse"
              style={{
                left: hint.x * cellSize,
                top: hint.y * cellSize,
                width: hint.size * cellSize,
                height: hint.size * cellSize,
              }}
            />
          )}

          {/* Placed pieces */}
          {placedSquares.map(sq => {
            if (sq.x === undefined || sq.y === undefined) return null;
            const dragging = isPieceBeingDragged(sq.id);
            return (
              <div
                key={sq.id}
                onPointerDown={e => handlePointerDown(e, sq, 'placed')}
                style={{
                  left: sq.x * cellSize,
                  top: sq.y * cellSize,
                  width: sq.size * cellSize,
                  height: sq.size * cellSize,
                  visibility: dragging ? 'hidden' : 'visible',
                }}
                className={`absolute rounded-lg cursor-grab active:cursor-grabbing shadow-piece border-t border-l border-white/20 flex items-center justify-center ${pieceBgClass(sq.size)}`}
              >
                {sq.size >= 2 && (
                  <span className="text-white/60 text-xs font-bold pointer-events-none select-none">
                    {sq.size}×{sq.size}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Inventory */}
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="label-caps text-text-muted">INVENTORY</h3>
            <span className="label-caps text-text-muted">
              {inventoryOrder.length} REMAINING
            </span>
          </div>
          <div className="overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            <div className="flex gap-3 min-w-max items-center">
              {inventoryOrder.map(sq => {
                const dragging = isPieceBeingDragged(sq.id);
                const dim = sq.size * cellSize;
                return (
                  <div
                    key={sq.id}
                    onPointerDown={e => handlePointerDown(e, sq, 'inventory')}
                    style={{
                      width: dim,
                      height: dim,
                      visibility: dragging ? 'hidden' : 'visible',
                    }}
                    className={`shrink-0 rounded-lg cursor-grab active:cursor-grabbing shadow-piece border-t border-l border-white/20 flex items-center justify-center hover:scale-[1.04] transition-transform ${pieceBgClass(sq.size)}`}
                  >
                    {sq.size >= 2 && (
                      <span className="text-white/60 text-xs font-bold pointer-events-none select-none">
                        {sq.size}×{sq.size}
                      </span>
                    )}
                  </div>
                );
              })}
              {inventoryOrder.length === 0 && (
                <div className="text-text-muted text-xs py-4">All pieces placed.</div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNav
        buttons={[
          {
            icon: 'undo',
            label: 'Undo',
            onClick: handleUndo,
            disabled: history.length === 0,
          },
          { icon: 'restart_alt', label: 'Restart', onClick: handleRestart },
          { icon: 'lightbulb', label: 'Hint', onClick: handleHint, active: !!hint },
          { icon: 'shuffle', label: 'Shuffle', onClick: handleShuffle },
        ]}
      />

      {/* Drag ghost following the pointer */}
      {drag && (
        <div
          className={`fixed pointer-events-none z-50 rounded-lg shadow-piece opacity-90 ${pieceBgClass(drag.size)}`}
          style={{
            left: drag.pointerX - drag.offsetX,
            top: drag.pointerY - drag.offsetY,
            width: drag.size * cellSize,
            height: drag.size * cellSize,
          }}
        />
      )}

      {gameState.isCompleted && (
        <WinScreen
          timeText={timeText}
          moves={moveCount}
          difficulty={difficulty}
          onNext={handleRestart}
          onMenu={onExit}
        />
      )}
    </div>
  );
}
